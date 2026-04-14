import React, { useState, useEffect } from 'react';
import { Wallet, Zap, ShieldCheck, Cpu, ArrowRight, BarChart3, Database, Clock } from 'lucide-react';

const App = () => {
  const CURRENT_USER = "user_1"; 
  const SELLER_ID = "user_2";

  const [balance, setBalance] = useState(0);
  const [energy, setEnergy] = useState(0);
  const [status, setStatus] = useState("SYSTEM_READY");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('terminal');
  const [history, setHistory] = useState([]); // New state for Ledger

  // 1. Sync Wallet and Energy
  useEffect(() => {
    const sync = async () => {
      try {
        const [wRes, eRes] = await Promise.all([
          fetch(`http://localhost:3001/api/wallet/${CURRENT_USER}`),
          fetch(`http://localhost:3002/api/energy/${CURRENT_USER}`)
        ]);
        const wData = await wRes.json();
        const eData = await eRes.json();
        setBalance(wData.balance ?? 0); 
        setEnergy(eData.energyBalance ?? 0);
      } catch (e) { console.warn("Syncing..."); }
    };
    sync();
    const interval = setInterval(sync, 3000);
    return () => clearInterval(interval);
  }, [CURRENT_USER]);

  // 2. Fetch History for Ledger Tab
  useEffect(() => {
    if (activeTab === 'ledger') {
      fetch('http://localhost:3003/api/history')
        .then(res => res.json())
        .then(data => setHistory(data.logs || []))
        .catch(err => console.error("History fetch fail"));
    }
  }, [activeTab]);

  const handleTrade = async () => {
    setLoading(true);
    setStatus("INITIATING_2PC_PROTOCOL");
    try {
        const response = await fetch('http://localhost:3003/api/trade', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                buyerId: CURRENT_USER,
                sellerId: SELLER_ID,
                amount_kwh: 10,
                cost_inr: 100 
            })
        });
        const data = await response.json();
        if (data.status === 'SUCCESS') {
            setStatus(`TX_COMMITTED: ${data.txId}`);
        } else {
            throw new Error(data.reason || "TRANSACTION_REJECTED");
        }
    } catch (error) {
        setStatus(`TX_FAILED: ${error.message}`);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-stretch bg-[#050505] text-white font-sans">
      
      {/* LEFT SIDEBAR */}
      <aside className="w-20 border-r border-white/5 bg-black/20 flex flex-col items-center py-8 gap-10">
        <div 
          onClick={() => setActiveTab('terminal')}
          className={`w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all ${activeTab === 'terminal' ? 'bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 'bg-slate-800'}`}
        >
          <Cpu size={20} />
        </div>
        <nav className="flex flex-col gap-8 text-slate-600">
          <BarChart3 
            size={20} 
            onClick={() => setActiveTab('stats')}
            className={`cursor-pointer transition-colors ${activeTab === 'stats' ? 'text-blue-400' : 'hover:text-blue-400'}`} 
          />
          <Database 
            size={20} 
            onClick={() => setActiveTab('ledger')}
            className={`cursor-pointer transition-colors ${activeTab === 'ledger' ? 'text-blue-400' : 'hover:text-blue-400'}`} 
          />
          <div className="h-[1px] w-6 bg-white/10" />
          <ShieldCheck size={20} className="text-emerald-500/50" />
        </nav>
      </aside>

      <main className="flex-1 flex flex-col">
        {/* TOP NAV */}
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-10">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-black tracking-[0.4em] text-slate-500">TERMINAL_v4.0</span>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black tracking-widest text-blue-500 uppercase underline underline-offset-8">NODE_SYNCED</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right mr-4">
              <p className="text-[9px] font-bold text-slate-500 uppercase">System Health</p>
              <p className="text-xs font-mono text-emerald-400">OPERATIONAL</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10" />
          </div>
        </header>

        {/* --- DYNAMIC CONTENT AREA --- */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'terminal' && (
            <section className="p-10 grid grid-cols-12 gap-8 animate-in fade-in duration-500">
              <div className="col-span-8 bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-12 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-600/5 to-transparent" />
                <div className="relative z-10">
                  <h1 className="text-6xl font-black italic tracking-tighter mb-2">VOLT<span className="text-blue-500 not-italic">TRADE</span></h1>
                  <p className="text-slate-500 font-mono text-xs tracking-widest uppercase">Atomic 2-Phase Commit Exchange</p>
                </div>
                <div className="flex items-end gap-16 relative z-10">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Wallet Capital</p>
                    <p className="text-5xl font-light">₹{balance.toLocaleString()}</p>
                  </div>
                  <div className="w-[1px] h-12 bg-white/10" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Grid Reserve</p>
                    <p className="text-5xl font-light">{energy} <span className="text-sm text-slate-600 font-bold">kWh</span></p>
                  </div>
                </div>
              </div>

              <div className="col-span-4 flex flex-col gap-6">
                <div className="flex-1 bg-slate-900/40 border border-white/5 rounded-[2rem] p-8">
                  <p className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.2em] mb-4">Live_Protocol_Log</p>
                  <div className="font-mono text-sm space-y-3">
                    <p className="text-emerald-400/80 underline underline-offset-4 decoration-emerald-500/20">› {status}</p>
                    <p className="text-slate-500">› Handshaking with IPC Pipes...</p>
                    <p className="text-slate-500">› Atomic Lock: Enabled</p>
                  </div>
                </div>
                <button onClick={handleTrade} disabled={loading} className="group h-32 bg-blue-600 hover:bg-white rounded-[2rem] flex items-center justify-between px-10 transition-all duration-500 active:scale-95">
                  <div className="text-left">
                    <p className="text-blue-200 group-hover:text-blue-900 text-[10px] font-bold tracking-widest mb-1 uppercase">Execute Protocol</p>
                    <p className="text-white group-hover:text-black text-xl font-black uppercase">{loading ? "PROCESSING..." : "Execute Trade"}</p>
                  </div>
                  <div className="w-12 h-12 bg-white/10 group-hover:bg-black/5 rounded-full flex items-center justify-center"><ArrowRight className="text-white group-hover:text-black" /></div>
                </button>
              </div>
            </section>
          )}

          {activeTab === 'ledger' && (
            <section className="p-10 animate-in slide-in-from-bottom-4 duration-500">
              <div className="bg-slate-900/40 border border-white/5 rounded-[2rem] overflow-hidden">
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                  <h2 className="text-xl font-black uppercase flex items-center gap-3"><Database className="text-blue-500" /> Distributed Ledger Audit</h2>
                  <span className="text-[10px] bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full border border-blue-500/20 font-bold">REAL-TIME SYNC</span>
                </div>
                <div className="p-0 font-mono text-xs">
                  {history.length > 0 ? history.map((log, i) => (
                    <div key={i} className="px-8 py-4 border-b border-white/5 hover:bg-white/5 flex items-center gap-4 group">
                      <Clock size={14} className="text-slate-600 group-hover:text-blue-400" />
                      <span className={`${log.includes('COMMITTED') ? 'text-emerald-400' : 'text-slate-400'}`}>{log}</span>
                    </div>
                  )) : (
                    <div className="p-20 text-center text-slate-600 italic">No transactions recorded in the current node session.</div>
                  )}
                </div>
              </div>
            </section>
          )}

          {activeTab === 'stats' && (
            <section className="p-10 text-center py-40">
              <div className="inline-block p-10 bg-slate-900/40 border border-white/5 rounded-[2rem]">
                <BarChart3 size={48} className="text-slate-700 mx-auto mb-6" />
                <h3 className="text-slate-400 font-bold uppercase tracking-widest">Statistical Analysis Module</h3>
                <p className="text-slate-600 text-sm mt-2 font-mono">Restricted to Admin Nodes during Demo Sequence.</p>
              </div>
            </section>
          )}
        </div>

        <footer className="h-16 border-t border-white/5 px-10 flex items-center justify-between text-[9px] font-bold text-slate-600 tracking-[0.4em]">
          <span>CONNECTED AS: {CURRENT_USER.toUpperCase()}</span>
          <div className="flex gap-8">
            <span>RAM: 42.1MB</span>
            <span className="text-emerald-500/50 uppercase">Encryption: Distributed Ledger</span>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default App;