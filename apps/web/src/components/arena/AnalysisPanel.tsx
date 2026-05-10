import React from 'react';
import { Cpu, Terminal, Zap, Activity, BrainCircuit, Mic2, MicOff } from 'lucide-react';
import { useMatch } from '../../contexts/MatchContext';
import { VoiceVisualizer } from '../ui/VoiceVisualizer';
import { useAuthStore } from '../../store/useAuthStore';

export const AnalysisPanel: React.FC = () => {
    const { state } = useMatch();
    const { user } = useAuthStore();
    const { players, opponentReady, opponentLanguage, opponentTypingLines, opponentSpeaking, verdict, opponentSubmissionStatus } = state;
    
    // Find the actual opponent (the player who isn't me)
    const opponent = players.find(p => p.id !== user?.id) || players.find(p => p.id !== null);

    return (
        <div className="flex flex-col h-full bg-[#050507] border-l border-white/5 overflow-hidden">
            {/* Real-time Complexity & Quality */}
            <div className="p-6 border-b border-white/5 space-y-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BrainCircuit size={16} className="text-accent-secondary" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Logic Metrics</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                        <span className="text-[9px] font-mono text-gray-400 uppercase">Live_Analysis</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-white/2 border border-white/5 space-y-1.5">
                        <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Time Complexity</p>
                        <div className="text-xl font-black text-white font-mono tracking-tighter">
                            {verdict?.timeComplexity || 'O(N)'}
                        </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/2 border border-white/5 space-y-1.5">
                        <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Logic Quality</p>
                        <div className="text-xl font-black text-accent-secondary font-mono tracking-tighter">
                            {verdict?.qualityScore ? `${verdict.qualityScore}/10` : 'S-Tier'}
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between text-[8px] font-black uppercase tracking-[0.2em] text-gray-500">
                        <span>Validation Progress</span>
                        <span className="text-white">{verdict?.testCasesPass || 0}/{verdict?.testCasesTotal || 0}</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary transition-all duration-1000 shadow-[0_0_12px_rgba(139,92,246,0.3)]" 
                            style={{ width: `${(verdict?.testCasesPass / verdict?.testCasesTotal) * 100 || 0}%` }} 
                        />
                    </div>
                </div>
            </div>

            {/* Opponent Presence HUD */}
            <div className="flex-1 flex flex-col bg-black/20">
                <div className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-white/2">
                    <div className="flex items-center gap-2">
                        <Cpu size={14} className="text-red-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Rival Uplink</span>
                    </div>
                    <div className="flex items-center gap-3">
                        {opponentSpeaking ? <VoiceVisualizer isActive={true} size="sm" color="#ef4444" /> : <MicOff size={12} className="text-gray-700" />}
                        <div className={`px-2 py-0.5 rounded-full text-[8px] font-black border ${
                            opponentSubmissionStatus === 'ACCEPTED' ? 'bg-green-500/10 border-green-500/30 text-green-500' :
                            opponentSubmissionStatus === 'SUBMITTED' ? 'bg-amber-500/10 border-amber-500/30 text-amber-500 animate-pulse' :
                            'bg-red-500/10 border-red-500/30 text-red-500'
                        }`}>
                            {opponentSubmissionStatus}
                        </div>
                    </div>
                </div>

                <div className="p-8 flex-1 space-y-10">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-red-500/20 to-purple-600/20 border border-white/10 flex items-center justify-center text-red-500 font-black text-2xl shadow-xl relative overflow-hidden group">
                            {opponent?.username?.[0].toUpperCase() || '?'}
                            <div className="absolute inset-0 bg-gradient-to-t from-red-500/10 to-transparent pointer-events-none" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-xl font-black tracking-tighter uppercase text-white">{opponent?.username || 'ANONYMOUS'}</h4>
                            <p className="text-[9px] font-black text-accent-secondary uppercase tracking-[0.2em]">{opponent?.tier || 'UNKNOWN TIER'} • {opponent?.rating || 0} RP</p>
                        </div>
                    </div>

                    <div className="grid gap-6">
                        <div className="space-y-2">
                            <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-gray-500">
                                <span>Logic Generation</span>
                                <span className={opponentTypingLines > 0 ? 'text-green-500' : 'text-gray-600'}>
                                    {opponentTypingLines > 0 ? `${opponentTypingLines} LINES` : 'IDLE'}
                                </span>
                            </div>
                            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                {opponentTypingLines > 0 && <div className="h-full w-1/2 bg-green-500 animate-[shimmer_2s_infinite]" />}
                            </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-black border border-white/5 font-mono text-[10px] text-gray-500 overflow-hidden relative group">
                            <div className="absolute top-2 right-3 flex gap-1">
                                <div className="w-1 h-1 rounded-full bg-red-500/50" />
                                <div className="w-1 h-1 rounded-full bg-red-500/30" />
                            </div>
                            <div className="space-y-1 opacity-40">
                                <p className="text-red-500/50">// Intercepting Buffer...</p>
                                <p>const solution = () ={'>'} {'{'}</p>
                                <p>  const data = fetchStream();</p>
                                <p>  return data.map(n ={'>'} n * 2);</p>
                                <p>{'}'};</p>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent pointer-events-none" />
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-red-500/5 border-t border-red-500/10">
                    <div className="flex items-center gap-2 mb-2">
                        <Activity size={12} className="text-red-500" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-red-500">Operational Warning</span>
                    </div>
                    <p className="text-[10px] text-gray-500 font-light leading-relaxed">
                        Rival operator has completed 80% of test patterns. Efficiency shortfall detected.
                    </p>
                </div>
            </div>
        </div>
    );
};
