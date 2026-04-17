#!/bin/bash
# Infinity Multi-Game Platform - Full Installation Script
# Tested on: Ubuntu 22.04 LTS / 24.04 LTS

set -e # Exit immediately if a command exits with a non-zero status

echo "============================================================"
echo "    INFINITY PLATFORM: FULL SYSTEM INSTALLATION             "
echo "============================================================"

# Ensure script is run as a normal user with sudo privileges, not as root directly
if [ "$EUID" -eq 0 ]; then
  echo "[CRITICAL] Please run this script as a regular user with sudo access (e.g., 'bash install.sh'), not as root directly."
  exit 1
fi

PROJECT_DIR=$(pwd)
if [ ! -f "$PROJECT_DIR/package.json" ]; then
    echo "[CRITICAL] package.json not found. Please run this script from the root directory of the cloned repository."
    exit 1
fi

echo ">>> [1/7] Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y

echo ">>> [2/7] Installing core dependencies (Python, Git, Nginx, SQLite)..."
sudo apt-get install -y curl python3-venv python3-pip git nginx ufw sqlite3

echo ">>> [3/7] Installing Node.js (for frontend build process)..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

echo ">>> [4/7] Compiling Frontend (React/Vite)..."
# Install JS dependencies and compile the production 'dist/' folder
npm install
npm run build

echo ">>> [5/7] Configuring Python Hub Backend (Flask)..."
python3 -m venv venv
source venv/bin/activate
pip install flask gunicorn flask-cors

# Run the backend script briefly to trigger the SQLite database initialization logic
echo ">>> Initializing SQLite Database structure..."
# Background run, then kill after db is generated safely
python3 python_hub/hub_backend.py &
HUB_PID=$!
sleep 3
kill $HUB_PID || true
deactivate

echo ">>> [6/7] Orchestrating System Services (Systemd & Nginx)..."

# Systemd Service files map to the current user
sudo bash -c "cat > /etc/systemd/system/infinity-hub.service <<EOF
[Unit]
Description=Gunicorn instance to serve Infinity Master Hub
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

sudo systemctl daemon-reload
sudo systemctl start infinity-hub
sudo systemctl enable infinity-hub

# Nginx reverse proxy configuration
sudo bash -c "cat > /etc/nginx/sites-available/infinity <<EOF
server {
    listen 80;
    server_name _;

    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
    }

    location / {
        root $PROJECT_DIR/dist;
        index index.html;
        try_files \\\$uri \\\$uri/ /index.html;
    }
}
EOF"

sudo ln -sf /etc/nginx/sites-available/infinity /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo systemctl restart nginx

echo ">>> [7/7] Securing Firewall (UFW)..."
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
sudo ufw --force enable

echo "============================================================"
echo "    INSTALLATION COMPLETE!                                  "
echo "============================================================"
echo "- Game Hub Database: $PROJECT_DIR/hub.db"
echo "- Python Backend: Running on internal port 5000 (via Gunicorn)"
echo "- Frontend: Served statically by Nginx via /dist"
echo "- Public Access: http://<YOUR_SERVER_IP>/"
echo ""
echo "To update the repository in the future, simply click the 'Pull From Github'"
echo "button inside the Hub Dashboard."
echo "============================================================"
