import React, { useEffect, useState, useRef } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { useNav } from '../../navigation/NavigationContext';
import { Zap, Swords, X, Check, Clock, ShieldAlert } from 'lucide-react';
import { useLayout } from '../../contexts/LayoutContext';

export interface IncomingChallengeData {
    challengeId: string;
    challenger: {
        id: string;
        username: string;
        rating: number;
        tier: string;
    };
    problemId?: string;
    problemTitle?: string;
}

export const IncomingChallengeModal: React.FC = () => {
    const { on, emit } = useSocket();
    const { goToArenaMatch } = useNav();
    const { isLight } = useLayout();
    const [incomingChallenge, setIncomingChallenge] = useState<IncomingChallengeData | null>(null);
    const [timeLeft, setTimeLeft] = useState(45);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const cleanupReceived = on('challenge:received', (data: IncomingChallengeData) => {
            console.log('⚡ [CHALLENGE] Incoming challenge received:', data);
            setIncomingChallenge(data);
            setTimeLeft(45);
        });

        const cleanupCancelled = on('challenge:cancelled', ({ challengeId }: { challengeId: string }) => {
            setIncomingChallenge(prev => (prev?.challengeId === challengeId ? null : prev));
        });

        const cleanupMatch = on('MATCH_FOUND', (data: any) => {
            const matchId = data.matchId || data.roomId;
            if (matchId) {
                setIncomingChallenge(null);
                goToArenaMatch(matchId);
            }
        });

        return () => {
            cleanupReceived();
            cleanupCancelled();
            cleanupMatch();
        };
    }, [on, goToArenaMatch]);

    useEffect(() => {
        if (incomingChallenge) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current!);
                        // Auto-decline on timeout
                        emit('challenge:decline', { challengeId: incomingChallenge.challengeId });
                        setIncomingChallenge(null);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [incomingChallenge, emit]);

    const handleAccept = () => {
        if (!incomingChallenge) return;
        emit('challenge:accept', { challengeId: incomingChallenge.challengeId });
        setIncomingChallenge(null);
    };

    const handleDecline = () => {
        if (!incomingChallenge) return;
        emit('challenge:decline', { challengeId: incomingChallenge.challengeId });
        setIncomingChallenge(null);
    };

    if (!incomingChallenge) return null;

    const { challenger, problemTitle } = incomingChallenge;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
            <div className={`relative w-full max-w-lg rounded-3xl p-8 border shadow-2xl overflow-hidden transition-all transform animate-scaleUp ${
                isLight 
                    ? 'bg-white border-purple-200 text-gray-900 shadow-purple-900/20' 
                    : 'bg-[#0f0f18] border-purple-500/40 text-white shadow-[0_0_80px_rgba(139,92,246,0.3)]'
            }`}>
                {/* Background ambient lighting */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none" />

                {/* Header Tag */}
                <div className="flex items-center justify-between mb-6 relative z-10">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-[10px] font-bold uppercase tracking-wider text-purple-400">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                        </span>
                        INCOMING CHALLENGE PROTOCOL
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 font-bold">
                        <Clock size={14} className="text-purple-400" />
                        <span>{timeLeft}s</span>
                    </div>
                </div>

                {/* Challenger Card */}
                <div className="text-center space-y-4 mb-8 relative z-10">
                    <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-purple-500 via-indigo-600 to-cyan-500 flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-purple-500/25 border border-white/20">
                        {challenger.username[0].toUpperCase()}
                    </div>

                    <div>
                        <h3 className="text-2xl font-black uppercase tracking-tight">
                            {challenger.username}
                        </h3>
                        <p className="text-xs text-purple-400 font-bold uppercase tracking-wider mt-1">
                            {challenger.tier} // <span className="text-white">{challenger.rating.toLocaleString()} RP</span>
                        </p>
                    </div>

                    <p className={`text-xs max-w-sm mx-auto leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>
                        Operator has initiated an encrypted tactical duel uplink against you.
                    </p>

                    {problemTitle && (
                        <div className={`p-3.5 rounded-2xl border text-left flex items-center justify-between ${
                            isLight ? 'bg-purple-50 border-purple-200' : 'bg-white/5 border-white/10'
                        }`}>
                            <div>
                                <span className="text-[9px] uppercase font-bold text-gray-400 block tracking-widest">Locked Sector</span>
                                <span className="text-xs font-bold text-purple-300">{problemTitle}</span>
                            </div>
                            <Swords size={18} className="text-purple-400" />
                        </div>
                    )}
                </div>

                {/* Progress countdown bar */}
                <div className="w-full bg-white/10 h-1 rounded-full mb-6 overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all duration-1000 ease-linear"
                        style={{ width: `${(timeLeft / 45) * 100}%` }}
                    />
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-4 relative z-10">
                    <button
                        onClick={handleDecline}
                        className={`py-4 px-6 rounded-2xl font-black uppercase text-xs tracking-widest border transition-all flex items-center justify-center gap-2 ${
                            isLight 
                                ? 'bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-800' 
                                : 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300 hover:text-white'
                        }`}
                    >
                        <X size={16} /> Decline
                    </button>

                    <button
                        onClick={handleAccept}
                        className="py-4 px-6 rounded-2xl font-black uppercase text-xs tracking-widest bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white shadow-[0_0_25px_rgba(124,58,237,0.5)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 border border-purple-400/30"
                    >
                        <Zap size={16} className="fill-current" /> Accept Duel
                    </button>
                </div>
            </div>
        </div>
    );
};
