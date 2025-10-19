import traceback
from sentence_transformers import SentenceTransformer, util

class CriminalMatcher:
    def __init__(self, supabase_client):
        self.supabase = supabase_client
        self.embedder = SentenceTransformer("all-MiniLM-L6-v2")

    def _fetch_fir_records(self):
        """Fetch all FIR records from Supabase in real-time."""
        try:
            response = self.supabase.table("fir_records").select(
                "fir_number, incident_type, incident_description, incident_location, accused_description, modus_operandi, status"
            ).execute()
            return response.data or []
        except Exception as e:
            print("❌ Error fetching FIR records:", e)
            traceback.print_exc()
            return []

    def find_similar_firs(self, case_description, top_n=5):
        """Find similar FIRs based on semantic similarity."""
        fir_records = self._fetch_fir_records()
        if not fir_records:
            return [{"message": "No FIR records found in database."}]

        corpus = []
        for fir in fir_records:
            parts = [
                str(fir.get("incident_type") or ""),
                str(fir.get("incident_description") or ""),
                str(fir.get("incident_location") or ""),
                str(fir.get("accused_description") or ""),
                str(fir.get("modus_operandi") or "")
            ]
            text = " ".join(parts)
            corpus.append(text.strip())


        # Encode query + corpus
        query_emb = self.embedder.encode(case_description, convert_to_tensor=True)
        corpus_emb = self.embedder.encode(corpus, convert_to_tensor=True)

        similarities = util.cos_sim(query_emb, corpus_emb)[0]
        scores = similarities.cpu().tolist()

        ranked = sorted(
            [
                {
                    "fir_number": fir_records[i].get("fir_number"),
                    "incident_type": fir_records[i].get("incident_type"),
                    "incident_location": fir_records[i].get("incident_location"),
                    "status": fir_records[i].get("status"),
                    "similarity": round(score * 100, 2)
                }
                for i, score in enumerate(scores)
            ],
            key=lambda x: x["similarity"],
            reverse=True
        )

        # ✅ Filter out irrelevant matches (below threshold)
        threshold = 50.0  # show only ≥50 % similarity
        filtered = [r for r in ranked if r["similarity"] >= threshold]

        # Limit to top N after filtering
        return filtered[:top_n]

