# chatbot_api.py (Auto-detect Gemini models + hybrid RAG)
from flask import Flask, request, jsonify
from flask_cors import CORS
import os, time, traceback
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# --- Load RAG ---
answer_query = None
try:
    from scripts.query import answer_query
    print("✅ RAG system loaded successfully.")
except Exception as e:
    print("⚠️ Could not import RAG system:", e)
    answer_query = None


# --- Configure Gemini ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai = None
gemini_available = False
detected_model = None

if GEMINI_API_KEY:
    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        gemini_available = True
        print("✅ Gemini (Google Generative AI) configured.")

        # Dynamically detect any working model
                # Force a specific model for stability
        detected_model = "models/gemini-2.5-flash"
        print(f"✅ Using fixed Gemini model: {detected_model}")

        

    except Exception as e:
        print("⚠️ Failed to configure Gemini client:", e)
else:
    print("⚠️ GEMINI_API_KEY not set.")


# --- Helper: check if RAG output looks valid ---
def is_rag_answer_valid(txt: str):
    if not txt or not isinstance(txt, str):
        return False
    s = txt.strip().lower()
    if len(s) < 30:
        return False
    bad = ["no relevant", "not found", "no data", "sorry", "error", "unknown"]
    return not any(b in s for b in bad)


# --- Gemini call ---
def call_gemini_for_legal_check_and_answer(user_query: str):
    if not gemini_available:
        return None

    prompt = f"""
You are a legal AI assistant for Indian police and legal professionals.

1️⃣ If the user's question is related to **law, legal procedure, IPC sections, evidence, FIR, bail, or court process**, 
then answer factually and concisely, referencing relevant IPC sections or legal procedures.

2️⃣ If the user's question is **not legal** (general chit-chat, emotional, non-law topic), 
reply EXACTLY with this token: NOT_A_LEGAL_QUERY

User question: "{user_query}"
    """.strip()

    try:
        model = genai.GenerativeModel(detected_model)
        resp = model.generate_content([{"role": "user", "parts": [prompt]}])

        text = None
        if hasattr(resp, "text"):
            text = resp.text
        elif hasattr(resp, "candidates") and resp.candidates:
            text = resp.candidates[0].content.parts[0].text
        else:
            text = str(resp)

        return (text or "").strip()
    except Exception as e:
        print("⚠️ Gemini error:", e)
        traceback.print_exc()
        return None


# --- API endpoint ---
@app.route("/api/chat", methods=["POST"])
def chat():
    try:
        data = request.get_json(force=True, silent=True) or {}
        msg = (data.get("message") or "").strip()
        if not msg:
            return jsonify({"success": False, "error": "Empty message"}), 400

        print(f"📨 Query: {msg}")

        # Step 1: RAG
        rag_ans = None
        if answer_query:
            try:
                t0 = time.time()
                rag_ans = answer_query(msg)
                print(f"⏱ RAG took {time.time()-t0:.2f}s")
            except Exception as e:
                print("❌ RAG error:", e)

        if is_rag_answer_valid(rag_ans):
            return jsonify({"success": True, "response": rag_ans, "source": "rag"})

        # Step 2: Gemini
        gem_ans = call_gemini_for_legal_check_and_answer(msg)
        if not gem_ans:
            return jsonify({"success": False, "response": "⚠️ Gemini failed to respond"}), 500

        if "NOT_A_LEGAL_QUERY" in gem_ans:
            return jsonify({
                "success": True,
                "response": "⚖️ Please ask a legal question (IPC, procedure, FIR, bail, etc.).",
                "source": "gemini_filter"
            })

        return jsonify({"success": True, "response": gem_ans, "source": "gemini"})

    except Exception as e:
        print("💥 Chat error:", e)
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "rag_loaded": bool(answer_query),
        "gemini_configured": gemini_available,
        "model": detected_model
    })


if __name__ == "__main__":
    print("🚀 Starting Legal Chatbot API (Hybrid RAG + Gemini with Auto-detect)...")
    app.run(host="0.0.0.0", port=5000, debug=True)
