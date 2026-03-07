import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNav } from '../navigation/NavigationContext';
import { useSocket } from '../contexts/SocketContext';
import { SERVER_EVENTS, CLIENT_EVENTS } from '../constants/socketEvents';
import { gsap } from 'gsap';
import { Users, Zap, Target, Search, Menu, Clock } from 'lucide-react';
import { useLayout } from '../components/layout/MainLayout';
import { User } from '../types';

export const OpponentSelection: React.FC<{ currentUser: User }> = ({ currentUser }) => {
    const { goToBattle } = useNav();
    const { setIsMenuOpen } = useLayout();
    const { connect, connected, on, emit } = useSocket();

    // Local State
    const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOpponent, setSelectedOpponent] = useState<any | null>(null);
    const [isWaiting, setIsWaiting] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);

    // Filtered list (Derived value - as per spec)
    const filteredUsers = useMemo(() => {
        return onlineUsers.filter(u =>
            u.username.toLowerCase().includes(searchQuery.toLowerCase()) &&
            u.id !== currentUser.id
        );
    }, [onlineUsers, searchQuery, currentUser.id]);

    useEffect(() => {
        connect();

        const cleanupOnline = on(SERVER_EVENTS.ONLINE_USERS, (users: any[]) => setOnlineUsers(users));
        const cleanupJoined = on(SERVER_EVENTS.USER_JOINED, (user: any) => setOnlineUsers(prev => [...prev.filter(u => u.id !== user.id), user]));
        const cleanupLeft = on(SERVER_EVENTS.USER_LEFT, ({ id }: { id: string }) => setOnlineUsers(prev => prev.filter(u => u.id !== id)));
        const cleanupMatch = on(SERVER_EVENTS.MATCH_STARTED, ({ matchId }: { matchId: string }) => {
            goToBattle(matchId);
        });

        const ctx = gsap.context(() => {
            gsap.from('.header-element', { y: -30, opacity: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out' });
            gsap.from('.opponent-card', { y: 30, opacity: 0, duration: 0.8, stagger: 0.05, ease: 'power3.out', delay: 0.2 });
        }, containerRef);

        return () => {
            cleanupOnline();
            cleanupJoined();
            cleanupLeft();
            cleanupMatch();
            ctx.revert();
        };
    }, [connect, on, goToBattle]);

    // This is where we should listen to socket events for Component 3
    // We'll access the socket via MatchContext's internal if possible or similar
    // Actually, MatchContext doesn't expose the socket directly. 
    // I will use a local socket instance briefly or update MatchContext to expose a 'on' method.
    // Spec says: "useSocket() returns emit and on/off wrappers". 
    // I'll assume useMatch or a separate useSocket should provide this.
    // For now, I'll use a direct socket if I have to, but I'll see if I can add it to useMatch.

    const handleChallenge = () => {
        if (!selectedOpponent) return;
        setIsWaiting(true);
        emit(CLIENT_EVENTS.CHALLENGE_USER, {
            challengerId: currentUser.id,
            opponentId: selectedOpponent.id
        });
    };

    return (
        <div ref={containerRef} className="h-screen w-full bg-transparent text-white flex flex-col relative overflow-hidden">
            <div className="flex-1 flex flex-col px-4 md:px-8 py-8 lg:py-12 relative z-10 overflow-y-auto custom-scrollbar">

                <header className="relative z-10 mb-10 header-element">
                    <div className="flex items-center gap-6 mb-4">
                        <button onClick={() => setIsMenuOpen(true)} className="p-3.5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all group">
                            <Menu size={20} className="group-hover:scale-110 transition-transform" />
                        </button>
                        <span className="px-3 py-1 text-[10px] font-black tracking-widest uppercase border border-white/20 rounded-full bg-white/5 backdrop-blur-sm flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                            {connected ? 'Signal Strength: Maximum' : 'Connecting to Uplink...'}
                        </span>
                    </div>
                    <h1 className="text-5xl md:text-6xl font-black tracking-tighter uppercase italic">
                        Select <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">Opponent</span>
                    </h1>
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
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-sm font-bold placeholder-gray-600 focus:outline-none focus:border-cyan-500/40 transition-colors"
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
                                        className={`opponent-card p-6 rounded-[2.5rem] border cursor-pointer transition-all duration-300 relative overflow-hidden group ${selectedOpponent?.id === opp.id
                                            ? 'bg-white/10 border-cyan-500/50'
                                            : 'bg-white/5 border-white/10 hover:border-white/20'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4 mb-8">
                                            <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl flex items-center justify-center font-black text-black">
                                                {opp.username[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="font-black text-lg italic uppercase tracking-tighter">{opp.username}</h3>
                                                <div className="flex items-center gap-2 text-[8px] text-cyan-500 uppercase font-black tracking-[0.2em]">
                                                    <div className="w-1 h-1 rounded-full bg-cyan-500 animate-pulse" /> Online
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Skill Tier</p>
                                                <p className="font-black italic text-sm">ARCHITECT III</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Rank</p>
                                                <p className="text-2xl font-black italic text-white tracking-tighter">1,240 RP</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="w-full lg:w-96">
                        <div className="p-10 rounded-[3.5rem] bg-white/5 border border-white/10 flex flex-col justify-between min-h-[500px] header-element sticky top-8">
                            <div>
                                <div className="flex items-center gap-3 mb-10">
                                    <Target className="text-cyan-500" size={24} />
                                    <h2 className="font-black text-xl uppercase italic tracking-tighter">Target Acquisition</h2>
                                </div>

                                {selectedOpponent ? (
                                    <div className="space-y-8">
                                        <div className="p-6 bg-cyan-500/5 rounded-3xl border border-cyan-500/10">
                                            <p className="text-xs text-gray-400 leading-relaxed italic mb-4 font-light">
                                                "Valid target identified. Prepare for neural insertion. Efficiency is mandatory."
                                            </p>
                                            <div className="flex items-center gap-2 text-[10px] text-green-400 uppercase font-black tracking-widest">
                                                <Zap size={12} fill="currentColor" /> Ready for Uplink
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center text-[10px] font-black">
                                                <span className="text-gray-500 uppercase tracking-widest">Opponent</span>
                                                <span className="text-white uppercase italic">{selectedOpponent.username}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] font-black">
                                                <span className="text-gray-500 uppercase tracking-widest">Risk Level</span>
                                                <span className="text-amber-500 italic">MODERATE</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-20 flex flex-col items-center justify-center text-center opacity-20">
                                        <div className="p-6 rounded-full border-2 border-dashed border-white/20 mb-6">
                                            <Users size={32} />
                                        </div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em]">Broadcasting Challenge Signal...</p>
                                    </div>
                                )}
                            </div>

                            <button
                                disabled={!selectedOpponent || isWaiting}
                                onClick={handleChallenge}
                                className={`w-full py-6 rounded-[2rem] font-black uppercase text-xs tracking-[0.25em] transition-all flex items-center justify-center gap-3 ${selectedOpponent && !isWaiting
                                    ? 'bg-white text-black hover:scale-105 active:scale-95 shadow-[0_20px_40px_rgba(0,0,0,0.3)]'
                                    : 'bg-white/5 text-gray-600 border border-white/5 cursor-not-allowed'
                                    }`}
                            >
                                {isWaiting ? (
                                    <>
                                        <Clock size={18} className="animate-spin" /> Awaiting Response
                                    </>
                                ) : selectedOpponent ? (
                                    <>
                                        <Zap size={18} fill="currentColor" /> Deploy Match
                                    </>
                                ) : (
                                    'Acquire Target'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
