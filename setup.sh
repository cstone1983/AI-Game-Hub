#!/bin/bash
set -e

# Infinity Platform Ubuntu Setup Script
# Run this on a fresh Ubuntu LTS Instance to set up the Hub & Updater

echo "================================================="
echo " Starting Infinity Deployment Protocol"
echo "================================================="

# 1. Update system packages
echo "[1/7] Updating system packages..."
sudo apt update && sudo apt upgrade -y

# 2. Install Dependencies
echo "[2/7] Installing required dependencies..."
sudo apt install -y python3-venv python3-pip git nginx ufw sqlite3 curl

# 3. Configure Firewall (CRITICAL STEP)
# UFW must allow Port 22 SSH before being forcefully enabled 
# so we don't sever the cloud shell connection.
echo "[3/7] Hardening Firewall (UFW)..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp # Preview testing port
sudo ufw --force enable

# 4. Virtual Environment & Dependencies
echo "[4/7] Establishing Python Environment..."
PROJECT_DIR=$(pwd)
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install flask gunicorn flask-cors requests

# 5. Native Native Updater Privileges
echo "[5/7] Provisioning NOPASSWD limits for Updater..."
# This ensures our CI/CD script running inside the Updater process
# can restart the services without halting for a sudo password.
echo "$USER ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart infinity-hub" | sudo tee /etc/sudoers.d/infinity-updater
echo "$USER ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart infinity-updater" | sudo tee -a /etc/sudoers.d/infinity-updater
sudo chmod 0440 /etc/sudoers.d/infinity-updater

# 6. Systemd Configuration
echo "[6/7] Creating Systemd Services..."

# Phase 1: Main Platform Hub
sudo bash -c "cat > /etc/systemd/system/infinity-hub.service <<EOF
[Unit]
Description=Infinity Master Hub
After=network.target

[Service]
User=$USER
Group=www-data
WorkingDirectory=$PROJECT_DIR
Environment=\"PATH=$PROJECT_DIR/venv/bin\"
ExecStart=$PROJECT_DIR/venv/bin/gunicorn --workers 3 --bind 0.0.0.0:5000 python_hub.hub_backend:app

[Install]
WantedBy=multi-user.target
EOF"

# Phase 4: Native Updater Service (Running on alternate port)
sudo bash -c "cat > /etc/systemd/system/infinity-updater.service <<EOF
[Unit]
Description=Infinity Updater Service
After=network.target

[Service]
User=$USER
WorkingDirectory=$PROJECT_DIR
Environment=\"PATH=$PROJECT_DIR/venv/bin\"
ExecStart=$PROJECT_DIR/venv/bin/python python_hub/updater.py

[Install]
WantedBy=multi-user.target
EOF"

sudo systemctl daemon-reload
sudo systemctl enable infinity-hub infinity-updater
sudo systemctl start infinity-hub infinity-updater

# 7. Reverse Proxy Architecture
echo "[7/7] Configuring Nginx Reverse Proxy..."
sudo bash -c 'cat > /etc/nginx/sites-available/infinity <<EOF
server {
    listen 80;
    server_name _;

    # Main application layer (Flask Backend + static front)
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOF'

sudo ln -sf /etc/nginx/sites-available/infinity /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo systemctl restart nginx

echo "================================================="
echo " Deployment Protocol Complete!"
echo " The Infinity Hub is now serving on Port 80."
echo " The Updater Service is listening internally on 5050."
echo "================================================="
