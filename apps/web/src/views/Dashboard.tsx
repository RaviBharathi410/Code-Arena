import React, { useEffect, useRef, useState, useMemo, ReactNode, useCallback } from 'react';
import { useNav, PAGES } from '../navigation/NavigationContext';
import gsap from 'gsap';
import { useArenaStore } from '../store/useArenaStore';
import { TournamentHub } from './TournamentHub';
import { useLayout } from '../components/layout/MainLayout';
import api from '../lib/api';
import { User, LeaderboardEntry, Match } from '../types';

import {
    Trophy, Zap, Activity,
    Sword, Target,
    ChevronRight,
    Edit2, Moon, Sun,
    Play, Menu, X, Search,
    Bell, Mail, Sparkles, Shield, Cpu,
    Award, TrendingUp
} from 'lucide-react';

// ── Leaderboard data ──────────────────────────────────────────────────────
const INITIAL_LEADERBOARD = [
    { rank: 1, userId: 'm1', username: 'Ghost_Runner_32', rating: 4820, wins: 312, losses: 80, badge: '⚡' },
    { rank: 2, userId: 'm2', username: 'NeonShadow_X', rating: 4611, wins: 289, losses: 95, badge: '🔥' },
    { rank: 3, userId: 'm3', username: 'CipherKnight', rating: 4430, wins: 261, losses: 105, badge: '💎' },
    { rank: 4, userId: 'm4', username: 'VoidPulse_9', rating: 4205, wins: 238, losses: 112, badge: '🚀' },
    { rank: 5, userId: 'm5', username: 'QuantumByte', rating: 3980, wins: 215, losses: 115, badge: '🌟' },
    { rank: 6, userId: 'm6', username: 'SilverAxe_404', rating: 3760, wins: 198, losses: 120, badge: '🏆' },
    { rank: 7, userId: 'm7', username: 'NullPointer_77', rating: 3540, wins: 179, losses: 125, badge: '⚔️' },
    { rank: 8, userId: 'm8', username: 'DataPhantom', rating: 3310, wins: 160, losses: 130, badge: '🎯' },
];

// ── Radar Chart Component ─────────────────────────────────────────────────
const SkillRadar: React.FC<{ isLight: boolean; skills?: { name: string; value: number }[] }> = ({ isLight, skills }) => {
    const data = useMemo(() => skills || [
        { name: 'Logic', value: 85 },
        { name: 'Speed', value: 72 },
        { name: 'Accuracy', value: 94 },
        { name: 'Data Struct', value: 65 },
        { name: 'Complexity', value: 78 },
    ], [skills]);

    const size = 260;
    const center = size / 2;
    const radius = size * 0.35;
    const angleStep = (Math.PI * 2) / data.length;

    const points = data.map((s, i) => {
        const x = center + radius * (s.value / 100) * Math.cos(i * angleStep - Math.PI / 2);
        const y = center + radius * (s.value / 100) * Math.sin(i * angleStep - Math.PI / 2);
        return `${x},${y}`;
    }).join(' ');

    const webPoints = [0.2, 0.4, 0.6, 0.8, 1.0].map(level => {
        return data.map((_, i) => {
            const x = center + radius * level * Math.cos(i * angleStep - Math.PI / 2);
            const y = center + radius * level * Math.sin(i * angleStep - Math.PI / 2);
            return `${x},${y}`;
        }).join(' ');
    });

    return (
        <div className="flex flex-col items-center">
            <svg width={size} height={size} className="overflow-visible">
                {webPoints.map((p, i) => (
                    <polygon key={i} points={p} fill="none" stroke={isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.06)"} strokeWidth="1" />
                ))}
                {data.map((_, i) => {
                    const x = center + radius * Math.cos(i * angleStep - Math.PI / 2);
                    const y = center + radius * Math.sin(i * angleStep - Math.PI / 2);
                    return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke={isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)"} />;
                })}
                <polygon
                    points={points}
                    fill={isLight ? "rgba(0,0,0,0.1)" : "rgba(34,211,238,0.15)"}
                    stroke={isLight ? "black" : "#22d3ee"}
                    strokeWidth="2"
                    className="transition-all duration-1000"
                />
                {data.map((s, i) => {
                    const x = center + (radius + 20) * Math.cos(i * angleStep - Math.PI / 2);
                    const y = center + (radius + 20) * Math.sin(i * angleStep - Math.PI / 2);
                    return (
                        <text
                            key={i} x={x} y={y} textAnchor="middle" fontSize="7" fontWeight="900"
                            fill={isLight ? "#000" : "#fff"} className="uppercase tracking-[0.15em] opacity-40 italic"
                        >
                            {s.name}
                        </text>
                    );
                })}
            </svg>
        </div>
    );
};

// ── Tab types ─────────────────────────────────────────────────────────────
type Tab = 'command' | 'battle' | 'practice' | 'tournaments' | 'history' | 'leaderboard' | 'profile' | 'settings';

// ── Main Dashboard ────────────────────────────────────────────────────────
export const Dashboard: React.FC<{ currentUser: User }> = ({ currentUser }) => {
    const { fetchProblems, fetchTournaments } = useArenaStore();
    const { currentPage, goToBattle, goToOpponents, goToArenaSolo, goToArenaPractice, goToHistory, goToProfile } = useNav();
    const { isMenuOpen, setIsMenuOpen, isLight, setTheme } = useLayout();

    const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
    const [recentMatchesData, setRecentMatchesData] = useState<Match[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);
    const mailRef = useRef<HTMLDivElement>(null);

    // Map currentPage to Dashboard tab
    const PAGE_TO_TAB: Record<string, Tab> = {
        [PAGES.DASHBOARD]: 'command',
        [PAGES.BATTLE]: 'battle',
        [PAGES.PRACTICE]: 'practice',
        [PAGES.TOURNAMENTS]: 'tournaments',
        [PAGES.HISTORY]: 'history',
        [PAGES.LEADERBOARD]: 'leaderboard',
        [PAGES.PROFILE]: 'profile',
        [PAGES.SETTINGS]: 'settings',
    };

    const [activeTab, setActiveTab] = useState<Tab>(PAGE_TO_TAB[currentPage] || 'command');
    const [searchQuery, setSearchQuery] = useState('');
    const [showNots, setShowNots] = useState(false);
    const [showMail, setShowMail] = useState(false);
    const [isEditingProfile, setIsEditingProfile] = useState(false);

    const [notifications] = useState([
        { id: 1, text: 'New Tournament starting soon!', time: '5m ago' },
        { id: 2, text: 'Rank up! You are now Silver IV', time: '1h ago' }
    ]);

    const [messages] = useState([
        { id: 1, from: 'System', text: 'Welcome to Arena Protocol v2.4. Uplink established.', time: 'Just Now', unread: true },
        { id: 2, from: 'Ghost_Runner_32', text: 'GG! Your algorithm was lethal. Rematch?', time: '2h ago', unread: true },
    ]);

    useEffect(() => {
        setActiveTab(PAGE_TO_TAB[currentPage] || 'command');
    }, [currentPage]);

    // Close notification/mail dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setShowNots(false);
            }
            if (mailRef.current && !mailRef.current.contains(e.target as Node)) {
                setShowMail(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchDashboardData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [lbRes, mRes] = await Promise.all([
                api.get('/leaderboard?limit=8'),
                api.get(`/matches/recent?userId=${currentUser.id}`)
            ]);
            setLeaderboardData(lbRes.data);
            setRecentMatchesData(mRes.data);
        } catch (err: any) {
            console.error('Failed to fetch dashboard data:', err);
            setError('Intelligence uplink failed. System compromised.');
        } finally {
            setIsLoading(false);
        }
    }, [currentUser.id]);

    useEffect(() => {
        fetchDashboardData();
        fetchProblems();
        fetchTournaments();

        const ctx = gsap.context((self) => {
            const elements = self.selector?.('.dash-element');
            if (elements && elements.length > 0) {
                gsap.from(elements, {
                    y: 30, opacity: 0, duration: 1.2,
                    stagger: 0.08, ease: 'power4.out', delay: 0.15,
                });
            }
        }, containerRef);
        return () => ctx.revert();
    }, []);

    useEffect(() => {
        const ctx = gsap.context((self) => {
            const panels = self.selector?.('.panel-content');
            if (panels && panels.length > 0) {
                gsap.fromTo(panels,
                    { opacity: 0, y: 16 },
                    { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' }
                );
            }
        }, containerRef);
        return () => ctx.revert();
    }, [activeTab]);

    const sortedLeaderboard = useMemo(() => {
        const data = leaderboardData.length > 0 ? leaderboardData : INITIAL_LEADERBOARD;
        let results = [...data].sort((a, b) => (b.rating || 0) - (a.rating || 0));
        if (searchQuery) results = results.filter(e => (e.username || '').toLowerCase().includes(searchQuery.toLowerCase()));
        return results;
    }, [leaderboardData, searchQuery]);

    // ── Panel Components ──────────────────────────────────────────────────
    const CommandPanel = () => (
        <div className="panel-content space-y-8">
            <div className="space-y-4">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/20 ${isLight ? 'bg-black/5' : 'bg-white/5'}`}>
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className={`text-xs tracking-wider uppercase ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>System Status: Optimal</span>
                </div>
                <h1 className="text-5xl md:text-6xl font-black tracking-tighter leading-tight italic uppercase">
                    Command <br />
                    <span className={`text-transparent bg-clip-text bg-gradient-to-r ${isLight ? 'from-black to-gray-400' : 'from-cyan-400 to-blue-600'}`}>Center</span>
                </h1>
                <p className={`text-lg max-w-lg font-light leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                    Welcome back, Operator <strong className={isLight ? 'text-black' : 'text-white'}>{currentUser.username}</strong>. Monitoring live combat vectors.
                </p>
                {isLoading && <div className="text-[10px] font-black uppercase tracking-[0.4em] animate-pulse text-cyan-500">Syncing with global intel...</div>}
                {error && <div className="text-xs font-black uppercase text-red-500">{error}</div>}
            </div>
            <div className="flex flex-wrap gap-4">
                <button onClick={() => goToBattle()} className={`group relative px-8 py-4 rounded-full font-black uppercase text-xs tracking-[0.2em] overflow-hidden flex items-center gap-3 hover:scale-105 transition-transform ${isLight ? 'bg-black text-white' : 'bg-white text-black'}`}>
                    <Zap size={18} fill="currentColor" /> Enter Arena
                </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                {[
                    { icon: <Trophy size={20} />, val: currentUser.rating ?? 2431, label: 'Rank Rating' },
                    { icon: <Target size={20} />, val: '64.2%', label: 'Win Rate' },
                    { icon: <Activity size={20} />, val: currentUser.wins ?? 128, label: 'Total Battles' },
                ].map((s, i) => (
                    <div key={i} className={`p-6 rounded-3xl border backdrop-blur-xl relative overflow-hidden group transition-all hover:-translate-y-1 ${isLight ? 'bg-white border-black/5 shadow-xl' : 'bg-white/5 border-white/10 hover:bg-white/8'}`}>
                        <div className={`p-3 rounded-2xl w-fit mb-4 ${isLight ? 'bg-black/5' : 'bg-white/10'}`}>{s.icon}</div>
                        <p className="text-3xl font-black italic tracking-tighter">{s.val}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest mt-1 opacity-50">{s.label}</p>
                    </div>
                ))}
            </div>
        </div>
    );

    const BattlePanel = () => (
        <div className="panel-content space-y-8">
            <div>
                <h2 className="text-4xl font-bold tracking-tighter uppercase">Battle Arena</h2>
                <p className={isLight ? 'text-gray-600' : 'text-gray-400'}>High-stakes algorithm combat. RP at risk.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                    { title: 'Ranked Dual', desc: 'Climb the global leaderboard in 1v1 combat.', icon: <Sword size={28} />, badge: 'STAKES', action: () => goToOpponents() },
                    { title: 'Quick Match', desc: 'Jump into a casual speed-coding session instantly.', icon: <Zap size={28} />, badge: 'FAST', action: () => goToArenaSolo() },
                ].map((mode, i) => (
                    <button key={i} onClick={mode.action}
                        className={`group p-8 rounded-3xl border transition-all duration-300 text-left relative overflow-hidden ${isLight ? 'bg-black/5 border-black/10 hover:bg-black/10' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                        <div className={`absolute top-6 right-6 text-[10px] font-black tracking-widest border px-2 py-0.5 rounded ${isLight ? 'border-black/20 text-gray-600' : 'border-white/20 text-gray-400'}`}>{mode.badge}</div>
                        <div className={`mb-6 transition-colors ${isLight ? 'text-gray-600 group-hover:text-black' : 'text-gray-300 group-hover:text-white'}`}>{mode.icon}</div>
                        <h3 className="text-2xl font-black mb-3 italic uppercase tracking-tighter">{mode.title}</h3>
                        <p className={`text-sm leading-relaxed mb-6 font-light ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>{mode.desc}</p>
                        <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all group-hover:gap-4 ${isLight ? 'text-gray-500 group-hover:text-black' : 'text-gray-400 group-hover:text-white'}`}>
                            Deploy <ChevronRight size={14} />
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );

    const panels: Record<Tab, ReactNode> = {
        command: <CommandPanel />,
        battle: <BattlePanel />,
        practice: (
            <div className="panel-content space-y-12">
                <div className="flex flex-col xl:flex-row gap-12">
                    <div className="flex-1 space-y-10">
                        <div className="space-y-2">
                            <h2 className="text-4xl font-black tracking-tighter uppercase italic">Practice Lab</h2>
                            <p className={`text-lg font-light ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Adaptive training engine — optimized for skill vector evolution.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[
                                { title: 'Speed Run Mode', desc: 'Crush high-volume Easy/Medium tasks against a lethal clock.', icon: <Zap size={24} />, mode: 'SPEED' },
                                { title: 'Deep Focus Mode', desc: 'Complex system architecture problems. Maximum logic precision.', icon: <Target size={24} />, mode: 'FOCUS' },
                                { title: 'Weakness Fix', desc: 'AI-curated drills targeting your historical failure points.', icon: <Shield size={24} />, mode: 'ADAPTIVE' },
                                { title: 'AI Coach Mode', desc: 'Real-time complexity analysis and logic optimization hints.', icon: <Sparkles size={24} />, mode: 'COACH' },
                            ].map((mode, i) => (
                                <button key={i} onClick={() => goToArenaPractice(mode.mode.toLowerCase())}
                                    className={`group p-8 rounded-[2.5rem] border text-left transition-all relative overflow-hidden ${isLight ? 'bg-black/5 border-black/10 hover:bg-black/10' : 'bg-white/5 border-white/8 hover:bg-white/10'}`}>
                                    <div className="flex justify-between items-start mb-8 relative z-10">
                                        <div className={`p-4 rounded-3xl ${isLight ? 'bg-white shadow-lg' : 'bg-white/10 backdrop-blur-md'}`}>{mode.icon}</div>
                                        <div className={`text-[10px] font-black uppercase tracking-[0.3em] opacity-30`}>{mode.mode}</div>
                                    </div>
                                    <h3 className="text-2xl font-black mb-3 relative z-10 uppercase tracking-tight">{mode.title}</h3>
                                    <p className={`text-sm font-light leading-relaxed mb-8 relative z-10 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>{mode.desc}</p>
                                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest relative z-10 group-hover:gap-5 transition-all">
                                        Initialize <ChevronRight size={14} />
                                    </div>
                                    <div className={`absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-10 transition-opacity ${isLight ? 'bg-black' : 'bg-white'}`} />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="w-full xl:w-96 space-y-8">
                        <div className={`p-10 rounded-[3rem] border flex flex-col items-center relative overflow-hidden ${isLight ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/8'}`}>
                            <div className="absolute top-6 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 whitespace-nowrap">Skill Vector Tracking</div>
                            <div className="mt-8 scale-110">
                                <SkillRadar isLight={isLight} />
                            </div>
                        </div>

                        <div className={`p-8 rounded-[3rem] border relative overflow-hidden flex flex-col justify-between h-[320px] ${isLight ? 'bg-black text-white' : 'bg-white text-black'}`}>
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-8">
                                    <Cpu size={16} />
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em]">Engine Intelligence</h3>
                                </div>
                                <div className="space-y-6">
                                    <div className="space-y-1">
                                        <div className="text-3xl font-black italic uppercase tracking-tighter">Recommended</div>
                                        <p className="text-[10px] uppercase font-black opacity-60 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> Graphs (Weak Area)
                                        </p>
                                    </div>
                                    <div className="flex gap-4 items-center">
                                        <div className="px-3 py-1 rounded-full border border-current text-[10px] font-black uppercase tracking-widest opacity-60">Medium</div>
                                        <div className="text-[10px] font-black uppercase tracking-widest opacity-40">15 MIN CHALLENGE</div>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => goToArenaPractice()} className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.25em] transition-all relative z-10 ${isLight ? 'bg-white text-black hover:scale-[0.98]' : 'bg-black text-white hover:scale-[0.98]'}`}>
                                Launch Drill
                            </button>
                            <div className="absolute top-0 right-0 -mr-20 -mt-20 opacity-10">
                                <Activity size={300} strokeWidth={4} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        ),
        tournaments: <TournamentHub isLight={isLight} isStandalone={false} />,
        history: (
            <div className="panel-content">
                <h2 className="text-4xl font-bold tracking-tighter uppercase">Battle Log</h2>
                <div className={`mt-8 p-8 rounded-3xl border ${isLight ? 'bg-white border-black/10' : 'bg-white/5 border-white/10'}`}>
                    <p className="opacity-50 font-mono italic">Protocol Data: 0 matches found in local cache.</p>
                </div>
            </div>
        ),
        leaderboard: (
            <div className="panel-content">
                <h2 className="text-4xl font-bold tracking-tighter uppercase">Global Intel</h2>
                <div className="mt-8 space-y-4">
                    {sortedLeaderboard.map((u, i) => (
                        <div key={i} className={`p-6 rounded-2xl border flex items-center justify-between ${isLight ? 'bg-white border-black/5 shadow-md' : 'bg-white/5 border-white/10'}`}>
                            <div className="flex items-center gap-4">
                                <span className="font-black opacity-20 text-2xl w-8">#{i + 1}</span>
                                <span className="font-bold">{u.username}</span>
                            </div>
                            <span className="font-black text-cyan-500">{u.rating} RP</span>
                        </div>
                    ))}
                </div>
            </div>
        ),
        profile: (
            <div className="panel-content space-y-10">
                <div className="flex justify-between items-end">
                    <div>
                        <h2 className="text-4xl font-black tracking-tighter uppercase italic">Operator DNA</h2>
                        <p className={`text-lg font-light ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Protocol Clearance: Level 42 — Master Architect</p>
                    </div>
                    <button
                        onClick={() => setIsEditingProfile(!isEditingProfile)}
                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${isEditingProfile ? (isLight ? 'bg-black text-white border-black' : 'bg-white text-black border-white') : (isLight ? 'bg-black/5 hover:bg-black/10 border-black/10' : 'bg-white/5 hover:bg-white/10 border-white/10')}`}
                    >
                        {isEditingProfile ? 'Save Local' : 'Edit Sector'}
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Col: Core Stats & Avatar */}
                    <div className="lg:col-span-4 space-y-8">
                        <div className={`p-10 rounded-[3rem] border flex flex-col items-center relative overflow-hidden ${isLight ? 'bg-black text-white shadow-2xl' : 'bg-white text-black shadow-white/5 shadow-2xl skew-y-1'}`}>
                            <div className="relative group cursor-pointer mb-8">
                                <div className={`w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center font-black text-5xl transition-transform group-hover:scale-105 duration-500`}>
                                    {currentUser.username?.[0].toUpperCase()}
                                </div>
                                {isEditingProfile && (
                                    <div className="absolute inset-0 bg-black/40 rounded-[2.5rem] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Edit2 size={24} className="text-white" />
                                    </div>
                                )}
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-3xl font-black italic tracking-tighter uppercase">{currentUser.username}</h3>
                                <p className="text-[10px] uppercase font-black tracking-[0.3em] opacity-40">Active Instance // US-EAST-1</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 w-full mt-10">
                                <div className="text-center p-4 border border-current rounded-2xl opacity-40">
                                    <p className="text-2xl font-black tracking-tighter">{currentUser.rating}</p>
                                    <p className="text-[8px] font-black uppercase tracking-widest mt-1">Global RP</p>
                                </div>
                                <div className="text-center p-4 border border-current rounded-2xl opacity-40">
                                    <p className="text-2xl font-black tracking-tighter">Gold II</p>
                                    <p className="text-[8px] font-black uppercase tracking-widest mt-1">Tier Class</p>
                                </div>
                            </div>
                        </div>

                        {/* Recent Performance Snapshot */}
                        <div className={`p-8 rounded-[2.5rem] border ${isLight ? 'bg-white border-black/10' : 'bg-white/5 border-white/10'}`}>
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mb-8 border-b border-current pb-4">Performance Vectors</h4>
                            <div className="mt-4">
                                <SkillRadar isLight={isLight} />
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-8">
                                <div className="p-4 rounded-2xl bg-black/5 text-center">
                                    <p className="text-xl font-black uppercase">94%</p>
                                    <p className="text-[8px] font-black opacity-30">Accuracy</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-black/5 text-center">
                                    <p className="text-xl font-black uppercase">4.2s</p>
                                    <p className="text-[8px] font-black opacity-30">Avg Load</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Col: Details / History / Achievements */}
                    <div className="lg:col-span-8 space-y-8">
                        {/* Summary & Achievements */}
                        <div id="achievements" className={`p-10 rounded-[3.5rem] border relative overflow-hidden ${isLight ? 'bg-white border-black/10' : 'bg-white/5 border-white/10'}`}>
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mb-10">Milestone achievements</h4>
                            <div className="flex flex-wrap gap-4">
                                {[
                                    { icon: <Zap size={20} />, label: 'Blitz Master', color: 'bg-yellow-500/20 text-yellow-500' },
                                    { icon: <Award size={20} />, label: 'Algorithm Elite', color: 'bg-cyan-500/20 text-cyan-500' },
                                    { icon: <Shield size={20} />, label: 'Bug Crusher', color: 'bg-green-500/20 text-green-500' },
                                    { icon: <TrendingUp size={20} />, label: 'Top 1% Growth', color: 'bg-purple-500/20 text-purple-500' },
                                    { icon: <Trophy size={20} />, label: 'Season III Champ', color: 'bg-blue-500/20 text-blue-500' },
                                ].map((badge, i) => (
                                    <div key={i} className={`group relative p-4 rounded-3xl border border-current w-32 h-32 flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 cursor-help ${badge.color}`}>
                                        {badge.icon}
                                        <p className="text-[9px] font-black uppercase text-center tracking-tighter leading-tight">{badge.label}</p>
                                        <div className="absolute inset-0 bg-current opacity-0 group-hover:opacity-5 rounded-3xl transition-opacity" />
                                    </div>
                                ))}
                                <div className="p-4 rounded-3xl border border-dashed border-gray-500 w-32 h-32 flex items-center justify-center opacity-30">
                                    <span className="text-[8px] font-black text-center">+12 More Locked</span>
                                </div>
                            </div>
                        </div>

                        {/* Recent Battle History (Scores) */}
                        <div id="logs" className={`p-10 rounded-[3.5rem] border ${isLight ? 'bg-white border-black/10' : 'bg-white/5 border-white/10'}`}>
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mb-8 flex justify-between">
                                <span>Recent combat logs</span>
                                <span className="opacity-40 italic">Uplink Stable</span>
                            </h4>
                            <div className="space-y-4">
                                {recentMatchesData.length === 0 && !isLoading && (
                                    <p className="text-xs opacity-40 italic">No recent combat logs found in this sector.</p>
                                )}
                                {recentMatchesData.map((log, i) => (
                                    <div key={log.id} className={`p-6 rounded-[2rem] flex items-center justify-between group transition-all hover:bg-white/5 border border-transparent hover:border-white/10`}>
                                        <div className="flex items-center gap-6">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${log.status === 'completed' ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                                                {log.player2Id === currentUser.id ? 'VS' : 'OP'}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-lg font-black italic uppercase tracking-tighter">Match #{log.id.slice(0, 8)}</span>
                                                    <span className="text-[8px] font-black px-1.5 py-0.5 bg-white/10 rounded uppercase opacity-50 tracking-widest">{log.status}</span>
                                                </div>
                                                <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mt-1">Status: {log.status} // {log.createdAt ? new Date(log.createdAt).toLocaleDateString() : 'Active'}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={() => { setActiveTab('history'); goToHistory(); }}
                                className="w-full mt-10 py-5 rounded-[2rem] border border-dashed border-gray-500/30 text-[9px] font-black uppercase tracking-[0.3em] opacity-40 hover:opacity-100 hover:border-gray-500 transition-all font-black"
                            >
                                View Full Combat Archive
                            </button>
                        </div>

                        {/* Account Config (Editing Area) */}
                        <div id="config" className={`p-10 rounded-[3.5rem] border ${isLight ? 'bg-black text-white' : 'bg-white/5 border-white/10'}`}>
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mb-10">Neural Interface configuration</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="space-y-1.5">
                                        <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Operator ID</label>
                                        {isEditingProfile ? (
                                            <input type="text" defaultValue={currentUser.username} className="w-full bg-white/5 border border-white/20 rounded-xl p-4 text-xs font-black italic focus:border-cyan-500 outline-none" />
                                        ) : (
                                            <p className="text-lg font-black italic tracking-tighter">{currentUser.username || 'GUEST_OPERATOR'}</p>
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Uplink Email</label>
                                        {isEditingProfile ? (
                                            <input type="email" defaultValue={currentUser.email} className="w-full bg-white/5 border border-white/20 rounded-xl p-4 text-xs font-black italic focus:border-cyan-500 outline-none" />
                                        ) : (
                                            <p className="text-lg font-black italic tracking-tighter truncate">{currentUser.email || 'N/A'}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div className="space-y-1.5">
                                        <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Operator Bio // System Motto</label>
                                        {isEditingProfile ? (
                                            <textarea rows={3} className="w-full bg-white/5 border border-white/20 rounded-2xl p-4 text-xs font-black italic focus:border-cyan-500 outline-none resize-none" defaultValue="Evolved logic. Absolute precision. The void awaits." />
                                        ) : (
                                            <p className="text-xs font-light tracking-wide leading-relaxed italic opacity-80">"Evolved logic. Absolute precision. The void awaits."</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        ),
        settings: (
            <div className="panel-content">
                <h2 className="text-4xl font-bold tracking-tighter uppercase">Core Settings</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                    {[
                        { label: 'Neural Audio', val: 'ENABLED', icon: <Play size={20} /> },
                        { label: 'Visual Interface', val: 'LIGHT_MODE', icon: <Sun size={20} /> },
                    ].map((s, i) => (
                        <div key={i} className={`p-8 rounded-3xl border ${isLight ? 'bg-white border-black/5' : 'bg-white/5 border-white/10'}`}>
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">{s.label}</p>
                                    <p className="text-2xl font-black italic">{s.val}</p>
                                </div>
                                {s.icon}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    };

    return (
        <div className={`relative h-screen w-full transition-colors duration-500 flex flex-col ${isLight ? 'bg-gray-50 text-black' : 'bg-transparent text-white'}`} ref={containerRef}>
            <div className={`flex-1 overflow-y-auto px-6 md:px-12 py-8 relative z-10 custom-scrollbar`}>
                <div className="w-full">
                    <header className="mb-12 flex justify-between items-center relative z-50">
                        <div className="flex items-center gap-6 flex-shrink-0">
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className={`p-3.5 rounded-2xl border transition-all dash-element group ${isLight ? 'bg-white border-black/10 hover:bg-black/5' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'}`}
                                title="Toggle Navigation Control"
                            >
                                {isMenuOpen ? <X size={22} className="group-hover:rotate-90 transition-transform" /> : <Menu size={22} className="group-hover:scale-110 transition-transform" />}
                            </button>
                            <div className="dash-element hidden sm:block min-w-0 flex-shrink">
                                <span className={`text-[10px] font-black uppercase tracking-[0.4em] block mb-1.5 transition-colors opacity-40 ${isLight ? 'text-gray-400' : 'text-cyan-500'}`}>Uplink // Status: Nominal</span>
                                <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter italic leading-none truncate">
                                    {activeTab} <span className="text-gray-500 tracking-normal opacity-40 italic">Sector</span>
                                </h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 dash-element flex-shrink-0">
                            <div className="relative group hidden lg:block">
                                <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all duration-500 ${isLight ? 'bg-white border-black/10 focus-within:border-black' : 'bg-white/5 border-white/10 focus-within:border-cyan-500/40 text-white'}`}>
                                    <Search size={16} className={`transition-opacity ${searchQuery ? 'opacity-100 text-cyan-500' : 'opacity-30'}`} />
                                    <input
                                        type="text" placeholder="Search protocol data..." value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-[0.2em] placeholder:opacity-20 w-56"
                                    />
                                    <div className="px-1.5 py-0.5 rounded border border-white/10 text-[8px] font-black opacity-20">CMD+K</div>
                                </div>
                                {searchQuery && (
                                    <div className={`absolute top-16 right-0 w-80 rounded-3xl p-6 shadow-3xl z-50 border backdrop-blur-3xl animate-in zoom-in-95 ${isLight ? 'bg-white/98 border-black/10' : 'bg-[#0a0a0a]/98 border-white/10'}`}>
                                        <div className="space-y-1.5">
                                            {sortedLeaderboard.slice(0, 4).map((item, i) => (
                                                <div key={i} className={`p-4 rounded-2xl flex items-center justify-between group transition-all cursor-pointer ${isLight ? 'hover:bg-black/5' : 'hover:bg-white/5'}`}>
                                                    <span className="text-xs font-black uppercase tracking-tight">{item.username}</span>
                                                    <ChevronRight size={14} className="opacity-0 group-hover:opacity-100" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button onClick={() => setTheme(isLight ? 'dark' : 'light')} className={`p-3.5 rounded-2xl border transition-all ${isLight ? 'bg-white border-black/10 hover:bg-black/5' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'}`}>
                                {isLight ? <Moon size={20} /> : <Sun size={20} />}
                            </button>

                            <div className="relative" ref={notifRef}>
                                <button onClick={() => { setShowNots(!showNots); setShowMail(false); }} className={`p-3.5 rounded-2xl border transition-all relative ${isLight ? 'bg-white border-black/10 hover:bg-black/5' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'}`}>
                                    <Bell size={20} />
                                    <span className="absolute top-3 right-3 w-4 h-4 bg-red-500 border-2 border-black rounded-full text-[8px] font-black flex items-center justify-center">2</span>
                                </button>
                                {showNots && (
                                    <div className={`absolute top-16 right-0 w-80 rounded-3xl p-6 shadow-3xl z-50 border animate-in zoom-in-95 duration-200 ${isLight ? 'bg-white border-black/10 shadow-xl' : 'bg-[#0a0a0a] border-white/10 shadow-2xl shadow-black/50'}`}>
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-gray-400' : 'text-cyan-500'}`}>Intelligence Feed</h3>
                                        </div>
                                        <div className="space-y-3">
                                            {notifications.map(n => (
                                                <div key={n.id} className={`p-4 rounded-2xl border ${isLight ? 'bg-black/5 border-black/5' : 'bg-white/5 border-white/5'}`}>
                                                    <p className="text-xs font-bold mb-1">{n.text}</p>
                                                    <span className="text-[9px] opacity-40 font-black uppercase tracking-widest">{n.time}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="relative" ref={mailRef}>
                                <button onClick={() => { setShowMail(!showMail); setShowNots(false); }} className={`p-3.5 rounded-2xl border transition-all relative ${isLight ? 'bg-white border-black/10 hover:bg-black/5' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'}`}>
                                    <Mail size={20} />
                                    <div className="absolute top-3 right-3 w-2.5 h-2.5 bg-cyan-500 border-2 border-black rounded-full animate-pulse" />
                                </button>
                                {showMail && (
                                    <div className={`absolute top-16 right-0 w-80 rounded-3xl p-6 shadow-3xl z-50 border animate-in zoom-in-95 duration-200 ${isLight ? 'bg-white border-black/10 shadow-xl' : 'bg-[#0a0a0a] border-white/10 shadow-2xl shadow-black/50'}`}>
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-gray-400' : 'text-cyan-500'}`}>Secure Uplink</h3>
                                        </div>
                                        <div className="space-y-1.5">
                                            {messages.map(m => (
                                                <div key={m.id} className={`p-4 rounded-2xl ${m.unread ? (isLight ? 'bg-black/5' : 'bg-white/10') : 'hover:bg-white/5'}`}>
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-cyan-500">{m.from}</span>
                                                        <span className="text-[8px] opacity-30">{m.time}</span>
                                                    </div>
                                                    <p className="text-xs font-medium opacity-80 line-clamp-1">{m.text}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="relative ml-2">
                                <button
                                    onClick={() => goToProfile()}
                                    className={`flex items-center gap-3 pl-3 pr-2 py-2 rounded-2xl border transition-all ${isLight ? 'bg-white border-black/10 hover:bg-black/5' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                                >
                                    <div className="flex flex-col items-end hidden sm:block">
                                        <span className="text-[10px] font-black uppercase tracking-tighter">{currentUser.username || 'OPERATOR'}</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                            <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Active</span>
                                        </div>
                                    </div>
                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center text-black font-black text-sm`}>
                                        {(currentUser.username || 'G')[0].toUpperCase()}
                                    </div>
                                </button>
                            </div>
                        </div>
                    </header>

                    <div className="dash-element flex-1 min-h-0 relative mt-4">
                        {panels[activeTab]}
                    </div>
                </div>
            </div>

            <style>{`
                .panel-content {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                    animation: panelFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @keyframes panelFadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}; border-radius: 10px; }
            `}</style>
        </div>
    );
};
