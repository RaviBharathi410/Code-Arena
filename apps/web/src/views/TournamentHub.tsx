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
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
                <div className="space-y-2">
                    <h1 className="text-5xl font-black tracking-tighter uppercase italic">
                        Tournament <br />
                        <span className={`text-transparent bg-clip-text bg-gradient-to-r ${isLight ? 'from-black to-gray-400' : 'from-white to-gray-500'}`}>Hub</span>
                    </h1>
                    <p className={`text-lg font-light ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                        Meta-level arena operations. Global bracket synchronization active.
                    </p>
                </div>

                <div className={`p-1.5 rounded-2xl flex gap-1 ${isLight ? 'bg-black/5' : 'bg-white/5'}`}>
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
                {filteredTournaments.map((t) => (
                    <div
                        key={t.id}
                        className={`tournament-card group p-8 rounded-[2.5rem] border transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${isLight ? 'bg-white border-black/5 hover:border-black/10 hover:shadow-2xl' : 'bg-white/5 border-white/8 hover:border-white/20 hover:bg-white/[0.07]'
                            }`}
                    >
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-6">
                                <div className={`flex items-center gap-2 px-3 py-1 rounded-full border border-current text-[10px] font-black uppercase tracking-widest ${t.tier === 'Diamond' ? 'text-blue-400' :
                                    t.tier === 'Platinum' ? 'text-cyan-400' :
                                        t.tier === 'Gold' ? 'text-yellow-500' : 'text-gray-400'
                                    }`}>
                                    <Trophy size={10} /> {t.tier} Tier
                                </div>
                                {t.status === 'live' && (
                                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest animate-pulse border border-red-500/20">
                                        <Activity size={10} /> Live Now
                                    </div>
                                )}
                            </div>

                            <h3 className="text-3xl font-black mb-2 uppercase tracking-tighter leading-none group-hover:scale-[1.02] transition-transform origin-left">
                                {t.name}
                            </h3>
                            <p className={`text-sm font-medium mb-8 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                                {t.format} • {t.requirements}
                            </p>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className={`p-4 rounded-2xl ${isLight ? 'bg-black/5' : 'bg-white/5'}`}>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-1 flex items-center gap-1.5"><Users size={12} /> Players</p>
                                    <p className="text-xl font-black">{t.players} / {t.maxPlayers}</p>
                                </div>
                                <div className={`p-4 rounded-2xl ${isLight ? 'bg-black/5' : 'bg-white/5'}`}>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-1 flex items-center gap-1.5"><Zap size={12} /> Prize Pool</p>
                                    <p className="text-xl font-black text-cyan-400">{t.prizePool}</p>
                                </div>
                            </div>
                        </div>

                        <div className="relative z-10 flex items-center justify-between gap-4 mt-auto">
                            <div className="flex items-center gap-3">
                                <Clock size={16} className="text-gray-500" />
                                <div className="text-left">
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Start Time</p>
                                    <p className={`text-sm font-bold ${t.status === 'live' ? 'text-green-500' : ''}`}>{t.startTime}</p>
                                </div>
                            </div>

                            {t.status === 'upcoming' ? (
                                <button className={`px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${isLight ? 'bg-black text-white hover:scale-105 shadow-xl' : 'bg-white text-black hover:scale-105 shadow-lg'
                                    }`}>
                                    Register
                                </button>
                            ) : t.status === 'live' ? (
                                <div className="flex gap-2">
                                    <button className="px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest bg-cyan-500 text-white hover:scale-105 shadow-lg shadow-cyan-500/20">
                                        Watch
                                    </button>
                                    <button className={`px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest border transition-all ${isLight ? 'border-black/10 hover:bg-black/5' : 'border-white/10 hover:bg-white/5'
                                        }`}>
                                        Bracket
                                    </button>
                                </div>
                            ) : (
                                <button className={`px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest border transition-all ${isLight ? 'border-black/10 hover:bg-black/5 text-gray-400' : 'border-white/10 hover:bg-white/5 text-gray-500'
                                    }`}>
                                    View Results
                                </button>
                            )}
                        </div>

                        {/* Background Decorative Element */}
                        <div className={`absolute -bottom-10 -right-10 w-48 h-48 rounded-full blur-[80px] opacity-10 transition-opacity group-hover:opacity-20 ${t.tier === 'Diamond' ? 'bg-blue-400' :
                            t.tier === 'Platinum' ? 'bg-cyan-400' :
                                t.tier === 'Gold' ? 'bg-yellow-500' : 'bg-gray-400'
                            }`} />
                    </div>
                ))}
            </div>

            {/* Quick Stats Banner */}
            <div className={`p-10 rounded-[3rem] border flex flex-col md:flex-row items-center justify-between gap-8 ${isLight ? 'bg-black text-white' : 'bg-white text-black'}`}>
                <div className="flex items-center gap-6">
                    <div className={`p-4 rounded-3xl ${isLight ? 'bg-white/10' : 'bg-black/10'}`}>
                        <Gavel size={32} />
                    </div>
                    <div>
                        <h4 className="text-2xl font-black uppercase tracking-tighter italic">Official Protocol</h4>
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
