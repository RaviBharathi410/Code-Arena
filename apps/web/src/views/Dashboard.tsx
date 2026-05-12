import React, { useEffect, useRef, useState, useMemo, ReactNode, useCallback } from 'react';
import { useNav, PAGES } from '../navigation/NavigationContext';
import gsap from 'gsap';
import { useArenaStore } from '../store/useArenaStore';
import { useAuthStore } from '../store/useAuthStore';
import { useSocket } from '../contexts/SocketContext';
import { TournamentHub } from './TournamentHub';
import { useLayout } from '../components/layout/MainLayout';
import { User, LeaderboardEntry, MatchRoom } from '../types';
import { useMatch } from '../contexts/MatchContext';
import api from '../lib/api';
import { SettingsView } from './SettingsView';

import {
    Trophy, Zap, Activity,
    Sword, Target,
    ChevronRight,
    Edit2, Moon, Sun,
    Menu, X,
    Bell, Sparkles, Shield, Cpu,
    Award, TrendingUp, Plus, Users
} from 'lucide-react';
import { Logo } from '../components/ui/Logo';

// ── Leaderboard data ──────────────────────────────────────────────────────
const INITIAL_LEADERBOARD: LeaderboardEntry[] = [
    { rank: 1, userId: 'm1', username: 'Ghost_Runner_32', rankRating: 4820, wins: 312, winRate: 80, tier: 'OPERATOR' },
    { rank: 2, userId: 'm2', username: 'NeonShadow_X', rankRating: 4611, wins: 289, winRate: 75, tier: 'DIAMOND' },
    { rank: 3, userId: 'm3', username: 'CipherKnight', rankRating: 4430, wins: 261, winRate: 70, tier: 'PLATINUM' },
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
                            fill={isLight ? "#000" : "#fff"} className="uppercase tracking-[0.15em] opacity-40"
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
    const { 
        currentPage, goToBattle, goToOpponents, 
        goToArenaPractice, goToHistory, goToProblems,
        goToArenaMatch, params 
    } = useNav();
    const { isMenuOpen, setIsMenuOpen, isLight, setTheme } = useLayout();
    const { createRoom, joinRoom, findMatch: doFindMatch, cancelSearch: doCancelSearch, status: matchStatus, roomId: matchRoomId } = useMatch();

    const { updateRating, updateStats } = useAuthStore();
    const { on, emit } = useSocket();

    const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
    const [recentMatchesData, setRecentMatchesData] = useState<MatchRoom[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isMatchmaking, setIsMatchmaking] = useState(false);
    const [matchmakingTime, setMatchmakingTime] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [ratingFlash, setRatingFlash] = useState<{ change: number; newRating: number } | null>(null);

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
    const [showNots, setShowNots] = useState(false);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [notifications, setNotifications] = useState([
        { id: 1, text: 'New Tournament starting soon!', time: '5m ago' },
        { id: 2, text: 'Rank up! You are now Silver IV', time: '1h ago' }
    ]);

    const [displayedUser, setDisplayedUser] = useState<User>(currentUser);
    const [profileLoading, setProfileLoading] = useState(false);

    useEffect(() => {
        const fetchTargetProfile = async () => {
            if (activeTab === 'profile' && params.userId && params.userId !== currentUser.id) {
                setProfileLoading(true);
                try {
                    const res = await api.get(`/users/${params.userId}`);
                    setDisplayedUser(res.data);
                } catch (err) {
                    console.error('Failed to fetch profile:', err);
                    setDisplayedUser(currentUser);
                } finally {
                    setProfileLoading(false);
                }
            } else {
                setDisplayedUser(currentUser);
            }
        };

        fetchTargetProfile();
    }, [activeTab, params.userId, currentUser]);

    useEffect(() => {
        setActiveTab(PAGE_TO_TAB[currentPage] || 'command');
    }, [currentPage]);

    // Close notification dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setShowNots(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        let interval: any;
        if (isMatchmaking) {
            interval = setInterval(() => setMatchmakingTime(t => t + 1), 1000);
        } else {
            setMatchmakingTime(0);
        }
        return () => clearInterval(interval);
    }, [isMatchmaking]);

    const startMatchmaking = () => {
        setIsMatchmaking(true);
        doFindMatch();
    };

    const cancelMatchmaking = () => {
        setIsMatchmaking(false);
        doCancelSearch();
    };

    // Navigate to arena when matchmaking finds a match
    useEffect(() => {
        if (isMatchmaking && matchStatus === 'waiting' && matchRoomId) {
            setIsMatchmaking(false);
            goToArenaMatch(matchRoomId);
        }
    }, [isMatchmaking, matchStatus, matchRoomId, goToArenaMatch]);

    const fetchDashboardData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [lbRes, matchRes] = await Promise.allSettled([
                api.get('/leaderboard?limit=10'),
                api.get(`/matches/user/${currentUser.id}?limit=5`),
            ]);

            if (lbRes.status === 'fulfilled' && lbRes.value.data) {
                setLeaderboardData(lbRes.value.data.data || lbRes.value.data || []);
            }
            if (matchRes.status === 'fulfilled' && matchRes.value.data) {
                setRecentMatchesData(matchRes.value.data.data || matchRes.value.data || []);
            }
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

        // Subscribe to live ELO update events
        const cleanupElo = on('match:eloUpdate', (data: { updates: { userId: string; eloRating: number; change: number }[] }) => {
            const myUpdate = data.updates.find(u => u.userId === currentUser.id);
            if (myUpdate) {
                updateRating(myUpdate.eloRating, myUpdate.change);
                updateStats({
                    wins: myUpdate.change > 0 ? (currentUser.wins || 0) + 1 : currentUser.wins,
                    losses: myUpdate.change <= 0 ? (currentUser.losses || 0) + 1 : currentUser.losses,
                });
                setRatingFlash({ change: myUpdate.change, newRating: myUpdate.eloRating });
                setNotifications(prev => [{
                    id: Date.now(),
                    text: `Match result: ${myUpdate.change > 0 ? '+' : ''}${myUpdate.change} RP`,
                    time: 'Just now'
                }, ...prev.slice(0, 4)]);
                setTimeout(() => setRatingFlash(null), 4000);
            }
        });

        const ctx = gsap.context((self) => {
            const elements = self.selector?.('.dash-element');
            if (elements && elements.length > 0) {
                gsap.from(elements, {
                    y: 30, duration: 1.2,
                    stagger: 0.08, ease: 'power4.out', delay: 0.15,
                });
            }
        }, containerRef);
        return () => { ctx.revert(); cleanupElo(); };
    }, []);

    useEffect(() => {
        const ctx = gsap.context((self) => {
            const panels = self.selector?.('.panel-content');
            if (panels && panels.length > 0) {
                gsap.fromTo(panels,
                    { y: 16 },
                    { y: 0, duration: 0.45, ease: 'power3.out' }
                );
            }
        }, containerRef);
        return () => ctx.revert();
    }, [activeTab]);

    const sortedLeaderboard = useMemo(() => {
        const data = leaderboardData.length > 0 ? leaderboardData : INITIAL_LEADERBOARD;
        return [...data].sort((a, b) => (b.rankRating || 0) - (a.rankRating || 0));
    }, [leaderboardData]);

    // ── Panel Components ──────────────────────────────────────────────────
    const CommandPanel = () => (
        <div className="panel-content space-y-12 flex flex-col items-center text-center">
            <div className="space-y-6 flex flex-col items-center">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/20 ${isLight ? 'bg-black/5' : 'bg-white/5'}`}>
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className={`text-xs tracking-wider uppercase ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>System Status: Optimal</span>
                </div>
                <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.85] uppercase">
                    Command <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-primary to-accent-secondary">Center</span>
                </h1>
                <p className={`text-lg max-w-2xl font-light leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                    Welcome back, Operator <strong className={isLight ? 'text-black' : 'text-white'}>{currentUser.username}</strong>. Monitoring live combat vectors. Neural uplink stable at 14.2ms latency.
                </p>
                {isLoading && <div className="text-[10px] font-black uppercase tracking-[0.4em] animate-pulse text-accent-secondary">Syncing with global intel...</div>}
                {error && <div className="text-xs font-black uppercase text-red-500">{error}</div>}
            </div>
            <div className="flex flex-wrap justify-center gap-4">
                <button onClick={() => goToBattle()} className={`group relative px-8 py-4 rounded-full font-black uppercase text-xs tracking-[0.2em] overflow-hidden flex items-center gap-3 hover:scale-105 transition-transform ${isLight ? 'bg-black text-white' : 'bg-white text-black'}`}>
                    <Zap size={18} fill="currentColor" /> Enter Arena
                </button>
                <button onClick={() => goToProblems()} className={`group relative px-8 py-4 rounded-full font-black uppercase text-xs tracking-[0.2em] overflow-hidden flex items-center gap-3 hover:scale-105 transition-transform ${isLight ? 'bg-white text-black border border-black/10 shadow-lg hover:bg-black/5' : 'bg-white/5 border border-white/10 hover:bg-white/10 text-white'}`}>
                    <Sword size={18} fill="none" /> Browse Arsenal
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6 w-full max-w-6xl">
                {[
                    { icon: <Trophy size={20} />, val: currentUser.rankRating ?? 1200, label: 'Rank Rating', highlight: ratingFlash && 'rating' },
                    { icon: <Target size={20} />, val: currentUser.wins && currentUser.losses
                        ? `${Math.round((currentUser.wins / ((currentUser.wins || 0) + (currentUser.losses || 0))) * 100)}%`
                        : '—', label: 'Win Rate' },
                    { icon: <Activity size={20} />, val: (currentUser.wins || 0) + (currentUser.losses || 0), label: 'Total Battles' },
                ].map((s, i) => (
                    <div key={i} className={`p-10 rounded-[2.5rem] border backdrop-blur-xl relative overflow-hidden group transition-all hover:-translate-y-1 w-full ${
                        isLight ? 'bg-white border-black/5 shadow-xl' : 'bg-[#12121a] border-white/20 hover:bg-[#1a1a24] hover:border-white/40 shadow-2xl shadow-black/50'
                    }`}>
                        <div className={`p-3.5 rounded-2xl w-fit mb-8 ${isLight ? 'bg-black/5' : 'bg-white/10'}`}>{s.icon}</div>
                        <p className="text-5xl font-black tracking-tighter mb-2">{s.val}</p>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">{s.label}</p>
                        {/* Live RP flash indicator on Rating card */}
                        {i === 0 && ratingFlash && (
                            <div className={`absolute top-6 right-6 px-3 py-1 rounded-full text-[10px] font-black animate-bounce ${
                                ratingFlash.change > 0
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}>
                                {ratingFlash.change > 0 ? '+' : ''}{ratingFlash.change} RP
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );

    const BattlePanel = () => (
        <div className="panel-content space-y-10 flex flex-col items-center text-center">
            <div className="flex flex-col items-center space-y-2">
                <h2 className="text-5xl font-black tracking-tighter uppercase">Battle <span className="text-accent-secondary">Arena</span></h2>
                <p className={`text-lg font-light max-w-2xl ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>High-stakes algorithm combat. RP at risk. Prepare for neural insertion.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                    { title: 'Ranked Dual', desc: 'Climb the global leaderboard in 1v1 combat.', icon: <Sword size={28} />, badge: 'STAKES', action: () => goToProblems() },
                    { title: 'Quick Match', desc: 'Jump into a casual speed-coding session instantly.', icon: <Zap size={28} />, badge: 'FAST', action: startMatchmaking },
                    { title: 'Create Room', desc: 'Generate a private 6-char code to challenge a friend.', icon: <Plus size={28} />, badge: 'PRIVATE', action: async () => { await createRoom('1v1'); goToArenaMatch('new'); } },
                    { title: 'Join Room', desc: 'Enter a 6-character room code to join an existing uplink.', icon: <Users size={28} />, badge: 'UPLINK', action: () => { const code = prompt('Enter 6-char Room Code:'); if(code) { joinRoom(code); goToArenaMatch('new'); } } },
                ].map((mode, i) => (
                    <button key={i} onClick={mode.action}
                        className={`group p-8 rounded-3xl border transition-all duration-300 text-left relative overflow-hidden ${isLight ? 'bg-black/5 border-black/10 hover:bg-black/10' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                        <div className={`absolute top-6 right-6 text-[10px] font-black tracking-widest border px-2 py-0.5 rounded ${isLight ? 'border-black/20 text-gray-600' : 'border-white/20 text-gray-400'}`}>{mode.badge}</div>
                        <div className={`mb-6 transition-colors ${isLight ? 'text-gray-600 group-hover:text-black' : 'text-gray-300 group-hover:text-white'}`}>{mode.icon}</div>
                        <h3 className="text-2xl font-black mb-3 uppercase tracking-tighter">{mode.title}</h3>
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
            <div className="panel-content space-y-12 flex flex-col items-center text-center">
                <div className="flex flex-col xl:flex-row gap-12 w-full max-w-7xl mx-auto">
                    <div className="flex-1 flex flex-col items-center text-center space-y-10">
                        <div className="w-full flex flex-col items-center">
                            <div className="max-w-2xl space-y-3">
                                <h2 className="text-5xl font-black tracking-tighter uppercase">Practice <span className="text-accent-primary">Lab</span></h2>
                                <p className={`text-lg font-light ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Adaptive training engine — optimized for skill vector evolution. Master the logic of the arena.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
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
                                <div className="space-y-6 text-left">
                                    <div className="space-y-1">
                                        <div className="text-3xl font-black uppercase tracking-tighter">Recommended</div>
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
            <div className="panel-content items-center text-center">
                <h2 className="text-4xl font-bold tracking-tighter uppercase">Battle <span className="text-accent-secondary">Log</span></h2>
                <div className={`mt-8 p-8 rounded-3xl border w-full max-w-4xl ${isLight ? 'bg-white border-black/10' : 'bg-white/5 border-white/10'}`}>
                    <p className="opacity-50 font-mono">Protocol Data: 0 matches found in local cache.</p>
                </div>
            </div>
        ),
        leaderboard: (
            <div className="panel-content items-center text-center">
                <h2 className="text-4xl font-bold tracking-tighter uppercase">Global Intel</h2>
                <div className="mt-8 space-y-4 w-full max-w-4xl">
                    {sortedLeaderboard.map((u, i) => (
                        <div key={i} className={`p-6 rounded-2xl border flex items-center justify-between ${isLight ? 'bg-white border-black/5 shadow-md' : 'bg-white/5 border-white/10'}`}>
                            <div className="flex items-center gap-4 text-left">
                                <span className="font-black opacity-20 text-2xl w-8">#{i + 1}</span>
                                <span className="font-bold">{u.username}</span>
                            </div>
                            <span className="font-black text-accent-secondary">{u.rankRating} RP</span>
                        </div>
                    ))}
                </div>
            </div>
        ),
        profile: (
            <div className="panel-content space-y-10">
                <div className="flex justify-between items-end">
                    <div>
                        <h2 className="text-4xl font-black tracking-tighter uppercase">Operator DNA</h2>
                        <p className={`text-lg font-light ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Protocol Clearance: Level 42 — Master Architect</p>
                    </div>
                    <button
                        onClick={() => setIsEditingProfile(!isEditingProfile)}
                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${isEditingProfile ? (isLight ? 'bg-black text-white border-black' : 'bg-white text-black border-white') : (isLight ? 'bg-black/5 hover:bg-black/10 border-black/10' : 'bg-white/5 hover:bg-white/10 border-white/10')}`}
                    >
                        {isEditingProfile ? 'Save Local' : 'Edit Sector'}
                    </button>
                </div>

                {profileLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-2 border-accent-secondary border-t-transparent animate-spin rounded-full" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Left Col: Core Stats & Avatar */}
                        <div className="lg:col-span-4 space-y-8">
                            <div className={`p-10 rounded-[3rem] border flex flex-col items-center relative overflow-hidden transition-all duration-700 ${isLight ? 'bg-white border-black/10 shadow-2xl' : 'bg-white text-black shadow-[0_40px_100px_rgba(255,255,255,0.1)]'}`}>
                                <div className="relative group cursor-pointer mb-8">
                                    <div className={`w-32 h-32 rounded-[2.5rem] bg-accent-secondary flex items-center justify-center font-black text-5xl transition-transform group-hover:scale-105 duration-500 text-black shadow-2xl shadow-accent-secondary/20`}>
                                        {displayedUser.username?.[0].toUpperCase()}
                                    </div>
                                    {isEditingProfile && displayedUser.id === currentUser.id && (
                                        <div className="absolute inset-0 bg-black/40 rounded-[2.5rem] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Edit2 size={24} className="text-white" />
                                        </div>
                                    )}
                                </div>
                                <div className="text-center space-y-2">
                                    <h3 className="text-3xl font-black tracking-tighter uppercase text-black">{displayedUser.username}</h3>
                                    <p className="text-[10px] uppercase font-black tracking-[0.3em] opacity-40 text-black">Active Instance // US-EAST-1</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4 w-full mt-10">
                                    <div className="text-center p-6 border border-black/10 rounded-3xl bg-black/5 text-black">
                                        <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Global RP</p>
                                        <p className="text-2xl font-black tracking-tighter">{displayedUser.rankRating}</p>
                                    </div>
                                    <div className="text-center p-6 border border-black/10 rounded-3xl bg-black/5 text-black">
                                        <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">Tier Class</p>
                                        <p className="text-2xl font-black tracking-tighter">{displayedUser.tier || 'Gold II'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Performance Radar in Sidebar for users */}
                            <div className={`p-8 rounded-[2.5rem] border ${isLight ? 'bg-white border-black/10' : 'bg-white/5 border-white/10'}`}>
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mb-8 border-b border-current pb-4">Neural Performance</h4>
                                <div className="mt-4">
                                    <SkillRadar isLight={isLight} />
                                </div>
                            </div>
                        </div>

                        {/* Right Col: Achievements & History */}
                        <div className="lg:col-span-8 space-y-8">
                            <div id="achievements" className={`p-10 rounded-[3.5rem] border ${isLight ? 'bg-white border-black/10 shadow-sm' : 'bg-white/5 border-white/10'}`}>
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mb-10">Milestone Achievements</h4>
                                <div className="flex flex-wrap gap-4">
                                    {[
                                        { name: 'Blitz Master', icon: <Zap size={18} />, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20' },
                                        { name: 'Algorithm Elite', icon: <Award size={18} />, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' },
                                        { name: 'Bug Crusher', icon: <Shield size={18} />, color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20' },
                                        { name: 'Top 1% Growth', icon: <TrendingUp size={18} />, color: 'text-fuchsia-400', bg: 'bg-fuchsia-400/10', border: 'border-fuchsia-400/20' },
                                        { name: 'Season III Champ', icon: <Trophy size={18} />, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
                                    ].map((a, i) => (
                                        <div key={i} className={`p-6 rounded-[2rem] border ${a.bg} ${a.border} group relative transition-all hover:scale-105 w-32 h-32 flex flex-col items-center justify-center text-center gap-3`}>
                                            <div className={a.color}>{a.icon}</div>
                                            <span className={`text-[8px] font-black uppercase tracking-widest ${a.color}`}>{a.name}</span>
                                            <div className="absolute inset-0 bg-current opacity-0 group-hover:opacity-5 rounded-3xl transition-opacity" />
                                        </div>
                                    ))}
                                    <div className="p-4 rounded-[2rem] border border-dashed border-gray-500/30 w-32 h-32 flex items-center justify-center opacity-30">
                                        <span className="text-[8px] font-black text-center">+12 More Locked</span>
                                    </div>
                                </div>
                            </div>

                            {/* Account Config (Editing Area) */}
                            <div id="config" className={`p-10 rounded-[3.5rem] border ${isLight ? 'bg-black text-white' : 'bg-white/5 border-white/10'}`}>
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mb-10">Neural Interface configuration</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <div className="space-y-1.5">
                                            <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Operator ID</label>
                                            {isEditingProfile && displayedUser.id === currentUser.id ? (
                                                <input type="text" defaultValue={displayedUser.username} className={`w-full border rounded-xl p-4 text-xs font-black focus:border-accent-secondary outline-none ${isLight ? 'bg-black/5 border-black/10 text-black' : 'bg-white/5 border-white/20 text-white'}`} />
                                            ) : (
                                                <p className={`text-lg font-black tracking-tighter ${isLight ? 'text-black' : 'text-white'}`}>{displayedUser.username || 'GUEST_OPERATOR'}</p>
                                            )}
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Uplink Email</label>
                                            {isEditingProfile && displayedUser.id === currentUser.id ? (
                                                <input type="email" defaultValue={displayedUser.email} className="w-full bg-white/5 border border-white/20 rounded-xl p-4 text-xs font-black focus:border-accent-secondary outline-none" />
                                            ) : (
                                                <p className={`text-lg font-black tracking-tighter truncate ${isLight ? 'text-black' : 'text-white'}`}>{displayedUser.email || 'N/A'}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="space-y-1.5">
                                            <label className="text-[8px] font-black uppercase tracking-widest opacity-40">Operator Bio // System Motto</label>
                                            {isEditingProfile ? (
                                                <textarea rows={3} className="w-full bg-white/5 border border-white/20 rounded-2xl p-4 text-xs font-black focus:border-accent-secondary outline-none resize-none" defaultValue="Evolved logic. Absolute precision. The void awaits." />
                                            ) : (
                                                <p className="text-xs font-light tracking-wide leading-relaxed opacity-80">"Evolved logic. Absolute precision. The void awaits."</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Battle History (Scores) */}
                            <div id="logs" className={`p-10 rounded-[3.5rem] border ${isLight ? 'bg-white border-black/10' : 'bg-white/5 border-white/10'}`}>
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mb-8 flex justify-between">
                                    <span>Recent combat logs</span>
                                    <span className="opacity-40">Uplink Stable</span>
                                </h4>
                                <div className="space-y-4">
                                    {recentMatchesData.length === 0 && !isLoading && (
                                        <p className="text-xs opacity-40">No recent combat logs found in this sector.</p>
                                    )}
                                    {recentMatchesData.map((log) => (
                                        <div key={log.id} className={`p-6 rounded-[2rem] flex items-center justify-between group transition-all border border-transparent ${isLight ? 'hover:bg-black/5 hover:border-black/5' : 'hover:bg-white/5 hover:border-white/10'}`}>
                                            <div className="flex items-center gap-6">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${log.status === 'completed' ? (isLight ? 'bg-green-500/10 text-green-600' : 'bg-green-500/20 text-green-500') : (isLight ? 'bg-yellow-500/10 text-yellow-600' : 'bg-yellow-500/20 text-yellow-500')}`}>
                                                    {log.player2Id === displayedUser.id ? 'VS' : 'OP'}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-3">
                                                        <span className={`text-lg font-black uppercase tracking-tighter ${isLight ? 'text-black' : 'text-white'}`}>Match #{log.id.slice(0, 8)}</span>
                                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest ${isLight ? 'bg-black/5 opacity-60' : 'bg-white/10 opacity-50'}`}>{log.status}</span>
                                                    </div>
                                                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mt-1">Status: {log.status} // {log.createdAt ? new Date(log.createdAt).toLocaleDateString() : 'Active'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        ),
        settings: (
            <div className="panel-content">
                <SettingsView />
            </div>
        )
    };

    return (
        <div className={`relative min-h-screen w-full transition-colors duration-500 flex flex-col items-center ${isLight ? 'bg-gray-50 text-black' : 'bg-transparent text-white'}`} ref={containerRef}>
            {isMatchmaking && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-6">
                    <div className="max-w-md w-full space-y-12 text-center relative">
                        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-80 h-80 bg-accent-secondary/20 blur-[120px] rounded-full animate-pulse" />
                        
                        <div className="space-y-4 relative z-10">
                            <h2 className="text-5xl font-black tracking-tighter uppercase italic">Searching...</h2>
                            <p className="text-xs font-black uppercase tracking-[0.4em] text-gray-500">Scanning global sectors for active rivals</p>
                        </div>

                        <div className="flex flex-col items-center gap-8 relative z-10">
                            <div className="relative">
                                <div className="w-32 h-32 rounded-full border-2 border-white/5 flex items-center justify-center">
                                    <div className="w-24 h-24 rounded-full border-2 border-accent-secondary/30 border-t-accent-secondary animate-spin" />
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center text-accent-secondary">
                                    <Zap size={32} fill="currentColor" className="animate-pulse" />
                                </div>
                            </div>
                            
                            <div className="space-y-1">
                                <p className="text-4xl font-black font-mono tracking-tighter">00:{matchmakingTime.toString().padStart(2, '0')}</p>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-600">Elapsed Tactical Time</p>
                            </div>
                        </div>

                        <button 
                            onClick={cancelMatchmaking}
                            className="relative z-10 w-full py-5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-[0.3em] transition-all"
                        >
                            Abort Uplink
                        </button>
                    </div>
                </div>
            )}
            
            <div className="w-full relative z-10 flex flex-col items-center">
                <div className="w-full px-6 md:px-12 pt-[42px] pb-8 border-b border-white/5 backdrop-blur-sm sticky top-0 z-[60]">
                    <header className="flex flex-col items-start relative z-50 gap-8 max-w-7xl mx-auto w-full">
                        <div className="flex items-center gap-10 w-full relative">
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className={`p-2 transition-all z-[70] flex items-center justify-center active:scale-90 ${
                                    isLight ? 'text-black hover:bg-black/5' : 'text-white hover:bg-white/5'
                                } rounded-xl`}
                                title="Toggle Navigation Control"
                            >
                                {isMenuOpen ? <X size={26} /> : <Menu size={26} />}
                            </button>
                            <div className="min-w-0 text-left flex flex-col items-start">
                                <Logo isLight={isLight} />
                            </div>
                            
                            <div className="absolute right-0 flex items-center gap-4 dash-element">
                                <button onClick={() => setTheme(isLight ? 'dark' : 'light')} className={`p-3.5 rounded-2xl border transition-all ${isLight ? 'bg-white border-black/10 hover:bg-black/5' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'}`}>
                                    {isLight ? <Moon size={20} /> : <Sun size={20} />}
                                </button>

                                <div className="relative" ref={notifRef}>
                                    <button onClick={() => { setShowNots(!showNots); }} className={`p-3.5 rounded-2xl border transition-all relative ${isLight ? 'bg-white border-black/10 hover:bg-black/5' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'}`}>
                                        <Bell size={20} />
                                        <span className="absolute top-3 right-3 w-4 h-4 bg-red-500 border-2 border-black rounded-full text-[8px] font-black flex items-center justify-center">2</span>
                                    </button>
                                    {showNots && (
                                        <div className={`absolute top-16 right-0 w-80 rounded-3xl p-6 shadow-3xl z-50 border animate-in zoom-in-95 duration-200 text-left ${isLight ? 'bg-white border-black/10 shadow-xl' : 'bg-[#0a0a0a] border-white/10 shadow-2xl shadow-black/50'}`}>
                                            <div className="flex items-center justify-between mb-6">
                                                <h3 className="text-[10px] font-black uppercase tracking-widest text-accent-secondary">Intelligence Feed</h3>
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

                                <button
                                    onClick={() => setActiveTab('profile')}
                                    className={`flex items-center gap-3 px-4 py-2 rounded-2xl border transition-all ${isLight ? 'bg-white border-black/10 hover:bg-black/5' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                                >
                                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center text-black font-black text-xs shadow-lg">
                                        {currentUser.username[0].toUpperCase()}
                                    </div>
                                    <div className="hidden sm:block text-left">
                                        <p className={`text-[10px] font-black uppercase tracking-tighter leading-none ${isLight ? 'text-black' : 'text-white'}`}>{currentUser.username}</p>
                                        <p className="text-[8px] font-bold text-accent-secondary uppercase tracking-[0.2em] leading-none mt-1">Operator</p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </header>
                </div>

                <div className="w-full max-w-7xl mx-auto px-6 md:px-12 py-12 relative z-10 flex justify-center">
                    <div className="dash-element w-full max-w-7xl relative">
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
