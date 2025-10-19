from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
from supabase import create_client, Client
import os
from dotenv import load_dotenv
import jwt
import datetime
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# ----------------------------
# ⚙️ Supabase Configuration
# ----------------------------
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')  # anon key
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')  # service key
JWT_SECRET = os.getenv('JWT_SECRET', 'your-secret-key')

# ----------------------------
# 📧 Email Configuration
# ----------------------------
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
EMAIL_USER = os.getenv('EMAIL_USER')
EMAIL_PASSWORD = os.getenv('EMAIL_PASSWORD')
ADMIN_EMAIL = os.getenv('ADMIN_EMAIL', 'your-email@gmail.com')

# ----------------------------
# 🔐 Admin Verification Code
# ----------------------------
ADMIN_VERIFY_CODE = os.getenv('ADMIN_VERIFY_CODE', '12345')

# ----------------------------
# 🗄️ Initialize Supabase Clients
# ----------------------------
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)  # anon key for normal users
supabase_admin: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)  # service key for admin ops


# -----------------------------------------------------
# 📧 Send Notification Email (No verification link)
# -----------------------------------------------------
def send_verification_notification(police_email, police_name):
    """Send notification email to admin when new police registers"""
    try:
        subject = f"Police Verification Request - {police_name}"

        message = MIMEMultipart()
        message['From'] = EMAIL_USER
        message['To'] = ADMIN_EMAIL
        message['Subject'] = subject

        body = f"""
        <html>
            <body>
                <h2>New Police Verification Request</h2>
                <p>A new police officer has registered and requires verification:</p>
                <ul>
                    <li><strong>Name:</strong> {police_name}</li>
                    <li><strong>Email:</strong> {police_email}</li>
                    <li><strong>Registration Date:</strong> {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</li>
                </ul>
                <p>Please review this request in the Admin Panel and verify when ready.</p>
            </body>
        </html>
        """

        message.attach(MIMEText(body, 'html'))

        with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT) as server:
            server.starttls()
            server.login(EMAIL_USER, EMAIL_PASSWORD)
            server.send_message(message)

        print(f"✅ Notification email sent to admin for {police_email}")
        return True
    except Exception as e:
        print(f"❌ Email sending failed: {e}")
        return False


# -----------------------------------------------------
# 📝 Register Endpoint
# -----------------------------------------------------
@app.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        print("Registration data received:", data)

        required_fields = ['fullName', 'email', 'password', 'role']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400

        existing_user = supabase.table('users').select('*').eq('email', data['email']).execute()
        if existing_user.data:
            return jsonify({'error': 'User with this email already exists'}), 400

        user_data = {
            'full_name': data['fullName'],
            'email': data['email'],
            'password': data['password'],
            'role': data['role'],
            'is_verified': data['role'] == 'citizen',
            'created_at': datetime.datetime.now().isoformat()
        }

        if data['role'] == 'police':
            user_data.update({
                'badge_number': data.get('badgeNumber', ''),
                'police_station': data.get('policeStation', ''),
                'rank': data.get('rank', '')
            })

        result = supabase.table('users').insert(user_data).execute()
        print("Insert result:", result)

        if result.data:
            message = 'Registration successful!'
            email_sent = False

            if data['role'] == 'police':
                email_sent = send_verification_notification(data['email'], data['fullName'])
                if email_sent:
                    message += ' Admin will verify your account soon.'
                else:
                    message += ' (Admin notification failed.)'

            return jsonify({
                'message': message,
                'email_sent': email_sent,
                'role': data['role']
            }), 201
        else:
            return jsonify({'error': 'Registration failed: unknown error'}), 500

    except Exception as e:
        print(f"Registration error: {e}")
        return jsonify({'error': f'Registration failed: {str(e)}'}), 500


# -----------------------------------------------------
# 🔐 Login Endpoint
# -----------------------------------------------------
@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        print("Login attempt for:", data.get('email'))

        if not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email and password are required'}), 400

        result = supabase.table('users').select('*').eq('email', data['email']).execute()
        if not result.data:
            return jsonify({'error': 'Invalid email or password'}), 401

        user = result.data[0]

        if user['password'] != data['password']:
            return jsonify({'error': 'Invalid email or password'}), 401

        if user['role'] == 'police' and not user['is_verified']:
            return jsonify({'error': 'Your account is pending verification by admin.'}), 401

        token_payload = {
            'user_id': user['id'],
            'email': user['email'],
            'role': user['role'],
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)
        }
        token = jwt.encode(token_payload, JWT_SECRET, algorithm='HS256')

        return jsonify({
            'message': 'Login successful',
            'token': token,
            'role': user['role'],
            'user': {
                'id': user['id'],
                'full_name': user['full_name'],
                'email': user['email']
            }
        }), 200

    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({'error': f'Login failed: {str(e)}'}), 500


# -----------------------------------------------------
# 🧩 Admin Verification Toggle Endpoint
# -----------------------------------------------------
@app.route('/api/toggle-verify', methods=['POST'])
def toggle_verify():
    """Toggle is_verified for a specific user if correct admin code provided"""
    try:
        data = request.get_json()
        email = data.get('email')
        code = data.get('code')

        if not email or not code:
            return jsonify({'error': 'Email and code are required'}), 400

        if code != ADMIN_VERIFY_CODE:
            return jsonify({'error': 'Invalid verification code'}), 401

        # Fetch user status
        user = supabase_admin.table('users').select('is_verified').eq('email', email).execute()
        if not user.data:
            return jsonify({'error': 'User not found'}), 404

        current_status = user.data[0]['is_verified']
        new_status = not current_status

        # Perform update using admin client (service key)
        result = supabase_admin.table('users').update({'is_verified': new_status}).eq('email', email).execute()
        if result.data:
            status_text = "verified" if new_status else "unverified"
            return jsonify({'message': f'{email} successfully {status_text}'}), 200
        else:
            return jsonify({'error': 'Update failed'}), 500

    except Exception as e:
        print(f"Verification toggle error: {e}")
        return jsonify({'error': str(e)}), 500


# -----------------------------------------------------
# 🧮 Get All Police Users (for Admin Page)
# -----------------------------------------------------
@app.route('/api/get-police-users', methods=['GET'])
def get_police_users():
    """Return list of all police officers"""
    try:
        result = supabase.table('users').select('full_name, email, is_verified, rank, police_station').eq('role', 'police').order('is_verified', desc=False).execute()
        return jsonify(result.data), 200
    except Exception as e:
        print(f"Fetch police users error: {e}")
        return jsonify({'error': str(e)}), 500


# -----------------------------------------------------
# 🧪 Health Check
# -----------------------------------------------------
@app.route('/api/health', methods=['GET'])
def health_check():
    try:
        supabase.table('users').select('count', count='exact').execute()
        return jsonify({'status': 'healthy', 'database': 'connected'}), 200
    except Exception as e:
        return jsonify({'status': 'unhealthy', 'database': 'disconnected', 'error': str(e)}), 500


# -----------------------------------------------------
# 🌐 Serve HTML Pages
# -----------------------------------------------------
@app.route('/')
def home_page():
    return send_from_directory('.', 'home.html')

@app.route('/admin')
def admin_page():
    return send_from_directory('.', 'admin_dashboard.html')

@app.route('/police')
def police_dashboard_page():
    return send_from_directory('.', 'police_dashboard.html')


# -----------------------------------------------------
# 🚀 Run Flask App
# -----------------------------------------------------
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

