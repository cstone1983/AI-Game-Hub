#!/bin/bash

# --- Master Hub & Infinity Platform Deployment Script ---
# Targeted for Ubuntu 22.04/24.04 Server

set -e # Exit on error

echo "--- Initializing Infinity Platform Setup ---"

# 1. Update System
sudo apt update && sudo apt upgrade -y

# 2. Install Core Dependencies
sudo apt install -y python3-venv python3-pip git nginx ufw sqlite3

# 3. Configure Firewall
echo "--- Configuring Firewall ---"
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3000
sudo ufw --force enable

# 4. Repository Setup
# Assuming current directory is where code should live
PROJECT_DIR=$(pwd)
echo "Project Directory: $PROJECT_DIR"

# 5. Python Environment Setup
echo "--- Setting up Python Virtual Environment ---"
python3 -m venv venv
source venv/bin/activate
pip install flask gunicorn flask-cors

# 6. Database Initialization
echo "--- Initializing Database ---"
python3 python_hub/hub_backend.py # This will run init_db() inside

# 7. Create Systemd Service for Hub
echo "--- Creating Systemd Service ---"
sudo bash -c "cat > /etc/systemd/system/infinity-hub.service <<EOF
[Unit]
Description=Gunicorn instance to serve Infinity Master Hub
After=network.target

[Service]
User=\$USER
Group=www-data
WorkingDirectory=$PROJECT_DIR
Environment=\"PATH=$PROJECT_DIR/venv/bin\"
ExecStart=$PROJECT_DIR/venv/bin/gunicorn --workers 3 --bind 0.0.0.0:5000 python_hub.hub_backend:app

[Install]
WantedBy=multi-user.target
EOF"

sudo systemctl start infinity-hub
sudo systemctl enable infinity-hub

# 8. Nginx Reverse Proxy Setup
echo "--- Configuring Nginx ---"
sudo bash -c "cat > /etc/nginx/sites-available/infinity <<EOF
server {
    listen 80;
    server_name _;

    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    location / {
        root $PROJECT_DIR/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }
}
EOF"

sudo ln -s /etc/nginx/sites-available/infinity /etc/nginx/sites-enabled/ || true
sudo rm -f /etc/nginx/sites-enabled/default
sudo systemctl restart nginx

echo "--- Setup Complete! ---"
echo "Hub API is running on port 5000 (proxied via 80/api)."
echo "Visit your server IP to view the Platform Hub."
