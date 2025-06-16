# FastMac Development Environment Setup

🚀 **FastMac** is a web-based tool for macOS that generates custom installation scripts for development tools. Select the tools you need, and get a personalized bash script that installs everything with proper PATH configuration and error handling.

## Features

- ✅ **Smart Homebrew Setup**: Automatically installs Homebrew and configures PATH for both Intel and Apple Silicon Macs
- 🔧 **Xcode Command Line Tools**: Ensures essential build tools are installed
- 📦 **850+ Development Tools**: Comprehensive collection organized by category
- 🎯 **Dependency Resolution**: Automatically handles tool dependencies
- 💡 **Error Handling**: Robust error checking with informative messages
- 🌈 **Colorful Output**: Beautiful terminal output with status indicators
- 🔄 **Smart Detection**: Skips already installed tools

## Quick Start

### Option 1: Run with the startup script (Recommended)
```bash
./start.sh
```

### Option 2: Manual setup
```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the application
python run.py
```

Then open your browser to http://127.0.0.1:5000

## How It Works

1. **Select Tools**: Browse categories and select the development tools you need
2. **Generate Script**: Click "Generate Script" to create a custom installation script
3. **Download & Run**: Save the script and run it in your terminal

The generated script will:
- ✅ Check system compatibility (macOS only)
- ✅ Install Xcode Command Line Tools if needed
- ✅ Install/update Homebrew with proper PATH setup
- ✅ Install your selected tools with dependency resolution
- ✅ Handle both Intel and Apple Silicon Macs
- ✅ Provide detailed progress and error messages

## Tool Categories

- **🔤 Programming Languages**: Python, Node.js, Go, Rust, Java, Ruby, etc.
- **🐚 Shell & Terminal**: iTerm2, WezTerm, Zsh, Oh My Zsh, Starship, etc.  
- **✏️ Code Editors**: VS Code, Sublime Text, Neovim, LazyVim, etc.
- **🛠️ Development Tools**: Git, GitHub CLI, Docker, Kubernetes, etc.
- **☁️ Cloud Tools**: AWS CLI, Google Cloud SDK, Azure CLI, etc.
- **🗄️ Databases**: PostgreSQL, MySQL, MongoDB, Redis, etc.
- **🌐 Web Development**: Nginx, Apache, Postman, Insomnia, etc.
- **📱 Mobile Development**: Flutter, React Native, Android Studio, etc.
- **🎮 Gaming**: Steam, Discord, OBS Studio, etc.
- **🎨 Design**: Figma, Sketch, Adobe Creative Suite, etc.
- **📊 Productivity**: Notion, Obsidian, Alfred, Rectangle, etc.
- **🔐 Security**: 1Password, Bitwarden, Wireshark, etc.
- **💻 System**: CleanMyMac, DiskSight, Activity Monitor, etc.
- **🎵 Media**: VLC, Spotify, IINA, HandBrake, etc.

## Project Structure

```
FastMac/
├── run.py              # Main Flask application
├── tools.json          # Tool definitions and metadata
├── start.sh           # Startup script
├── requirements.txt   # Python dependencies
├── templates/         # HTML templates
│   ├── base.html     # Base template
│   └── index.html    # Main interface
├── Static/           # CSS and JavaScript assets
└── venv/            # Python virtual environment
```

## Configuration

### Adding New Tools

Edit `tools.json` to add new tools. Each tool should have:

```json
{
  "tool_id": {
    "name": "Tool Name",
    "description": "Tool description",
    "brew_package": "package-name",
    "check_command": "command --version",
    "cask": false,
    "requires": ["dependency1", "dependency2"],
    "pre_install": ["echo 'Pre-install command'"],
    "post_install": ["echo 'Post-install command'"]
  }
}
```

**Required fields:**
- `name`: Display name
- `description`: Tool description

**Optional fields:**
- `brew_package`: Homebrew package name (for standard installs)
- `check_command`: Command to verify installation
- `cask`: Set to `true` for GUI applications
- `requires`: Array of dependency tool IDs
- `type`: Set to `"custom"` for non-Homebrew installs
- `install_command`: Custom installation command (for type: "custom")
- `pre_install`: Commands to run before installation
- `post_install`: Commands to run after installation

## Script Features

The generated installation script includes:

### PATH Management
- Automatically detects Intel vs Apple Silicon Macs
- Sets up Homebrew PATH correctly for both architectures
- Exports PATH for immediate use during script execution

### Error Handling
- Exits on any command failure (`set -e`)
- Validates each installation step
- Provides clear error messages with color coding

### Progress Indicators
- 🚀 Script startup
- 🔍 System checks
- 📦 Tool installations
- ⚙️ Configuration steps
- 🎉 Completion message

### Smart Installation
- Skips already installed tools
- Handles dependencies automatically
- Supports both Homebrew and custom installations
- Provides installation verification

## Requirements

- **macOS**: This tool is designed specifically for macOS
- **Python 3.7+**: Required for running the Flask application
- **Internet Connection**: Required for downloading tools and dependencies

## Contributing

1. Fork the repository
2. Add your tools to `tools.json`
3. Test the generated script
4. Submit a pull request

## Troubleshooting

### Common Issues

**Script fails with "brew: command not found"**
- The script should handle this automatically, but you can manually add Homebrew to your PATH:
```bash
# For Apple Silicon Macs
export PATH="/opt/homebrew/bin:$PATH"

# For Intel Macs  
export PATH="/usr/local/bin:$PATH"
```

**Tool installation fails**
- Check if the tool is available in Homebrew: `brew search tool-name`
- Verify the tool configuration in `tools.json`
- Run the script with verbose output: `bash -x install_script.sh`

**Flask app won't start**
- Ensure Python 3 is installed: `python3 --version`
- Check virtual environment: `source venv/bin/activate`
- Install dependencies: `pip install -r requirements.txt`

## License

MIT License - feel free to use and modify as needed.

---

**Happy coding!** 🚀 