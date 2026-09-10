import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, Users, Clock, Gavel, Activity, Zap, X } from 'lucide-react';
import { useNav } from '../navigation/NavigationContext';
import gsap from 'gsap';
import { useArenaStore } from '../store/useArenaStore';


interface Tournament {
    id: string;
    name: string;
    tier: 'Diamond' | 'Platinum' | 'Gold' | 'Silver';
    prizePool: string;
    players: number;
    maxPlayers: number;
    format: 'Knockout' | 'Double Elimination' | 'Round Robin';
    startTime: string;
    requirements: string;
    status: 'upcoming' | 'live' | 'completed';
}

const TOURNAMENTS_DATA: Tournament[] = [
    {
        id: '1',
        name: 'Arena Masters Spring Championship',
        tier: 'Platinum',
        prizePool: '10,000 RP',
        players: 128,
        maxPlayers: 128,
        format: 'Knockout',
        startTime: 'In 02h 12m',
        requirements: 'Min. Rank: Gold',
        status: 'upcoming'
    },
    {
        id: '101',
        name: 'Weekend Blitz Tournament',
        tier: 'Gold',
        prizePool: '2,000 RP',
        players: 48,
        maxPlayers: 64,
        format: 'Knockout',
        startTime: 'LIVE',
        requirements: 'All Ranks',
        status: 'live'
    },
    {
        id: '2',
        name: 'Binary Beats Pro Invitational',
        tier: 'Diamond',
        prizePool: '50,000 RP',
        players: 16,
        maxPlayers: 16,
        format: 'Double Elimination',
        startTime: '3 days left',
        requirements: 'Invite Only',
        status: 'upcoming'
    },
    {
        id: '3',
        name: 'Shadow Duel Open',
        tier: 'Silver',
        prizePool: '500 RP',
        players: 24,
        maxPlayers: 32,
        format: 'Knockout',
        startTime: 'Completed',
        requirements: 'All Ranks',
        status: 'completed'
    }
];


export const TournamentHub: React.FC<{ isLight: boolean; isStandalone?: boolean }> = ({ isLight, isStandalone: propStandalone }) => {
    const { goToDashboard } = useNav();
    const { tournaments } = useArenaStore();
    const [activeFilter, setActiveFilter] = useState<'Upcoming' | 'Live' | 'Completed'>('Upcoming');

    useEffect(() => {
        // Redundant fetch removed - handled by parent Dashboard
    }, []);

    useEffect(() => {
        if (filteredTournaments.length === 0) return;

        const ctx = gsap.context((self) => {
            const cards = self.selector?.('.tournament-card');
            if (cards && cards.length > 0) {
                gsap.from(cards, {
                    y: 30,
                    opacity: 0,
                    duration: 0.8,
                    stagger: 0.1,
                    ease: 'power3.out',
                    clearProps: 'all'
                });
            }
        });
        return () => ctx.revert();
    }, [activeFilter, tournaments.length]);

    const displayTournaments = useMemo(() => {
        const mappedFromStore = (tournaments || []).map((t: any) => ({
            id: `store-${t.id}`,
            name: t.title,
            status: t.status === 'open' ? 'upcoming' as const : t.status as any,
            startTime: t.startTime || 'Soon',
            tier: 'Platinum' as const,
            prizePool: 'TBD',
            players: 0,
            maxPlayers: 128,
            format: 'Knockout' as const,
            requirements: 'All Ranks'
        }));
        return [...mappedFromStore, ...TOURNAMENTS_DATA] as Tournament[];
    }, [tournaments]);

    const filteredTournaments = displayTournaments.filter((t: Tournament) => {
        if (activeFilter === 'Upcoming') return t.status === 'upcoming';
        if (activeFilter === 'Live') return t.status === 'live';
        if (activeFilter === 'Completed') return t.status === 'completed';
        return true;
    });

    const isStandalone = propStandalone ?? (location.pathname === '/tournaments' && !['/dashboard', '/battle', '/practice', '/history'].some(p => location.pathname.startsWith(p)));

    return (
        <div className={`w-full panel-content ${isStandalone ? 'h-screen overflow-y-auto custom-scrollbar bg-[#020202]' : 'bg-transparent'} ${isLight ? 'bg-gray-50 text-black' : 'text-white'} space-y-8 pb-12 relative px-4 md:px-8`}>
            {isStandalone && (
                <button
                    onClick={() => goToDashboard()}
                    className="absolute top-8 right-8 p-3 rounded-full hover:bg-white/5 border border-white/10 transition-all text-gray-500 hover:text-white z-50 group"
                    title="Return to Dashboard"
                >
                    <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                </button>
            )}

            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10 pt-4">
                <div className="space-y-3 flex-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent-secondary/30 bg-accent-secondary/5 text-accent-secondary text-[10px] font-black uppercase tracking-widest">
                        <Gavel size={14} /> Global Tournament Protocol
                    </div>
                    <h1 className="text-6xl md:text-7xl font-black tracking-tighter uppercase leading-[0.9]">
                        Tournament <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-primary to-accent-secondary">Hub</span>
                    </h1>
                    <p className={`text-sm font-medium max-w-2xl ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                        Meta-level arena operations. Global bracket synchronization active. Identify and engage in active combat sequences.
                    </p>
                </div>

                <div className={`p-1.5 rounded-2xl flex gap-1 self-start md:self-center ${isLight ? 'bg-black/5' : 'bg-white/5'}`}>
                    {(['Upcoming', 'Live', 'Completed'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveFilter(tab)}
                            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeFilter === tab
                                ? (isLight ? 'bg-black text-white shadow-xl' : 'bg-white text-black shadow-lg')
                                : (isLight ? 'text-gray-500 hover:text-black' : 'text-gray-400 hover:text-white')
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tournaments Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredTournaments.map((t) => {
                    const fillPercent = Math.min(100, Math.round((t.players / (t.maxPlayers || 1)) * 100));
                    const isFull = t.players >= t.maxPlayers;
                    return (
                        <div
                            key={t.id}
                            className={`tournament-card group p-8 rounded-3xl border transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${
                                isLight 
                                    ? 'bg-white border-purple-100 hover:border-purple-300 hover:shadow-xl' 
                                    : 'bg-[#0d0d16]/90 border-purple-500/20 hover:border-purple-400/50 hover:shadow-[0_0_30px_rgba(124,58,237,0.2)]'
                            }`}
                        >
                            <div className="relative z-10">
                                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                                    <div className="flex items-center gap-2">
                                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] font-bold uppercase tracking-wider ${
                                            t.tier === 'Diamond' ? 'text-cyan-300 border-cyan-500/40 bg-cyan-500/10 shadow-[0_0_10px_rgba(6,182,212,0.2)]' :
                                            t.tier === 'Platinum' ? 'text-purple-300 border-purple-500/40 bg-purple-500/10 shadow-[0_0_10px_rgba(168,85,247,0.2)]' :
                                            t.tier === 'Gold' ? 'text-amber-300 border-amber-500/40 bg-amber-500/10 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 
                                            'text-gray-300 border-gray-500/40 bg-gray-500/10'
                                        }`}>
                                            <Trophy size={11} /> {t.tier} Tier
                                        </div>
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                            isLight ? 'bg-black/5 text-gray-600' : 'bg-white/5 text-gray-400 border border-white/10'
                                        }`}>
                                            {t.format}
                                        </span>
                                    </div>

                                    {t.status === 'live' ? (
                                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/15 text-rose-400 text-[10px] font-bold uppercase tracking-wider border border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.3)]">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 shadow-[0_0_6px_#f43f5e]"></span>
                                            </span>
                                            LIVE NOW
                                        </div>
                                    ) : (
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                                            {t.requirements}
                                        </span>
                                    )}
                                </div>

                                <h3 className={`text-2xl md:text-3xl font-black mb-2 uppercase tracking-tight leading-tight group-hover:text-purple-300 transition-colors text-left ${
                                    isLight ? 'text-black' : 'text-white'
                                }`}>
                                    {t.name}
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
                                    {/* Player Fill Progress Bar */}
                                    <div className={`p-4 rounded-2xl border text-left ${
                                        isLight ? 'bg-purple-50/50 border-purple-100' : 'bg-black/40 border-purple-500/20'
                                    }`}>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[9px] uppercase tracking-wider opacity-60 flex items-center gap-1.5 font-bold">
                                                <Users size={11} className="text-purple-400" /> Roster Fill
                                            </span>
                                            <span className="text-xs font-bold">
                                                {t.players} / <span className="opacity-50">{t.maxPlayers}</span>
                                            </span>
                                        </div>
                                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-700 ${
                                                    isFull 
                                                        ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]' 
                                                        : 'bg-gradient-to-r from-purple-500 to-violet-400 shadow-[0_0_8px_#a855f7]'
                                                }`}
                                                style={{ width: `${fillPercent}%` }}
                                            />
                                        </div>
                                        <p className="text-[8px] font-medium opacity-40 uppercase tracking-wider mt-2">
                                            {isFull ? 'Grid capacity reached' : `${t.maxPlayers - t.players} slots remaining`}
                                        </p>
                                    </div>

                                    {/* Prize Pool Card */}
                                    <div className={`p-4 rounded-2xl border text-left flex flex-col justify-between ${
                                        isLight ? 'bg-purple-50/50 border-purple-100' : 'bg-black/40 border-purple-500/20'
                                    }`}>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[9px] uppercase tracking-wider opacity-60 flex items-center gap-1.5 font-bold">
                                                <Zap size={11} className="text-amber-400" /> Bounty Pool
                                            </span>
                                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-300">
                                                ESCROWED
                                            </span>
                                        </div>
                                        <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-violet-200">
                                            {t.prizePool}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="relative z-10 flex items-center justify-between gap-4 mt-auto pt-4 border-t border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                                        <Clock size={14} />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[9px] uppercase tracking-wider opacity-50 font-bold">Commences</p>
                                        <p className={`text-xs font-bold ${t.status === 'live' ? 'text-rose-400 animate-pulse' : 'text-gray-200'}`}>
                                            {t.startTime}
                                        </p>
                                    </div>
                                </div>

                                {t.status === 'upcoming' ? (
                                    <button 
                                        disabled={isFull}
                                        className={`px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                                            isFull 
                                                ? 'bg-white/5 text-gray-500 border border-white/10 cursor-not-allowed'
                                                : isLight 
                                                    ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-md' 
                                                    : 'bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white shadow-[0_0_20px_rgba(124,58,237,0.35)] hover:scale-105'
                                        }`}
                                    >
                                        {isFull ? 'Roster Full' : 'Register'}
                                    </button>
                                ) : t.status === 'live' ? (
                                    <div className="flex gap-2">
                                        <button className="px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)] hover:scale-105 transition-all">
                                            Spectate
                                        </button>
                                        <button className={`px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${
                                            isLight ? 'border-purple-200 hover:bg-purple-50' : 'border-white/10 hover:bg-white/5 text-gray-300'
                                        }`}>
                                            Bracket
                                        </button>
                                    </div>
                                ) : (
                                    <button className={`px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${
                                        isLight ? 'border-gray-200 text-gray-500 hover:bg-gray-100' : 'border-white/10 text-gray-400 hover:bg-white/5'
                                    }`}>
                                        Ledger Results
                                    </button>
                                )}
                            </div>

                            {/* Background Decorative Glow */}
                            <div className={`absolute -bottom-10 -right-10 w-48 h-48 rounded-full blur-[80px] opacity-10 transition-opacity group-hover:opacity-25 pointer-events-none ${
                                t.tier === 'Diamond' ? 'bg-cyan-400' :
                                t.tier === 'Platinum' ? 'bg-purple-500' :
                                t.tier === 'Gold' ? 'bg-amber-400' : 'bg-gray-400'
                            }`} />
                        </div>
                    );
                })}
            </div>

            {/* Quick Stats Banner */}
            <div className={`p-10 rounded-[3rem] border flex flex-col md:flex-row items-center justify-between gap-8 ${isLight ? 'bg-black text-white' : 'bg-white text-black'}`}>
                <div className="flex items-center gap-6">
                    <div className={`p-4 rounded-3xl ${isLight ? 'bg-white/10' : 'bg-black/10'}`}>
                        <Gavel size={32} />
                    </div>
                    <div>
                        <h4 className="text-2xl font-black uppercase tracking-tighter">Official Protocol</h4>
                        <p className="text-xs opacity-60 uppercase tracking-widest mt-1">Tournament Rules & Eligibility</p>
                    </div>
                </div>

                <div className="flex flex-wrap justify-center gap-6">
                    {[
                        { label: 'Total RP Pool', val: '2.4M' },
                        { label: 'Active Brackets', val: '14' },
                        { label: 'Global Rank req.', val: 'Top 50%' },
                    ].map((s, i) => (
                        <div key={i} className="text-center md:text-left">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">{s.label}</p>
                            <p className="text-2xl font-black">{s.val}</p>
                        </div>
                    ))}
                </div>

                <button className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:scale-105 ${isLight ? 'bg-white text-black' : 'bg-black text-white'}`}>
                    Read Rulebook
                </button>
            </div>
        </div>
    );
};
