# admin.py
from functools import wraps
from flask import Blueprint, render_template, request, redirect, url_for, flash, session, current_app
from werkzeug.security import generate_password_hash, check_password_hash
import firebase_admin
from firebase_admin import firestore
import os
from datetime import datetime
import logging
from dotenv import load_dotenv

# Configure logging
logger = logging.getLogger(__name__)
load_dotenv() 

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

def get_admin_password():
    """Get admin password from environment variables with fallback for testing"""
    print(f"Current working directory: {os.getcwd()}")
    print(f"Looking for .env file at: {os.path.join(os.getcwd(), '.env')}")
    print(f"Does .env file exist? {os.path.exists(os.path.join(os.getcwd(), '.env'))}")
    return os.getenv('ADMIN_PASSWORD')


ADMIN_PASSWORD = get_admin_password()
def login_required(f):
    """Decorator to require login for admin routes"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('admin_logged_in'):
            return redirect(url_for('admin.login'))
        return f(*args, **kwargs)
    return decorated_function

@admin_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        password = request.form.get('password')
        # Debug output for development
        logger.info(f"Attempting login with password: {password}")
        logger.info(f"Expected password from env: {ADMIN_PASSWORD}")
        
        if password == ADMIN_PASSWORD:
            session['admin_logged_in'] = True
            logger.info("Login successful")
            return redirect(url_for('admin.dashboard'))
        
        logger.warning("Login attempt failed")
        flash('Invalid password', 'error')
    return render_template('admin/login.html')

@admin_bp.route('/logout')
def logout():
    session.pop('admin_logged_in', None)
    return redirect(url_for('admin.login'))

@admin_bp.route('/')
@login_required
def dashboard():
    db = firestore.client()
    categories = {}
    tools = []
    
    # Fetch categories
    for cat in db.collection('categories').stream():
        categories[cat.id] = cat.to_dict()
    
    # Fetch tools
    for tool in db.collection('tools').stream():
        tool_data = tool.to_dict()
        tool_data['id'] = tool.id
        tool_data['category_name'] = categories.get(tool_data.get('category', ''), {}).get('name', 'Unknown')
        tools.append(tool_data)
    
    return render_template('admin/dashboard.html', 
                         categories=categories, 
                         tools=tools)

@admin_bp.route('/tool/new', methods=['GET', 'POST'])
@login_required
def new_tool():
    db = firestore.client()
    if request.method == 'POST':
        tool_data = {
            'name': request.form.get('name'),
            'description': request.form.get('description'),
            'category': request.form.get('category'),
            'brew_package': request.form.get('brew_package'),
            'check_command': request.form.get('check_command'),
            'type': request.form.get('type', 'standard'),
            'cask': request.form.get('cask') == 'on',
            'requires': request.form.getlist('requires'),
            'install_command': request.form.get('install_command'),
            'pre_install': request.form.getlist('pre_install'),
            'post_install': request.form.getlist('post_install'),
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        
        db.collection('tools').add(tool_data)
        flash('Tool added successfully', 'success')
        return redirect(url_for('admin.dashboard'))
    
    # Get categories for the form
    categories = {}
    for cat in db.collection('categories').stream():
        categories[cat.id] = cat.to_dict()
    
    return render_template('admin/tool_form.html', 
                         categories=categories,
                         tool=None)

@admin_bp.route('/tool/edit/<tool_id>', methods=['GET', 'POST'])
@login_required
def edit_tool(tool_id):
    db = firestore.client()
    tool_ref = db.collection('tools').document(tool_id)
    
    if request.method == 'POST':
        tool_data = {
            'name': request.form.get('name'),
            'description': request.form.get('description'),
            'category': request.form.get('category'),
            'brew_package': request.form.get('brew_package'),
            'check_command': request.form.get('check_command'),
            'type': request.form.get('type', 'standard'),
            'cask': request.form.get('cask') == 'on',
            'requires': request.form.getlist('requires'),
            'install_command': request.form.get('install_command'),
            'pre_install': request.form.getlist('pre_install'),
            'post_install': request.form.getlist('post_install'),
            'updated_at': datetime.utcnow()
        }
        
        tool_ref.update(tool_data)
        flash('Tool updated successfully', 'success')
        return redirect(url_for('admin.dashboard'))
    
    tool = tool_ref.get()
    if not tool.exists:
        flash('Tool not found', 'error')
        return redirect(url_for('admin.dashboard'))
    
    # Get categories for the form
    categories = {}
    for cat in db.collection('categories').stream():
        categories[cat.id] = cat.to_dict()
    
    tool_data = tool.to_dict()
    tool_data['id'] = tool.id
    
    return render_template('admin/tool_form.html',
                         categories=categories,
                         tool=tool_data)

@admin_bp.route('/tool/delete/<tool_id>', methods=['POST'])
@login_required
def delete_tool(tool_id):
    db = firestore.client()
    db.collection('tools').document(tool_id).delete()
    flash('Tool deleted successfully', 'success')
    return redirect(url_for('admin.dashboard'))

@admin_bp.route('/category/new', methods=['GET', 'POST'])
@login_required
def new_category():
    if request.method == 'POST':
        db = firestore.client()
        category_data = {
            'name': request.form.get('name'),
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        
        db.collection('categories').add(category_data)
        flash('Category added successfully', 'success')
        return redirect(url_for('admin.dashboard'))
    
    return render_template('admin/category_form.html')

@admin_bp.route('/category/edit/<category_id>', methods=['GET', 'POST'])
@login_required
def edit_category(category_id):
    db = firestore.client()
    category_ref = db.collection('categories').document(category_id)
    
    if request.method == 'POST':
        category_data = {
            'name': request.form.get('name'),
            'updated_at': datetime.utcnow()
        }
        
        category_ref.update(category_data)
        flash('Category updated successfully', 'success')
        return redirect(url_for('admin.dashboard'))
    
    category = category_ref.get()
    if not category.exists:
        flash('Category not found', 'error')
        return redirect(url_for('admin.dashboard'))
    
    category_data = category.to_dict()
    category_data['id'] = category.id
    
    return render_template('admin/category_form.html',
                         category=category_data)