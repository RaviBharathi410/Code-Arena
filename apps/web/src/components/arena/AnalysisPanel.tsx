import React from 'react';
import { Cpu, Terminal, Zap, Activity, BrainCircuit, MicOff, Shield } from 'lucide-react';
import { useMatch } from '../../contexts/MatchContext';
import { VoiceVisualizer } from '../ui/VoiceVisualizer';
import { useAuthStore } from '../../store/useAuthStore';

export const AnalysisPanel: React.FC = () => {
    const { state } = useMatch();
    const { user } = useAuthStore();
    const { players, opponentLanguage, opponentTypingLines, opponentSpeaking, verdict, opponentSubmissionStatus } = state;
    
    // Find the actual opponent (the player who isn't me)
    const opponent = players.find(p => p.id !== user?.id) || players.find(p => p.id !== null);

    const validationPct = verdict?.testCasesTotal 
        ? Math.round(((verdict?.testCasesPass || 0) / verdict.testCasesTotal) * 100) 
        : 0;

    return (
        <div className="flex flex-col h-full bg-[#07070d] border-l border-white/10 overflow-hidden font-sans">
            {/* Real-time Complexity & Quality */}
            <div className="p-6 border-b border-white/10 space-y-6 bg-black/40 backdrop-blur-md">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BrainCircuit size={15} className="text-accent-secondary" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                            Logic Vectors
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Live Uplink</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-2xl bg-[#0e0e18] border border-white/10 space-y-1 hover:border-accent-secondary/30 transition-all shadow-md">
                        <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider">Time Complexity</p>
                        <div className="text-xl font-black text-white tracking-tight">
                            {verdict?.timeComplexity || 'O(N)'}
                        </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#0e0e18] border border-white/10 space-y-1 hover:border-accent-secondary/30 transition-all shadow-md">
                        <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider">Logic Quality</p>
                        <div className="text-xl font-black text-accent-primary tracking-tight">
                            {verdict?.qualityScore ? `${verdict.qualityScore}/10` : 'S-Tier'}
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                        <span>Validation Progress</span>
                        <span className="text-white font-semibold">{verdict?.testCasesPass || 0}/{verdict?.testCasesTotal || 0} ({validationPct}%)</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary transition-all duration-1000 shadow-[0_0_10px_rgba(139,92,246,0.5)]" 
                            style={{ width: `${validationPct}%` }} 
                        />
                    </div>
                </div>
            </div>

            {/* Opponent Presence HUD */}
            <div className="flex-1 flex flex-col bg-black/20 overflow-hidden">
                <div className="px-6 py-3.5 flex items-center justify-between border-b border-white/10 bg-black/40">
                    <div className="flex items-center gap-2">
                        <Shield size={13} className="text-red-400" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Rival Uplink</span>
                    </div>
                    <div className="flex items-center gap-3">
                        {opponentSpeaking ? <VoiceVisualizer isActive={true} color="#ef4444" /> : <MicOff size={12} className="text-zinc-600" />}
                        <div className={`px-2.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider border ${
                            opponentSubmissionStatus === 'ACCEPTED' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]' :
                            opponentSubmissionStatus === 'SUBMITTED' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse' :
                            'bg-red-500/10 border-red-500/30 text-red-400'
                        }`}>
                            {opponentSubmissionStatus || 'ACTIVE'}
                        </div>
                    </div>
                </div>
 
                <div className="p-6 flex-1 space-y-6 overflow-y-auto custom-scrollbar">
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500/30 via-purple-600/20 to-black border border-red-500/30 flex items-center justify-center text-red-400 font-black text-2xl shadow-xl relative overflow-hidden group">
                            {opponent?.username?.[0]?.toUpperCase() || 'R'}
                            <div className="absolute inset-0 bg-gradient-to-t from-red-500/10 to-transparent pointer-events-none" />
                        </div>
                        <div className="space-y-1 min-w-0">
                            <h4 className="text-base font-black tracking-tight uppercase text-white truncate">{opponent?.username || 'RIVAL_OPERATOR'}</h4>
                            <p className="text-[9px] font-bold text-accent-primary uppercase tracking-wider">
                                {opponent?.tier || 'GRANDMASTER'} • {opponent?.rankRating || 2400} RP
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-4">
                        <div className="space-y-2">
                            <div className="flex justify-between text-[8px] font-bold uppercase tracking-wider text-zinc-400">
                                <span>Logic Generation Speed</span>
                                <span className={opponentTypingLines > 0 ? 'text-emerald-400 font-semibold' : 'text-zinc-500'}>
                                    {opponentTypingLines > 0 ? `${opponentTypingLines} LINES/MIN` : 'IDLE'}
                                </span>
                            </div>
                            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                {opponentTypingLines > 0 && <div className="h-full w-1/2 bg-emerald-400 animate-[shimmer_2s_infinite]" />}
                            </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-black/60 border border-white/10 font-mono text-[11px] text-zinc-500 overflow-hidden relative shadow-inner">
                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5">
                                <span className="text-[9px] text-red-400 font-bold uppercase tracking-wider font-sans">Intercepted Stream</span>
                                <span className="text-[9px] text-zinc-400 uppercase font-semibold font-sans">{opponentLanguage || 'JS'}</span>
                            </div>
                            <div className="space-y-1 opacity-50 font-mono text-[10px]">
                                <p className="text-red-400/70">// Tactical stream capture...</p>
                                <p>const evaluate = (stream) =&gt; &#123;</p>
                                <p>  const cache = new Map();</p>
                                <p>  return stream.reduce((a, b) =&gt; a ^ b);</p>
                                <p>&#125;;</p>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent pointer-events-none" />
                        </div>
                    </div>
                </div>

                <div className="p-4 px-6 bg-red-950/20 border-t border-red-500/20">
                    <div className="flex items-center gap-2 mb-1">
                        <Shield size={12} className="text-red-400" />
                        <span className="text-[8px] font-bold uppercase tracking-wider text-red-400">Combat Integrity // Rule 14E</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 font-light leading-relaxed">
                        Real-time AI assistance is strictly prohibited during ranked combat. Neural AI Coach and Socratic guidance are active in Practice Lab.
                    </p>
                </div>
            </div>
        </div>
    );
};
