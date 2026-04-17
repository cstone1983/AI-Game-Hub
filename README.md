# Infinity Game Platform - Deployment Guide

Welcome to the Infinity Game platform orchestration guide. Follow these instructions to turn a fresh Ubuntu LTS virtual machine into a live, production-grade cloud ecosystem running the Hub backend, Game Modules, and our Native CI/CD Updater.

## 1. Cloud Instance Initialization
Connect to your fresh Ubuntu server via SSH:
```bash
ssh <your_user>@<your_server_ip>
```
*(Ensure you have bash execution privileges)*

## 2. Clone the Repository
Clone your project repository containing the codebase into your desired application path.
```bash
git clone https://github.com/cstone1983/AI-Game-Hub.git infinity-hub
cd infinity-hub
```

## 3. Execute the Automated Orchestrator
The repository includes a comprehensive `setup.sh` script that provisions dependencies, configures the `UFW` firewall (explicitly whitelisting port 22 first to avoid lockouts), and configures Nginx and Systemd.

Give it isolated execution privileges and run:
```bash
chmod +x setup.sh
./setup.sh
```

### What this script does:
1. **APT Dependencies:** Downloads `python3-venv`, `git`, `nginx`, and `ufw`.
2. **Network Hardening:** Secures the UFW firewall rules natively (allowing SSH on 22/tcp).
3. **Dual-Service Architecture:** Installs the `infinity-hub` (Port 5000) and the `infinity-updater` (Port 5050) as discrete `systemd` daemon tasks.
4. **Proxy:** Bonds Nginx across Port 80, routing directly into the Hub service.

## 4. Administrative Gateway
At this phase, your server is completely active. 

- Access your new Hub by navigating to your domain or server IP format in any standard modern browser. E.g: `http://<your_server_ip>/`
- Login directly using the default administrator credential configured at database genesis:
  - **Username:** `admin`
  - **Password:** `admin`

*(Warning: Log into the Hub dashboard immediately after installation and modify your admin credentials)*

## 5. Webhook CI/CD Triggers
The Python Backend (`infinity-hub`) is intentionally unprivileged and sandboxed for security. The Admin Panel updates the codebase utilizing a separate microservice (`updater.py`) listening exclusively on `127.0.0.1:5050`. 

When an Admin clicks **"Pull from GitHub"** inside the `Command Center`, the following event loop triggers inherently:
1. Hub proxies an internal HTTP POST to `127.0.0.1:5050/update`
2. Native Updater process triggers `git pull origin main`
3. Native Updater process runs `systemctl restart infinity-hub` (granted specific permission inside `/etc/sudoers.d/`).
4. Result stack tracebacks are returned seamlessly straight into your browser's Admin Terminal.

## 6. Local Development Array
If you intend to test this repository's Phase 2 UI updates without an Nginx installation:
1. Install node dependencies: `npm install`
2. Start the development Node container mapping to the DB: `npm run dev`
3. **The Local Interface renders on standard Node ports:** `http://localhost:3000`
