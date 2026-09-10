import React, { useEffect, useRef, useState, useMemo, ReactNode, useCallback } from 'react';
import { useNav, PAGES } from '../navigation/NavigationContext';
import gsap from 'gsap';
import { useArenaStore } from '../store/useArenaStore';
import { useAuthStore } from '../store/useAuthStore';
import { useSocket } from '../hooks/useSocket';
import { TournamentHub } from './TournamentHub';
import { useLayout } from '../contexts/LayoutContext';
import { User, LeaderboardEntry, MatchRoom } from '../types';
import { useMatch } from '../contexts/MatchContext';
import api from '../lib/api';
import { SettingsView } from './SettingsView';
import { RoomConfigModal } from '../components/rooms/RoomConfigModal';

import {
    Trophy, Zap, Activity,
    Sword, Target,
    ChevronRight,
    Edit2, Moon, Sun,
    Menu, X,
    Bell, Sparkles, Shield, Cpu,
    Award, TrendingUp, Plus, Users,
    Copy, Check, AlertCircle, Loader2, RotateCcw
} from 'lucide-react';
import { Logo } from '../components/ui/Logo';


// ── Leaderboard data ──────────────────────────────────────────────────────
const INITIAL_LEADERBOARD: LeaderboardEntry[] = [
    { rank: 1, userId: 'm1', username: 'Ghost_Runner_32', rankRating: 4820, wins: 312, winRate: 80, tier: 'GRANDMASTER' },
    { rank: 2, userId: 'm2', username: 'NeonShadow_X', rankRating: 4611, wins: 289, winRate: 75, tier: 'DIAMOND' },
    { rank: 3, userId: 'm3', username: 'CipherKnight', rankRating: 4430, wins: 261, winRate: 70, tier: 'PLATINUM' },
];

// ── Radar Chart Component ─────────────────────────────────────────────────
interface SkillRadarProps {
    isLight: boolean;
    skills?: { name: string; value: number; status?: string; hasData?: boolean }[];
    hasData?: boolean;
}

const SkillRadar: React.FC<SkillRadarProps> = ({ isLight, skills, hasData = true }) => {
    const data = useMemo(() => {
        if (!hasData || !skills || skills.length === 0) {
            return [
                { name: 'Arrays', value: 0, status: 'NO_DATA', hasData: false },
                { name: 'Strings', value: 0, status: 'NO_DATA', hasData: false },
                { name: 'Trees', value: 0, status: 'NO_DATA', hasData: false },
                { name: 'Graphs', value: 0, status: 'NO_DATA', hasData: false },
                { name: 'DP', value: 0, status: 'NO_DATA', hasData: false },
                { name: 'Math', value: 0, status: 'NO_DATA', hasData: false },
                { name: 'Sorting', value: 0, status: 'NO_DATA', hasData: false },
                { name: 'Hashing', value: 0, status: 'NO_DATA', hasData: false },
            ];
        }
        return skills;
    }, [skills, hasData]);

    const size = 260;
    const center = size / 2;
    const radius = size * 0.35;
    const angleStep = (Math.PI * 2) / data.length;

    const points = data.map((s, i) => {
        const val = s.hasData ? Math.max(15, s.value) : 10;
        const x = center + radius * (val / 100) * Math.cos(i * angleStep - Math.PI / 2);
        const y = center + radius * (val / 100) * Math.sin(i * angleStep - Math.PI / 2);
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
        <div className="flex flex-col items-center relative">
            <svg width={size} height={size} className="overflow-visible">
                {webPoints.map((p, i) => (
                    <polygon key={i} points={p} fill="none" stroke={isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.06)"} strokeWidth="1" strokeDasharray={!hasData ? "3 3" : undefined} />
                ))}
                {data.map((_, i) => {
                    const x = center + radius * Math.cos(i * angleStep - Math.PI / 2);
                    const y = center + radius * Math.sin(i * angleStep - Math.PI / 2);
                    return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke={isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)"} />;
                })}
                <polygon
                    points={points}
                    fill={!hasData ? "transparent" : (isLight ? "rgba(0,0,0,0.1)" : "rgba(34,211,238,0.15)")}
                    stroke={!hasData ? (isLight ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.2)") : (isLight ? "black" : "#22d3ee")}
                    strokeWidth="2"
                    strokeDasharray={!hasData ? "4 4" : undefined}
                    className="transition-all duration-1000"
                />
                {data.map((s, i) => {
                    const x = center + (radius + 20) * Math.cos(i * angleStep - Math.PI / 2);
                    const y = center + (radius + 20) * Math.sin(i * angleStep - Math.PI / 2);
                    const isUncharted = s.hasData === false;
                    return (
                        <text
                            key={i} x={x} y={y} textAnchor="middle" fontSize="7" fontWeight="900"
                            fill={isUncharted ? (isLight ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.3)") : (isLight ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.6)")}
                            className="tracking-widest uppercase font-mono"
                        >
                            {s.name}
                        </text>
                    );
                })}
            </svg>

            {!hasData && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center pointer-events-none">
                    <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[8px] font-mono font-bold text-cyan-400 tracking-[0.2em] uppercase mb-1 pointer-events-auto">
                        UNCHARTED VECTOR
                    </span>
                    <p className="text-[9px] font-light max-w-[150px] opacity-60">
                        Complete diagnostic drills to calibrate skill vector
                    </p>
                </div>
            )}
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
        goToArenaMatch, goToHostedRoom, params
    } = useNav();
    const { isMenuOpen, setIsMenuOpen, isLight, setTheme } = useLayout();
    const {
        createRoom,
        joinMatch: joinRoom,
        findMatch: doFindMatch,
        cancelSearch: doCancelSearch,
        status: matchStatus,
        roomId: matchRoomId,
        roomCode: matchRoomCode,
        players: matchPlayers,
        error: matchError,
        clearError: clearMatchError
    } = useMatch();

    const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
    const [showRoomConfigModal, setShowRoomConfigModal] = useState(false);
    const [showJoinRoomModal, setShowJoinRoomModal] = useState(false);
    const [joinRoomCodeInput, setJoinRoomCodeInput] = useState('');
    const [joinCustomError, setJoinCustomError] = useState<string | null>(null);
    const [isJoiningRoom, setIsJoiningRoom] = useState(false);
    const [copiedRoomCode, setCopiedRoomCode] = useState(false);

    const { updateRating, updateStats } = useAuthStore();
    const { on, emit } = useSocket();

    const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
    const [recentMatchesData, setRecentMatchesData] = useState<MatchRoom[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isMatchmaking, setIsMatchmaking] = useState(false);
    const [matchmakingTime, setMatchmakingTime] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [ratingFlash, setRatingFlash] = useState<{ change: number; newRating: number } | null>(null);
    const [skillRadar, setSkillRadar] = useState<any>(null);
    const [weaknessInfo, setWeaknessInfo] = useState<any>(null);

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
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadNotifCount, setUnreadNotifCount] = useState(0);
    const [rematchStatus, setRematchStatus] = useState<string | null>(null);

    const [displayedUser, setDisplayedUser] = useState<User>(currentUser);
    const [profileLoading, setProfileLoading] = useState(false);

    useEffect(() => {
        api.get('/skills/radar')
            .then(res => setSkillRadar(res.data))
            .catch(err => console.warn('[SKILL_RADAR] Failed to load skill vector:', err));

        api.get('/skills/weakness')
            .then(res => setWeaknessInfo(res.data))
            .catch(err => console.warn('[SKILL_WEAKNESS] Failed to load weakness info:', err));
    }, [activeTab]);

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

    // Instant navigation to arena when socket receives MATCH_FOUND
    useEffect(() => {
        const cleanup = on('MATCH_FOUND', (data: any) => {
            const matchId = data.matchId || data.roomId;
            if (matchId) {
                setIsMatchmaking(false);
                goToArenaMatch(matchId);
            }
        });
        return () => {
            cleanup && cleanup();
        };
    }, [on, goToArenaMatch]);

    // Fallback: Navigate to arena when match state is detected
    useEffect(() => {
        if (isMatchmaking && (matchStatus === 'waiting' || matchStatus === 'active') && matchRoomId) {
            setIsMatchmaking(false);
            goToArenaMatch(matchRoomId);
        }
    }, [isMatchmaking, matchStatus, matchRoomId, goToArenaMatch]);

    // Handle Join Room success or error
    useEffect(() => {
        if (showJoinRoomModal && isJoiningRoom && matchRoomId && matchStatus === 'waiting' && !matchError) {
            setIsJoiningRoom(false);
            setShowJoinRoomModal(false);
            goToArenaMatch(matchRoomId);
        }
    }, [showJoinRoomModal, isJoiningRoom, matchRoomId, matchStatus, matchError, goToArenaMatch]);

    useEffect(() => {
        if (matchError) {
            setIsJoiningRoom(false);
            if (isMatchmaking) {
                setIsMatchmaking(false);
            }
        }
    }, [matchError, isMatchmaking]);

    // Auto-navigate host if rival connects while Create Room modal is open
    useEffect(() => {
        if (showCreateRoomModal && matchRoomId && (matchPlayers || []).length >= 2) {
            setShowCreateRoomModal(false);
            goToArenaMatch(matchRoomId);
        }
    }, [showCreateRoomModal, matchRoomId, matchPlayers, goToArenaMatch]);

    // Unified Room Join Handler: checks multi-user hosted rooms first, falls back to 1v1 duel
    const handleJoinRoomCode = async (rawCode: string) => {
        const code = rawCode.trim().toUpperCase();
        if (code.length !== 6 || isJoiningRoom) return;
        clearMatchError();
        setJoinCustomError(null);
        setIsJoiningRoom(true);

        try {
            // Check if this token corresponds to a Multi-User Hosted Room
            const res = await api.post('/rooms/join', { roomCode: code });
            if (res.data?.success && (res.data?.room || res.data?.data)) {
                setShowJoinRoomModal(false);
                setIsJoiningRoom(false);
                goToHostedRoom(code);
                return;
            }
        } catch (err: any) {
            // If room code not found in multi-user rooms, fall back to 1v1 duel
            if (err.response?.status === 404) {
                joinRoom(code);
                return;
            }
            // Room exists but rejected (e.g. room full, session in progress)
            setIsJoiningRoom(false);
            setJoinCustomError(err.response?.data?.message || 'Failed to connect to room uplink.');
            return;
        }

        // Fallback invocation
        joinRoom(code);
    };

    const fetchDashboardData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [lbRes, matchRes, notifRes] = await Promise.allSettled([
                api.get('/leaderboard?limit=10'),
                api.get(`/matches/user/${currentUser.id}?limit=20`),
                api.get('/notifications?limit=20'),
            ]);

            if (lbRes.status === 'fulfilled' && lbRes.value.data) {
                setLeaderboardData(lbRes.value.data.data || lbRes.value.data || []);
            }
            if (matchRes.status === 'fulfilled' && matchRes.value.data) {
                setRecentMatchesData(matchRes.value.data.data || matchRes.value.data || []);
            }
            if (notifRes.status === 'fulfilled' && notifRes.value.data) {
                setNotifications(notifRes.value.data.data || []);
                setUnreadNotifCount(notifRes.value.data.unreadCount || 0);
            }
        } catch (err: any) {
            console.error('Failed to fetch dashboard data:', err);
            setError('Intelligence uplink failed. System compromised.');
        } finally {
            setIsLoading(false);
        }
    }, [currentUser.id]);

    const handleMarkAllNotificationsRead = async () => {
        try {
            await api.post('/notifications/mark-read', {});
            setUnreadNotifCount(0);
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (err) {
            console.error('Failed to mark notifications read:', err);
        }
    };

    const handleRematch = (oppId: string, oppName: string, probId?: string) => {
        if (!oppId) {
            goToBattle();
            return;
        }
        emit('challenge:send', { toUserId: oppId, problemId: probId });
        setRematchStatus(`Rematch challenge transmitted to @${oppName}!`);
        setTimeout(() => setRematchStatus(null), 5000);
    };

    useEffect(() => {
        const token = useAuthStore.getState().token;
        if (!token || !currentUser?.id) return;

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
                    title: 'Combat Rating Update',
                    message: `Match result: ${myUpdate.change > 0 ? '+' : ''}${myUpdate.change} RP`,
                    time: 'Just now',
                    read: false
                }, ...prev.slice(0, 19)]);
                setUnreadNotifCount(c => c + 1);
                setTimeout(() => setRatingFlash(null), 4000);
            }
        });

        const cleanupNotif = on('notification:new', (notif: any) => {
            setNotifications(prev => [notif, ...prev]);
            setUnreadNotifCount(c => c + 1);
        });

        const cleanupChallenge = on('challenge:received', (data: any) => {
            const notif = {
                _id: Date.now().toString(),
                title: 'Combat Challenge Received',
                message: `@${data.fromUsername} has challenged you to a duel!`,
                type: 'challenge',
                read: false,
                createdAt: new Date().toISOString(),
                data
            };
            setNotifications(prev => [notif, ...prev]);
            setUnreadNotifCount(c => c + 1);
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
        return () => {
            ctx.revert();
            cleanupElo();
            cleanupNotif();
            cleanupChallenge();
        };
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
        <div className="panel-content space-y-6 md:space-y-7 flex flex-col items-center text-center p-4 pt-10">
            <div className="space-y-3 md:space-y-3.5 flex flex-col items-center">


                <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tighter leading-[0.88] uppercase">
                    Command <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-violet-300 drop-shadow-[0_0_30px_rgba(124,58,237,0.4)]">Center</span>
                </h1>

                <p className={`text-sm md:text-base max-w-xl font-light leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                    Welcome back, Operator <strong className={isLight ? 'text-black' : 'text-white font-mono'}>{currentUser.username}</strong>



                    . Monitoring live combat vectors. Neural uplink armed and ready.
                </p>


                {error && <div className="text-xs font-mono font-bold uppercase text-red-400 border border-red-500/30 px-3 py-1 rounded-lg bg-red-500/10">{error}</div>}
            </div>

            <div className="flex flex-wrap justify-center gap-3 md:gap-4">
                <button
                    onClick={() => goToBattle()}
                    className="group relative px-6 py-3.5 rounded-2xl font-black uppercase text-xs tracking-[0.15em] overflow-hidden flex items-center gap-2.5 transition-all duration-300 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white shadow-[0_0_25px_rgba(124,58,237,0.45)] hover:shadow-[0_0_35px_rgba(124,58,237,0.65)] hover:scale-105 active:scale-95"
                >
                    <Zap size={16} className="fill-current transition-transform duration-300 group-hover:scale-125" />
                    <span>Enter Arena</span>
                </button>
                <button
                    onClick={() => goToOpponents()}
                    className={`group relative px-6 py-3.5 rounded-2xl font-black uppercase text-xs tracking-[0.15em] overflow-hidden flex items-center gap-2.5 transition-all duration-300 hover:scale-105 active:scale-95 border ${isLight
                        ? 'bg-white text-gray-900 border-purple-200 shadow-lg hover:bg-purple-50'
                        : 'bg-white/[0.04] border-white/10 hover:border-purple-500/40 text-gray-200 hover:text-white hover:bg-purple-950/20 shadow-xl'
                        }`}
                >
                    <Users size={16} className="transition-transform duration-300 group-hover:scale-110 text-purple-400" />
                    <span>Live Operators</span>
                </button>
                <button
                    onClick={() => goToProblems()}
                    className={`group relative px-6 py-3.5 rounded-2xl font-black uppercase text-xs tracking-[0.15em] overflow-hidden flex items-center gap-2.5 transition-all duration-300 hover:scale-105 active:scale-95 border ${isLight
                        ? 'bg-white text-gray-900 border-purple-200 shadow-lg hover:bg-purple-50'
                        : 'bg-white/[0.04] border-white/10 hover:border-purple-500/40 text-gray-200 hover:text-white hover:bg-purple-950/20 shadow-xl'
                        }`}
                >
                    <Sword size={16} className="transition-transform duration-300 group-hover:-rotate-12 text-purple-400" />
                    <span>Browse Arsenal</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 pt-2 md:pt-3 w-full max-w-5xl">
                {(() => {
                    const totalMatches = (currentUser.wins || 0) + (currentUser.losses || 0);
                    const hasMatchHistory = totalMatches > 0;
                    const isPlacement = currentUser.tier === 'PLACEMENT' || !hasMatchHistory;

                    return [
                        {
                            icon: <Trophy size={20} className="text-accent-primary" />,
                            val: currentUser.rankRating ?? 1200,
                            label: 'Rank Rating',
                            sub: isPlacement ? `Placement (${currentUser.placementMatchesRemaining ?? 5} left)` : (currentUser.tier || 'Silver'),
                            trend: isPlacement ? 'Provisional Volatility (K=64)' : '+24 RP recent cycle',
                            highlight: ratingFlash && 'rating'
                        },
                        {
                            icon: <Target size={20} className="text-accent-primary" />,
                            val: hasMatchHistory
                                ? `${Math.round(((currentUser.wins || 0) / totalMatches) * 100)}%`
                                : '—',
                            label: 'Win Rate',
                            sub: hasMatchHistory ? `${currentUser.wins || 0} Wins / ${currentUser.losses || 0} Losses` : 'No Match History',
                            trend: hasMatchHistory ? 'Active Record' : 'Complete 1st Ranked Match'
                        },
                        {
                            icon: <Activity size={20} className="text-accent-primary" />,
                            val: hasMatchHistory ? totalMatches : '—',
                            label: 'Total Battles',
                            sub: hasMatchHistory ? 'Ranked & Quick Clashes' : 'Zero Battles Logged',
                            trend: hasMatchHistory ? '100% Ledger Verified' : 'Unrated Account'
                        },
                    ];
                })().map((s, i) => (
                    <div key={i} className={`p-5 sm:p-6 rounded-2xl md:rounded-3xl border relative overflow-hidden group transition-all duration-300 hover:-translate-y-1.5 w-full text-left ${isLight
                        ? 'bg-white border-purple-100 shadow-xl'
                        : 'bg-[#0e0e16]/80 border-purple-500/20 hover:border-purple-500/40 shadow-2xl hover:shadow-[0_0_30px_rgba(124,58,237,0.15)]'
                        }`}>
                        <div className="flex justify-between items-start mb-3 sm:mb-4">
                            <div className={`p-2.5 rounded-xl border ${isLight
                                ? 'bg-purple-50 border-purple-100'
                                : 'bg-purple-950/30 border-purple-500/20'
                                }`}>
                                {s.icon}
                            </div>
                            <span className="text-[9px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-white/5 border border-white/10 text-gray-400">
                                {s.trend}
                            </span>
                        </div>

                        <p className="text-3xl sm:text-4xl font-black tracking-tighter mb-1 font-mono">{s.val}</p>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400 mb-0.5">{s.label}</p>
                        <p className="text-[11px] font-mono opacity-50">{s.sub}</p>

                        {/* Live RP flash indicator on Rating card */}
                        {i === 0 && ratingFlash && (
                            <div className={`absolute top-5 right-5 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold animate-bounce ${ratingFlash.change > 0
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30 shadow-[0_0_12px_#22c55e]'
                                : 'bg-red-500/20 text-red-400 border border-red-500/30 shadow-[0_0_12px_#ef4444]'
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
            <div className="flex flex-col items-center space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-[9px] font-mono font-bold text-purple-300 tracking-[0.25em] uppercase">
                    COMBAT ZONES READY
                </div>
                <h2 className="text-5xl md:text-6xl font-black tracking-tighter uppercase">
                    Battle <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-violet-300">Arena</span>
                </h2>
                <p className={`text-base font-light max-w-2xl ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                    High-stakes algorithmic combat. Rating Points at risk. Prepare for live neural insertion.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl">
                {[
                    {
                        title: 'Ranked Duel',
                        desc: 'Climb the global leaderboard in 1v1 algorithmic combat under strict matchmaker rules.',
                        icon: <Sword size={26} className="text-accent-primary group-hover:rotate-12 transition-transform duration-300" />,
                        badge: 'STAKES',
                        action: () => goToProblems({ mode: 'ranked' })
                    },
                    {
                        title: 'Quick Match',
                        desc: 'Jump into a casual speed-coding clash immediately. No rating point penalty.',
                        icon: <Zap size={26} className="text-accent-primary group-hover:scale-110 transition-transform duration-300" />,
                        badge: 'FAST',
                        action: startMatchmaking
                    },
                    {
                        title: 'Host Arena',
                        desc: 'Configure a multi-user combat room with custom problem sets and up to 8 operators.',
                        icon: <Plus size={26} className="text-accent-primary group-hover:rotate-90 transition-transform duration-300" />,
                        badge: 'MULTI-USER',
                        action: () => setShowRoomConfigModal(true)
                    },
                    {
                        title: 'Join Room',
                        desc: 'Enter an active 6-character access token to patch directly into an arena combat lobby.',
                        icon: <Users size={26} className="text-accent-primary group-hover:translate-x-1 transition-transform duration-300" />,
                        badge: 'UPLINK',
                        action: () => {
                            clearMatchError();
                            setJoinCustomError(null);
                            setJoinRoomCodeInput('');
                            setIsJoiningRoom(false);
                            setShowJoinRoomModal(true);
                        }
                    },
                ].map((mode, i) => (
                    <button
                        key={i}
                        onClick={mode.action}
                        className={`group p-8 rounded-3xl border transition-all duration-300 text-left relative overflow-hidden hover:-translate-y-1.5 focus:outline-none ${isLight
                            ? 'bg-white border-purple-100 shadow-md hover:border-accent-secondary/50 hover:shadow-xl'
                            : 'bg-[#0c0c14]/80 border-white/10 hover:border-accent-secondary/50 hover:shadow-[0_0_30px_rgba(124,58,237,0.2)]'
                            }`}
                    >
                        <div className="absolute top-6 right-6 text-[9px] font-mono font-bold tracking-widest border px-2.5 py-1 rounded-full bg-white/5 border-white/10 text-zinc-400">
                            {mode.badge}
                        </div>
                        <div className="mb-6 p-3 rounded-2xl w-fit bg-white/5 border border-white/10 text-accent-primary">
                            {mode.icon}
                        </div>
                        <h3 className="text-2xl font-black mb-2 uppercase tracking-tight">{mode.title}</h3>
                        <p className={`text-xs leading-relaxed mb-6 font-light ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>{mode.desc}</p>
                        <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest text-accent-primary group-hover:text-accent-secondary transition-all group-hover:gap-4">
                            Deploy Directive <ChevronRight size={14} className="transition-transform group-hover:translate-x-1" />
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
                                <SkillRadar isLight={isLight} skills={skillRadar?.radarPoints} hasData={skillRadar?.hasData} />
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
                                        <div className="text-3xl font-black uppercase tracking-tighter">
                                            {(!skillRadar?.hasData || weaknessInfo?.isDiagnostic) ? 'Diagnostic' : 'Recommended'}
                                        </div>
                                        <p className="text-[10px] uppercase font-black opacity-60 flex items-center gap-2">
                                            {(!skillRadar?.hasData || weaknessInfo?.isDiagnostic) ? (
                                                <>
                                                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                                                    {weaknessInfo?.category ? `${weaknessInfo.category.toUpperCase()} (CALIBRATION)` : 'CALIBRATION PROTOCOL'}
                                                </>
                                            ) : (
                                                <>
                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                                    {`${weaknessInfo?.category ? weaknessInfo.category.toUpperCase() : 'LOGIC'} (WEAK AREA)`}
                                                </>
                                            )}
                                        </p>
                                    </div>
                                    <div className="flex gap-4 items-center">
                                        <div className="px-3 py-1 rounded-full border border-current text-[10px] font-black uppercase tracking-widest opacity-60">
                                            {(!skillRadar?.hasData || weaknessInfo?.isDiagnostic) ? 'Foundational' : 'Targeted'}
                                        </div>
                                        <div className="text-[10px] font-black uppercase tracking-widest opacity-40">
                                            {(!skillRadar?.hasData || weaknessInfo?.isDiagnostic) ? '3 PROBLEM DRILL' : '15 MIN CHALLENGE'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => goToArenaPractice('adaptive')}
                                className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.25em] transition-all relative z-10 ${isLight ? 'bg-white text-black hover:scale-[0.98]' : 'bg-black text-white hover:scale-[0.98]'}`}
                            >
                                {(!skillRadar?.hasData || weaknessInfo?.isDiagnostic) ? 'Launch Calibration' : 'Launch Drill'}
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
            <div className="panel-content items-center text-center space-y-8 max-w-5xl mx-auto w-full">
                <div className="flex flex-col items-center space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-[9px] font-mono font-bold text-purple-300 tracking-[0.25em] uppercase">
                        COMBAT TELEMETRY ARCHIVE
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black tracking-tighter uppercase">
                        Battle <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-violet-300">Log</span>
                    </h2>
                    <p className={`text-sm font-light max-w-xl ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                        Decrypted match telemetry, algorithm benchmarks, and Rating Point fluctuations.
                    </p>
                </div>

                {rematchStatus && (
                    <div className="w-full p-4 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-300 font-mono text-xs text-center animate-in fade-in duration-300">
                        ⚡ {rematchStatus}
                    </div>
                )}

                {recentMatchesData.length > 0 ? (
                    <div className="w-full space-y-4 text-left">
                        {recentMatchesData.map((log: any, idx: number) => {
                            const rawId = String(log?.id || log?._id || log?.roomCode || '');
                            const shortId = rawId ? rawId.slice(0, 8) : `00${idx + 1}`;

                            const p1Id = typeof log.player1Id === 'object' ? log.player1Id?._id?.toString() || log.player1Id?.id : String(log.player1Id || '');
                            const p2Id = typeof log.player2Id === 'object' ? log.player2Id?._id?.toString() || log.player2Id?.id : String(log.player2Id || '');
                            const winnerIdStr = typeof log.winnerId === 'object' ? log.winnerId?._id?.toString() || log.winnerId?.id : String(log.winnerId || '');

                            const isMeP1 = p1Id === currentUser.id;
                            const opponentUser = isMeP1
                                ? (typeof log.player2Id === 'object' ? log.player2Id : null)
                                : (typeof log.player1Id === 'object' ? log.player1Id : null);
                            const opponentName = opponentUser?.username || (isMeP1 ? 'Rival Combatant' : 'Host Combatant');
                            const opponentId = opponentUser?._id || opponentUser?.id || (isMeP1 ? p2Id : p1Id);

                            const problemTitle = typeof log.problemId === 'object' && log.problemId?.title ? log.problemId.title : 'Algorithm Duel';
                            const problemTargetId = typeof log.problemId === 'object' ? (log.problemId?._id || log.problemId?.slug) : log.problemId;

                            const isWin = winnerIdStr === currentUser.id;
                            const isDraw = log.status === 'draw' || (!winnerIdStr && log.status === 'completed');
                            const isRoomUnranked = Boolean(log.roomCode) || log.mode !== 'ranked';
                            const myDelta = isMeP1 ? (log.deltaP1 ?? 0) : (log.deltaP2 ?? 0);

                            return (
                                <div
                                    key={rawId || idx}
                                    className={`p-6 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isLight
                                        ? 'bg-white border-purple-100 shadow-sm hover:shadow-md'
                                        : 'bg-[#0e0e16]/90 border-purple-500/20 hover:border-purple-500/40 shadow-xl'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`px-3 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 ${isWin
                                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                                            : isDraw
                                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.2)]'
                                            }`}>
                                            <span className={`w-2 h-2 rounded-full ${isWin ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                                            {isWin ? 'VICTORY' : isDraw ? 'DRAW' : 'DEFEAT'}
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-3">
                                                <span className="font-mono text-xs font-bold text-gray-400">#{shortId}</span>
                                                <span className="text-sm font-bold tracking-tight">{problemTitle}</span>
                                                <span className="text-[10px] font-mono text-purple-400 uppercase tracking-widest px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20">
                                                    vs @{opponentName}
                                                </span>
                                            </div>
                                            <p className="text-[11px] font-mono opacity-50 mt-0.5">
                                                {log.createdAt ? new Date(log.createdAt).toLocaleString() : 'Recent Engagement'} // {isRoomUnranked ? 'Room Match' : 'Ranked Arena'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 self-end sm:self-center">
                                        <div className="text-right">
                                            {isRoomUnranked ? (
                                                <span className="text-xs font-mono font-bold text-gray-400">0 RP (Unranked)</span>
                                            ) : (
                                                <span className={`text-sm font-mono font-bold ${myDelta > 0 ? 'text-emerald-400' : myDelta < 0 ? 'text-rose-400' : 'text-gray-400'}`}>
                                                    {myDelta > 0 ? `+${myDelta} RP` : `${myDelta} RP`}
                                                </span>
                                            )}
                                            <p className="text-[9px] font-mono opacity-40 uppercase">Net Rating</p>
                                        </div>
                                        {opponentId ? (
                                            <button
                                                onClick={() => handleRematch(opponentId, opponentName, problemTargetId)}
                                                className="px-4 py-2 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 transition-all flex items-center gap-1.5"
                                                title={`Send rematch request to @${opponentName}`}
                                            >
                                                <RotateCcw size={12} />
                                                Rematch
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => goToBattle()}
                                                className="px-4 py-2 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider bg-white/5 hover:bg-purple-600 hover:text-white border border-white/10 transition-all"
                                            >
                                                Duel
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className={`p-12 rounded-3xl border w-full max-w-2xl flex flex-col items-center text-center space-y-6 relative overflow-hidden ${isLight
                        ? 'bg-white border-purple-100 shadow-xl'
                        : 'bg-[#0d0d16]/80 border-purple-500/20 shadow-[0_0_40px_rgba(0,0,0,0.6)]'
                        }`}>
                        {/* Radar / Hologram rings */}
                        <div className="relative w-24 h-24 flex items-center justify-center">
                            <div className="absolute inset-0 rounded-full border border-purple-500/20 animate-ping" />
                            <div className="absolute inset-2 rounded-full border border-purple-500/40" />
                            <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-[0_0_20px_rgba(124,58,237,0.3)]">
                                <Sword size={28} />
                            </div>
                        </div>

                        <div className="space-y-2 max-w-md">
                            <h3 className="text-xl font-bold uppercase tracking-tight font-mono">
                                NO COMBAT TELEMETRY ARCHIVED
                            </h3>
                            <p className="text-xs text-gray-400 leading-relaxed font-light">
                                Your neural combat logs, algorithm execution times, and RP fluctuations will materialize here after your first engagement in the arena.
                            </p>
                        </div>

                        <button
                            onClick={() => goToBattle()}
                            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-mono font-bold text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:scale-105 transition-all"
                        >
                            Deploy First Battle
                        </button>
                    </div>
                )}
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
                                    <p className="text-[10px] uppercase font-black tracking-[0.3em] opacity-40 text-black">Active Instance // Online</p>
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
                                    {recentMatchesData.map((log: any) => {
                                        const rawId = String(log?.id || log?._id || log?.roomCode || '');
                                        const shortId = rawId ? rawId.slice(0, 8) : 'N/A';
                                        const p1Id = typeof log.player1Id === 'object' ? log.player1Id?._id?.toString() || log.player1Id?.id : String(log.player1Id || '');
                                        const isMeP1 = p1Id === displayedUser.id;
                                        const opponentUser = isMeP1
                                            ? (typeof log.player2Id === 'object' ? log.player2Id : null)
                                            : (typeof log.player1Id === 'object' ? log.player1Id : null);
                                        const opponentName = opponentUser?.username || 'Rival Combatant';
                                        const problemTitle = typeof log.problemId === 'object' && log.problemId?.title ? log.problemId.title : 'Algorithm Clash';

                                        return (
                                            <div key={rawId || Math.random()} className={`p-6 rounded-[2rem] flex items-center justify-between group transition-all border border-transparent ${isLight ? 'hover:bg-black/5 hover:border-black/5' : 'hover:bg-white/5 hover:border-white/10'}`}>
                                                <div className="flex items-center gap-6">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${log.status === 'completed' ? (isLight ? 'bg-green-500/10 text-green-600' : 'bg-green-500/20 text-green-500') : (isLight ? 'bg-yellow-500/10 text-yellow-600' : 'bg-yellow-500/20 text-yellow-500')}`}>
                                                        {opponentName[0]?.toUpperCase() || 'VS'}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-3">
                                                            <span className={`text-lg font-black uppercase tracking-tighter ${isLight ? 'text-black' : 'text-white'}`}>{problemTitle}</span>
                                                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest ${isLight ? 'bg-black/5 opacity-60' : 'bg-white/10 opacity-50'}`}>{log.status}</span>
                                                        </div>
                                                        <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mt-1">vs @{opponentName} // {log.createdAt ? new Date(log.createdAt).toLocaleDateString() : 'Active'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
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
            <div className="w-full relative z-10 flex flex-col items-center">
                <div className="w-full px-4 sm:px-6 lg:px-8 py-3 sm:py-3.5 border-b border-white/5 backdrop-blur-sm sticky top-0 z-[60]">
                    <header className="flex items-center justify-between w-full relative z-50 pt-3">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className={`p-2 transition-all z-[70] flex items-center justify-center active:scale-90 ${isLight ? 'text-black hover:bg-black/5' : 'text-white hover:bg-white/5'
                                    } rounded-xl`}
                                title="Toggle Navigation Control"
                            >
                                {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
                            </button>
                            <div className="min-w-0 text-left flex flex-col items-start">
                                <Logo isLight={isLight} />
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5 sm:gap-3 dash-element">
                            <button onClick={() => setTheme(isLight ? 'dark' : 'light')} className={`p-2.5 rounded-xl border transition-all ${isLight ? 'bg-white border-black/10 hover:bg-black/5' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'}`} title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}>
                                {isLight ? <Moon size={18} /> : <Sun size={18} />}
                            </button>

                            <div className="relative" ref={notifRef}>
                                <button onClick={() => { setShowNots(!showNots); }} className={`p-2.5 rounded-xl border transition-all relative ${isLight ? 'bg-white border-black/10 hover:bg-black/5' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'}`} title="Notifications">
                                    <Bell size={18} />
                                    {unreadNotifCount > 0 && (
                                        <span className="absolute top-1.5 right-1.5 px-1.5 h-4 min-w-4 bg-red-500 border-2 border-black rounded-full text-[8px] font-black flex items-center justify-center text-white">
                                            {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                                        </span>
                                    )}
                                </button>
                                {showNots && (
                                    <div className={`absolute top-14 right-0 w-84 rounded-3xl p-6 shadow-3xl z-50 border animate-in zoom-in-95 duration-200 text-left ${isLight ? 'bg-white border-black/10 shadow-xl' : 'bg-[#0a0a0a] border-white/10 shadow-2xl shadow-black/50'}`}>
                                        <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
                                            <h3 className="text-[10px] font-black uppercase tracking-widest text-accent-secondary">Intelligence Feed</h3>
                                            {unreadNotifCount > 0 && (
                                                <button
                                                    onClick={handleMarkAllNotificationsRead}
                                                    className="text-[9px] font-mono text-gray-400 hover:text-white uppercase tracking-wider underline cursor-pointer"
                                                >
                                                    Mark all read
                                                </button>
                                            )}
                                        </div>
                                        <div className="space-y-2.5 max-h-[340px] overflow-y-auto custom-scrollbar">
                                            {notifications.length === 0 ? (
                                                <p className="text-xs text-gray-500 italic py-4 text-center font-mono">No telemetry alerts recorded.</p>
                                            ) : (
                                                notifications.map((n: any) => (
                                                    <div key={n._id || n.id} className={`p-3.5 rounded-2xl border transition-all ${!n.read
                                                        ? (isLight ? 'bg-purple-500/10 border-purple-300' : 'bg-purple-500/15 border-purple-500/30')
                                                        : (isLight ? 'bg-black/5 border-black/5' : 'bg-white/5 border-white/5')
                                                        }`}>
                                                        <div className="flex items-center justify-between gap-2 mb-1">
                                                            <p className="text-xs font-bold leading-tight">{n.title || n.text}</p>
                                                            {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-accent-secondary shrink-0" />}
                                                        </div>
                                                        <p className="text-[11px] text-gray-400 leading-tight mb-1.5">{n.message || n.text}</p>
                                                        <span className="text-[8px] opacity-40 font-black uppercase tracking-widest">
                                                            {n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (n.time || 'Just now')}
                                                        </span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => setActiveTab('profile')}
                                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all ${isLight ? 'bg-white border-black/10 hover:bg-black/5' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                                title="Operator Profile"
                            >
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center text-black font-black text-xs shadow-md">
                                    {currentUser.username[0].toUpperCase()}
                                </div>
                                <div className="hidden sm:block text-left">
                                    <p className={`text-[10px] font-black uppercase tracking-tighter leading-none ${isLight ? 'text-black' : 'text-white'}`}>{currentUser.username}</p>

                                </div>
                            </button>
                        </div>
                    </header>
                </div>

                <div className="w-full max-w-7xl mx-auto px-6 md:px-12 py-4 sm:py-6 md:py-8 relative z-10 flex justify-center">
                    <div className="dash-element w-full max-w-7xl relative">
                        {panels[activeTab]}
                    </div>
                </div>

                {/* Quick Match Searching Modal */}
                {isMatchmaking && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <div className="relative w-full max-w-md p-8 rounded-[2.5rem] border border-white/10 bg-[#0c0d16] text-white text-center overflow-hidden shadow-2xl">
                            {/* Ambient top accent line */}
                            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                            {/* Sonar Radar sweep */}
                            <div className="relative w-36 h-36 mx-auto mb-6 flex items-center justify-center">
                                <div className="absolute inset-0 rounded-full border border-white/10 animate-ping" />
                                <div className="absolute inset-3 rounded-full border border-white/10" />
                                <div className="absolute inset-6 rounded-full border border-dashed border-white/20 animate-spin" style={{ animationDuration: '6s' }} />
                                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white">
                                    <Zap size={28} className="text-white/80" />
                                </div>
                            </div>

                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-mono font-bold text-white/70 tracking-[0.2em] uppercase mb-3">
                                <span className="w-2 h-2 rounded-full bg-accent-secondary animate-pulse" />
                                MATCHMAKING PROTOCOL ACTIVE
                            </div>

                            <h3 className="text-2xl font-black uppercase tracking-tight mb-2">Acquiring Opponent</h3>
                            <p className="text-xs text-gray-400 font-light mb-6 leading-relaxed">
                                Scanning sector for an opponent matching your skill rating (<span className="text-white font-mono font-bold">~{currentUser.rankRating ?? 1200} RP</span>).
                            </p>

                            <div className="flex items-center justify-center gap-6 py-3 px-4 mb-6 rounded-2xl bg-white/5 border border-white/10 font-mono text-xs">
                                <div>
                                    <span className="text-gray-500 text-[10px] uppercase block">Search Time</span>
                                    <span className="text-white font-bold">{Math.floor(matchmakingTime / 60)}:{(matchmakingTime % 60).toString().padStart(2, '0')}</span>
                                </div>
                                <div className="h-6 w-px bg-white/10" />
                                <div>
                                    <span className="text-gray-500 text-[10px] uppercase block">Target Rating</span>
                                    <span className="text-purple-300 font-bold">{currentUser.rankRating ?? 1200} RP</span>
                                </div>
                            </div>

                            <button
                                onClick={cancelMatchmaking}
                                className="w-full py-3.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-mono font-bold uppercase tracking-wider transition-all"
                            >
                                Abort Matchmaking
                            </button>
                        </div>
                    </div>
                )}

                {/* Private 1v1 Create Room Modal */}
                {showCreateRoomModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <div className="relative w-full max-w-md p-8 rounded-[2.5rem] border border-emerald-500/30 bg-[#0c0d16] text-white shadow-[0_0_60px_rgba(16,185,129,0.25)] text-center overflow-hidden">
                            {/* Top scanning line */}
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse" />

                            {/* Header / Icon */}
                            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                                <Plus size={28} />
                            </div>

                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[9px] font-mono font-bold text-emerald-300 tracking-[0.2em] uppercase mb-3">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                                PRIVATE 1V1 UPLINK
                            </div>

                            <h3 className="text-2xl font-black uppercase tracking-tight mb-2">Combat Room Deployed</h3>
                            <p className="text-xs text-gray-400 font-light mb-6 leading-relaxed">
                                Transmit this 6-character access token to your rival operator. Once they patch in, enter the waiting room to commence battle.
                            </p>

                            {/* Room Code Display */}
                            <div className="p-4 mb-6 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center gap-2">
                                <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-gray-500">Access Token</span>
                                {matchRoomCode ? (
                                    <div className="flex items-center gap-3">
                                        <span className="text-3xl font-mono font-black text-emerald-400 tracking-[0.25em]">
                                            {matchRoomCode}
                                        </span>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(matchRoomCode);
                                                setCopiedRoomCode(true);
                                                setTimeout(() => setCopiedRoomCode(false), 2000);
                                            }}
                                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all"
                                            title="Copy Token"
                                        >
                                            {copiedRoomCode ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 py-2 text-emerald-400 text-sm font-mono animate-pulse">
                                        <Loader2 size={18} className="animate-spin" />
                                        <span>Generating token...</span>
                                    </div>
                                )}
                                {copiedRoomCode && (
                                    <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">
                                        Token copied to clipboard!
                                    </span>
                                )}
                            </div>

                            {/* Operator status */}
                            <div className="flex items-center justify-between px-4 py-3 mb-6 rounded-xl bg-black/40 border border-white/5 text-xs font-mono">
                                <span className="text-gray-400">Operators Connected</span>
                                <span className="text-emerald-400 font-bold">
                                    {(matchPlayers || []).length || 1} / 2 Ready
                                </span>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => {
                                        if (matchRoomId) {
                                            setShowCreateRoomModal(false);
                                            goToArenaMatch(matchRoomId);
                                        }
                                    }}
                                    disabled={!matchRoomId}
                                    className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                                >
                                    Enter Arena Waiting Room
                                </button>
                                <button
                                    onClick={() => setShowCreateRoomModal(false)}
                                    className="w-full py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-gray-400 text-xs font-mono uppercase tracking-wider transition-all"
                                >
                                    Dismiss & Keep In Background
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Join Room Modal */}
            {showJoinRoomModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
                    <div className={`relative w-full max-w-md p-8 rounded-[2.5rem] border text-center overflow-hidden ${isLight
                        ? 'bg-white border-amber-300 text-slate-900 shadow-2xl'
                        : 'bg-[#0c0d16] border-amber-500/30 text-white shadow-[0_0_60px_rgba(245,158,11,0.25)]'
                        }`}>
                        {/* Top scanning line */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-pulse" />

                        {/* Header / Icon */}
                        <div className={`w-14 h-14 mx-auto mb-4 rounded-2xl border flex items-center justify-center shadow-md ${isLight
                            ? 'bg-amber-100 border-amber-300 text-amber-600'
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                            }`}>
                            <Users size={28} />
                        </div>

                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[9px] font-mono font-bold tracking-[0.2em] uppercase mb-3 ${isLight
                            ? 'bg-amber-100 border-amber-300 text-amber-800'
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                            }`}>
                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                            UPLINK PATCH PROTOCOL
                        </div>

                        <h3 className={`text-2xl font-black uppercase tracking-tight mb-2 ${isLight ? 'text-slate-900' : 'text-white'
                            }`}>Connect to Room</h3>
                        <p className={`text-xs font-medium mb-6 leading-relaxed ${isLight ? 'text-slate-600' : 'text-gray-400 font-light'
                            }`}>
                            Enter the 6-character room token provided by the host operator to infiltrate the combat chamber.
                        </p>

                        {/* Error Message */}
                        {(matchError || joinCustomError) && (
                            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2.5 text-left text-red-400 text-xs font-mono">
                                <AlertCircle size={16} className="shrink-0" />
                                <span>{joinCustomError || matchError}</span>
                            </div>
                        )}

                        {/* Input */}
                        <div className="mb-6">
                            <input
                                type="text"
                                maxLength={6}
                                value={joinRoomCodeInput}
                                onChange={(e) => {
                                    clearMatchError();
                                    setJoinCustomError(null);
                                    setJoinRoomCodeInput(e.target.value.toUpperCase());
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleJoinRoomCode(joinRoomCodeInput);
                                    }
                                }}
                                placeholder="e.g. A9X2B7"
                                autoFocus
                                className={`w-full text-center py-3.5 px-4 border rounded-2xl text-2xl font-mono font-black tracking-[0.3em] uppercase focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all ${isLight
                                    ? 'bg-slate-50 border-slate-300 focus:border-amber-500 text-slate-900 placeholder-slate-400 focus:bg-white'
                                    : 'bg-white/5 border-white/10 focus:border-amber-400 text-white placeholder-gray-600'
                                    }`}
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => handleJoinRoomCode(joinRoomCodeInput)}
                                disabled={joinRoomCodeInput.trim().length !== 6 || isJoiningRoom}
                                className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center justify-center gap-2"
                            >
                                {isJoiningRoom ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        <span>Patching Into Uplink...</span>
                                    </>
                                ) : (
                                    <span>Patch Into Uplink</span>
                                )}
                            </button>
                            <button
                                onClick={() => {
                                    clearMatchError();
                                    setJoinCustomError(null);
                                    setShowJoinRoomModal(false);
                                }}
                                className={`w-full py-2.5 rounded-xl border text-xs font-mono uppercase tracking-wider transition-all font-bold ${isLight
                                    ? 'border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                                    : 'border-white/10 hover:bg-white/5 text-gray-400 hover:text-white'
                                    }`}
                            >
                                Abort Connection
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Phase 15: Multi-User Room Configuration Modal */}
            <RoomConfigModal
                isOpen={showRoomConfigModal}
                onClose={() => setShowRoomConfigModal(false)}
                currentUser={currentUser}
            />

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
