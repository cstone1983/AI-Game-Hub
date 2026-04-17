import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Gamepad2, 
  Terminal, 
  Settings, 
  Users, 
  Activity, 
  Plane,
  ChevronRight,
  Database,
  Unplug
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('hub');
  const [stats, setStats] = useState({ activeUsers: 0, gamesTracked: 0 });
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline'>('online');
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [updateLog, setUpdateLog] = useState<string>('');

  useEffect(() => {
    fetch('/api/hub/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(() => setBackendStatus('offline'));
  }, []);

  const triggerUpdate = async (target: string) => {
    setUpdateStatus('updating');
    setUpdateLog(`[INFO] Triggering webhook update for ${target} from cstone1983/AI-Game-Hub...\n`);
    
    try {
      const res = await fetch('/api/hub/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setUpdateLog(prev => prev + `[SUCCESS] Update pulled successfully.\n\n${data.output}`);
        setUpdateStatus('success');
      } else {
        setUpdateLog(prev => prev + `[ERROR] Update failed.\n\n${data.details || data.traceback || data.error}`);
        setUpdateStatus('error');
      }
    } catch (err) {
      setUpdateLog(prev => prev + `[CRITICAL] Network request failed.\n${String(err)}`);
      setUpdateStatus('error');
    }
  };

  return (
    <div className="flex h-screen overflow-hidden text-sm uppercase tracking-wider">
      {/* Sidebar */}
      <nav className="w-64 border-r border-[#2A2A2A] flex flex-col bg-[#0A0A0A]">
        <div className="p-6 border-b border-[#2A2A2A] flex items-center gap-3">
          <div className="w-8 h-8 bg-[#00FF00] rounded-sm flex items-center justify-center">
            <span className="text-black font-extrabold text-lg">∞</span>
          </div>
          <span className="font-bold text-lg tracking-tighter">INFINITY</span>
        </div>

        <div className="flex-1 py-6">
          <NavItem 
            icon={<LayoutDashboard size={18}/>} 
            label="Master Hub" 
            active={activeTab === 'hub'} 
            onClick={() => setActiveTab('hub')}
          />
          <NavItem 
            icon={<Gamepad2 size={18}/>} 
            label="Games Library" 
            active={activeTab === 'library'} 
            onClick={() => setActiveTab('library')}
          />
          <NavItem 
            icon={<Terminal size={18}/>} 
            label="API Console" 
            active={activeTab === 'api'} 
            onClick={() => setActiveTab('api')}
          />
          <NavItem 
            icon={<Database size={18}/>} 
            label="Local Data" 
            active={activeTab === 'data'} 
            onClick={() => setActiveTab('data')}
          />
        </div>

        <div className="p-6 border-t border-[#2A2A2A] text-[10px] text-[#666] flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${backendStatus === 'online' ? 'bg-[#00FF00]' : 'bg-red-500'}`}></div>
            HUB STATUS: {backendStatus}
          </div>
          <div>ESTABLISHED: 2026-04-17</div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 bg-[#141414] overflow-y-auto">
        <header className="px-8 py-6 border-b border-[#2A2A2A] flex justify-between items-center bg-[#141414] sticky top-0 z-10">
          <h2 className="text-lg font-bold flex items-center gap-2">
            {activeTab === 'hub' && <><Activity size={20} className="text-[#00FF00]"/> DASHBOARD STATS</>}
            {activeTab === 'library' && <><Gamepad2 size={20} className="text-[#00FF00]"/> GAME REPOSITORY</>}
          </h2>
          <div className="flex gap-4">
             <div className="px-3 py-1 border border-[#2A2A2A] mono text-xs">V 1.0.4-BETA</div>
          </div>
        </header>

        <div className="p-8">
          <AnimatePresence mode="wait">
             {activeTab === 'hub' && (
               <motion.div 
                 key="hub"
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -10 }}
                 className="grid grid-cols-12 gap-6"
               >
                 <StatsCard title="Total Players" value={stats.activeUsers} icon={<Users size={24}/>}/>
                 <StatsCard title="Game Modules" value={stats.gamesTracked} icon={<Gamepad2 size={24}/>}/>
                 <StatsCard title="API Requests" value="1.2K" icon={<Activity size={24}/>}/>

                 {/* Active Games Grid */}
                 <div className="col-span-12 mt-8">
                    <h3 className="text-xs text-[#666] mb-4">DEPLOYED MODULES</h3>
                    <div className="data-grid border border-[#2A2A2A]">
                      <GameRow name="Idle Flight Manager" genre="SIMULATION" status="ALPHA" progress={45} />
                      <GameRow name="Neon Matrix" genre="ARCADE" status="DEVELOPMENT" progress={12} />
                      <GameRow name="Cargo Link" genre="LOGISTICS" status="PLANNED" progress={0} />
                    </div>
                 </div>

                 {/* Global Log */}
                 <div className="col-span-12 mt-8">
                   <div className="flex justify-between items-center mb-4">
                     <h3 className="text-xs text-[#666]">PLATFORM TERMINAL & CI/CD</h3>
                     <button 
                       onClick={() => triggerUpdate('all')}
                       disabled={updateStatus === 'updating'}
                       className={`text-xs px-3 py-1 border transition-colors ${
                         updateStatus === 'updating' ? 'border-[#444] text-[#444]' : 'border-[#00FF00] text-[#00FF00] hover:bg-[#00FF00] hover:text-black'
                       }`}
                     >
                       {updateStatus === 'updating' ? 'PULLING...' : 'PULL FROM GITHUB'}
                     </button>
                   </div>
                   <div className="bg-black p-4 mono text-[11px] h-48 overflow-y-auto text-[#00FF00] border border-[#2A2A2A] whitespace-pre-wrap">
                     <div>[INFO] TARGET REPO: github.com/cstone1983/AI-Game-Hub</div>
                     <div>[INFO] HUB CORE LOADED...</div>
                     <div>[INFO] ESTABLISHING DATABASE CONNECTION...</div>
                     <div>[INFO] SQLITE ADAPTER: ONLINE</div>
                     <div>[WARN] GAME_MODULE_1: ASSETS MISSING (EXPECTED IN PHASE 2)</div>
                     <div>[INFO] API_CONTRACT_v1: LISTENING ON PORT 3000</div>
                     {updateLog && <div className="mt-4 pt-4 border-t border-[#2A2A2A]">{updateLog}</div>}
                     <div className="animate-pulse">_</div>
                   </div>
                 </div>
               </motion.div>
             )}

             {activeTab === 'library' && (
               <motion.div 
                key="lib"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-3 gap-6"
               >
                 <GameModuleCard 
                   name="IDLE FLIGHT MANAGER" 
                   description="Master the skies. Build routes, manage fleets, and grow your airline empire."
                   icon={<Plane className="text-[#00FF00]"/>}
                   active={true}
                 />
                 <GameModuleCard 
                   name="NEON MATRIX" 
                   description="Cyberpunk arcade survival. High-speed hacking and evasion."
                   icon={<Unplug className="text-gray-600"/>}
                   active={false}
                 />
               </motion.div>
             )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-6 py-4 transition-all ${
        active 
          ? 'bg-gradient-to-r from-[#00FF0022] to-transparent border-l-2 border-[#00FF00] text-[#00FF00]' 
          : 'text-[#888] hover:text-white'
      }`}
    >
      {icon}
      <span className="font-bold text-xs">{label}</span>
    </button>
  );
}

function StatsCard({ title, value, icon }: { title: string, value: any, icon: any }) {
  return (
    <div className="col-span-4 bg-[#1A1A1A] border border-[#2A2A2A] p-6 hover:border-[#00FF00] transition-colors group">
      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] text-[#666] font-bold">{title}</span>
        <div className="text-[#666] group-hover:text-[#00FF00] transition-colors">{icon}</div>
      </div>
      <div className="text-4xl font-light mono">{value}</div>
    </div>
  );
}

function GameRow({ name, genre, status, progress }: { name: string, genre: string, status: string, progress: number }) {
  return (
    <div className="data-row hover:bg-[#202020]">
      <div className="flex items-center gap-2">
        <span className="font-bold">{name}</span>
      </div>
      <div className="text-[#666] text-xs flex items-center gap-4">
        <span>{genre}</span>
        <div className="flex-1 h-[2px] bg-[#333] max-w-[100px] overflow-hidden">
           <div className="h-full bg-[#00FF00]" style={{ width: `${progress}%` }}></div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-3">
        <span className={`text-[10px] px-2 py-0.5 border ${status === 'ALPHA' ? 'border-[#00FF00] text-[#00FF00]' : 'border-[#444] text-[#444]'}`}>
          {status}
        </span>
        <ChevronRight size={14} className="text-[#444]"/>
      </div>
    </div>
  );
}

function GameModuleCard({ name, description, icon, active }: { name: string, description: string, icon: any, active: boolean }) {
  return (
    <div className={`p-6 border ${active ? 'border-[#2A2A2A] hover:border-[#00FF00]' : 'border-[#222] opacity-50'} transition-all bg-[#1A1A1A] relative overflow-hidden group`}>
      <div className="mb-6">{React.cloneElement(icon as React.ReactElement, { size: 48 })}</div>
      <h3 className="font-bold text-lg mb-2">{name}</h3>
      <p className="text-xs text-[#666] leading-relaxed mb-6">
        {description}
      </p>
      <button className={`w-full py-2 border ${active ? 'border-[#00FF00] text-[#00FF00] hover:bg-[#00FF00] hover:text-black' : 'border-[#444] text-[#444] cursor-not-allowed'} font-bold text-xs transition-all`}>
        {active ? 'LAUNCH MODULE' : 'MODULE LOCKED'}
      </button>
      {active && (
         <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-100 transition-opacity">
            <Plane size={80} className="rotate-45"/>
         </div>
      )}
    </div>
  );
}
