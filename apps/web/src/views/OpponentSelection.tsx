import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { Activity, Users, Shield, Zap, Target, Search, Menu } from 'lucide-react';
import { useLayout } from '../components/layout/MainLayout';

const OPPONENTS = [
    { id: '1', name: 'Ghost_Runner_32', rank: 'Diamond', rp: 3450, winRate: 68.4, avatar: 'GR', matches: 1204 },
    { id: '2', name: 'Null_Pointer', rank: 'Platinum', rp: 2890, winRate: 54.2, avatar: 'NP', matches: 843 },
    { id: '3', name: 'Syntax_Error_404', rank: 'Gold', rp: 2100, winRate: 49.8, avatar: 'SE', matches: 432 },
    { id: '4', name: 'Byte_Me', rank: 'Silver', rp: 1540, winRate: 42.1, avatar: 'BM', matches: 156 },
];

export const OpponentSelection: React.FC = () => {
    const navigate = useNavigate();
    const { setIsMenuOpen } = useLayout();
    const containerRef = useRef<HTMLDivElement>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from('.header-element', {
                y: -30,
                opacity: 0,
                duration: 0.8,
                stagger: 0.1,
                ease: 'power3.out'
            });

            gsap.from('.opponent-card', {
                y: 30,
                opacity: 0,
                duration: 0.8,
                stagger: 0.1,
                ease: 'power3.out',
                delay: 0.3
            });
        }, containerRef);

        return () => ctx.revert();
    }, []);

    const handleSelect = (id: string) => {
        setSelectedId(id);
        // Play selection animation
        gsap.to(`.card-${id}`, {
            scale: 1.02,
            boxShadow: '0 0 20px rgba(255,255,255,0.2)',
            duration: 0.3
        });
        gsap.to(`.card-${id} .card-border`, {
            opacity: 1,
            duration: 0.3
        });
    };

    const handleInitialize = () => {
        if (!selectedId) return;

        // Generate a random match ID for the battle
        const matchId = `match-${Math.random().toString(36).substring(2, 9)}`;

        // Setup exit animation before navigating
        gsap.to(containerRef.current, {
            opacity: 0,
            y: -20,
            duration: 0.4,
            ease: 'power2.in',
            onComplete: () => {
                navigate(`/arena/${matchId}`);
            }
        });
    };

    return (
        <div ref={containerRef} className="h-screen w-full bg-[#020202] text-white flex flex-col relative overflow-hidden">
            <div className="flex-1 flex flex-col px-4 md:px-8 py-8 lg:py-12 relative z-10 overflow-y-auto custom-scrollbar">
                {/* Background noise/gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] to-[#020202] pointer-events-none" />
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-white/5 rounded-full blur-[120px] pointer-events-none transform translate-x-1/3 -translate-y-1/3" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-white/5 rounded-full blur-[100px] pointer-events-none transform -translate-x-1/2 translate-y-1/3" />

                <header className="relative z-10 mb-16 header-element">
                    <div className="flex items-center gap-6 mb-4">
                        <button
                            onClick={() => setIsMenuOpen(true)}
                            className="p-3.5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all group"
                        >
                            <Menu size={20} className="group-hover:scale-110 transition-transform" />
                        </button>
                        <span className="px-3 py-1 text-xs font-bold tracking-widest uppercase border border-white/20 rounded-full bg-white/5 backdrop-blur-sm">
                            Matchmaking Sector
                        </span>
                    </div>
                    <h1 className="text-5xl md:text-6xl font-bold tracking-tighter">
                        SELECT YOUR <br /> OPPONENT
                    </h1>
                    <p className="text-gray-400 mt-4 max-w-md">
                        Choose a rival to test your voice-coding algorithms against. Higher ranked opponents yield more Rating Points (RP).
                    </p>
                </header>

                <div className="relative z-10 flex-1 flex flex-col lg:flex-row gap-12">
                    {/* Left side: Opponent List */}
                    <div className="flex-1 space-y-4">
                        <div className="header-element mb-6 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                            <input
                                type="text"
                                placeholder="Search operator registry..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-white/30 transition-colors"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {OPPONENTS.map((opp) => (
                                <div
                                    key={opp.id}
                                    onClick={() => handleSelect(opp.id)}
                                    className={`opponent-card card-${opp.id} relative p-6 rounded-2xl border cursor-pointer transition-all duration-300 overflow-hidden group ${selectedId === opp.id
                                        ? 'bg-white/10 border-white/40'
                                        : 'bg-[#0a0a0a]/50 border-white/10 hover:border-white/20 hover:bg-white/5'
                                        }`}
                                >
                                    <div className={`card-border absolute inset-0 rounded-2xl pointer-events-none border border-white transition-opacity duration-300 ${selectedId === opp.id ? 'opacity-20' : 'opacity-0'}`} />

                                    <div className="flex items-start justify-between mb-8">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-gradient-to-br from-gray-800 to-black rounded-lg border border-white/10 flex items-center justify-center font-bold text-lg">
                                                {opp.avatar}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg">{opp.name}</h3>
                                                <div className="flex items-center gap-2 text-xs text-gray-400 uppercase tracking-widest mt-1">
                                                    <Shield size={12} /> {opp.rank}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-mono text-xl font-bold">{opp.rp}</div>
                                            <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">RP</div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                                        <div>
                                            <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Win Rate</div>
                                            <div className="font-bold text-lg">{opp.winRate}%</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Matches</div>
                                            <div className="font-bold text-lg">{opp.matches.toLocaleString()}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right side: Action Panel */}
                    <div className="w-full lg:w-96 flex flex-col">
                        <div className="sticky top-8 bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 flex-1 flex flex-col justify-between min-h-[500px] header-element">
                            <div>
                                <div className="flex items-center gap-3 mb-6">
                                    <Target className="text-gray-400" />
                                    <h2 className="font-bold text-xl uppercase tracking-widest">Protocol Status</h2>
                                </div>

                                {selectedId ? (
                                    <div className="space-y-6">
                                        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                                            <p className="text-sm text-gray-400 leading-relaxed mb-4">
                                                Valid target locked. Prepare your voice algorithms for latency-free combat.
                                                Upon insertion, you will have exactly 10 minutes to resolve the challenge.
                                            </p>
                                            <div className="flex items-center gap-2 text-xs text-green-400 uppercase tracking-widest font-mono">
                                                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                                Connection Stable
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-500">Target</span>
                                                <span className="font-bold">{OPPONENTS.find(o => o.id === selectedId)?.name}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-500">Rank Weight</span>
                                                <span className="font-bold text-amber-500">High Stakes</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-500">Allowed Toolset</span>
                                                <span className="font-mono text-xs">Voice|Keyboard</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
                                        <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                                            <Users className="text-gray-500" size={24} />
                                        </div>
                                        <p className="text-gray-500 font-medium">Awaiting Opponent Selection...</p>
                                    </div>
                                )}
                            </div>

                            <button
                                disabled={!selectedId}
                                onClick={handleInitialize}
                                className={`w-full py-4 rounded-xl font-bold tracking-widest uppercase transition-all flex items-center justify-center gap-2 ${selectedId
                                    ? 'bg-white text-black hover:scale-[1.02] shadow-[0_0_20px_rgba(255,255,255,0.2)] cursor-pointer'
                                    : 'bg-white/10 text-gray-500 cursor-not-allowed border border-white/5'
                                    }`}
                            >
                                {selectedId ? (
                                    <>
                                        <Zap size={18} /> Initialize Battle
                                    </>
                                ) : (
                                    'Select Target'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
