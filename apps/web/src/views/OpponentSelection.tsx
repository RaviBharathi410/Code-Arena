import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNav } from '../navigation/NavigationContext';
import { useSocket } from '../hooks/useSocket';
import { SERVER_EVENTS, CLIENT_EVENTS } from '../constants/socketEvents';
import { gsap } from 'gsap';
import { Users, Zap, Target, Search, Menu, Clock, User as UserIcon } from 'lucide-react';
import { useLayout } from '../contexts/LayoutContext';
import type { User } from '../types';
import { useMatch } from '../contexts/MatchContext';

export const OpponentSelection: React.FC<{ currentUser: User }> = ({ currentUser }) => {
    const { goToArenaMatch, params: navParams, goToProblems, goToUserProfile } = useNav();
    const { setIsMenuOpen } = useLayout();
    const { connect, connected, on, emit } = useSocket();

    // Local State
    const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOpponent, setSelectedOpponent] = useState<any | null>(null);
    const [isWaiting, setIsWaiting] = useState(false);
    const [activeChallengeId, setActiveChallengeId] = useState<string | null>(null);
    const [waitingMessage, setWaitingMessage] = useState('Broadcasting challenge signal...');
    const [challengeFeedback, setChallengeFeedback] = useState<string | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);

    // Filtered list (Derived value - sorted by Live status first, then Rating)
    const filteredUsers = useMemo(() => {
        return onlineUsers
            .filter(u =>
                u.username.toLowerCase().includes(searchQuery.toLowerCase()) &&
                u.id !== currentUser.id
            )
            .sort((a, b) => {
                if (a.isLive && !b.isLive) return -1;
                if (!a.isLive && b.isLive) return 1;
                return (b.rating || 0) - (a.rating || 0);
            });
    }, [onlineUsers, searchQuery, currentUser.id]);

    useEffect(() => {
        connect();

        // Request live operators from server immediately
        emit('users:get_online');

        const cleanupOnline = on(SERVER_EVENTS.ONLINE_USERS, (users: any[]) => setOnlineUsers(users));
        const cleanupJoined = on(SERVER_EVENTS.USER_JOINED, (user: any) => setOnlineUsers(prev => [...prev.filter(u => u.id !== user.id), user]));
        const cleanupLeft = on(SERVER_EVENTS.USER_LEFT, ({ id }: { id: string }) => setOnlineUsers(prev => prev.filter(u => u.id !== id)));
        
        const cleanupSent = on('challenge:sent', (data: any) => {
            if (data.challengeId) setActiveChallengeId(data.challengeId);
            setWaitingMessage(data.message || 'Challenge dispatched. Awaiting handshake...');
        });

        const cleanupAccepted = on('challenge:accepted', ({ matchId }: { matchId: string }) => {
            setIsWaiting(false);
            setActiveChallengeId(null);
            goToArenaMatch(matchId);
        });

        const cleanupDeclined = on('challenge:declined', (data: any) => {
            setIsWaiting(false);
            setActiveChallengeId(null);
            setChallengeFeedback(data.message || 'Operator declined the challenge signal.');
            setTimeout(() => setChallengeFeedback(null), 5000);
        });

        const cleanupError = on('challenge:error', (data: any) => {
            setIsWaiting(false);
            setActiveChallengeId(null);
            setChallengeFeedback(data.message || 'Challenge protocol failed.');
            setTimeout(() => setChallengeFeedback(null), 5000);
        });

        const cleanupMatch = on('MATCH_FOUND', (data: any) => {
            setIsWaiting(false);
            setActiveChallengeId(null);
            const matchId = data.matchId || data.roomId;
            if (matchId) goToArenaMatch(matchId);
        });

        const ctx = gsap.context(() => {
            gsap.from('.header-element', { y: -30, duration: 0.8, stagger: 0.1, ease: 'power3.out' });
            const cards = containerRef.current?.querySelectorAll('.opponent-card');
            if (cards && cards.length > 0) {
                gsap.from('.opponent-card', { y: 30, duration: 0.8, stagger: 0.05, ease: 'power3.out', delay: 0.2 });
            }
        }, containerRef);

        return () => {
            cleanupOnline();
            cleanupJoined();
            cleanupLeft();
            cleanupSent();
            cleanupAccepted();
            cleanupDeclined();
            cleanupError();
            cleanupMatch();
            ctx.revert();
        };
    }, [connect, on, emit, goToArenaMatch]);

    const { createRoom } = useMatch();

    const handleChallenge = () => {
        if (!selectedOpponent || isWaiting) return;
        setIsWaiting(true);
        setChallengeFeedback(null);
        setWaitingMessage(`Transmitting challenge signal to ${selectedOpponent.username}...`);
        emit('challenge:send', { toUserId: selectedOpponent.id, problemId: navParams.problemId });
    };

    const handleCancelChallenge = () => {
        if (activeChallengeId) {
            emit('challenge:cancel', { challengeId: activeChallengeId });
        }
        setIsWaiting(false);
        setActiveChallengeId(null);
        setChallengeFeedback('Challenge broadcast cancelled.');
        setTimeout(() => setChallengeFeedback(null), 4000);
    };

    const handleUserProfile = (userId: string) => {
        goToUserProfile(userId);
    };

    const problemId = navParams.problemId;

    const { isLight } = useLayout();

    return (
        <div ref={containerRef} className={`h-screen w-full flex flex-col relative overflow-hidden transition-colors duration-500 ${isLight ? 'bg-gray-50 text-black' : 'bg-[#050507] text-white'}`}>
            <div className="flex-1 flex flex-col px-4 md:px-8 py-8 lg:py-12 relative z-10 overflow-y-auto custom-scrollbar">

                <header className="relative z-10 mb-12 header-element w-full">
                    <div className="flex items-center justify-between w-full mb-8">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setIsMenuOpen(true)} className={`p-3.5 border rounded-2xl transition-all group shadow-sm ${isLight ? 'bg-black text-white border-black/10' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                                <Menu size={20} className="group-hover:scale-110 transition-transform" />
                            </button>
                            <div className={`px-4 py-1.5 text-[9px] font-black tracking-widest uppercase border rounded-full backdrop-blur-sm flex items-center gap-3 ${isLight ? 'border-black/10 bg-black/5 text-black' : 'border-white/10 bg-white/5 text-white'}`}>
                                <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                                {connected ? 'Signal Strength: Maximum' : 'Connecting to Uplink...'}
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right hidden sm:block">
                                <p className={`text-[10px] font-black uppercase tracking-tighter leading-none ${isLight ? 'text-black' : 'text-white'}`}>{currentUser?.username || 'Operator'}</p>
                                <p className="text-[8px] font-bold text-accent-secondary uppercase tracking-[0.2em] leading-none mt-1">Uplink Active</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center text-black font-black text-sm shadow-lg">
                                {(currentUser?.username || 'O')[0].toUpperCase()}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 flex flex-col items-start text-left pl-[10px]">
                        <h1 className="text-6xl md:text-7xl font-black tracking-tighter uppercase leading-[0.85]">
                            Operator <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-primary to-accent-secondary">Registry</span>
                        </h1>
                        <p className={`text-lg max-w-2xl font-light leading-relaxed mt-4 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                            Scan global sectors for active operators. Initiate logic-based combat protocols to acquire rank points.
                        </p>
                    </div>

                    {problemId && (
                        <div className="mt-10 flex flex-row items-center gap-4 pl-[10px]">
                            <div className="px-4 py-2 rounded-xl bg-accent-secondary/10 border border-accent-secondary/20 text-[10px] font-black uppercase tracking-[0.2em] text-accent-secondary flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-accent-secondary animate-pulse" />
                                PROBLEM LOCKED: {problemId.slice(0, 8)}
                            </div>
                        </div>
                    )}
                </header>

                <div className="relative z-10 flex-1 flex flex-col lg:flex-row gap-10">
                    <div className="flex-1 space-y-4">
                        <div className="header-element mb-6 relative">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search operator registry..."
                                className={`w-full border rounded-2xl py-5 pl-14 pr-6 text-sm font-bold placeholder-gray-500 focus:outline-none focus:border-accent-secondary/40 transition-all ${isLight ? 'bg-white border-black/10 text-black shadow-sm focus:shadow-md' : 'bg-[#12121a] border-white/20 text-white'}`}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredUsers.length === 0 ? (
                                <div className="col-span-full p-20 rounded-[3rem] border border-dashed border-white/10 flex flex-col items-center justify-center text-center opacity-40">
                                    <Users size={48} className="mb-4" />
                                    <p className="text-lg font-bold uppercase tracking-tighter">No operators found</p>
                                    <p className="text-[10px] uppercase tracking-widest mt-2">{searchQuery ? 'Broaden your search parameters' : 'The arena is currently empty'}</p>
                                </div>
                            ) : (
                                filteredUsers.map((opp) => (
                                    <div
                                        key={opp.id}
                                        onClick={() => setSelectedOpponent(opp)}
                                        className={`opponent-card p-8 rounded-[2.5rem] border cursor-pointer transition-all duration-500 relative overflow-hidden group ${selectedOpponent?.id === opp.id
                                            ? (isLight ? 'bg-white border-accent-secondary shadow-2xl scale-[1.02]' : 'bg-[#252535] border-accent-secondary scale-[1.02] shadow-[0_0_60px_rgba(139,92,246,0.3)]')
                                            : (isLight ? 'bg-white border-black/10 hover:border-black/20 hover:shadow-xl' : 'bg-[#151520] border-white/20 hover:bg-[#1a1a28] hover:border-white/40')
                                            }`}
                                    >
                                        <div className="flex items-center gap-4 mb-10 relative z-10">
                                            <div className="relative">
                                                <div className="w-14 h-14 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-2xl flex items-center justify-center font-black text-black text-xl shadow-lg">
                                                    {opp.username[0].toUpperCase()}
                                                </div>
                                                {opp.isLive && (
                                                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-black"></span>
                                                    </span>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className={`font-black text-2xl uppercase tracking-tighter transition-colors ${isLight ? 'text-black' : 'text-white'}`}>{opp.username}</h3>
                                                {opp.status === 'in_match' ? (
                                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/15 border border-red-500/40 text-[9px] text-red-400 uppercase font-black tracking-[0.15em] mt-1 shadow-[0_0_12px_rgba(239,68,68,0.25)]">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                                                        IN COMBAT
                                                    </div>
                                                ) : opp.isLive ? (
                                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[9px] text-emerald-400 uppercase font-black tracking-[0.15em] mt-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                        LIVE OPERATOR
                                                    </div>
                                                ) : (
                                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] text-gray-400 uppercase font-black tracking-[0.15em] mt-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                                                        STANDBY
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-end relative z-10">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Skill Tier</p>
                                                <p className={`font-black text-lg ${isLight ? 'text-gray-800' : 'text-white'}`}>{opp.tier || 'ARCHITECT III'}</p>
                                            </div>
                                            <div className="text-right space-y-1">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Global Rank</p>
                                                <p className={`text-4xl font-black tracking-tighter ${isLight ? 'text-black' : 'text-white'}`}>{opp.rating?.toLocaleString() || '1,000'} <span className="text-accent-secondary text-lg">RP</span></p>
                                            </div>
                                        </div>
                                        {/* Dynamic scanline effect for selected state */}
                                        {selectedOpponent?.id === opp.id && (
                                            <div className="absolute inset-0 bg-gradient-to-t from-accent-primary/5 to-transparent pointer-events-none animate-pulse" />
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="w-full lg:w-96">
                        <div className={`p-10 rounded-[3.5rem] border flex flex-col justify-between min-h-[500px] header-element sticky top-8 transition-all duration-500 ${isLight ? 'bg-white border-black/10 shadow-2xl' : 'bg-[#151520] border-white/30'}`}>
                            <div>
                                <div className="flex items-center gap-3 mb-8">
                                    <Target className="text-accent-secondary" size={28} />
                                    <h2 className={`font-black text-2xl uppercase tracking-tighter ${isLight ? 'text-black' : 'text-white'}`}>Target Acquisition</h2>
                                </div>

                                {challengeFeedback && (
                                    <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse flex-shrink-0" />
                                        <span>{challengeFeedback}</span>
                                    </div>
                                )}

                                {isWaiting ? (
                                    <div className="space-y-6 py-6 text-center">
                                        <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
                                            <div className="absolute inset-0 rounded-full border-2 border-accent-secondary/30 animate-ping" />
                                            <div className="absolute inset-2 rounded-full border-2 border-dashed border-accent-secondary/60 animate-spin" />
                                            <div className="w-12 h-12 rounded-full bg-accent-secondary/20 flex items-center justify-center text-accent-secondary">
                                                <Zap size={22} className="animate-pulse" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="text-sm font-black uppercase tracking-widest text-accent-secondary">Handshake Protocol Active</h3>
                                            <p className="text-xs text-gray-300 font-medium leading-relaxed">{waitingMessage}</p>
                                        </div>
                                        <button
                                            onClick={handleCancelChallenge}
                                            className="px-6 py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-[10px] font-bold uppercase tracking-wider transition-all"
                                        >
                                            Cancel Challenge
                                        </button>
                                    </div>
                                ) : selectedOpponent ? (
                                    <div className="space-y-8">
                                        <div className={`p-6 rounded-3xl border ${isLight ? 'bg-black/5 border-black/5' : 'bg-accent-secondary/15 border-accent-secondary/30'}`}>
                                            <p className={`text-xs leading-relaxed mb-4 font-light ${isLight ? 'text-gray-600' : 'text-gray-200'}`}>
                                                {selectedOpponent.isLive
                                                    ? '"Target active and connected to uplink. Direct duel challenge will be dispatched to their HUD."'
                                                    : '"Target in standby mode. Deploying will initiate a combat simulation match."'
                                                }
                                            </p>
                                            <div className={`flex items-center gap-2 text-[10px] uppercase font-black tracking-widest ${selectedOpponent.isLive ? 'text-emerald-400' : 'text-purple-400'}`}>
                                                <Zap size={12} fill="currentColor" /> {selectedOpponent.isLive ? 'Live Duel Ready' : 'Sparring Protocol Ready'}
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center text-[10px] font-black">
                                                <span className="text-gray-300 uppercase tracking-widest">Opponent</span>
                                                <span className={`uppercase text-lg ${isLight ? 'text-black' : 'text-white'}`}>{selectedOpponent.username}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] font-black">
                                                <span className="text-gray-300 uppercase tracking-widest">Connection</span>
                                                <span className={`text-xs font-bold ${selectedOpponent.isLive ? 'text-emerald-400' : 'text-gray-400'}`}>
                                                    {selectedOpponent.isLive ? '● ONLINE LIVE' : '○ STANDBY'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] font-black">
                                                <span className="text-gray-300 uppercase tracking-widest">Skill Tier</span>
                                                <span className="text-accent-secondary text-sm">{selectedOpponent.tier || 'ARCHITECT III'}</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-20 flex flex-col items-center justify-center text-center opacity-40">
                                        <div className="p-8 rounded-full border-2 border-dashed border-white/20 mb-6">
                                            <Users size={40} />
                                        </div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em]">Select an operator to engage</p>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3 pt-6">
                                <button
                                    disabled={!selectedOpponent || isWaiting}
                                    onClick={() => handleUserProfile(selectedOpponent.id)}
                                    className={`w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all flex items-center justify-center gap-3 border ${selectedOpponent && !isWaiting
                                        ? (isLight ? 'bg-white border-black/10 hover:bg-black/5 text-black' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white')
                                        : 'opacity-20 cursor-not-allowed'
                                    }`}
                                >
                                    <UserIcon size={14} /> View Profile
                                </button>

                                <button
                                    disabled={!selectedOpponent || isWaiting || selectedOpponent.status === 'in_match'}
                                    onClick={handleChallenge}
                                    className={`w-full py-6 rounded-[2rem] font-black uppercase text-xs tracking-[0.25em] transition-all flex items-center justify-center gap-3 ${selectedOpponent && !isWaiting && selectedOpponent.status !== 'in_match'
                                        ? (isLight ? 'bg-black text-white hover:scale-105 active:scale-95 shadow-xl shadow-black/10' : 'bg-white text-black hover:scale-105 active:scale-95 shadow-[0_20px_40px_rgba(255,255,255,0.15)]')
                                        : (isLight ? 'bg-black/10 text-black/40 border border-black/5 cursor-not-allowed' : 'bg-white/10 text-gray-400 border border-white/10 cursor-not-allowed')
                                        }`}
                                >
                                    {isWaiting ? (
                                        <>
                                            <Clock size={18} className="animate-spin" /> Awaiting Handshake...
                                        </>
                                    ) : selectedOpponent ? (
                                        selectedOpponent.status === 'in_match' ? (
                                            <span className="text-red-400 flex items-center gap-2">
                                                <Zap size={16} className="text-red-400" /> In Live Combat
                                            </span>
                                        ) : selectedOpponent.isLive ? (
                                            <>
                                                <Zap size={18} fill="currentColor" /> Request Challenge
                                            </>
                                        ) : (
                                            <>
                                                <Zap size={18} fill="currentColor" /> Deploy Sparring Duel
                                            </>
                                        )
                                    ) : (
                                        'Acquire Target'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
