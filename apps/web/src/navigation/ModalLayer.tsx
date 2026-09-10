import React from 'react';
import { useNav, MODALS } from './NavigationContext';
import { 
    CheckCircle2, Cpu, X, Timer, Layers, 
    Zap, TrendingUp, ShieldAlert 
} from 'lucide-react';
import { IncomingChallengeModal } from '../components/arena/IncomingChallengeModal';

// ── Modal Layer ───────────────────────────────────────────────────────────
// Renders the active modal from navigation context as a global overlay.
// Individual modal UIs can be defined inline here or imported from components.

const ModalLayer: React.FC = () => {
    const { modal, closeModal } = useNav();

    return (
        <>
            <IncomingChallengeModal />
            {modal && (
                <div className="fixed inset-0 z-[200]">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={closeModal}
                    />

                    {/* Modal Content */}
                    <div className="relative z-10 flex items-center justify-center h-full p-6">
                        {modal === MODALS.CONFIRM_LEAVE && (
                            <ConfirmLeaveModal onClose={closeModal} />
                        )}
                        {modal === MODALS.MATCH_RESULTS && (
                            <MatchResultsModal onClose={closeModal} />
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

// ── Confirm Leave Modal ───────────────────────────────────────────────────

const ConfirmLeaveModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { goToDashboard } = useNav();

    return (
        <div className="w-full max-w-md bg-[#0a0a0a] border border-red-500/30 rounded-3xl p-8 space-y-6 shadow-[0_0_50px_rgba(239,68,68,0.1)]">
            <div className="flex items-center gap-4 text-red-500">
                <div className="w-10 h-10 rounded-2xl bg-red-500/20 flex items-center justify-center">
                    <ShieldAlert size={20} />
                </div>
                <div>
                    <h3 className="text-xl font-black uppercase tracking-tighter text-white">Warning: Combat Active</h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">Protocol Abandonment Imminent</p>
                </div>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
                Leaving a live session will result in immediate rating penalty and disconnection from CodeArena. Confirm termination?
            </p>
            <div className="flex gap-4">
                <button
                    onClick={onClose}
                    className="flex-1 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all text-white"
                >
                    Stay in Combat
                </button>
                <button
                    onClick={() => { onClose(); goToDashboard(); }}
                    className="flex-1 py-4 bg-red-500 hover:bg-red-400 text-black rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-red-500/20"
                >
                    Terminate Session
                </button>
            </div>
        </div>
    );
};

// ── Match Results Modal ───────────────────────────────────────────────────

const MatchResultsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { goToDashboard, params } = useNav();
    
    // Attempt to extract real match details from navigation context params
    const matchState = params?.matchState || {};
    const result = matchState.result || (Math.random() > 0.5 ? 'VICTORY' : 'DEFEAT');
    const isVictory = result === 'VICTORY';
    const rpGain = matchState.rpGain || (isVictory ? 32 : -15);
    const accuracy = matchState.accuracy || (isVictory ? 100 : 75);
    const timeTaken = matchState.timeTaken || 142; // seconds
    const executionTime = matchState.executionTime || 28; // ms
    const memoryMB = matchState.memoryMB || 12.4;
    const complexity = matchState.complexity || 'O(N log N)';
    const cpuCycles = matchState.cpuCycles || '2.4M';
    const inputSize = matchState.inputSize || 'Competition Set';

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <div className="w-full max-w-4xl bg-[#08080c]/90 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)] flex flex-col md:flex-row backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300">
            {/* Left Column: Status Badge */}
            <div className={`w-full md:w-80 p-10 flex flex-col justify-between relative overflow-hidden shrink-0 ${isVictory ? 'bg-gradient-to-br from-purple-600 to-violet-800' : 'bg-gradient-to-br from-red-600 to-rose-700'}`}>
                <div className="space-y-2 relative z-10">
                    <p className="text-white/60 text-[9px] font-black uppercase tracking-[0.3em]">Protocol Status</p>
                    <h2 className="text-5xl font-black text-white leading-none tracking-tighter uppercase">{result}</h2>
                </div>

                <div className="relative z-10 mt-12 md:mt-0">
                    <div className="text-white/80 font-black text-[9px] uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
                        <TrendingUp size={12} /> Rank Adjustment
                    </div>
                    <div className="text-5xl font-black text-white">
                        {rpGain >= 0 ? `+${rpGain}` : rpGain} <span className="text-sm font-bold text-white/50">RP</span>
                    </div>
                    <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest mt-4">Calibration Success</p>
                </div>

                {/* Shimmering backdrop pattern */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 opacity-10 rotate-12 pointer-events-none">
                    <Zap size={280} strokeWidth={1} />
                </div>
            </div>

            {/* Right Column: Detailed Analytics & Metrics */}
            <div className="flex-1 p-10 space-y-8 flex flex-col justify-between">
                <div className="space-y-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-2xl font-black tracking-tight uppercase text-white">Neural Evaluation</h3>
                            <p className="text-gray-500 text-[9px] font-mono tracking-widest uppercase">Target sector analysis complete</p>
                        </div>
                        <button onClick={() => { onClose(); goToDashboard(); }} className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white hover:text-black transition-all text-white">
                            <X size={16} />
                        </button>
                    </div>

                    {/* Grid of Key Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                            { icon: <CheckCircle2 size={16} />, label: 'Accuracy', val: accuracy + '%' },
                            { icon: <Timer size={16} />, label: 'Duration', val: formatTime(timeTaken) },
                            { icon: <Cpu size={16} />, label: 'Runtime', val: executionTime + ' ms' },
                            { icon: <Layers size={16} />, label: 'Complexity', val: complexity },
                        ].map((m, i) => (
                            <div key={i} className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all flex flex-col justify-between h-28">
                                <div className="text-accent-secondary">{m.icon}</div>
                                <div>
                                    <p className="text-xl font-black text-white">{m.val}</p>
                                    <p className="text-[8px] font-black uppercase tracking-widest text-gray-500 mt-1">{m.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Extra details list */}
                    <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                            <span className="text-gray-500 uppercase">Input set complexity</span>
                            <span className="text-white font-bold">{inputSize}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-mono">
                            <span className="text-gray-500 uppercase">CPU cycles count</span>
                            <span className="text-white font-bold">{cpuCycles}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-mono">
                            <span className="text-gray-500 uppercase">Memory allocation</span>
                            <span className="text-white font-bold">{memoryMB} MB</span>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => { onClose(); goToDashboard(); }}
                    className="w-full py-5 rounded-2xl bg-white hover:bg-gray-200 text-black font-black uppercase tracking-[0.25em] text-xs hover:scale-[1.01] active:scale-[0.99] transition-all shadow-lg"
                >
                    Return to Command Center
                </button>
            </div>
        </div>
    );
};

export default ModalLayer;
