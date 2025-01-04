from flask import Flask, render_template, request, jsonify, send_from_directory, current_app
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv
import json
import os
import traceback
import logging
from functools import wraps
import time
from admin import admin_bp
import secrets
import base64

app = Flask(__name__,
    template_folder="templates",
    static_folder='static'  # Keep it simple, don't specify static_url_path
)

app.secret_key = os.getenv('FLASK_SECRET_KEY', secrets.token_hex(32))
app.config['SESSION_TYPE'] = 'filesystem'
app.register_blueprint(admin_bp)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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

def initialize_firebase():
    """Initialize Firebase with base64 encoded credentials"""
    max_retries = 3
    retry_delay = 2
    
    for attempt in range(max_retries):
        try:
            credentials_json = base64.b64decode(os.getenv("FIREBASE_CREDENTIALS_BASE64")).decode('utf-8')
            cred_dict = json.loads(credentials_json)
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred, {
                'projectId': cred_dict['project_id'],
            })
            return firestore.client()
        except Exception as e:
            if attempt == max_retries - 1:
                logger.error(f"Failed to initialize Firebase after {max_retries} attempts: {str(e)}")
                raise
            logger.warning(f"Firebase initialization attempt {attempt + 1} failed, retrying...")
            time.sleep(retry_delay)

def get_base_script():
    """Return the base installation script with setup code."""
    return '''#!/bin/bash
# Exit on error
set -e

# Setup terminal colors
setup_colors() {
  if [[ -t 2 ]] && [[ -z "${NO_COLOR-}" ]] && [[ "${TERM-}" != "dumb" ]]; then
    NOFORMAT='\\033[0m'
    RED='\\033[0;31m'
    GREEN='\\033[0;32m'
    YELLOW='\\033[1;33m'
  else
    NOFORMAT=''
    RED=''
    GREEN=''
    YELLOW=''
  fi
}

msg() {
  echo "${YELLOW}$1${NOFORMAT}"
}

success() {
  echo "${GREEN}$1${NOFORMAT}"
}

error() {
  echo "${RED}$1${NOFORMAT}"
}

setup_colors

msg "🔍 Checking system..."

# OS check
if [[ "$OSTYPE" != "darwin"* ]]; then
    error "❌ This script is only for macOS"
    exit 1
fi

# Homebrew installation
if ! command -v brew >/dev/null 2>&1; then
    msg "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

    # Add to PATH for Apple Silicon Macs
    if [[ -f /opt/homebrew/bin/brew ]]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
else
    msg "Updating Homebrew..."
    brew update
fi
'''

def generate_script(selected_tools):
    """Generate the complete installation script."""
    script_parts = [get_base_script()]
    installed_tools = set()

    try:
        # Get all tools data from Firestore
        tools_data = {}
        categories_ref = db.collection('categories').stream()
        for cat_doc in categories_ref:
            tools_data[cat_doc.id] = {
                'name': cat_doc.to_dict()['name'],
                'tools': {}
            }
        
        tools_ref = db.collection('tools').stream()
        for tool_doc in tools_ref:
            tool_data = tool_doc.to_dict()
            category_id = tool_data.get('category')
            if category_id in tools_data:
                tools_data[category_id]['tools'][tool_doc.id] = tool_data

    except Exception as e:
        logger.error(f"Error fetching from Firebase: {str(e)}")
        # Fallback to JSON file if Firebase fails
        try:
            with open('tools.json') as f:
                tools_data = json.load(f)
        except Exception as json_e:
            logger.error(f"Error loading tools.json: {str(json_e)}")
            raise

    def add_tool_to_script(tool_id):
        """Add a tool and its dependencies to the script."""
        if tool_id in installed_tools:
            return

        # Find the tool in our categories
        tool = None
        for cat_data in tools_data.values():
            if tool_id in cat_data['tools']:
                tool = cat_data['tools'][tool_id]
                break

        if not tool:
            logger.warning(f"Tool {tool_id} not found in database")
            return

        # Handle dependencies first
        if tool.get('requires'):
            for dep_id in tool['requires']:
                add_tool_to_script(dep_id)

        # Pre-install steps
        if tool.get('pre_install'):
            for cmd in tool['pre_install']:
                script_parts.append(f'''
msg "Preparing for {tool['name']}..."
{cmd}''')

        # Main installation
        if tool.get('type') != 'custom':
            install_type = 'install --cask' if tool.get('cask', False) else 'install'
            package_name = tool.get('brew_package', tool_id)
            check_command = tool.get('check_command', tool_id)
            
            script_parts.append(f'''
msg "Installing {tool['name']}..."
if ! command -v {check_command} >/dev/null 2>&1; then
    brew {install_type} {package_name}
else
    success "{tool['name']} is already installed"
fi''')
        else:
            script_parts.append(f'''
msg "Installing {tool['name']}..."
{tool['install_command']}''')

        # Post-install steps
        if tool.get('post_install'):
            for cmd in tool['post_install']:
                script_parts.append(f'''
msg "Configuring {tool['name']}..."
{cmd}''')

        installed_tools.add(tool_id)

    # Process all selected tools
    for tool_id in selected_tools:
        add_tool_to_script(tool_id)

    script_parts.append('\nsuccess "✅ Installation complete!"')
    return '\n'.join(script_parts)

@app.route('/')
@handle_errors
def index():
    try:
        static_folder = app.static_folder
        static_url = app.static_url_path
        logger.info(f"Static folder: {static_folder}")
        logger.info(f"Static URL path: {static_url}")
        logger.info(f"Static folder exists: {os.path.exists(static_folder)}")
        if os.path.exists(static_folder):
            logger.info(f"Static folder contents: {os.listdir(static_folder)}")
        categories = {}
        tools_by_category = {}
        
        try:
            # Try Firebase first
            categories_ref = db.collection('categories').stream()
            for cat_doc in categories_ref:
                cat_data = cat_doc.to_dict()
                categories[cat_doc.id] = {
                    'id': cat_doc.id,
                    'name': cat_data.get('name', 'Unnamed Category'),
                    'tools': {}
                }
                tools_by_category[cat_doc.id] = 0

            tools_ref = db.collection('tools').stream()
            for tool_doc in tools_ref:
                tool_data = tool_doc.to_dict()
                category_id = tool_data.get('category')
                
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
        except Exception as firebase_e:
            logger.error(f"Firebase error: {str(firebase_e)}")
            # Fallback to JSON file
            with open('tools.json') as f:
                categories = json.load(f)
                tools_by_category = {cat_id: len(cat_data['tools']) 
                                   for cat_id, cat_data in categories.items()}

        # Remove empty categories
        categories = {k: v for k, v in categories.items() if tools_by_category[k] > 0}
        
        logger.info(f"Loaded {len(categories)} categories with tools")
        return render_template('index.html', 
                             categories=categories,
                             tools_by_category=tools_by_category)
                             
    except Exception as e:
        logger.error(f"Error loading categories: {str(e)}\n{traceback.format_exc()}")
        return render_template('index.html', categories={}, tools_by_category={})
    
    

@app.route('/generate', methods=['POST'])
@handle_errors
def generate():
    """Generate the installation script based on selected tools."""
    selected_tools = request.json
    
    if not selected_tools:
        logger.warning("No tools selected")
        return jsonify({'error': 'No tools selected'}), 400
    
    logger.info(f"Generating script for tools: {selected_tools}")
    try:
        script = generate_script(selected_tools)
        return jsonify({'script': script})
    except Exception as e:
        logger.error(f"Error generating script: {str(e)}\n{traceback.format_exc()}")
        return jsonify({'error': 'Failed to generate script'}), 500

