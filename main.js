// Infinity Phase 2 - Player Dashboard Logic

document.addEventListener('DOMContentLoaded', () => {
    const authContainer = document.getElementById('auth-container');
    const dashboardContainer = document.getElementById('dashboard-container');
    const loginForm = document.getElementById('login-form');
    const authError = document.getElementById('auth-error');
    const userStats = document.getElementById('user-stats');
    const adminBtn = document.getElementById('admin-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const gameRegistry = document.getElementById('game-registry');

    // Check if logged in
    const activeUser = JSON.parse(localStorage.getItem('infinity_user') || 'null');
    
    if (activeUser) {
        showDashboard(activeUser);
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        authError.classList.add('hidden');

        try {
            let res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (res.status === 401) {
                // If invalid credentials, attempt auto-register for ease of testing the prototype
                res = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password, email: `${username}@auto.local` })
                });
            }

            if (!res.ok) throw new Error('Authentication Rejected');
            
            const user = await res.json();
            localStorage.setItem('infinity_user', JSON.stringify(user));
            showDashboard(user);
        } catch (err) {
            authError.textContent = err.message;
            authError.classList.remove('hidden');
        }
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('infinity_user');
        dashboardContainer.classList.add('hidden');
        authContainer.classList.remove('hidden');
        loginForm.reset();
    });

    async function showDashboard(user) {
        authContainer.classList.add('hidden');
        dashboardContainer.classList.remove('hidden');
        
        userStats.textContent = `User: ${user.username} | Global Lvl: ${user.global_level} | Miles: ${user.total_miles}`;
        
        if (user.is_admin) {
            adminBtn.classList.remove('hidden');
        } else {
            adminBtn.classList.add('hidden');
        }

        await fetchGames();
    }

    async function fetchGames() {
        try {
            const res = await fetch('/api/hub/modules');
            const modules = await res.json();
            
            gameRegistry.innerHTML = '';
            modules.forEach(mod => {
                const isMaintenance = mod.maintenance_mode === 1;
                const statusClass = isMaintenance ? 'status-maintenance' : 'status-online';
                const statusText = isMaintenance ? 'MAINTENANCE' : 'ONLINE';
                const actionBtn = isMaintenance 
                    ? `<button class="btn" disabled style="opacity: 0.5;">Offline</button>`
                    : `<button class="btn btn-primary" onclick="alert('Module loading logic for ${mod.id} will connect here.')">Launch</button>`;

                gameRegistry.innerHTML += `
                    <div class="game-card">
                        <div class="flex-between mb-2">
                            <h3>${mod.name}</h3>
                            <div style="font-size: 0.75rem;"><span class="status-indicator ${statusClass}"></span> ${statusText}</div>
                        </div>
                        <p style="font-size: 0.85rem; margin-bottom: 1.5rem; min-height: 40px; color: var(--text-muted);">${mod.description}</p>
                        ${actionBtn}
                    </div>
                `;
            });
        } catch (err) {
            console.error('Failed to load games', err);
        }
    }
});
