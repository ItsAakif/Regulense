"""
WSGI entry point for production deployment
"""
import os
from api.main import create_app

# Create the Flask application instance
app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)