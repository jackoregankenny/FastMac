# admin.py
from functools import wraps
from flask import Blueprint, render_template, request, redirect, url_for, flash, session, jsonify
from firebase_admin import firestore
import os
from datetime import datetime

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

def login_required(f):
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
        if password == os.getenv('ADMIN_PASSWORD'):
            session['admin_logged_in'] = True
            return redirect(url_for('admin.dashboard'))
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
    
    # Fetch categories and filter out empty/None values
    for cat in db.collection('categories').stream():
        cat_data = cat.to_dict()
        if cat_data and cat_data.get('name'):  # Only add if category has data and name
            categories[cat.id] = cat_data
    
    # Fetch tools and filter out incomplete entries
    for tool in db.collection('tools').stream():
        tool_data = tool.to_dict()
        if tool_data and tool_data.get('name'):  # Only add if tool has data and name
            tool_data['id'] = tool.id
            tools.append(tool_data)
    
    return render_template('admin/dashboard.html', 
                         categories=categories, 
                         tools=tools)

@admin_bp.route('/tool/<tool_id>', methods=['GET'])
@login_required
def get_tool(tool_id):
    db = firestore.client()
    tool_doc = db.collection('tools').document(tool_id).get()
    if tool_doc.exists:
        tool_data = tool_doc.to_dict()
        tool_data['id'] = tool_id
        return jsonify(tool_data)
    return jsonify({'error': 'Tool not found'}), 404

@admin_bp.route('/category/<category_id>', methods=['GET'])
@login_required
def get_category(category_id):
    db = firestore.client()
    cat_doc = db.collection('categories').document(category_id).get()
    if cat_doc.exists:
        cat_data = cat_doc.to_dict()
        cat_data['id'] = category_id
        return jsonify(cat_data)
    return jsonify({'error': 'Category not found'}), 404

@admin_bp.route('/tool/save', methods=['POST'])
@login_required
def save_tool():
    db = firestore.client()
    tool_data = {
        'name': request.form.get('name'),
        'description': request.form.get('description'),
        'category': request.form.get('category'),
        'brew_package': request.form.get('brew_package'),
        'check_command': request.form.get('check_command'),
        'type': request.form.get('type', 'standard'),
        'cask': request.form.get('cask') == 'on',
        'install_command': request.form.get('install_command'),
        'pre_install': request.form.getlist('pre_install[]'),
        'post_install': request.form.getlist('post_install[]'),
        'requires': request.form.getlist('requires[]'),
        'updated_at': datetime.utcnow()
    }
    
    # Filter out empty arrays
    for key in ['pre_install', 'post_install', 'requires']:
        tool_data[key] = [x for x in tool_data[key] if x.strip()]
    
    tool_id = request.form.get('id')
    try:
        if tool_id:
            db.collection('tools').document(tool_id).update(tool_data)
        else:
            tool_data['created_at'] = datetime.utcnow()
            db.collection('tools').add(tool_data)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/category/save', methods=['POST'])
@login_required
def save_category():
    db = firestore.client()
    category_data = {
        'name': request.form.get('name'),
        'updated_at': datetime.utcnow()
    }
    
    category_id = request.form.get('id')
    try:
        if category_id:
            db.collection('categories').document(category_id).update(category_data)
        else:
            category_data['created_at'] = datetime.utcnow()
            db.collection('categories').add(category_data)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/tool/<tool_id>/delete', methods=['POST'])
@login_required
def delete_tool(tool_id):
    db = firestore.client()
    try:
        db.collection('tools').document(tool_id).delete()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/category/<category_id>/delete', methods=['POST'])
@login_required
def delete_category(category_id):
    db = firestore.client()
    try:
        # First check if any tools are using this category
        tools = db.collection('tools').where('category', '==', category_id).limit(1).get()
        if len(tools) > 0:
            return jsonify({'error': 'Cannot delete category that is in use by tools'}), 400
            
        db.collection('categories').document(category_id).delete()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500