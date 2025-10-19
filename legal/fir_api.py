from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
from datetime import datetime, timedelta, timezone
from scripts.fir_rag import FIRRAGModel
from scripts.pdf_generator import generate_fir_pdf
from scripts.supabase_client import SupabaseFIRClient
from scripts.case_analyzer import CaseAnalyzer
from scripts.criminal_matcher import CriminalMatcher

import logging
import json

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Initialize FIR RAG model
try:
    fir_model = FIRRAGModel("data/section.csv")
    if not fir_model.load_embeddings():
        logger.info("Training new FIR embeddings...")
        fir_model.train_embeddings()
    logger.info("✅ FIR RAG model loaded successfully!")
except Exception as e:
    logger.error(f"❌ Failed to initialize FIR RAG model: {e}")
    fir_model = None

# Initialize Supabase client
try:
    supabase_client = SupabaseFIRClient()
    logger.info("✅ Supabase client initialized successfully!")
except Exception as e:
    logger.error(f"❌ Failed to initialize Supabase client: {e}")
    supabase_client = None

try:
    case_analyzer = CaseAnalyzer(supabase_client.supabase if supabase_client else None)
    logger.info("✅ Case analyzer initialized successfully!")
except Exception as e:
    logger.error(f"❌ Case analyzer failed: {e}")
    case_analyzer = None




# === ENHANCED FIR MANAGEMENT ===

def safe_parse_datetime(dt_str, as_date=False):
    """Parse ISO datetime or date string into UTC-aware datetime"""
    if not dt_str:
        return None
    try:
        if as_date:
            dt = datetime.fromisoformat(str(dt_str)).replace(tzinfo=timezone.utc)
        else:
            dt = datetime.fromisoformat(str(dt_str).replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            dt = dt.astimezone(timezone.utc)
        return dt
    except Exception:
        return None


# === CASE MANAGEMENT ENDPOINTS ===

# === CASE MANAGEMENT ENDPOINTS ===

@app.route('/api/police/cases/pending', methods=['GET'])
def get_pending_cases():
    """Fetch pending/active cases needing attention (last N months by default).
       Simplified rule: pending if status is in active_statuses AND incident_date within cutoff.
    """
    try:
        if not supabase_client:
            return jsonify({'success': False, 'error': 'Database not available'}), 500

        # optional query param ?months=6 (defaults to 6)
        try:
            months = int(request.args.get('months', 6))
            months = max(0, months)
        except Exception:
            months = 6

        cutoff_date = (datetime.now(timezone.utc) - timedelta(days=30 * months)).strftime('%Y-%m-%d')

        # Only include active statuses (simple rule)
        active_statuses = ['under_investigation', 'registered', 'charges_filed', 'court_proceeding']

        response = (
            supabase_client.supabase.table("fir_records")
            .select("*")
            .in_('status', active_statuses)
            .gte('incident_date', cutoff_date)
            .order('incident_date', desc=True)
            .execute()
        )

        pending_cases = []
        for case in (response.data or []):
            # Normalize dates (keep existing behavior)
            incident_dt = safe_parse_datetime(case.get('incident_date'), as_date=True)
            created_at_dt = safe_parse_datetime(case.get('created_at'), as_date=False)

            case['incident_date'] = incident_dt.isoformat() if incident_dt else None
            case['created_at'] = created_at_dt.isoformat() if created_at_dt else None

            # keep days_pending for frontend info (if created_at exists)
            days_pending = (datetime.now(timezone.utc) - created_at_dt).days if created_at_dt else None

            # DO NOT call case_analyzer or filter by needs_attention here.
            pending_cases.append({
                **case,
                # keep an empty analysis object so frontend that expects it won't break
                'analysis': {},
                'days_pending': days_pending
            })

        return jsonify({'success': True, 'count': len(pending_cases), 'cases': pending_cases})

    except Exception as e:
        logger.error(f"💥 Pending cases error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500





@app.route('/api/police/cases/updates', methods=['GET'])
def get_case_updates():
    """Fetch recent case updates from the past 7 days."""
    try:
        if not supabase_client:
            return jsonify({'success': False, 'error': 'Database not available'}), 500

        seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).strftime('%Y-%m-%d')
        response = (
            supabase_client.supabase.table("fir_records")
            .select("*")
            .gte('updated_at', seven_days_ago)
            .order('updated_at', desc=True)
            .execute()
        )

        updates = []
        for case in response.data:
            updated_at_dt = safe_parse_datetime(case.get('updated_at'))
            updates.append({
                'fir_number': case.get('fir_number'),
                'incident_type': case.get('incident_type'),
                'last_updated': updated_at_dt.isoformat() if updated_at_dt else None,
                'update_type': 'Modified',
                'officer': case.get('investigating_officer')
            })

        return jsonify({'success': True, 'updates': updates, 'last_week_count': len(updates)})

    except Exception as e:
        logger.error(f"💥 Case updates error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# --------------------------------------------------------------------
# Allow slashes in FIR numbers by using <path:fir_number>
# --------------------------------------------------------------------

@app.route('/api/police/cases/<path:fir_number>', methods=['GET'])
def get_case_with_activities(fir_number):
    """Return a single FIR record plus its related case_activities timeline."""
    try:
        if not supabase_client:
            return jsonify({'success': False, 'error': 'Database not available'}), 500

        # Try using existing helper
        try:
            fir_result = supabase_client.get_fir_by_number(fir_number)
            if not fir_result.get('success'):
                return jsonify({'success': False, 'error': fir_result.get('error', 'FIR not found')}), 404
            fir_record = fir_result.get('data')
        except Exception:
            # fallback direct query
            q = (
                supabase_client.supabase.table('fir_records')
                .select('*')
                .eq('fir_number', fir_number)
                .limit(1)
                .execute()
            )
            fir_record = q.data[0] if q.data else None
            if not fir_record:
                return jsonify({'success': False, 'error': 'FIR not found'}), 404

        # Fetch activity timeline
        act_resp = (
            supabase_client.supabase.table('case_activities')
            .select('*')
            .eq('fir_number', fir_number)
            .order('activity_date', desc=True)
            .execute()
        )
        activities = act_resp.data if act_resp and act_resp.data else []

        return jsonify({'success': True, 'record': fir_record, 'activities': activities})

    except Exception as e:
        logger.error(f"💥 Get case + activities error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500
    
# Compatibility route: existing code may call /api/fir/<fir_number>
@app.route('/api/fir/<path:fir_number>', methods=['GET'])
def get_fir_compat(fir_number):
    """
    Backwards compatibility: proxy /api/fir/<fir_number> to the case-with-activities handler.
    This avoids 404s from older frontend code that still hits /api/fir/<fir_number>.
    """
    try:
        # call the existing handler function to reuse logic
        return get_case_with_activities(fir_number)
    except Exception as e:
        logger.error(f"💥 Compatibility GET /api/fir/{fir_number} error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500



@app.route('/api/police/cases/<path:fir_number>/notes', methods=['POST'])
def add_case_note(fir_number):
    """
    Add a new activity/note to case_activities for a FIR.
    Expects JSON: { title, description, activity_type, officer_name, officer_badge }
    """
    try:
        data = request.get_json() or {}
        title = data.get('title') or 'Note'
        description = data.get('description') or ''
        activity_type = data.get('activity_type') or 'note_added'
        officer_name = data.get('officer_name') or data.get('officer') or 'Unknown'
        officer_badge = data.get('officer_badge')

        if not supabase_client:
            return jsonify({'success': False, 'error': 'Database not available'}), 500

        insert_payload = {
            'fir_number': fir_number,
            'activity_type': activity_type,
            'title': title,
            'description': description,
            'previous_value': None,
            'new_value': None,
            'officer_name': officer_name,
            'officer_badge': officer_badge
        }

        resp = supabase_client.supabase.table('case_activities').insert(insert_payload).execute()

        if resp and resp.data:
            return jsonify({'success': True, 'message': 'Activity recorded', 'activity': resp.data}), 201
        else:
            return jsonify({'success': False, 'error': 'Insert failed'}), 500

    except Exception as e:
        logger.error(f"💥 Add case note error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/police/cases/<path:fir_number>/status', methods=['PUT'])
def update_case_status(fir_number):
    """Update case status and investigation notes."""
    try:
        data = request.json or {}
        new_status = data.get('status')
        notes = data.get('notes', '')

        if not supabase_client:
            return jsonify({'success': False, 'error': 'Database not available'}), 500

        # Update FIR record
        response = (
            supabase_client.supabase.table("fir_records")
            .update({
                'status': new_status,
                'investigation_notes': notes,
                'updated_at': datetime.now(timezone.utc).isoformat()
            })
            .eq('fir_number', fir_number)
            .execute()
        )

        if response.data:
            # Log activity into case_activities table
            try:
                supabase_client.supabase.table("case_activities").insert({
                    'fir_number': fir_number,
                    'activity_type': 'status_change',
                    'title': f'Status changed to {new_status}',
                    'description': notes or f'Status updated to {new_status}',
                    'officer_name': 'Dashboard User'
                }).execute()
            except Exception as sub_e:
                logger.warning(f"⚠️ Could not log case activity: {sub_e}")

            return jsonify({'success': True, 'message': f'Case {fir_number} updated to {new_status}'})
        else:
            return jsonify({'success': False, 'error': 'Case not found'}), 404

    except Exception as e:
        logger.error(f"💥 Update case status error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500
    














@app.route("/api/police/analytics/status-distribution", methods=["GET"])
def get_status_distribution():
    """Return case status distribution data"""
    try:
        if not supabase_client:
            return jsonify({"success": False, "error": "Database not available"}), 500

        # Query for status distribution
        response = supabase_client.supabase.table("fir_records") \
            .select("status") \
            .execute()

        firs = response.data or []
        
        # Count status distribution
        status_counts = {}
        for fir in firs:
            status = fir.get('status', 'unknown')
            status_counts[status] = status_counts.get(status, 0) + 1

        # Format status names for better display
        formatted_statuses = {
            'under_investigation': 'Under Investigation',
            'registered': 'Registered',
            'charges_filed': 'Charges Filed', 
            'court_proceeding': 'Court Proceedings',
            'resolved': 'Resolved',
            'closed': 'Closed',
            'unknown': 'Unknown'
        }

        distribution = {}
        for status, count in status_counts.items():
            display_name = formatted_statuses.get(status, status.replace('_', ' ').title())
            distribution[display_name] = count

        return jsonify({"success": True, "distribution": distribution})

    except Exception as e:
        logger.error(f"💥 Status distribution error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

# === ANALYTICS ENDPOINTS ===

@app.route('/api/police/analytics/patterns', methods=['POST'])
def analyze_criminal_patterns():
    """Analyze trends and criminal patterns."""
    try:
        filters = request.json or {}
        if not case_analyzer:
            return jsonify({'success': False, 'error': 'Analytics unavailable'}), 500

        analysis = case_analyzer.analyze_patterns(filters)
        return jsonify({'success': True, 'analysis': analysis})

    except Exception as e:
        logger.error(f"💥 Pattern analysis error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/police/analytics/hotspots', methods=['GET'])
def get_crime_hotspots():
    """Identify high-crime locations."""
    try:
        if not case_analyzer:
            return jsonify({'success': False, 'error': 'Analytics unavailable'}), 500
        return jsonify({'success': True, 'hotspots': case_analyzer.identify_hotspots()})
    except Exception as e:
        logger.error(f"💥 Hotspot error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/police/analytics/statistics', methods=['GET'])
def get_comprehensive_stats():
    """Comprehensive statistical overview."""
    try:
        time_range = request.args.get('range', 'month')
        if not case_analyzer:
            return jsonify({'success': False, 'error': 'Analytics unavailable'}), 500
        stats = case_analyzer.get_comprehensive_stats(time_range)
        return jsonify({'success': True, 'statistics': stats})
    except Exception as e:
        logger.error(f"💥 Statistics error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# -------------------- CRIMINAL MATCHING ENDPOINT --------------------
# -------------------- CRIMINAL MATCHING ENDPOINT --------------------
# -------------------- CRIMINAL MATCHING ENDPOINT --------------------
# --- Criminal Matcher Initialization ---import os

try:
    # ✅ Pass the REAL Supabase client inside your wrapper
    criminal_matcher = CriminalMatcher(supabase_client.supabase)
    logger.info("✅ Criminal matcher initialized successfully with Supabase (raw client)!")
except Exception as e:
    logger.error(f"❌ Failed to initialize CriminalMatcher: {e}")
    criminal_matcher = None





@app.route("/api/police/criminal-matching", methods=["POST"])
def match_criminals():
    """
    Matches an input case description with existing FIR records.
    Returns top relevant matches based on semantic similarity.
    """
    try:
        if not criminal_matcher:
            return jsonify({"success": False, "error": "Matcher not initialized"}), 500

        payload = request.get_json()
        description = payload.get("description", "").strip()

        if not description:
            return jsonify({"success": False, "error": "Missing case description"}), 400

        matches = criminal_matcher.find_similar_firs(description, top_n=5)
        return jsonify({"success": True, "matches": matches}), 200

    except Exception as e:
        logger.error(f"❌ Criminal matching error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500









# === LEGAL RESOURCES ===

@app.route('/api/police/legal/resources', methods=['GET'])
def get_legal_resources():
    """Get legal resources and references"""
    try:
        resource_type = request.args.get('type', 'all')  # ipc, procedures, templates
        
        resources = {
            'ipc_sections': [
                {'section': '279', 'title': 'Rash driving', 'penalty': '6 months or fine'},
                {'section': '302', 'title': 'Murder', 'penalty': 'Life imprisonment or death'},
                {'section': '379', 'title': 'Theft', 'penalty': '3 years or fine'},
                # ... more sections
            ],
            'procedures': [
                {'title': 'FIR Registration', 'steps': ['Verify complainant', 'Record statement', 'Register FIR']},
                {'title': 'Evidence Collection', 'steps': ['Secure scene', 'Collect evidence', 'Document chain of custody']},
            ],
            'templates': [
                {'name': 'Charge Sheet', 'type': 'document'},
                {'name': 'Search Warrant', 'type': 'request'},
                {'name': 'Bail Application', 'type': 'application'},
            ]
        }
        
        if resource_type == 'all':
            return jsonify({'success': True, 'resources': resources})
        else:
            return jsonify({'success': True, 'resources': resources.get(resource_type, [])})
            
    except Exception as e:
        logger.error(f"💥 Legal resources error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/fir/suggest-sections', methods=['POST'])
def suggest_sections():
    """Suggest IPC sections based on incident description"""
    try:
        data = request.json
        incident_description = data.get('incident_description', '').strip()
        
        if not incident_description:
            return jsonify({'success': False, 'error': 'Incident description required'}), 400
        
        if not fir_model:
            return jsonify({
                'success': False, 
                'error': 'FIR system not available'
            }), 500
        
        logger.info(f"🔍 Searching sections for: {incident_description[:100]}...")
        
        suggestions = fir_model.suggest_sections(incident_description)
        
        if suggestions:
            logger.info(f"✅ Found {len(suggestions)} sections")
            return jsonify({
                'success': True,
                'suggestions': suggestions,
                'source': 'rag'
            })
        else:
            # Fallback to Gemini
            logger.info("🤖 Using Gemini fallback")
            fallback_response = fir_model.gemini_fallback(incident_description)
            return jsonify({
                'success': True,
                'suggestions': [],
                'fallback_response': fallback_response,
                'source': 'gemini'
            })
            
    except Exception as e:
        logger.error(f"💥 Error in suggest-sections: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/fir/generate-pdf', methods=['POST'])
def generate_pdf():
    """Generate and save FIR PDF, store in Supabase"""
    try:
        data = request.json
        
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        # Generate unique FIR number
        fir_number = generate_fir_number()
        
        # Create FIR data structure with defaults
        fir_data = {
            'fir_number': fir_number,
            'timestamp': datetime.now().isoformat(),
            'police_station': data.get('police_station', 'Local Police Station'),
            'district': data.get('district', 'District'),
            'state': data.get('state', 'State'),
            'incident_details': {
                'type': data.get('incident_type', ''),
                'date': data.get('incident_date', ''),
                'time': data.get('incident_time', ''),
                'location': data.get('location', ''),
                'description': data.get('incident_description', '')
            },
            'victim_info': {
                'name': data.get('victim_name', ''),
                'contact': data.get('victim_contact', ''),
                'address': data.get('victim_address', ''),
                'age': data.get('victim_age', ''),
                'gender': data.get('victim_gender', '')
            },
            'accused_info': {
                'name': data.get('accused_name', ''),
                'description': data.get('accused_description', '')
            },
            'sections_applied': data.get('sections_applied', []),
            'investigating_officer': data.get('investigating_officer', 'Investigation Officer'),
            'additional_comments': data.get('additional_comments', '')
        }
        
        logger.info(f"📄 Generating FIR: {fir_number}")
        
        # Generate PDF
        pdf_path = generate_fir_pdf(fir_data)
        
        if not pdf_path or not os.path.exists(pdf_path):
            return jsonify({'success': False, 'error': 'Failed to generate PDF'}), 500
        
        # Store in Supabase if client is available
        db_storage_success = False
        if supabase_client:
            try:
                # Prepare data for Supabase storage
                supabase_data = {
                    'fir_number': fir_number,
                    'police_station': fir_data['police_station'],
                    'district': fir_data['district'],
                    'state': fir_data['state'],
                    'incident_type': fir_data['incident_details']['type'],
                    'incident_date': fir_data['incident_details']['date'],
                    'incident_time': fir_data['incident_details']['time'],
                    'incident_location': fir_data['incident_details']['location'],
                    'incident_description': fir_data['incident_details']['description'],
                    'victim_name': fir_data['victim_info']['name'],
                    'victim_contact': fir_data['victim_info']['contact'],
                    'victim_address': fir_data['victim_info']['address'],
                    'victim_age': fir_data['victim_info'].get('age'),
                    'victim_gender': fir_data['victim_info'].get('gender'),
                    'accused_name': fir_data['accused_info'].get('name'),
                    'accused_description': fir_data['accused_info'].get('description'),
                    'ipc_sections': json.dumps(fir_data['sections_applied']),
                    'investigating_officer': fir_data['investigating_officer'],
                    'additional_comments': fir_data['additional_comments'],
                    'pdf_path': pdf_path
                }
                
                storage_result = supabase_client.store_fir_record(supabase_data)
                db_storage_success = storage_result['success']
                
                if db_storage_success:
                    logger.info(f"✅ FIR stored in Supabase with ID: {storage_result.get('id')}")
                else:
                    logger.error(f"❌ Failed to store FIR in Supabase: {storage_result.get('error')}")
                    
            except Exception as db_error:
                logger.error(f"❌ Database storage error: {db_error}")
                db_storage_success = False
        
        return jsonify({
            'success': True,
            'fir_number': fir_number,
            'pdf_path': pdf_path,
            'download_url': f'/api/fir/download/{fir_number.replace("/", "_")}',
            'stored_in_db': db_storage_success,
            'db_error': not db_storage_success and supabase_client is not None,
            'message': 'FIR generated successfully' + (' and stored in database' if db_storage_success else '')
        })
        
    except Exception as e:
        logger.error(f"💥 Error generating PDF: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/fir/download/<fir_number>')
def download_fir(fir_number):
    """Download FIR PDF"""
    try:
        # Replace underscores with slashes for the actual file path
        actual_fir_number = fir_number.replace('_', '/')
        parts = actual_fir_number.split('/')
        
        if len(parts) < 4:
            return jsonify({'success': False, 'error': 'Invalid FIR number format'}), 400
        
        police_station, year, month, sequence = parts[0], parts[1], parts[2], parts[3]
        
        # Map month number to month name
        month_names = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December']
        try:
            month_int = int(month)
            month_name = month_names[month_int - 1] if 1 <= month_int <= 12 else f"Month_{month}"
        except:
            month_name = f"Month_{month}"
        
        pdf_path = f"fir_drafts/{year}/{month}_{month_name}/{fir_number}.pdf"
        
        logger.info(f"📥 Download request for: {pdf_path}")
        
        if os.path.exists(pdf_path):
            return send_file(pdf_path, as_attachment=True, download_name=f"FIR_{fir_number}.pdf")
        else:
            logger.error(f"❌ FIR not found: {pdf_path}")
            return jsonify({'success': False, 'error': 'FIR not found'}), 404
            
    except Exception as e:
        logger.error(f"💥 Download error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# NEW API ENDPOINTS FOR FIR RETRIEVAL AND SEARCH

@app.route('/api/fir/search', methods=['POST'])
def search_fir():
    """Search FIR records with various filters"""
    try:
        filters = request.json or {}
        
        if not supabase_client:
            return jsonify({
                'success': False, 
                'error': 'Database not available',
                'suggestion': 'Check Supabase configuration'
            }), 500
        
        logger.info(f"🔍 Searching FIR records with filters: {filters}")
        
        result = supabase_client.search_fir_records(filters)
        
        if result['success']:
            logger.info(f"✅ Found {len(result['data'])} FIR records")
            return jsonify({
                'success': True,
                'count': len(result['data']),
                'records': result['data'],
                'filters_applied': filters
            })
        else:
            logger.error(f"❌ Search error: {result['error']}")
            return jsonify({
                'success': False, 
                'error': result['error']
            }), 500
            
    except Exception as e:
        logger.error(f"💥 Search endpoint error: {e}")
        return jsonify({
            'success': False, 
            'error': str(e)
        }), 500

@app.route('/api/fir/<fir_number>')
def get_fir(fir_number):
    """Get specific FIR by FIR number"""
    try:
        if not supabase_client:
            return jsonify({
                'success': False, 
                'error': 'Database not available'
            }), 500
        
        logger.info(f"🔍 Fetching FIR: {fir_number}")
        
        result = supabase_client.get_fir_by_number(fir_number)
        
        if result['success']:
            logger.info(f"✅ FIR found: {fir_number}")
            return jsonify({
                'success': True, 
                'record': result['data']
            })
        else:
            logger.error(f"❌ FIR not found: {fir_number}")
            return jsonify({
                'success': False, 
                'error': result['error']
            }), 404
            
    except Exception as e:
        logger.error(f"💥 Get FIR error: {e}")
        return jsonify({
            'success': False, 
            'error': str(e)
        }), 500

@app.route('/api/fir/reports/monthly/<int:year>/<int:month>')
def get_monthly_report(year, month):
    """Get monthly FIR report"""
    try:
        if not supabase_client:
            return jsonify({
                'success': False, 
                'error': 'Database not available'
            }), 500
        
        logger.info(f"📊 Generating monthly report for {month}/{year}")
        
        result = supabase_client.get_monthly_report(year, month)
        
        if result['success']:
            logger.info(f"✅ Monthly report generated: {len(result['data'])} records")
            return jsonify({
                'success': True,
                'year': year,
                'month': month,
                'count': len(result['data']),
                'records': result['data']
            })
        else:
            logger.error(f"❌ Monthly report error: {result['error']}")
            return jsonify({
                'success': False, 
                'error': result['error']
            }), 500
            
    except Exception as e:
        logger.error(f"💥 Monthly report error: {e}")
        return jsonify({
            'success': False, 
            'error': str(e)
        }), 500

@app.route('/api/fir/statistics')
def get_statistics():
    """Get crime statistics and analytics"""
    try:
        start_date = request.args.get('start_date', '2024-01-01')
        end_date = request.args.get('end_date', datetime.now().strftime('%Y-%m-%d'))
        
        if not supabase_client:
            return jsonify({
                'success': False, 
                'error': 'Database not available'
            }), 500
        
        logger.info(f"📈 Generating statistics from {start_date} to {end_date}")
        
        result = supabase_client.get_crime_statistics(start_date, end_date)
        
        if result['success']:
            logger.info("✅ Statistics generated successfully")
            return jsonify({
                'success': True, 
                'statistics': result
            })
        else:
            logger.error(f"❌ Statistics error: {result['error']}")
            return jsonify({
                'success': False, 
                'error': result['error']
            }), 500
            
    except Exception as e:
        logger.error(f"💥 Statistics error: {e}")
        return jsonify({
            'success': False, 
            'error': str(e)
        }), 500

@app.route('/api/fir/list')
def list_fir():
    """Get paginated list of FIR records"""
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        
        if not supabase_client:
            return jsonify({
                'success': False, 
                'error': 'Database not available'
            }), 500
        
        # Calculate offset for pagination
        offset = (page - 1) * limit
        
        # Get total count
        count_response = supabase_client.supabase.table("fir_records")\
            .select("id", count="exact")\
            .execute()
        
        total_count = count_response.count or 0
        
        # Get paginated records
        response = supabase_client.supabase.table("fir_records")\
            .select("*")\
            .order("created_at", desc=True)\
            .range(offset, offset + limit - 1)\
            .execute()
        
        return jsonify({
            'success': True,
            'records': response.data,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total_count,
                'pages': (total_count + limit - 1) // limit
            }
        })
        
    except Exception as e:
        logger.error(f"💥 List FIR error: {e}")
        return jsonify({
            'success': False, 
            'error': str(e)
        }), 500

@app.route('/api/fir/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    db_status = "connected" if supabase_client else "disconnected"
    rag_status = "loaded" if fir_model else "failed"
    
    return jsonify({
        'status': 'healthy',
        'services': {
            'rag_model': rag_status,
            'supabase': db_status,
            'pdf_generator': 'operational'
        },
        'timestamp': datetime.now().isoformat(),
        'endpoints': {
            'suggest_sections': 'POST /api/fir/suggest-sections',
            'generate_pdf': 'POST /api/fir/generate-pdf',
            'search': 'POST /api/fir/search',
            'get_fir': 'GET /api/fir/<fir_number>',
            'monthly_report': 'GET /api/fir/reports/monthly/<year>/<month>',
            'statistics': 'GET /api/fir/statistics',
            'list': 'GET /api/fir/list'
        }
    })

def generate_fir_number():
    """Generate unique FIR number in format: PS/YYYY/MM/XXXX"""
    now = datetime.now()
    police_station_code = "PS"  # You can make this configurable
    year = now.year
    month = now.month
    
    # Count existing FIRs this month to generate sequential number
    month_names = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December']
    month_name = month_names[month - 1]
    month_dir = f"fir_drafts/{year}/{month:02d}_{month_name}"
    
    if os.path.exists(month_dir):
        existing_firs = len([f for f in os.listdir(month_dir) if f.endswith('.pdf')])
        sequence = existing_firs + 1
    else:
        sequence = 1
    
    return f"{police_station_code}/{year}/{month:02d}/{sequence:04d}"

@app.route('/api/police/dashboard/overview', methods=['GET'])
def get_dashboard_overview():
    """Get complete dashboard overview"""
    try:
        # Get various metrics
        today = datetime.now().strftime('%Y-%m-%d')
        
        # Today's cases
        today_cases = supabase_client.supabase.table("fir_records")\
            .select("id", count="exact")\
            .eq('incident_date', today)\
            .execute()
        
        # Pending cases
        pending_cases = supabase_client.supabase.table("fir_records")\
            .select("id", count="exact")\
            .is_('status', 'null')\
            .execute()
        
        # Recent updates
        recent_updates = supabase_client.supabase.table("fir_records")\
            .select("*")\
            .order('updated_at', desc=True)\
            .limit(5)\
            .execute()
        
        overview = {
            'today_cases': today_cases.count or 0,
            'pending_cases': pending_cases.count or 0,
            'total_cases': 0,  # You might want to calculate this
            'recent_activity': recent_updates.data if recent_updates.data else []
        }
        
        return jsonify({'success': True, 'overview': overview})
        
    except Exception as e:
        logger.error(f"💥 Dashboard overview error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500
    




# -------------------- CRIME ANALYTICS ENDPOINT --------------------
# -------------------- CRIME ANALYTICS ENDPOINT --------------------
# -------------------- CRIME ANALYTICS ENDPOINT --------------------
@app.route("/api/police/analytics", methods=["GET"])
def get_crime_analytics():
    """Return real analytics data from fir_records"""
    try:
        from collections import Counter

        time_range = request.args.get("range", "month")
        now = datetime.now(timezone.utc)

        if time_range == "week":
            start_date = now - timedelta(days=7)
        elif time_range == "year":
            start_date = now - timedelta(days=365)
        else:
            start_date = now - timedelta(days=30)

        # ✅ Use SupabaseFIRClient’s method correctly
        response = supabase_client.supabase.table("fir_records") \
            .select("*") \
            .gte("incident_date", start_date.isoformat()) \
            .execute()

        firs = response.data or []
        total_cases = len(firs)
        resolved = [f for f in firs if f.get("status", "").lower() == "resolved"]
        pending = [f for f in firs if f.get("status", "").lower() != "resolved"]

        resolution_rate = round((len(resolved) / total_cases * 100), 2) if total_cases else 0

        type_counts = Counter(f.get("incident_type", "Unknown") for f in firs)
        location_counts = Counter(f.get("location", "Unknown") for f in firs)

        analytics = {
            "total_cases": total_cases,
            "resolved_cases": len(resolved),
            "pending_cases": len(pending),
            "resolution_rate": resolution_rate,
            "crime_types": dict(type_counts),
            "hotspots": dict(location_counts.most_common(5)),
        }

        return jsonify({"success": True, "analytics": analytics})

    except Exception as e:
        app.logger.error(f"💥 Analytics error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500





if __name__ == '__main__':
    # Create directories if they don't exist
    os.makedirs('fir_drafts', exist_ok=True)
    os.makedirs('models', exist_ok=True)
    
    print("🚀 Starting FIR Drafting API with Supabase Integration...")
    print("📊 Available Endpoints:")
    print("   - POST   /api/fir/suggest-sections     - AI section suggestions")
    print("   - POST   /api/fir/generate-pdf         - Generate FIR PDF")
    print("   - GET    /api/fir/download/<fir_number> - Download FIR")
    print("   - POST   /api/fir/search               - Search FIR records")
    print("   - GET    /api/fir/<fir_number>         - Get specific FIR")
    print("   - GET    /api/fir/reports/monthly/<year>/<month> - Monthly reports")
    print("   - GET    /api/fir/statistics           - Crime statistics")
    print("   - GET    /api/fir/list                 - Paginated FIR list")
    print("   - GET    /api/fir/health               - Health check")
    print("")
    print("🔧 Service Status:")
    print(f"   - RAG Model: {'✅ Loaded' if fir_model else '❌ Failed'}")
    print(f"   - Supabase: {'✅ Connected' if supabase_client else '❌ Disconnected'}")
    print("")
    print("🌐 Server running on: http://localhost:5001")
    
    app.run(debug=True, port=5001, host='0.0.0.0')