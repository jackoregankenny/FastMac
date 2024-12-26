from flask import Flask, render_template, request, jsonify, send_from_directory
import json
import os

app = Flask(__name__)

def load_tools():
    """Load tools configuration from tools.json."""
    with open('tools.json') as f:
        return json.load(f)

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
    tools_data = load_tools()
    installed_tools = set()

    def add_tool_to_script(tool_id, category):
        """Add a tool and its dependencies to the script."""
        if tool_id in installed_tools:
            return

        tool = category['tools'][tool_id]

        # Handle dependencies first
        if tool.get('requires'):
            for dep_id in tool.get('requires'):
                for dep_category in tools_data.values():
                    if dep_id in dep_category['tools']:
                        add_tool_to_script(dep_id, dep_category)
                        break

        # Pre-install steps
        if tool.get('pre_install'):
            for cmd in tool['pre_install']:
                script_parts.append(f'''
msg "Preparing for {tool['name']}..."
{cmd}''')

        # Main installation
        if tool.get('type') != 'custom':
            install_type = 'install --cask' if tool.get('cask', False) else 'install'
            script_parts.append(f'''
msg "Installing {tool['name']}..."
if ! command -v {tool_id} >/dev/null 2>&1; then
    brew {install_type} {tool['brew_package']}
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
        for category in tools_data.values():
            if tool_id in category['tools']:
                add_tool_to_script(tool_id, category)
                break

    script_parts.append('\nsuccess "✅ Installation complete!"')
    return '\n'.join(script_parts)

@app.route('/')
def index():
    """Render the main page."""
    return render_template('index.html', categories=load_tools())

@app.route('/static/tools.json')
def serve_tools():
    """Serve the tools.json file."""
    return send_from_directory('.', 'tools.json')

@app.route('/generate', methods=['POST'])
def generate():
    """Generate the installation script based on selected tools."""
    try:
        selected_tools = request.json
        if not selected_tools:
            print("No tools were selected")
            return jsonify({'error': 'No tools selected'}), 400

        print(f"Selected tools: {selected_tools}")  # Debug log

        try:
            tools_data = load_tools()
            print(f"Loaded tools data with categories: {list(tools_data.keys())}")  # Debug log
        except Exception as e:
            print(f"Error loading tools.json: {str(e)}")
            return jsonify({'error': 'Error loading tools configuration'}), 500

        script = generate_script(selected_tools)
        print("Script generated successfully")  # Debug log

        return jsonify({'script': script})
    except Exception as e:
        import traceback
        print(f"Error generating script: {str(e)}")
        print("Full traceback:")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
