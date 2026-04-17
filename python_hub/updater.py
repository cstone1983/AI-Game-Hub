import os
import subprocess
import traceback
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/update', methods=['POST'])
def do_update():
    """Independent Native Updater Service - Listens on 127.0.0.1:5050"""
    try:
        # 1. Execute Git Pull
        pull = subprocess.run(
            ['git', 'pull', 'origin', 'main'], 
            capture_output=True, 
            text=True, 
            check=True
        )
        
        # 2. Restart Master Hub via systemctl
        restart_hub = subprocess.run(
            ['sudo', 'systemctl', 'restart', 'infinity-hub'], 
            capture_output=True, 
            text=True
        )
        
        # Output accumulation
        output_log = f"[GIT FULL]\n{pull.stdout}\n[SYSTEMCTL]\nRestarted infinity-hub.service successfully.\n{restart_hub.stdout}"
        
        return jsonify({"status": "success", "output": output_log})

    except subprocess.CalledProcessError as e:
        error_details = f"STDOUT:\n{e.stdout}\nSTDERR:\n{e.stderr}"
        return jsonify({"error": "Shell command failed", "traceback": error_details}), 500
    except Exception as e:
        return jsonify({"error": "Updater Exception", "traceback": traceback.format_exc()}), 500

if __name__ == '__main__':
    # Run independently on local loopback interface
    app.run(host='127.0.0.1', port=5050)
