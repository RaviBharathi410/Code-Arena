import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, Zap, Copy, Check, Clock, 
  ChevronLeft, Shield, Target, Activity, Share2, 
  Terminal, ArrowRight, Crosshair
} from 'lucide-react';

// --- STYLING CONSTANTS (Matches the Cyberpunk/Military Aesthetic) ---
const THEME = {
  bg: "bg-[#0d0d0f]",
  surface: "bg-[#111114]",
  surfaceHover: "hover:bg-[#16161a]",
  border: "border-white/10",
  accent: "text-[#8b5cf6]",
  accentBg: "bg-[#8b5cf6]",
  accentHover: "hover:bg-[#7c3aed]",
  muted: "text-[#6b7280]",
  danger: "text-[#ef4444]",
  success: "text-[#10b981]"
};

// --- SCORING & GRADING ENGINE ---
const calculateScore = (timeTakenSec, config, testCasesPassed = 10, totalTestCases = 10) => {
  const diffMultiplier = {
    'RECRUIT': 1.0,
    'OPERATIVE': 1.5,
    'ELITE': 2.0,
    'LEGENDARY': 3.0
  }[config.difficulty] || 1.0;

  const penaltyRate = {
    'SPEED ONLY': 5,
    'ACCURACY + SPEED': 3,
    'FULL SPECTRUM': 2
  }[config.scoringMode] || 2;

  const BASE_SCORE = 1000 * diffMultiplier;
  const TIME_PENALTY = timeTakenSec * penaltyRate;
  const ACCURACY_BONUS = (testCasesPassed / totalTestCases) * 500;
  
  return Math.max(0, Math.floor(BASE_SCORE - TIME_PENALTY + ACCURACY_BONUS));
};

const getGrade = (score, maxPossible) => {
  const percent = score / maxPossible;
  if (percent >= 0.90) return { letter: 'S', label: 'LEGENDARY', color: 'bg-yellow-500 text-black' };
  if (percent >= 0.75) return { letter: 'A', label: 'ELITE', color: 'bg-[#8b5cf6] text-white' };
  if (percent >= 0.55) return { letter: 'B', label: 'OPERATIVE', color: 'bg-blue-500 text-white' };
  if (percent >= 0.35) return { letter: 'C', label: 'RECRUIT', color: 'bg-gray-500 text-white' };
  return { letter: 'D', label: 'CADET', color: 'bg-red-500 text-white' };
};

// --- COMPONENT ENTRY ---
export default function CodeBattleRooms() {
  // Global State (Frontend Simulation)
  const [view, setView] = useState('MENU'); // MENU, CREATE, JOIN, WAITING, MATCH, RESULTS
  const [roomConfig, setRoomConfig] = useState(null);
  const [roomCode, setRoomCode] = useState('');
  const [participants, setParticipants] = useState([]);
  const [matchStatus, setMatchStatus] = useState('WAITING');
  
  // Current user mock
  const currentUser = { id: 'u1', username: 'GHOST_OPERATOR', isHost: true };

  // --- VIEWS ---
  if (view === 'MENU') return <MainMenu setView={setView} />;
  if (view === 'CREATE') return <CreateRoomModal setView={setView} setRoomConfig={setRoomConfig} setRoomCode={setRoomCode} setParticipants={setParticipants} currentUser={currentUser} />;
  if (view === 'JOIN') return <JoinRoomModal setView={setView} setRoomConfig={setRoomConfig} setRoomCode={setRoomCode} setParticipants={setParticipants} currentUser={currentUser} />;
  if (view === 'WAITING') return <CombatWaitingRoom setView={setView} config={roomConfig} code={roomCode} participants={participants} setParticipants={setParticipants} currentUser={currentUser} setMatchStatus={setMatchStatus} />;
  if (view === 'MATCH') return <MatchSimulation setView={setView} config={roomConfig} setMatchStatus={setMatchStatus} participants={participants} setParticipants={setParticipants} />;
  if (view === 'RESULTS') return <ResultsScreen setView={setView} config={roomConfig} participants={participants} setRoomConfig={setRoomConfig} setParticipants={setParticipants} currentUser={currentUser} />;
}

// --------------------------------------------------------
// 1. MAIN MENU
// --------------------------------------------------------
function MainMenu({ setView }) {
  return (
    <div className={`min-h-screen ${THEME.bg} text-white font-mono flex flex-col items-center justify-center p-6`}>
      <div className="text-center mb-16 space-y-4">
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter uppercase font-sans">Code <span className={THEME.accent}>Battle</span></h1>
        <p className={`${THEME.muted} tracking-[0.3em] text-sm md:text-base`}>MULTI-USER ARENA PROTOCOL // V2.0</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-2xl">
        <button 
          onClick={() => setView('CREATE')}
          className={`flex-1 p-8 rounded-3xl border ${THEME.border} ${THEME.surface} ${THEME.surfaceHover} transition-all group relative overflow-hidden`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#8b5cf6]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <Terminal size={40} className={`${THEME.accent} mb-6`} />
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-2 text-left">Deploy Arena</h2>
          <p className={`${THEME.muted} text-xs text-left tracking-widest leading-relaxed`}>Configure combat parameters, select sector mode, and invite operators to a custom uplink.</p>
        </button>

        <button 
          onClick={() => setView('JOIN')}
          className={`flex-1 p-8 rounded-3xl border ${THEME.border} ${THEME.surface} ${THEME.surfaceHover} transition-all group relative overflow-hidden`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <Crosshair size={40} className="text-white mb-6" />
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-2 text-left">Join Uplink</h2>
          <p className={`${THEME.muted} text-xs text-left tracking-widest leading-relaxed`}>Enter an access code to infiltrate an active combat waiting room and prepare for deployment.</p>
        </button>
      </div>
    </div>
  );
}

// --------------------------------------------------------
// 2. CREATE ROOM MODAL
// --------------------------------------------------------
function CreateRoomModal({ setView, setRoomConfig, setRoomCode, setParticipants, currentUser }) {
  const [config, setConfig] = useState({
    roomName: '',
    mode: '1V1 COMBAT',
    maxParticipants: 2,
    difficulty: 'OPERATIVE',
    timeLimit: 15,
    scoringMode: 'FULL SPECTRUM',
    visibility: 'PRIVATE',
    allowSpectators: false
  });

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No 0/O, 1/I/L
    let code = '';
    for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
  };

  const handleDeploy = () => {
    const code = generateCode();
    setRoomConfig(config);
    setRoomCode(code);
    setParticipants([{ ...currentUser, status: 'READY' }]);
    setView('WAITING');
  };

  return (
    <div className={`min-h-screen ${THEME.bg} text-white font-mono p-4 sm:p-8 flex flex-col`}>
      <button onClick={() => setView('MENU')} className="flex items-center gap-2 text-xs uppercase tracking-widest text-gray-500 hover:text-white transition-colors mb-8 w-fit">
        <ChevronLeft size={16} /> Abort Setup
      </button>

      <div className="max-w-4xl mx-auto w-full flex-1">
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase font-sans mb-10">Room <span className={THEME.accent}>Configuration</span></h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {/* Left Column */}
          <div className="space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold block">Room Designation</label>
              <input 
                type="text" 
                placeholder="AUTO-GENERATE"
                value={config.roomName}
                onChange={e => setConfig({...config, roomName: e.target.value})}
                className={`w-full bg-black/40 border ${THEME.border} rounded-xl px-4 py-4 text-sm focus:outline-none focus:border-[#8b5cf6]/50 transition-colors uppercase`}
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold block">Sector Mode</label>
              <div className="flex bg-black/40 rounded-xl p-1 border border-white/10">
                {['1V1 COMBAT', 'SQUAD BATTLE'].map(mode => (
                  <button 
                    key={mode}
                    onClick={() => setConfig({...config, mode, maxParticipants: mode === '1V1 COMBAT' ? 2 : 4})}
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors ${config.mode === mode ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {config.mode === 'SQUAD BATTLE' && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold flex justify-between">
                  <span>Max Participants</span>
                  <span className={THEME.accent}>{config.maxParticipants} OPRS</span>
                </label>
                <input 
                  type="range" min="2" max="10" step="1"
                  value={config.maxParticipants}
                  onChange={e => setConfig({...config, maxParticipants: parseInt(e.target.value)})}
                  className="w-full accent-[#8b5cf6]"
                />
              </div>
            )}

            <div className="space-y-3">
              <label className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold block">Threat Level (Difficulty)</label>
              <div className="grid grid-cols-2 gap-2">
                {['RECRUIT', 'OPERATIVE', 'ELITE', 'LEGENDARY'].map(diff => (
                  <button 
                    key={diff}
                    onClick={() => setConfig({...config, difficulty: diff})}
                    className={`py-3 text-[10px] font-bold uppercase tracking-widest rounded-xl border transition-colors ${config.difficulty === diff ? `bg-[#8b5cf6]/20 border-[#8b5cf6] ${THEME.accent}` : 'bg-black/40 border-white/5 text-gray-500 hover:border-white/20'}`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold flex justify-between">
                <span>Time Limit</span>
                <span className="text-white">{config.timeLimit} MIN</span>
              </label>
              <input 
                type="range" min="5" max="60" step="5"
                value={config.timeLimit}
                onChange={e => setConfig({...config, timeLimit: parseInt(e.target.value)})}
                className="w-full accent-[#8b5cf6]"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold block">Scoring Engine</label>
              <div className="space-y-2">
                {['SPEED ONLY', 'ACCURACY + SPEED', 'FULL SPECTRUM'].map(mode => (
                  <button 
                    key={mode}
                    onClick={() => setConfig({...config, scoringMode: mode})}
                    className={`w-full py-4 px-4 text-xs font-bold uppercase tracking-widest rounded-xl border text-left transition-colors flex justify-between items-center ${config.scoringMode === mode ? `bg-white/5 border-white/20 text-white` : 'bg-black/40 border-transparent text-gray-500 hover:bg-white/[0.02]'}`}
                  >
                    {mode}
                    {config.scoringMode === mode && <Check size={14} className={THEME.accent} />}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4 pt-4 border-t border-white/5">
              <button 
                onClick={() => setConfig({...config, visibility: config.visibility === 'PRIVATE' ? 'PUBLIC' : 'PRIVATE'})}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-colors ${config.visibility === 'PRIVATE' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}
              >
                {config.visibility === 'PRIVATE' ? <Shield size={14} /> : <Share2 size={14} />}
                {config.visibility}
              </button>
              
              <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-400 font-bold uppercase tracking-widest">
                <input 
                  type="checkbox" 
                  checked={config.allowSpectators}
                  onChange={(e) => setConfig({...config, allowSpectators: e.target.checked})}
                  className="accent-[#8b5cf6] w-4 h-4" 
                />
                Allow Spectators
              </label>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex justify-end">
          <button 
            onClick={handleDeploy}
            className={`px-10 py-5 rounded-2xl ${THEME.accentBg} ${THEME.accentHover} text-white font-black uppercase tracking-[0.2em] text-sm transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(139,92,246,0.3)] flex items-center gap-3`}
          >
            Deploy Room <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------
// 3. JOIN ROOM MODAL
// --------------------------------------------------------
function JoinRoomModal({ setView, setRoomConfig, setRoomCode, setParticipants, currentUser }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const inputsRef = useRef([]);

  const handleInput = (e, index) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (val.length <= 1) {
      const newCode = code.split('');
      newCode[index] = val;
      const finalCode = newCode.join('');
      setCode(finalCode);
      setError(false);
      
      if (val !== '' && index < 5) {
        inputsRef.current[index + 1].focus();
      }
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && code[index] === '' && index > 0) {
      inputsRef.current[index - 1].focus();
    }
  };

  const handleConnect = () => {
    if (code.length !== 6) return;
    if (code === 'ERROR1') {
      setError(true);
      return;
    }
    
    // Simulate finding a room
    setRoomCode(code);
    setRoomConfig({
      roomName: `SECTOR-${code}`,
      mode: 'SQUAD BATTLE',
      maxParticipants: 4,
      difficulty: 'ELITE',
      timeLimit: 20,
      scoringMode: 'ACCURACY + SPEED',
      visibility: 'PRIVATE',
      allowSpectators: true
    });
    setParticipants([
      { id: 'u2', username: 'NEON_SHADOW', isHost: true, status: 'READY' },
      { ...currentUser, isHost: false, status: 'READY' }
    ]);
    setView('WAITING');
  };

  return (
    <div className={`min-h-screen ${THEME.bg} flex flex-col items-center justify-center p-6 text-white font-mono`}>
      <button onClick={() => setView('MENU')} className="absolute top-8 left-8 flex items-center gap-2 text-xs uppercase tracking-widest text-gray-500 hover:text-white transition-colors">
        <ChevronLeft size={16} /> Abort
      </button>

      <div className={`max-w-md w-full p-10 rounded-[2.5rem] border ${THEME.border} ${THEME.surface} shadow-2xl`}>
        <div className="text-center mb-10">
          <Shield size={32} className={`mx-auto mb-4 ${THEME.accent}`} />
          <h2 className="text-3xl font-black uppercase font-sans tracking-tighter">Enter Access Code</h2>
          <p className="text-xs text-gray-500 tracking-widest mt-2">SECURE UPLINK REQUIRED</p>
        </div>

        <div className="flex justify-between gap-2 mb-8">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <input
              key={i}
              ref={el => inputsRef.current[i] = el}
              type="text"
              maxLength={1}
              value={code[i] || ''}
              onChange={e => handleInput(e, i)}
              onKeyDown={e => handleKeyDown(e, i)}
              className={`w-12 h-14 bg-black/50 border rounded-xl text-center text-xl font-bold uppercase transition-all focus:outline-none ${error ? 'border-red-500 text-red-500' : code[i] ? 'border-[#8b5cf6] text-[#8b5cf6] shadow-[0_0_15px_rgba(139,92,246,0.2)]' : 'border-white/10 text-white focus:border-white/30'}`}
            />
          ))}
        </div>

        {error && (
          <p className="text-red-500 text-[10px] uppercase font-bold tracking-widest text-center mb-6 animate-pulse">
            UPLINK FAILED — INVALID ACCESS CODE
          </p>
        )}

        <button 
          onClick={handleConnect}
          disabled={code.length < 6}
          className={`w-full py-5 rounded-xl font-black uppercase tracking-[0.2em] text-sm transition-all ${code.length === 6 ? `${THEME.accentBg} ${THEME.accentHover} text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:scale-[1.02] active:scale-95` : 'bg-white/5 text-gray-500 cursor-not-allowed'}`}
        >
          Connect
        </button>
      </div>
    </div>
  );
}

// --------------------------------------------------------
// 4. COMBAT WAITING ROOM
// --------------------------------------------------------
function CombatWaitingRoom({ setView, config, code, participants, setParticipants, currentUser, setMatchStatus }) {
  const [copied, setCopied] = useState(false);
  const minRequired = config.mode === '1V1 COMBAT' ? 2 : 2; // For squad, min 2 to start

  // Simulate network: another player joins after 3 seconds if slot available
  useEffect(() => {
    if (participants.length < config.maxParticipants) {
      const timer = setTimeout(() => {
        setParticipants(prev => {
          if (prev.length < config.maxParticipants && !prev.find(p => p.id === 'ghost1')) {
            return [...prev, { id: 'ghost1', username: 'OPERATOR_GHOST', isHost: false, status: 'STANDBY' }];
          }
          return prev;
        });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [participants.length, config.maxParticipants, setParticipants]);

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInitiate = () => {
    setMatchStatus('IN_PROGRESS');
    setView('MATCH');
  };

  const isReadyToStart = participants.length >= minRequired;
  const isHost = participants.find(p => p.id === currentUser.id)?.isHost;

  return (
    <div className={`min-h-screen ${THEME.bg} text-white font-mono flex flex-col`}>
      {/* Header */}
      <header className={`border-b ${THEME.border} ${THEME.surface} px-8 py-6 flex flex-col md:flex-row justify-between items-center gap-6 relative z-10`}>
        <div>
          <h1 className="text-3xl font-black uppercase font-sans tracking-tighter">Combat Waiting Room</h1>
          <p className="text-[10px] text-gray-500 tracking-[0.3em] font-bold mt-1 uppercase">{config.roomName || 'UNNAMED SECTOR'}</p>
        </div>
        
        <div className="flex items-center gap-4 bg-black/40 border border-white/10 rounded-2xl p-2 pl-6">
          <div>
            <p className="text-[9px] uppercase tracking-widest text-gray-500 mb-0.5">Access Code</p>
            <p className={`text-2xl font-black tracking-widest ${THEME.accent}`}>{code}</p>
          </div>
          <button 
            onClick={copyCode}
            className={`w-12 h-12 flex items-center justify-center rounded-xl transition-colors ${copied ? 'bg-green-500/20 text-green-500' : 'bg-white/5 hover:bg-white/10 text-white'}`}
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="flex-1 flex flex-col lg:flex-row p-4 lg:p-8 gap-8 overflow-hidden">
        
        {/* Left: Registry */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center gap-3 mb-6">
            <Users className={THEME.accent} size={20} />
            <h2 className="text-lg font-bold uppercase tracking-widest">Operator Registry</h2>
            <span className="ml-auto text-xs bg-white/10 px-3 py-1 rounded-full font-bold">{participants.length} / {config.maxParticipants}</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto pr-2 custom-scrollbar pb-10">
            {Array.from({ length: config.maxParticipants }).map((_, i) => {
              const p = participants[i];
              if (p) {
                return (
                  <div key={i} className={`p-6 rounded-3xl border border-[#8b5cf6]/30 bg-[#8b5cf6]/5 flex items-center gap-4 relative overflow-hidden`}>
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#8b5cf6]" />
                    <div className="w-12 h-12 bg-black/50 rounded-xl flex items-center justify-center font-black text-xl border border-white/10">
                      {p.username.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold truncate uppercase text-sm">{p.username}</p>
                        {p.isHost && <span className="text-[8px] bg-white/10 px-1.5 py-0.5 rounded font-black tracking-wider">HOST</span>}
                      </div>
                      <p className={`text-[10px] font-bold tracking-widest uppercase ${p.status === 'READY' ? 'text-green-500' : 'text-yellow-500'}`}>
                        {p.status}
                      </p>
                    </div>
                  </div>
                );
              }
              return (
                <div key={i} className="p-6 rounded-3xl border border-dashed border-white/10 bg-white/[0.02] flex items-center gap-4 opacity-50">
                  <div className="w-12 h-12 bg-black/20 rounded-xl border border-white/5" />
                  <div>
                    <p className="font-bold uppercase text-sm text-gray-500">Empty Slot</p>
                    <p className="text-[10px] font-bold tracking-widest uppercase text-gray-600">OPERATOR {i + 1}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Mission Control */}
        <div className="w-full lg:w-[400px] flex flex-col">
          <div className={`p-8 rounded-[2rem] border ${THEME.border} ${THEME.surface} shadow-2xl flex-1 flex flex-col justify-between`}>
            <div>
              <div className="flex items-center gap-3 mb-8">
                <Activity className={THEME.accent} size={24} />
                <h2 className="text-xl font-black uppercase tracking-tighter">Mission Control</h2>
              </div>

              <div className="space-y-4">
                <StatRow label="Sector Mode" value={config.mode} />
                <StatRow label="Difficulty" value={config.difficulty} />
                <StatRow label="Time Limit" value={`${config.timeLimit} MIN`} />
                <StatRow label="Scoring Engine" value={config.scoringMode} />
                <StatRow label="Visibility" value={config.visibility} />
              </div>
            </div>

            <div className="mt-12 space-y-4">
              {isHost ? (
                <button 
                  disabled={!isReadyToStart}
                  onClick={handleInitiate}
                  className={`w-full py-5 rounded-xl font-black uppercase tracking-[0.2em] text-sm transition-all flex justify-center items-center gap-3 ${isReadyToStart ? `${THEME.accentBg} text-white shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:scale-[1.02] active:scale-95` : 'bg-white/5 text-gray-500 cursor-not-allowed'}`}
                >
                  <Zap size={18} fill="currentColor" />
                  {isReadyToStart ? 'Initiate Uplink' : 'Waiting for Operators...'}
                </button>
              ) : (
                <div className="w-full py-5 rounded-xl bg-white/5 text-gray-400 font-black uppercase tracking-widest text-xs text-center border border-white/5 flex items-center justify-center gap-2">
                  <Clock size={16} className="animate-spin-slow" /> Awaiting Host Deployment
                </div>
              )}
            </div>
          </div>
          
          <button onClick={() => setView('MENU')} className="mt-6 text-[10px] uppercase font-bold tracking-widest text-gray-500 hover:text-red-400 transition-colors self-center">
            Abandon Mission
          </button>
        </div>

      </div>
    </div>
  );
}

function StatRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-white/5 last:border-0">
      <span className="text-xs text-gray-400 uppercase tracking-widest">{label}</span>
      <span className="text-sm font-bold uppercase">{value}</span>
    </div>
  );
}

// --------------------------------------------------------
// 5. MATCH SIMULATION (Fake Editor/Timer)
// --------------------------------------------------------
function MatchSimulation({ setView, config, setMatchStatus, participants, setParticipants }) {
  const [timeLeft, setTimeLeft] = useState(config.timeLimit * 60);
  const [lines, setLines] = useState(['// Uplink established.', '// Awaiting operator input...']);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          finishMatch(config.timeLimit * 60);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const finishMatch = (timeSpent) => {
    setMatchStatus('COMPLETED');
    // Generate mock results for everyone
    const results = participants.map(p => {
      const tTaken = p.id === 'u1' ? timeSpent : Math.floor(Math.random() * (config.timeLimit * 60));
      const passed = p.id === 'u1' ? 10 : Math.floor(Math.random() * 11);
      const score = calculateScore(tTaken, config, passed, 10);
      return {
        ...p,
        finalScore: score,
        timeTakenSec: tTaken,
        timeTakenStr: `${Math.floor(tTaken / 60).toString().padStart(2, '0')}:${(tTaken % 60).toString().padStart(2, '0')}`,
        testCasesPassed: passed,
        totalTestCases: 10,
        accuracyPercent: (passed / 10) * 100
      };
    }).sort((a, b) => b.finalScore - a.finalScore);
    
    // Assign ranks
    results.forEach((r, idx) => r.rank = idx + 1);
    setParticipants(results);
    setView('RESULTS');
  };

  const handleSimulateSubmit = () => {
    const timeSpent = (config.timeLimit * 60) - timeLeft;
    finishMatch(timeSpent);
  };

  const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const secs = (timeLeft % 60).toString().padStart(2, '0');
  const isDanger = timeLeft < 60;

  return (
    <div className={`h-screen w-screen flex flex-col ${THEME.bg} text-white font-mono`}>
      <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-black/50">
        <div className="flex items-center gap-4">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="font-bold tracking-widest uppercase text-sm">Active Uplink: {config.roomName}</span>
        </div>
        <div className={`font-black text-2xl tracking-widest ${isDanger ? 'text-red-500 animate-pulse' : 'text-white'}`}>
          {mins}:{secs}
        </div>
        <button 
          onClick={handleSimulateSubmit}
          className={`px-6 py-2 rounded-lg bg-white text-black font-black uppercase text-xs hover:bg-gray-200`}
        >
          Submit Solution
        </button>
      </header>
      <div className="flex-1 flex">
        <div className="w-1/3 border-r border-white/10 p-6 overflow-y-auto">
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-4 font-sans">Mission Objective</h2>
          <p className="text-sm text-gray-400 leading-relaxed mb-6">Build a robust simulation to process multi-dimensional arrays in O(n) time complexity. Ensure edge cases for empty vectors are handled properly.</p>
          <div className="space-y-4">
            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
              <p className="text-xs text-gray-500 mb-1">Constraints</p>
              <code className="text-sm text-[#8b5cf6]">1 {'<='} arr.length {'<='} 10^5</code>
            </div>
          </div>
        </div>
        <div className="flex-1 p-6 relative bg-[#09090b]">
          {lines.map((l, i) => <div key={i} className="text-gray-400">{l}</div>)}
          <div className="absolute bottom-6 right-6 text-[10px] text-gray-600 uppercase tracking-widest">
            SIMULATION MODE — Click SUBMIT to end
          </div>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------
// 6. RESULTS SCREEN
// --------------------------------------------------------
function ResultsScreen({ setView, config, participants, setRoomConfig, setParticipants, currentUser }) {
  const myResult = participants.find(p => p.id === currentUser.id);
  const isWinner = myResult?.rank === 1;

  // Max possible score assumes 0 seconds taken and 100% accuracy
  const maxPossibleScore = calculateScore(0, config, 10, 10);

  const getRankColor = (rank, isMe) => {
    if (isMe) return 'bg-[#8b5cf6]/20 border-[#8b5cf6]/50';
    if (rank === 1) return 'bg-yellow-500/10 border-yellow-500/30';
    if (rank === 2) return 'bg-gray-300/10 border-gray-300/30';
    if (rank === 3) return 'bg-orange-700/10 border-orange-700/30';
    return 'bg-white/5 border-white/5';
  };

  const getRankIconColor = (rank) => {
    if (rank === 1) return 'text-yellow-500';
    if (rank === 2) return 'text-gray-300';
    if (rank === 3) return 'text-orange-700';
    return 'text-gray-600';
  };

  const handleRematch = () => {
    setParticipants(prev => prev.map(p => ({ ...p, status: 'STANDBY', finalScore: 0 })));
    setView('WAITING');
  };

  return (
    <div className={`min-h-screen ${THEME.bg} text-white font-mono p-4 md:p-10 flex flex-col items-center overflow-y-auto`}>
      <div className="max-w-5xl w-full flex flex-col gap-10">
        
        {/* Header */}
        <div className="text-center space-y-4 py-10 border-b border-white/10">
          <h1 className={`text-6xl md:text-8xl font-black uppercase tracking-tighter font-sans ${isWinner ? 'text-yellow-500 drop-shadow-[0_0_30px_rgba(234,179,8,0.3)]' : 'text-gray-400'}`}>
            {isWinner ? 'Mission Complete' : 'Mission Failed'}
          </h1>
          <p className="text-sm tracking-[0.4em] uppercase font-bold text-gray-500">After-Action Report // {config.roomName}</p>
        </div>

        {/* Leaderboard */}
        <div className="space-y-4">
          <div className="grid grid-cols-12 gap-4 px-6 text-[10px] font-black uppercase tracking-widest text-gray-500">
            <div className="col-span-1 text-center">Rank</div>
            <div className="col-span-4">Operator</div>
            <div className="col-span-2 text-right">Score</div>
            <div className="col-span-2 text-center">Grade</div>
            <div className="col-span-3 text-right">Metrics (Time / Acc)</div>
          </div>

          {participants.map(p => {
            const isMe = p.id === currentUser.id;
            const gradeInfo = getGrade(p.finalScore, maxPossibleScore);

            return (
              <div 
                key={p.id} 
                className={`grid grid-cols-12 gap-4 px-6 py-5 items-center rounded-2xl border transition-all ${getRankColor(p.rank, isMe)}`}
              >
                <div className={`col-span-1 text-center font-black text-2xl ${getRankIconColor(p.rank)}`}>
                  #{p.rank}
                </div>
                
                <div className="col-span-4 flex items-center gap-4">
                  <div className="w-10 h-10 bg-black/50 rounded-lg flex items-center justify-center font-black text-lg border border-white/10">
                    {p.username.charAt(0)}
                  </div>
                  <div>
                    <p className={`font-bold uppercase tracking-wide text-sm ${isMe ? THEME.accent : 'text-white'}`}>{p.username}</p>
                    {isMe && <p className="text-[9px] uppercase tracking-widest text-[#8b5cf6]">You</p>}
                  </div>
                </div>

                <div className="col-span-2 text-right">
                  <p className="font-black text-2xl tracking-tighter">{p.finalScore}</p>
                </div>

                <div className="col-span-2 flex justify-center">
                  <div className={`px-3 py-1 rounded font-black tracking-widest text-xs flex items-center gap-2 ${gradeInfo.color}`}>
                    <span className="text-lg leading-none">{gradeInfo.letter}</span>
                    <span className="hidden sm:inline-block text-[8px] leading-none opacity-80">{gradeInfo.label}</span>
                  </div>
                </div>

                <div className="col-span-3 text-right">
                  <p className="text-sm font-bold">{p.timeTakenStr}</p>
                  <p className="text-[10px] text-gray-400 tracking-widest font-bold mt-1">
                    {p.testCasesPassed}/{p.totalTestCases} ({Math.round(p.accuracyPercent)}%)
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-8 pb-20">
          <button 
            onClick={handleRematch}
            className={`px-8 py-4 rounded-xl ${THEME.accentBg} ${THEME.accentHover} text-white font-black uppercase tracking-widest text-xs transition-all hover:scale-105 active:scale-95`}
          >
            Request Rematch
          </button>
          <button 
            onClick={() => setView('MENU')}
            className={`px-8 py-4 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 font-black uppercase tracking-widest text-xs transition-all`}
          >
            New Mission
          </button>
        </div>

      </div>
    </div>
  );
}
