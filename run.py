from flask import Flask, render_template, request, jsonify, send_from_directory
import json
import os

app = Flask(__name__)

def load_tools():
    """Load tools configuration from tools.json."""
    try:
        with open('tools.json', 'r', encoding='utf-8') as f:
            tools_data = json.load(f)
        
        # Validate the tools data structure
        if not isinstance(tools_data, dict):
            raise ValueError("tools.json must contain a JSON object")
        
        return tools_data
    except FileNotFoundError:
        raise FileNotFoundError("tools.json file not found")
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON in tools.json: {e}")
    except Exception as e:
        raise Exception(f"Error loading tools.json: {e}")

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
    BLUE='\\033[0;34m'
  else
    NOFORMAT=''
    RED=''
    GREEN=''
    YELLOW=''
    BLUE=''
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

info() {
  echo "${BLUE}$1${NOFORMAT}"
}

setup_colors

msg "🚀 FastMac Development Environment Setup"
info "This script will install your selected development tools"
echo ""

msg "🔍 Checking system..."

# OS check
if [[ "$OSTYPE" != "darwin"* ]]; then
    error "❌ This script is only for macOS"
    exit 1
fi

# Check for Xcode Command Line Tools
msg "🔍 Checking for Xcode Command Line Tools..."
if ! xcode-select -p >/dev/null 2>&1; then
    msg "📱 Installing Xcode Command Line Tools..."
    xcode-select --install
    
    # Wait for installation to complete
    msg "⏳ Waiting for Xcode Command Line Tools installation to complete..."
    msg "   Please follow the prompts in the installation dialog."
    until xcode-select -p >/dev/null 2>&1; do
        sleep 5
    done
    success "✅ Xcode Command Line Tools installed"
else
    success "✅ Xcode Command Line Tools already installed"
fi

# Function to setup brew PATH
setup_brew_path() {
    if [[ -f /opt/homebrew/bin/brew ]]; then
        # Apple Silicon Mac
        eval "$(/opt/homebrew/bin/brew shellenv)"
        export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:$PATH"
        export HOMEBREW_PREFIX="/opt/homebrew"
    elif [[ -f /usr/local/bin/brew ]]; then
        # Intel Mac
        eval "$(/usr/local/bin/brew shellenv)"
        export PATH="/usr/local/bin:/usr/local/sbin:$PATH"
        export HOMEBREW_PREFIX="/usr/local"
    fi
    
    # Add to shell profile for persistence
    if [[ -f ~/.zshrc ]]; then
        if ! grep -q "HOMEBREW_PREFIX" ~/.zshrc; then
            echo 'export HOMEBREW_PREFIX="$(brew --prefix)"' >> ~/.zshrc
            echo 'export PATH="$HOMEBREW_PREFIX/bin:$HOMEBREW_PREFIX/sbin:$PATH"' >> ~/.zshrc
        fi
    fi
    
    if [[ -f ~/.bash_profile ]]; then
        if ! grep -q "HOMEBREW_PREFIX" ~/.bash_profile; then
            echo 'export HOMEBREW_PREFIX="$(brew --prefix)"' >> ~/.bash_profile
            echo 'export PATH="$HOMEBREW_PREFIX/bin:$HOMEBREW_PREFIX/sbin:$PATH"' >> ~/.bash_profile
        fi
    fi
}

# Homebrew installation and PATH setup
if ! command -v brew >/dev/null 2>&1; then
    msg "📦 Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Setup brew PATH immediately after installation
    setup_brew_path
    
    # Verify installation
    if command -v brew >/dev/null 2>&1; then
        success "✅ Homebrew installed successfully"
    else
        error "❌ Homebrew installation failed"
        exit 1
    fi
else
    success "✅ Homebrew already installed"
    # Ensure brew is in PATH
    setup_brew_path
fi

# Update Homebrew and upgrade existing packages
msg "🔄 Updating Homebrew..."
brew update && brew upgrade

msg "🔧 Installing selected tools..."
echo ""
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
            script_parts.append(f'''
msg "🔧 Preparing for {tool['name']}..."''')
            for cmd in tool['pre_install']:
                script_parts.append(f'''
if {cmd}; then
    info "   ✅ Pre-install step completed"
else
    error "   ❌ Pre-install step failed: {cmd}"
    exit 1
fi''')

        # Main installation
        if tool.get('type') != 'custom':
            install_type = 'install --cask' if tool.get('cask', False) else 'install'
            check_cmd = tool.get('check_command', f'command -v {tool_id}')
            script_parts.append(f'''
msg "📦 Installing {tool['name']}..."
info "   {tool.get('description', '')}"
if {check_cmd} >/dev/null 2>&1; then
    success "✅ {tool['name']} is already installed"
else
    if brew {install_type} {tool['brew_package']}; then
        success "✅ {tool['name']} installed successfully"
    else
        error "❌ Failed to install {tool['name']}"
        exit 1
    fi
fi''')
        else:
            check_cmd = tool.get('check_command', 'false')
            script_parts.append(f'''
msg "📦 Installing {tool['name']} (custom installation)..."
info "   {tool.get('description', '')}"
if {check_cmd} >/dev/null 2>&1; then
    success "✅ {tool['name']} is already installed"
else
    if {tool['install_command']}; then
        success "✅ {tool['name']} installed successfully"
    else
        error "❌ Failed to install {tool['name']}"
        exit 1
    fi
fi''')

        # Post-install steps
        if tool.get('post_install'):
            script_parts.append(f'''
msg "⚙️  Configuring {tool['name']}..."''')
            for cmd in tool['post_install']:
                script_parts.append(f'''
if {cmd}; then
    info "   ✅ Configuration step completed"
else
    error "   ❌ Configuration step failed: {cmd}"
    exit 1
fi''')

        installed_tools.add(tool_id)

    # Process all selected tools
    for tool_id in selected_tools:
        for category in tools_data.values():
            if tool_id in category['tools']:
                add_tool_to_script(tool_id, category)
                break

    script_parts.append('''
echo ""
success "🎉 Installation complete!"
info "All selected tools have been installed successfully."
echo ""
msg "🔄 Please restart your terminal or run 'source ~/.zshrc' to ensure all PATH changes take effect."
echo ""
info "Happy coding! 🚀"
''')
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
    app.run(debug=True, port=5000)
