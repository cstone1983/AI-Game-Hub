// Infinity Phase 2 - Admin Dashboard Logic

document.addEventListener('DOMContentLoaded', () => {
    // Auth Check - Very basic prototype lock
    const activeUser = JSON.parse(localStorage.getItem('infinity_user') || 'null');
    if (!activeUser || !activeUser.is_admin) {
        document.body.innerHTML = '<div class="container glass-panel text-center" style="margin-top: 4rem;"><h1>ACCESS DENIED</h1><p style="margin-bottom: 2rem;">High-Level Authorization Required.</p><a href="/" class="btn btn-primary mt-4">Return to Authenticator</a></div>';
        return;
    }

    const hubPulse = document.getElementById('hub-pulse');
    const hubUsers = document.getElementById('hub-users');
    const registryList = document.getElementById('registry-list');
    const consoleOut = document.getElementById('console-output');
    const updateBtn = document.getElementById('trigger-update-btn');

    let isUpdating = false;

    function logToTerminal(msg, isError = false) {
        const time = new Date().toLocaleTimeString();
        const prefix = isError ? '[ERROR]' : '[INFO]';
        const el = document.createElement('div');
        el.style.color = isError ? 'var(--danger)' : 'inherit';
        el.textContent = `${time} ${prefix} ${msg}`;
        consoleOut.appendChild(el);
        consoleOut.scrollTop = consoleOut.scrollHeight;
    }

    // Polling Mechanism (Every 5 seconds)
    async function pollStatus() {
        if (isUpdating) return; 

        try {
            const res = await fetch('/api/hub/stats');
            if (res.ok) {
                const data = await res.json();
                hubPulse.innerHTML = `<span class="status-indicator status-online"></span> ${data.status.toUpperCase()}`;
                hubUsers.textContent = data.activeUsers;
            } else {
                hubPulse.innerHTML = `<span class="status-indicator status-offline"></span> SYSTEM ERROR`;
            }
        } catch(e) {
            hubPulse.innerHTML = `<span class="status-indicator status-offline"></span> OFFLINE`;
        }
    }

    setInterval(pollStatus, 5000);
    pollStatus();

    // Fetch and bind modules
    async function hydrateRegistry() {
        try {
            const res = await fetch('/api/hub/modules');
            const modules = await res.json();
            
            registryList.innerHTML = '';
            modules.forEach(mod => {
                const isMaint = mod.maintenance_mode === 1;
                
                const row = document.createElement('div');
                row.className = 'flex-between';
                row.style.padding = '0.75rem';
                row.style.borderBottom = '1px solid var(--glass-border)';
                row.style.marginBottom = '0.5rem';
                
                row.innerHTML = `
                    <div>
                        <strong style="color: ${isMaint ? '#f59e0b' : 'var(--glow-cyan)'}; font-size: 1.1rem; display: block; margin-bottom: 0.25rem;">${mod.name}</strong>
                        <span class="status-indicator ${isMaint ? 'status-maintenance' : 'status-online'}"></span>
                        <span style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">MODULE ID: ${mod.id}</span>
                    </div>
                    <div>
                        <button class="btn btn-primary toggle-maint-btn" data-id="${mod.id}" data-maint="${isMaint}">
                            ${isMaint ? 'SET ONLINE' : 'MAINTENANCE MODE'}
                        </button>
                    </div>
                `;
                registryList.appendChild(row);
            });

            // Bind buttons
            document.querySelectorAll('.toggle-maint-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.target.getAttribute('data-id');
                    const currentState = e.target.getAttribute('data-maint') === 'true';
                    const newState = !currentState;
                    
                    try {
                        const res = await fetch('/api/hub/maintenance', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id, maintenance_mode: newState })
                        });
                        if (!res.ok) throw new Error('Backend rejected change.');
                        
                        logToTerminal(`Module '${id}' maintenance toggle override applied (${newState ? 'LOCKED' : 'UNLOCKED'}).`);
                        hydrateRegistry();
                    } catch(err) {
                        logToTerminal(`Failed to update maintenance state: ${err}`, true);
                    }
                });
            });

        } catch(e) {
            logToTerminal(`Registry verification fetch failed: ${e}`, true);
        }
    }

    hydrateRegistry();

    // Webhook Trigger
    updateBtn.addEventListener('click', async () => {
        isUpdating = true;
        updateBtn.disabled = true;
        updateBtn.textContent = 'PULLING...';
        hubPulse.innerHTML = `<span class="status-indicator status-maintenance"></span> UPDATING...`;
        logToTerminal('Triggering webhook orchestrator for cstone1983/AI-Game-Hub pull...');

        try {
            const res = await fetch('/api/hub/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target: 'all' })
            });
            
            const text = await res.text();
            let data = {};
            try { data = JSON.parse(text); } catch(e) { data.error = text; }

            if (res.ok) {
                logToTerminal(`GitHub Pull Protocol Completed.\n\n${data.output}`);
            } else {
                logToTerminal(`Webhook Execution Failed.\n\nTraceback Override:\n${data.details || data.traceback || data.error}`, true);
            }
        } catch(e) {
            logToTerminal(`Network failure during webhook: ${e}`, true);
        } finally {
            isUpdating = false;
            updateBtn.disabled = false;
            updateBtn.textContent = 'PULL FROM GITHUB';
            pollStatus();
        }
    });

});
