# FastMac - macOS Development Environment Setup Tool

A web-based tool for generating customized installation scripts to set up development environments on macOS.

## Features

- Web interface for selecting development tools
- Automatic dependency resolution
- Generates optimized bash scripts for macOS
- Supports Homebrew packages and custom installations

## Deployment Options

### Coolify Deployment

1. **Connect your repository** to Coolify
2. **Set environment variables**:
   - `SECRET_KEY`: A secure random string for Flask sessions
   - `FLASK_DEBUG`: Set to `false` for production
   - `PORT`: Usually set automatically by Coolify

3. **Build settings**:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn run:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120`

### Docker Deployment

```bash
# Build the image
docker build -t fastmac .

# Run the container
docker run -p 5000:5000 -e SECRET_KEY=your-secret-key fastmac
```

### Heroku Deployment

```bash
# Install Heroku CLI and login
heroku login

# Create app
heroku create your-app-name

# Set environment variables
heroku config:set SECRET_KEY=your-secret-key
heroku config:set FLASK_DEBUG=false

# Deploy
git push heroku main
```

### Local Development

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export FLASK_DEBUG=true
export SECRET_KEY=dev-secret-key

# Run the application
python run.py
```

## Environment Variables

- `SECRET_KEY`: Flask secret key for session management
- `FLASK_DEBUG`: Enable/disable debug mode (true/false)
- `PORT`: Port to run the application on (default: 5000)

## Project Structure

```
FastMac/
├── run.py              # Main Flask application
├── wsgi.py             # WSGI entry point
├── requirements.txt    # Python dependencies
├── Procfile           # Process file for deployment
├── runtime.txt        # Python version specification
├── Dockerfile         # Docker configuration
├── tools.json         # Tool definitions and configurations
├── static/            # Static assets (CSS, JS)
└── templates/         # HTML templates
```

## Security Notes

- Always set a strong `SECRET_KEY` in production
- Disable debug mode in production environments
- The application is designed for internal use and doesn't handle sensitive data

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License. 