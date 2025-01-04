from flask import Flask, render_template, request, jsonify, current_app
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv
import os
import traceback
import logging
from functools import wraps
import time
from admin import admin_bp  # Import the admin blueprint
import secrets

# After creating the Flask app
app = Flask(__name__)
app.secret_key = os.getenv('FLASK_SECRET_KEY', secrets.token_hex(32))
app.config['SESSION_TYPE'] = 'filesystem'

# Register the admin blueprint
app.register_blueprint(admin_bp)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def initialize_firebase():
    """Initialize Firebase with retry mechanism and return Firestore client"""
    max_retries = 3
    retry_delay = 2  # seconds
    
    for attempt in range(max_retries):
        try:
            # Check if Firebase is already initialized
            if not firebase_admin._apps:
                # Initialize Firebase with credentials
                cred = credentials.Certificate({
                    "type": "service_account",
                    "project_id": "fastmac-98ba2",
                    "private_key_id": os.getenv("FIREBASE_PRIVATE_KEY_ID"),
                    "private_key": os.getenv("FIREBASE_PRIVATE_KEY").replace('\\n', '\n'),
                    "client_email": os.getenv("FIREBASE_CLIENT_EMAIL"),
                    "client_id": os.getenv("FIREBASE_CLIENT_ID"),
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                    "client_x509_cert_url": os.getenv("FIREBASE_CLIENT_CERT_URL")
                })
                
                firebase_admin.initialize_app(cred, {
                    'projectId': 'fastmac-98ba2',
                })
            
            # Always return a new Firestore client
            return firestore.client()
            
        except Exception as e:
            if attempt == max_retries - 1:
                logger.error(f"Failed to initialize Firebase after {max_retries} attempts: {str(e)}")
                raise
            logger.warning(f"Firebase initialization attempt {attempt + 1} failed, retrying...")
            time.sleep(retry_delay)

def handle_errors(f):
    """Decorator to handle errors consistently across routes"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception as e:
            logger.error(f"Error in {f.__name__}: {str(e)}\n{traceback.format_exc()}")
            return jsonify({
                'error': 'An unexpected error occurred',
                'details': str(e) if app.debug else 'Please try again later'
            }), 500
    return decorated_function

class FirestoreCache:
    """Simple cache for Firestore data"""
    def __init__(self, timeout=300):  # 5 minutes timeout
        self.cache = {}
        self.timeout = timeout
        self.timestamps = {}

    def get(self, key):
        if key in self.cache:
            if time.time() - self.timestamps[key] < self.timeout:
                return self.cache[key]
            else:
                del self.cache[key]
                del self.timestamps[key]
        return None

    def set(self, key, value):
        self.cache[key] = value
        self.timestamps[key] = time.time()

# Initialize cache
cache = FirestoreCache()

def get_base_script():
    """Return the base installation script with setup code."""
    # Previous implementation remains the same
    pass

@app.route('/')
@handle_errors
def index():
    try:
        categories = {}
        tools_by_category = {}
        
        # First, get all categories and create the basic structure
        categories_ref = db.collection('categories').stream()
        for cat_doc in categories_ref:
            cat_data = cat_doc.to_dict()
            categories[cat_doc.id] = {
                'id': cat_doc.id,  # Add ID to make it accessible in templates
                'name': cat_data.get('name', 'Unnamed Category'),
                'tools': {}
            }
            tools_by_category[cat_doc.id] = 0  # Initialize counter

        # Then get all tools and organize them
        tools_ref = db.collection('tools').stream()
        for tool_doc in tools_ref:
            tool_data = tool_doc.to_dict()
            category_id = tool_data.get('category')
            
            # Only process tools that have a valid category
            if category_id and category_id in categories:
                tools_by_category[category_id] += 1
                categories[category_id]['tools'][tool_doc.id] = {
                    'id': tool_doc.id,
                    'name': tool_data.get('name', 'Unnamed Tool'),
                    'description': tool_data.get('description', ''),
                    'brew_package': tool_data.get('brew_package', ''),
                    'check_command': tool_data.get('check_command', ''),
                    'type': tool_data.get('type', 'standard'),
                    'cask': tool_data.get('cask', False),
                    'requires': tool_data.get('requires', []),
                    'install_command': tool_data.get('install_command', ''),
                    'pre_install': tool_data.get('pre_install', []),
                    'post_install': tool_data.get('post_install', [])
                }

        # Remove any empty categories (optional)
        categories = {k: v for k, v in categories.items() if tools_by_category[k] > 0}
        
        print(f"Loaded {len(categories)} categories with tools")
        return render_template('index.html', 
                             categories=categories,
                             tools_by_category=tools_by_category)
                             
    except Exception as e:
        print(f"Error loading categories: {str(e)}")
        print(traceback.format_exc())
        return render_template('index.html', categories={}, tools_by_category={})


@app.route('/api/categories')
def get_categories():
    try:
        categories = []
        categories_ref = db.collection('categories').stream()
        for cat_doc in categories_ref:
            cat_data = cat_doc.to_dict()
            categories.append({
                'id': cat_doc.id,
                'name': cat_data.get('name', 'Unnamed Category')
            })
        return jsonify({'categories': categories})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/generate', methods=['POST'])
@handle_errors
def generate():
    """Generate the installation script based on selected tools."""
    selected_tools = request.json
    
    if not selected_tools:
        return jsonify({'error': 'No tools selected'}), 400
    
    logger.info(f"Generating script for tools: {selected_tools}")
    script = generate_script(selected_tools)
    
    return jsonify({'script': script})

@app.errorhandler(404)
def not_found_error(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

@app.route('/admin/categories/save', methods=['POST'])
def save_category():
    try:
        data = request.get_json()
        # If editing existing category
        if data.get('id'):
            doc_ref = db.collection('categories').document(data['id'])
            doc_ref.update({
                'name': data['name']
            })
        # If creating new category
        else:
            db.collection('categories').add({
                'name': data['name']
            })
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/admin/tools/save', methods=['POST'])
def save_tool():
    try:
        form_data = request.form.to_dict()
        # Handle array fields
        form_data['requires'] = request.form.getlist('requires')
        form_data['pre_install'] = request.form.getlist('pre_install')
        form_data['post_install'] = request.form.getlist('post_install')
        form_data['cask'] = 'cask' in request.form
        
        # If editing existing tool
        if form_data.get('id'):
            doc_ref = db.collection('tools').document(form_data['id'])
            doc_ref.update(form_data)
        # If creating new tool
        else:
            db.collection('tools').add(form_data)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/admin/tools/draft', methods=['POST'])
def save_tool_draft():
    try:
        # Here you could implement draft saving logic
        # For example, storing in a separate drafts collection
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    debug_mode = os.getenv('FLASK_ENV') == 'development'
    
    # Configure logging based on environment
    if debug_mode:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Initialize Firebase on startup
    try:
        db = initialize_firebase()
        logger.info("Firebase initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Firebase: {str(e)}")
        exit(1)
    
    app.run(host='0.0.0.0', port=5000, debug=debug_mode)