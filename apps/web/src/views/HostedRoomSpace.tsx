import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { 
    Users, Clock, Zap, Check, AlertCircle, ArrowRight, 
    Copy, LogOut, Play, Shield, Award, Terminal, Trophy, 
    Sparkles, X, ChevronRight, ChevronDown, CheckCircle2, RotateCcw,
    Activity, Eye, AlertTriangle
} from 'lucide-react';
import { useNav } from '../navigation/NavigationContext';
import { useSocket } from '../hooks/useSocket';
import { useBattleFocusWarning } from '../hooks/useBattleFocusWarning';
import { BattleFocusWarningModal } from '../components/arena/BattleFocusWarningModal';
import { useLayout } from '../contexts/LayoutContext';
import { useAuthStore } from '../store/useAuthStore';
import type { User } from '../types';
import api from '../lib/api';

export const HostedRoomSpace: React.FC<{ currentUser?: User; roomCode?: string }> = ({ currentUser: propUser, roomCode: propRoomCode }) => {
    const { isLight } = useLayout();
    const { params, goToDashboard } = useNav();
    const { socket, on, emit, connected: isSocketConnected } = useSocket();
    const authUser = useAuthStore(state => state.user);
    const currentUser = propUser || authUser;
    const currentUserId = currentUser?.id || (currentUser as any)?._id || '';

    const roomCode = (propRoomCode || params?.roomCode || '').toUpperCase();

    // Room state synced from server
    const [room, setRoom] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [copiedCode, setCopiedCode] = useState(false);

    // Active race state
    const [currentProbIndex, setCurrentProbIndex] = useState(0);
    const [code, setCode] = useState('');
    const [language, setLanguage] = useState('js');
    const [showLangDropdown, setShowLangDropdown] = useState(false);
    const langDropdownRef = useRef<HTMLDivElement>(null);
    const [timeLeft, setTimeLeft] = useState(1800); // 30 mins default
    const [isRunning, setIsRunning] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const LANGUAGE_OPTIONS = [
        { id: 'js', label: 'JavaScript' },
        { id: 'py', label: 'Python' },
        { id: 'java', label: 'Java' },
        { id: 'cpp', label: 'C++' },
        { id: 'c', label: 'C' },
    ];

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
                setShowLangDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    const [runVerdict, setRunVerdict] = useState<any>(null);
    const [submitVerdict, setSubmitVerdict] = useState<any>(null);
    const [solvedBanner, setSolvedBanner] = useState<string | null>(null);
    const [mobileTab, setMobileTab] = useState<'problem' | 'code' | 'standings'>('code');

    // Auto-switch to code tab on mobile when verdict arrives to see results drawer
    useEffect(() => {
        if ((runVerdict || submitVerdict) && typeof window !== 'undefined' && window.innerWidth < 768) {
            setMobileTab('code');
        }
    }, [runVerdict, submitVerdict]);

    // Initial fetch via REST API
    useEffect(() => {
        if (!roomCode) return;
        api.get(`/rooms/${roomCode}`)
            .then(res => {
                if (res.data?.room) {
                    setRoom(res.data.room);
                }
            })
            .catch(err => {
                console.warn('[HOSTED_ROOM] REST sync error:', err);
                setError(err.response?.data?.message || err.message || 'Failed to load room');
            });
    }, [roomCode]);

    // Join room channel on mount
    useEffect(() => {
        if (!roomCode || !socket || !isSocketConnected) return;

        emit('room:join_hosted', { roomCode });

        const cleanups = [
            on('room:sync', (data: any) => {
                setRoom(data);
                const me = (data.participants || []).find((p: any) => 
                    String(p.userId) === String(currentUserId) || String(p.userId?._id) === String(currentUserId)
                );
                if (me) {
                    setCurrentProbIndex(me.currentProblemIndex || 0);
                }
            }),

            on('room:participant_joined', (data: any) => {
                setRoom((prev: any) => {
                    if (!prev) return prev;
                    if (Array.isArray(data.participants) && data.participants.length > 0) {
                        return {
                            ...prev,
                            participants: data.participants
                        };
                    }
                    if (!data.participant) return prev;
                    const newUserId = String(data.participant.userId?._id || data.participant.userId || '');
                    const exists = (prev.participants || []).some((p: any) => {
                        const pid = String(p.userId?._id || p.userId || '');
                        return pid === newUserId;
                    });
                    return {
                        ...prev,
                        participants: exists ? prev.participants : [...(prev.participants || []), data.participant]
                    };
                });
            }),

            on('room:participant_left', (data: any) => {
                setRoom((prev: any) => {
                    if (!prev) return prev;
                    if (Array.isArray(data.participants)) {
                        return { ...prev, participants: data.participants };
                    }
                    const leftUserId = String(data.userId);
                    return {
                        ...prev,
                        participants: (prev.participants || []).filter((p: any) => {
                            const pid = String(p.userId?._id || p.userId || '');
                            return pid !== leftUserId;
                        })
                    };
                });
            }),

            on('room:host_changed', (data: any) => {
                setRoom((prev: any) => prev ? { ...prev, hostId: data.newHostId } : prev);
            }),

            on('room:participant_ready', (data: any) => {
                setRoom((prev: any) => {
                    if (!prev) return prev;
                    if (Array.isArray(data.participants)) {
                        return { ...prev, participants: data.participants };
                    }
                    const readyUserId = String(data.userId);
                    return {
                        ...prev,
                        participants: (prev.participants || []).map((p: any) => {
                            const pid = String(p.userId?._id || p.userId || '');
                            return pid === readyUserId ? { ...p, isReady: data.isReady } : p;
                        })
                    };
                });
            }),

            on('room:participant_kicked', (data: any) => {
                const targetId = String(data.targetUserId);
                if (targetId === String(currentUserId)) {
                    alert('You have been removed from the room by the host.');
                    goToDashboard();
                    return;
                }
                setRoom((prev: any) => {
                    if (!prev) return prev;
                    if (Array.isArray(data.participants)) {
                        return { ...prev, participants: data.participants };
                    }
                    return {
                        ...prev,
                        participants: (prev.participants || []).filter((p: any) => {
                            const pid = String(p.userId?._id || p.userId || '');
                            return pid !== targetId;
                        })
                    };
                });
            }),

            on('room:session_started', (data: any) => {
                setRoom((prev: any) => prev ? { ...prev, status: 'in-progress', startedAt: data.startedAt } : prev);
                setTimeLeft((data.durationMinutes || 30) * 60);
                setCurrentProbIndex(0);
                setRunVerdict(null);
                setSubmitVerdict(null);
            }),

            on('room:participant_progress', (data: any) => {
                setRoom((prev: any) => {
                    if (!prev) return prev;
                    const progUserId = String(data.userId);
                    return {
                        ...prev,
                        participants: (prev.participants || []).map((p: any) => {
                            const pid = String(p.userId?._id || p.userId || '');
                            return pid === progUserId ? { 
                                ...p, 
                                currentProblemIndex: data.problemIndex,
                                solvedProblems: data.solvedProblems || p.solvedProblems,
                                testCasesPassed: data.testCasesPassed,
                                totalTestCases: data.totalTestCases,
                                totalScore: data.totalScore,
                                finishedAt: data.finished ? new Date() : p.finishedAt
                            } : p;
                        })
                    };
                });
            }),

            on('room:run_result', (data: any) => {
                setIsRunning(false);
                setRunVerdict(data);
            }),

            on('room:submission_result', (data: any) => {
                setIsSubmitting(false);
                setSubmitVerdict(data);

                if (data.status === 'ACCEPTED') {
                    if (data.solvedNext) {
                        setSolvedBanner(`Problem Solved! Unlocked Problem #${data.nextProblemIndex + 1}!`);
                        setTimeout(() => setSolvedBanner(null), 4000);
                        setCurrentProbIndex(data.nextProblemIndex);
                    } else if (data.finished) {
                        setSolvedBanner('CONGRATULATIONS! You have completed all problems in the race!');
                    }
                }
            }),

            on('room:session_completed', (data: any) => {
                setRoom((prev: any) => prev ? { ...prev, status: 'completed', results: data.results } : prev);
            }),

            on('room:cancelled', (data: any) => {
                alert(data.message || 'Room uplink was cancelled.');
                goToDashboard();
            }),

            on('room:error', (data: any) => {
                setError(data.message || 'Room error');
            })
        ];

        return () => {
            cleanups.forEach(c => c && c());
        };
    }, [roomCode, socket, isSocketConnected, currentUserId, goToDashboard]);

    // Live lobby participant polling fallback (every 2.5s while in lobby)
    useEffect(() => {
        if (!roomCode || room?.status !== 'lobby') return;
        const interval = setInterval(() => {
            api.get(`/rooms/${roomCode}`)
                .then(res => {
                    if (res.data?.room) {
                        setRoom((prev: any) => {
                            if (!prev) return res.data.room;
                            const prevParticipants = prev.participants || [];
                            const newParticipants = res.data.room.participants || [];
                            
                            const countChanged = prevParticipants.length !== newParticipants.length;
                            const statusChanged = res.data.room.status !== prev.status;
                            const readyChanged = newParticipants.some((np: any) => {
                                const nid = String(np.userId?._id || np.userId || '');
                                const op = prevParticipants.find((p: any) => String(p.userId?._id || p.userId || '') === nid);
                                return !op || op.isReady !== np.isReady;
                            });

                            if (countChanged || statusChanged || readyChanged) {
                                return {
                                    ...prev,
                                    ...res.data.room,
                                    participants: newParticipants
                                };
                            }
                            return prev;
                        });
                    }
                })
                .catch(() => {});
        }, 2500);
        return () => clearInterval(interval);
    }, [roomCode, room?.status]);

    // Timer countdown during race
    useEffect(() => {
        if (room?.status === 'in-progress' && room?.startedAt) {
            const timer = setInterval(() => {
                const elapsed = Math.floor((Date.now() - new Date(room.startedAt).getTime()) / 1000);
                const total = (room.config?.durationMinutes || 30) * 60;
                const remaining = Math.max(0, total - elapsed);
                setTimeLeft(remaining);

                if (remaining === 0 && isHost) {
                    emit('room:end_session', { roomCode });
                }
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [room?.status, room?.startedAt, roomCode]);

    // Update boilerplate when problem changes
    const currentProblem = room?.problemSet?.[currentProbIndex];
    useEffect(() => {
        if (!currentProblem) return;
        const bp = currentProblem.boilerplate;
        let template = '';
        if (typeof bp === 'object') {
            template = bp[language] || bp[language === 'js' ? 'javascript' : language === 'py' ? 'python' : language] || '';
        }
        setCode(template || '// Write your solution here\n');
    }, [currentProblem, language]);

    const isHost = Boolean(room && (
        String(room.hostId) === String(currentUserId) || 
        String(room.hostId?._id) === String(currentUserId)
    ));
    const myParticipant = room?.participants?.find((p: any) => 
        String(p.userId) === String(currentUserId) || 
        String(p.userId?._id) === String(currentUserId)
    );
    const isMeReady = Boolean(myParticipant?.isReady);

    // Monitor tab departures, focus breaches, and beforeunload during active battle
    const isBattleActive = room?.status === 'in-progress';
    const {
        infractionCount,
        showWarningModal: showFocusWarningModal,
        dismissWarning: dismissFocusWarning,
    } = useBattleFocusWarning({
        isActive: isBattleActive,
        battleType: `Hosted Room Combat (${roomCode})`,
    });

    // Actions
    const handleLeaveRoom = () => {
        if (room?.status === 'in-progress' && !window.confirm('Active race in progress! Leaving now will forfeit your standing. Are you sure you want to exit?')) {
            return;
        }
        emit('room:leave_hosted', { roomCode });
        goToDashboard();
    };

    const handleToggleReady = () => {
        emit('room:toggle_ready', { roomCode, isReady: !isMeReady });
    };

    const handleStartSession = () => {
        emit('room:start_session', { roomCode });
    };

    const handleKick = (targetUserId: string) => {
        if (window.confirm('Are you sure you want to remove this operator from the room?')) {
            emit('room:kick_participant', { roomCode, targetUserId });
        }
    };

    const handleEndSessionEarly = () => {
        if (window.confirm('Are you sure you want to end this combat session now? Final rankings will be computed.')) {
            emit('room:end_session', { roomCode });
        }
    };

    const handleRunCode = () => {
        if (isRunning || isSubmitting) return;
        setIsRunning(true);
        setRunVerdict(null);
        emit('room:run_code', { roomCode, problemIndex: currentProbIndex, code, language });
    };

    const handleSubmitCode = () => {
        if (isRunning || isSubmitting) return;
        setIsSubmitting(true);
        setSubmitVerdict(null);
        emit('room:submit_code', { roomCode, problemIndex: currentProbIndex, code, language });
    };

    const formatTimer = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // ── LOADING / NO ROOM STATE ──────────────────────────────────────────
    if (!room) {
        return (
            <div className="min-h-screen bg-[#06070a] text-white flex flex-col items-center justify-center p-6 font-mono">
                <div className="flex flex-col items-center gap-4 max-w-md text-center">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                        {error ? <AlertCircle size={24} className="text-red-400" /> : <Zap size={24} className="animate-pulse" />}
                    </div>
                    {error ? (
                        <>
                            <p className="text-sm tracking-wide text-red-400 font-bold uppercase">{error}</p>
                            <button
                                onClick={goToDashboard}
                                className="mt-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white uppercase tracking-wider transition-all"
                            >
                                Return to Dashboard
                            </button>
                        </>
                    ) : (
                        <p className="text-sm tracking-widest text-gray-400 uppercase">Synchronizing with Hosted Uplink [{roomCode}]...</p>
                    )}
                </div>
            </div>
        );
    }

    // ── 15H: RESULTS VIEW (COMPLETED) ──────────────────────────────────
    if (room.status === 'completed') {
        const results = room.results || [];
        return (
            <div className={`min-h-screen p-6 md:p-12 font-sans flex flex-col items-center justify-center ${isLight ? 'bg-[#f8f9fc] text-slate-900' : 'bg-[#07080d] text-white'}`}>
                <div className="w-full max-w-4xl space-y-8">
                    {/* Unranked 0 RP Banner */}
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-purple-900/20 to-transparent border border-purple-500/30 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Shield className="text-purple-400" size={24} />
                            <div>
                                <span className="text-xs font-bold text-purple-300 uppercase tracking-widest block">Combat Session Terminated</span>
                                <span className="text-[11px] font-semibold text-gray-400">UNRANKED CUSTOM UPLINK &bull; 0 RP DELTA</span>
                            </div>
                        </div>
                        <button
                            onClick={goToDashboard}
                            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider transition-all"
                        >
                            Return to Command Hub
                        </button>
                    </div>

                    {/* Header */}
                    <div className="text-center space-y-2">
                        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight">Final Combat Standings</h1>
                        <p className="text-xs font-medium text-gray-400">Room Token: {room.roomCode} &bull; {room.title}</p>
                    </div>

                    {/* Results Table */}
                    <div className={`rounded-3xl border overflow-hidden shadow-2xl ${isLight ? 'bg-white border-slate-200' : 'bg-[#0c0d16] border-white/10'}`}>
                        <div className={`grid grid-cols-12 p-4 text-[11px] font-bold uppercase tracking-widest border-b ${isLight ? 'text-slate-500 border-slate-200 bg-slate-50' : 'text-gray-400 border-white/10 bg-white/[0.02]'}`}>
                            <div className="col-span-2">Rank</div>
                            <div className="col-span-4">Operator</div>
                            <div className="col-span-2 text-center">Problems Solved</div>
                            <div className="col-span-2 text-center">Time Taken</div>
                            <div className="col-span-2 text-right">Score</div>
                        </div>

                        <div className={`divide-y ${isLight ? 'divide-slate-100' : 'divide-white/5'}`}>
                            {results.map((res: any, idx: number) => {
                                const isWinner = res.rank === 1;
                                const isMe = String(res.userId) === String(currentUserId) || String(res.userId?._id) === String(currentUserId);
                                return (
                                    <div key={idx} className={`grid grid-cols-12 p-4 items-center text-xs font-medium ${isMe ? 'bg-purple-500/10' : 'hover:bg-white/[0.01]'}`}>
                                        <div className="col-span-2 flex items-center gap-2">
                                            {isWinner ? (
                                                <span className="w-7 h-7 rounded-xl bg-yellow-500 text-black font-black flex items-center justify-center text-xs shadow-[0_0_15px_rgba(234,179,8,0.5)]">
                                                    1
                                                </span>
                                            ) : (
                                                <span className={`w-7 h-7 rounded-xl font-black flex items-center justify-center text-xs ${isLight ? 'bg-slate-100 border border-slate-200 text-slate-500' : 'bg-white/5 border border-white/10 text-gray-400'}`}>
                                                    {res.rank}
                                                </span>
                                            )}
                                        </div>

                                        <div className="col-span-4 flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold uppercase text-xs ${isLight ? 'bg-purple-100 text-purple-700' : 'bg-white/10 text-white'}`}>
                                                {res.username?.[0] || 'O'}
                                            </div>
                                            <div>
                                                <span className={`font-bold block ${isLight ? 'text-slate-900' : 'text-white'}`}>{res.username} {isMe && '(You)'}</span>
                                                {isWinner && <span className="text-[9px] text-yellow-400 font-bold uppercase tracking-widest">Apex Victor</span>}
                                            </div>
                                        </div>

                                        <div className={`col-span-2 text-center font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                            {res.solvedCount} / {room.problemSet?.length || 0}
                                        </div>

                                        <div className="col-span-2 text-center text-gray-400 font-mono">
                                            {formatTimer(res.totalTimeSec || 0)}
                                        </div>

                                        <div className="col-span-2 text-right font-black text-purple-400 text-sm">
                                            {res.score} PTS
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── 15G: ACTIVE RACE VIEW ──────────────────────────────────────────
    if (room.status === 'in-progress') {
        const myProgress = myParticipant || {};
        const isFinishedAll = myProgress.finishedAt !== undefined;

        return (
            <div className={`h-screen flex flex-col font-sans overflow-hidden ${isLight ? 'bg-[#f8f9fc] text-slate-900' : 'bg-[#07080d] text-white'}`}>
                {/* Solved Notification Banner */}
                {solvedBanner && (
                    <div className="fixed top-4 inset-x-0 z-50 flex justify-center px-4 animate-bounce">
                        <div className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-black text-xs uppercase tracking-widest shadow-2xl flex items-center gap-2">
                            <CheckCircle2 size={18} />
                            <span>{solvedBanner}</span>
                        </div>
                    </div>
                )}

                {/* Top Race HUD */}
                <header className={`px-3 sm:px-6 py-2.5 sm:py-3 border-b flex items-center justify-between gap-3 shrink-0 ${isLight ? 'border-slate-200 bg-white text-slate-900 shadow-sm' : 'border-white/10 bg-[#0c0d16] text-white'}`}>
                    <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                            <span className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-widest">Token:</span>
                            <span className="text-xs sm:text-sm font-black text-purple-500 tracking-wider">{room.roomCode}</span>
                        </div>
                        <div className={`h-4 w-px hidden xs:block ${isLight ? 'bg-slate-200' : 'bg-white/10'}`} />
                        <span className={`text-xs font-bold truncate max-w-[120px] sm:max-w-xs hidden xs:block ${isLight ? 'text-slate-800' : 'text-white'}`}>{room.title}</span>
                    </div>

                    {/* Timer */}
                    <div className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-xl font-bold text-xs transition-all shrink-0 ${
                        timeLeft > 120
                            ? (isLight ? 'bg-slate-100 border border-slate-200 text-slate-700' : 'bg-white/5 border border-white/10 text-white')
                            : timeLeft >= 60
                                ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                                : 'bg-red-500/15 border border-red-500/40 text-red-500 animate-pulse'
                    }`}>
                        <Clock size={13} className={timeLeft <= 60 ? 'text-red-500 animate-pulse' : timeLeft <= 120 ? 'text-amber-400' : 'text-zinc-400'} />
                        <span className="font-mono text-xs sm:text-sm font-black">{formatTimer(timeLeft)}</span>
                    </div>

                    {/* Host Controls */}
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        {infractionCount > 0 && (
                            <div
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-400 text-[10px] font-mono font-extrabold animate-pulse shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                                title="Focus departures recorded during this battle"
                            >
                                <AlertTriangle size={12} />
                                <span>Breaches: {infractionCount}</span>
                            </div>
                        )}
                        {isHost && (
                            <button
                                onClick={handleEndSessionEarly}
                                className="px-2.5 sm:px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all"
                            >
                                <span className="hidden sm:inline">End Race Early</span>
                                <span className="sm:hidden">End</span>
                            </button>
                        )}
                        <button
                            onClick={handleLeaveRoom}
                            className={`p-1.5 sm:p-2 rounded-lg transition-all ${isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                            title="Exit to Dashboard"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                </header>

                {/* Multi-User Real-time Leaderboard Bar */}
                <div className={`px-3 sm:px-6 py-2 border-b flex items-center gap-2 sm:gap-3 overflow-x-auto shrink-0 custom-scrollbar scrollbar-none ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#090a10] border-white/5'}`}>
                    <span className="text-[9px] sm:text-[10px] font-bold text-gray-500 uppercase tracking-widest shrink-0">Race HUD:</span>
                    <div className="flex items-center gap-2 sm:gap-3">
                        {room.participants?.map((p: any) => {
                            const isFinished = p.finishedAt !== undefined;
                            const isMe = String(p.userId) === String(currentUserId) || String(p.userId?._id) === String(currentUserId);
                            return (
                                <div 
                                    key={p.userId} 
                                    className={`px-2.5 sm:px-3 py-1 rounded-xl border flex items-center gap-1.5 sm:gap-2 shrink-0 ${
                                        isMe 
                                            ? (isLight ? 'bg-purple-100 border-purple-300 shadow-sm' : 'bg-purple-950/40 border-purple-500/40')
                                            : (isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10')
                                    }`}
                                >
                                    <span className={`text-[11px] sm:text-xs font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>
                                        {p.username} {isMe && '(You)'}
                                    </span>
                                    <span className="text-[8px] text-gray-500">&bull;</span>
                                    <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${isFinished ? 'text-emerald-500' : 'text-yellow-500'}`}>
                                        {isFinished ? 'FINISHED' : `P${(p.currentProblemIndex || 0) + 1}`}
                                    </span>
                                    <span className="text-[11px] sm:text-xs text-purple-500 font-bold">{p.totalScore || 0} pts</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Mobile Segmented Tab Bar (< md) */}
                <div className={`md:hidden flex items-center justify-between border-b shrink-0 h-10 px-1 text-xs select-none ${
                    isLight ? 'bg-white border-slate-200' : 'bg-[#090a10] border-white/10'
                }`}>
                    <button
                        onClick={() => setMobileTab('problem')}
                        className={`flex-1 py-2 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-all border-b-2 ${
                            mobileTab === 'problem'
                                ? (isLight ? 'border-purple-600 text-purple-700 bg-purple-50/50' : 'border-purple-500 text-white bg-white/5')
                                : (isLight ? 'border-transparent text-slate-500' : 'border-transparent text-gray-400')
                        }`}
                    >
                        <Shield size={12} />
                        <span>Problem ({currentProbIndex + 1}/{room.problemSet?.length || 1})</span>
                    </button>
                    <button
                        onClick={() => setMobileTab('code')}
                        className={`flex-1 py-2 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-all border-b-2 ${
                            mobileTab === 'code'
                                ? (isLight ? 'border-purple-600 text-purple-700 bg-purple-50/50' : 'border-purple-500 text-white bg-white/5')
                                : (isLight ? 'border-transparent text-slate-500' : 'border-transparent text-gray-400')
                        }`}
                    >
                        <Terminal size={12} />
                        <span>Editor</span>
                    </button>
                    <button
                        onClick={() => setMobileTab('standings')}
                        className={`flex-1 py-2 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-all border-b-2 ${
                            mobileTab === 'standings'
                                ? (isLight ? 'border-purple-600 text-purple-700 bg-purple-50/50' : 'border-purple-500 text-white bg-white/5')
                                : (isLight ? 'border-transparent text-slate-500' : 'border-transparent text-gray-400')
                        }`}
                    >
                        <Trophy size={12} />
                        <span>Standings</span>
                    </button>
                </div>

                {/* Mobile View Container (< md) */}
                <div className="md:hidden flex-1 flex flex-col min-h-0 overflow-hidden relative">
                    {mobileTab === 'problem' && (
                        <div className={`flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar ${isLight ? 'bg-white text-slate-800' : 'bg-[#090a10]/50 text-gray-300'}`}>
                            {currentProblem ? (
                                <>
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 py-0.5 rounded-md bg-purple-500/20 border border-purple-500/30 text-[10px] font-bold tracking-wider text-purple-400">
                                                Problem {currentProbIndex + 1} of {room.problemSet.length}
                                            </span>
                                            {currentProblem.isCustom && (
                                                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-[10px] font-bold tracking-wider text-amber-500">
                                                    CUSTOM
                                                </span>
                                            )}
                                        </div>
                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${currentProblem.difficulty === 'HARD' ? 'text-red-500' : currentProblem.difficulty === 'MEDIUM' ? 'text-yellow-500' : 'text-emerald-500'}`}>
                                            {currentProblem.difficulty}
                                        </span>
                                    </div>

                                    <div>
                                        <h2 className={`text-2xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{currentProblem.title}</h2>
                                        <p className="text-xs text-gray-400 font-medium mt-1">{currentProblem.category}</p>
                                    </div>

                                    <div className={`space-y-4 text-sm leading-relaxed whitespace-pre-wrap ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                                        {currentProblem.description}
                                    </div>

                                    {currentProblem.constraints && (
                                        <div className={`p-4 rounded-2xl border space-y-2 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'}`}>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Constraints</span>
                                            <p className={`text-xs font-medium ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>{currentProblem.constraints}</p>
                                        </div>
                                    )}

                                    {currentProblem.examples?.length > 0 && (
                                        <div className="space-y-3">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Examples</span>
                                            {currentProblem.examples.map((ex: any, i: number) => (
                                                <div key={i} className={`p-3 rounded-xl border text-xs space-y-1 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/40 border-white/10'}`}>
                                                    <div><span className="text-gray-400 font-medium">Input: </span><span className={`font-mono ${isLight ? 'text-slate-800' : 'text-white'}`}>{ex.input}</span></div>
                                                    <div><span className="text-gray-400 font-medium">Output: </span><span className="font-mono text-emerald-500 font-bold">{ex.output}</span></div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="p-8 text-center text-gray-500 font-medium text-xs">Loading problem...</div>
                            )}
                        </div>
                    )}

                    {mobileTab === 'code' && (
                        <div className={`flex-1 flex flex-col min-h-0 h-full ${isLight ? 'bg-slate-50' : 'bg-black'}`}>
                            {/* Editor Action Bar on Mobile */}
                            <div className={`px-4 py-2 border-b flex items-center justify-between gap-2 shrink-0 ${isLight ? 'bg-white border-slate-200' : 'bg-[#090a10] border-white/10'}`}>
                                <div className="relative z-30" ref={langDropdownRef}>
                                    <button
                                        type="button"
                                        onClick={() => setShowLangDropdown(prev => !prev)}
                                        className={`border rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 cursor-pointer shadow-sm transition-all ${
                                            isLight 
                                                ? 'bg-white border-slate-300 text-purple-600 hover:border-purple-400' 
                                                : 'bg-black border-white/20 hover:border-accent-secondary/60 text-accent-secondary'
                                        }`}
                                    >
                                        <span>{LANGUAGE_OPTIONS.find(l => l.id === language)?.label || 'JavaScript'}</span>
                                        <ChevronDown size={11} className={`transition-transform duration-200 ${showLangDropdown ? 'rotate-180' : ''}`} />
                                    </button>

                                    {showLangDropdown && (
                                        <div 
                                            className={`absolute top-full mt-1 left-0 w-32 py-1 rounded-xl border shadow-2xl z-50 overflow-hidden ${
                                                isLight ? 'bg-white border-slate-200' : 'bg-black border-white/20'
                                            }`}
                                        >
                                            {LANGUAGE_OPTIONS.map((opt) => (
                                                <button
                                                    key={opt.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setLanguage(opt.id);
                                                        setShowLangDropdown(false);
                                                    }}
                                                    className={`w-full px-3 py-1.5 text-left text-[10px] font-black uppercase tracking-wider flex items-center justify-between transition-colors ${
                                                        language === opt.id 
                                                            ? (isLight ? 'text-purple-600' : 'text-accent-secondary')
                                                            : (isLight ? 'text-slate-600 hover:text-slate-900' : 'text-zinc-300 hover:text-white')
                                                    }`}
                                                    style={{ backgroundColor: language === opt.id ? (isLight ? 'rgba(139, 92, 246, 0.1)' : 'rgba(255, 255, 255, 0.08)') : (isLight ? '#ffffff' : '#000000') }}
                                                >
                                                    <span>{opt.label}</span>
                                                    {language === opt.id && <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="text-[10px] font-bold text-gray-500">
                                    P{currentProbIndex + 1}/{room.problemSet?.length || 1}
                                </div>
                            </div>

                            {/* Monaco Editor */}
                            <div className="flex-1 min-h-0">
                                <Editor
                                    height="100%"
                                    language={language === 'js' ? 'javascript' : language === 'py' ? 'python' : language}
                                    theme={isLight ? 'vs' : 'vs-dark'}
                                    value={code}
                                    onChange={val => {
                                        setCode(val || '');
                                        emit('room:code_update', { roomCode, lines: (val || '').split('\n').length });
                                    }}
                                    options={{
                                        fontSize: 13,
                                        minimap: { enabled: false },
                                        scrollBeyondLastLine: false,
                                        automaticLayout: true,
                                        lineNumbersMinChars: 2,
                                    }}
                                />
                            </div>

                            {/* Verdict Drawer */}
                            {(runVerdict || submitVerdict) && (
                                <div className={`p-3 border-t max-h-40 overflow-y-auto space-y-2 font-mono text-xs shrink-0 ${isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#0c0d16] border-white/10 text-white'}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded font-black uppercase text-[10px] ${(runVerdict || submitVerdict).status === 'ACCEPTED' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                                                {(runVerdict || submitVerdict).status}
                                            </span>
                                            <span className="text-gray-400 text-[10px]">
                                                {(runVerdict || submitVerdict).testCasesPass} / {(runVerdict || submitVerdict).testCasesTotal} Passed
                                            </span>
                                        </div>
                                        <button onClick={() => { setRunVerdict(null); setSubmitVerdict(null); }} className="text-gray-400 hover:text-gray-600">
                                            <X size={14} />
                                        </button>
                                    </div>
                                    <pre className={`text-[10px] font-mono whitespace-pre-wrap p-2 rounded-lg ${isLight ? 'bg-slate-100 text-slate-700' : 'bg-black/50 text-gray-300'}`}>
                                        {(runVerdict || submitVerdict).details || 'All test cases evaluated.'}
                                    </pre>
                                </div>
                            )}

                            {/* Sticky Bottom Action Bar on Mobile */}
                            <div className={`border-t px-3 py-2 flex items-center gap-2 z-30 shrink-0 ${
                                isLight ? 'bg-white/95 border-slate-200 backdrop-blur-md' : 'bg-black/95 border-white/10 backdrop-blur-md'
                            }`}>
                                <button
                                    onClick={handleRunCode}
                                    disabled={isRunning || isSubmitting || isFinishedAll}
                                    className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 ${
                                        isLight 
                                            ? 'border-cyan-400 bg-cyan-50 hover:bg-cyan-100 text-cyan-700' 
                                            : 'border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300'
                                    }`}
                                >
                                    <Play size={13} />
                                    <span>{isRunning ? 'Running...' : 'Run Tests'}</span>
                                </button>
                                <button
                                    onClick={handleSubmitCode}
                                    disabled={isRunning || isSubmitting || isFinishedAll}
                                    className="flex-1 py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-mono text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                                >
                                    <Zap size={13} />
                                    <span>{isSubmitting ? 'Verifying...' : 'Submit'}</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {mobileTab === 'standings' && (
                        <div className={`flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar ${isLight ? 'bg-[#f8f9fc] text-slate-900' : 'bg-[#07080d] text-white'}`}>
                            <div className="flex items-center justify-between pb-2 border-b border-white/10">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Live Combat Standings</h3>
                                <span className="text-[10px] text-purple-400 font-bold">{room.participants?.length || 0} Operators</span>
                            </div>
                            <div className="space-y-2">
                                {room.participants?.map((p: any, idx: number) => {
                                    const isFinished = p.finishedAt !== undefined;
                                    const isMe = String(p.userId) === String(currentUserId) || String(p.userId?._id) === String(currentUserId);
                                    return (
                                        <div 
                                            key={p.userId || idx} 
                                            className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                                                isMe 
                                                    ? (isLight ? 'bg-purple-100 border-purple-300 shadow-sm' : 'bg-purple-950/40 border-purple-500/40')
                                                    : (isLight ? 'bg-white border-slate-200' : 'bg-[#0c0d16] border-white/10')
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500/20 to-violet-500/20 border border-purple-500/30 flex items-center justify-center font-black text-xs text-purple-400 uppercase">
                                                    {p.username?.[0]}
                                                </div>
                                                <div>
                                                    <span className={`text-xs font-bold block ${isLight ? 'text-slate-800' : 'text-white'}`}>
                                                        {p.username} {isMe && '(You)'}
                                                    </span>
                                                    <span className="text-[9px] text-gray-400 uppercase">
                                                        {isFinished ? 'Finished Race' : `Solving Problem ${(p.currentProblemIndex || 0) + 1}`}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xs text-purple-500 font-black block">{p.totalScore || 0} pts</span>
                                                <span className={`text-[9px] font-bold uppercase ${isFinished ? 'text-emerald-400' : 'text-yellow-400'}`}>
                                                    {isFinished ? 'DONE' : 'ACTIVE'}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Main Battle Area: Problem Spec + Editor (Desktop view: hidden md:flex) */}
                <div className="hidden md:flex flex-1 flex-row min-h-0 overflow-hidden">
                    {/* Left: Problem Statement */}
                    <div className={`w-5/12 border-r p-6 overflow-y-auto space-y-6 ${isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#090a10]/50 border-white/10 text-gray-300'}`}>
                        {currentProblem ? (
                            <>
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded-md bg-purple-500/20 border border-purple-500/30 text-[10px] font-bold tracking-wider text-purple-400">
                                            Problem {currentProbIndex + 1} of {room.problemSet.length}
                                        </span>
                                        {currentProblem.isCustom && (
                                            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-[10px] font-bold tracking-wider text-amber-500">
                                                CUSTOM
                                            </span>
                                        )}
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${currentProblem.difficulty === 'HARD' ? 'text-red-500' : currentProblem.difficulty === 'MEDIUM' ? 'text-yellow-500' : 'text-emerald-500'}`}>
                                        {currentProblem.difficulty}
                                    </span>
                                </div>

                                <div>
                                    <h2 className={`text-2xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{currentProblem.title}</h2>
                                    <p className="text-xs text-gray-400 font-medium mt-1">{currentProblem.category}</p>
                                </div>

                                <div className={`space-y-4 text-sm leading-relaxed whitespace-pre-wrap ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>
                                    {currentProblem.description}
                                </div>

                                {currentProblem.constraints && (
                                    <div className={`p-4 rounded-2xl border space-y-2 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'}`}>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Constraints</span>
                                        <p className={`text-xs font-medium ${isLight ? 'text-slate-700' : 'text-gray-300'}`}>{currentProblem.constraints}</p>
                                    </div>
                                )}

                                {currentProblem.examples?.length > 0 && (
                                    <div className="space-y-3">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Examples</span>
                                        {currentProblem.examples.map((ex: any, i: number) => (
                                            <div key={i} className={`p-3 rounded-xl border text-xs space-y-1 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/40 border-white/10'}`}>
                                                <div><span className="text-gray-400 font-medium">Input: </span><span className={`font-mono ${isLight ? 'text-slate-800' : 'text-white'}`}>{ex.input}</span></div>
                                                <div><span className="text-gray-400 font-medium">Output: </span><span className="font-mono text-emerald-500 font-bold">{ex.output}</span></div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="p-8 text-center text-gray-500 font-medium text-xs">Loading problem...</div>
                        )}
                    </div>

                    {/* Right: Monaco Editor + Action Bar */}
                    <div className={`flex-1 flex flex-col min-h-0 ${isLight ? 'bg-slate-50' : 'bg-black'}`}>
                        {/* Action Bar */}
                        <div className={`px-6 py-2.5 border-b flex items-center justify-between gap-4 shrink-0 ${isLight ? 'bg-white border-slate-200' : 'bg-[#090a10] border-white/10'}`}>
                            <div className="relative z-30" ref={langDropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setShowLangDropdown(prev => !prev)}
                                    className={`border rounded-lg px-3.5 py-1.5 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 cursor-pointer shadow-sm transition-all ${
                                        isLight 
                                            ? 'bg-white border-slate-300 text-purple-600 hover:border-purple-400' 
                                            : 'bg-black border-white/20 hover:border-accent-secondary/60 text-accent-secondary'
                                    }`}
                                >
                                    <span>{LANGUAGE_OPTIONS.find(l => l.id === language)?.label || 'JavaScript'}</span>
                                    <ChevronDown size={12} className={`transition-transform duration-200 ${showLangDropdown ? 'rotate-180' : ''}`} />
                                </button>

                                {showLangDropdown && (
                                    <div 
                                        className={`absolute top-full mt-2 left-0 w-36 py-1.5 rounded-xl border shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 overflow-hidden ${
                                            isLight ? 'bg-white border-slate-200' : 'bg-black border-white/20'
                                        }`}
                                    >
                                        {LANGUAGE_OPTIONS.map((opt) => (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => {
                                                    setLanguage(opt.id);
                                                    setShowLangDropdown(false);
                                                }}
                                                className={`w-full px-3.5 py-2 text-left text-[10px] font-black uppercase tracking-wider flex items-center justify-between transition-colors ${
                                                    language === opt.id 
                                                        ? (isLight ? 'text-purple-600' : 'text-accent-secondary')
                                                        : (isLight ? 'text-slate-600 hover:text-slate-900' : 'text-zinc-300 hover:text-white')
                                                }`}
                                                style={{ backgroundColor: language === opt.id ? (isLight ? 'rgba(139, 92, 246, 0.1)' : 'rgba(255, 255, 255, 0.08)') : (isLight ? '#ffffff' : '#000000') }}
                                            >
                                                <span>{opt.label}</span>
                                                {language === opt.id && <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_#8b5cf6]" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleRunCode}
                                    disabled={isRunning || isSubmitting || isFinishedAll}
                                    className={`px-4 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-2 transition-all disabled:opacity-40 ${
                                        isLight 
                                            ? 'border-cyan-400 bg-cyan-50 hover:bg-cyan-100 text-cyan-700' 
                                            : 'border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300'
                                    }`}
                                >
                                    <Play size={14} />
                                    <span>{isRunning ? 'Running...' : 'Run Tests'}</span>
                                </button>
                                <button
                                    onClick={handleSubmitCode}
                                    disabled={isRunning || isSubmitting || isFinishedAll}
                                    className="px-5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-mono text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                                >
                                    <Zap size={14} />
                                    <span>{isSubmitting ? 'Verifying...' : 'Submit'}</span>
                                </button>
                            </div>
                        </div>

                        {/* Monaco Editor */}
                        <div className="flex-1 min-h-0">
                            <Editor
                                height="100%"
                                language={language === 'js' ? 'javascript' : language === 'py' ? 'python' : language}
                                theme={isLight ? 'vs' : 'vs-dark'}
                                value={code}
                                onChange={val => {
                                    setCode(val || '');
                                    emit('room:code_update', { roomCode, lines: (val || '').split('\n').length });
                                }}
                                options={{
                                    fontSize: 14,
                                    minimap: { enabled: false },
                                    scrollBeyondLastLine: false,
                                    automaticLayout: true,
                                }}
                            />
                        </div>

                        {/* Verdict Drawer */}
                        {(runVerdict || submitVerdict) && (
                            <div className={`p-4 border-t max-h-48 overflow-y-auto space-y-2 font-mono text-xs shrink-0 ${isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#0c0d16] border-white/10 text-white'}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded font-black uppercase text-[10px] ${(runVerdict || submitVerdict).status === 'ACCEPTED' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                                            {(runVerdict || submitVerdict).status}
                                        </span>
                                        <span className="text-gray-400 text-[10px]">
                                            {(runVerdict || submitVerdict).testCasesPass} / {(runVerdict || submitVerdict).testCasesTotal} Tests Passed
                                        </span>
                                    </div>
                                    <button onClick={() => { setRunVerdict(null); setSubmitVerdict(null); }} className="text-gray-400 hover:text-gray-600">
                                        <X size={14} />
                                    </button>
                                </div>
                                <pre className={`text-[11px] font-mono whitespace-pre-wrap p-2 rounded-lg ${isLight ? 'bg-slate-100 text-slate-700' : 'bg-black/50 text-gray-300'}`}>
                                    {(runVerdict || submitVerdict).details || 'All test cases evaluated.'}
                                </pre>
                            </div>
                        )}
                    </div>
                </div>

                {/* Battle Focus Tab Departure Warning Modal */}
                <BattleFocusWarningModal
                    isOpen={showFocusWarningModal}
                    infractionCount={infractionCount}
                    battleType={`Hosted Room Combat (${roomCode})`}
                    onDismiss={dismissFocusWarning}
                />
            </div>
        );
    }

    // ── 15F: LOBBY VIEW (DEFAULT) ──────────────────────────────────────
    const participants = room.participants || [];

    return (
        <div className={`min-h-screen p-3 sm:p-6 md:p-12 font-sans flex flex-col justify-center items-center ${isLight ? 'bg-[#f8f9fc] text-slate-900' : 'bg-[#07080d] text-white'}`}>
            <div className="w-full max-w-5xl space-y-6 sm:space-y-8">
                {/* Header Card */}
                <div className={`p-5 sm:p-8 rounded-3xl sm:rounded-[2.5rem] border shadow-2xl relative overflow-hidden ${isLight ? 'bg-white border-slate-200' : 'bg-[#0c0d16] border-white/10'}`}>
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-400" />

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-2">
                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-bold tracking-wider uppercase ${
                                isLight 
                                    ? 'bg-purple-50 border-purple-200 text-purple-700' 
                                    : 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                            }`}>
                                <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
                                MULTI-USER LOBBY ACTIVE
                            </div>
                            <h1 className={`text-3xl md:text-4xl font-black uppercase tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>{room.title}</h1>
                            <p className="text-xs font-medium text-gray-500">
                                Capacity: {participants.length} / {room.capacity} Operators &bull; Format: Race Protocol &bull; Duration: {room.config?.durationMinutes || 30}m
                            </p>
                        </div>

                        {/* Room Code Badge */}
                        <div className={`p-4 rounded-2xl border flex flex-col items-center md:items-end gap-1.5 shrink-0 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'}`}>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">6-Character Access Token</span>
                            <div className="flex items-center gap-3">
                                <span className="text-3xl font-black text-purple-500 tracking-wider">{room.roomCode}</span>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(room.roomCode);
                                        setCopiedCode(true);
                                        setTimeout(() => setCopiedCode(false), 2000);
                                    }}
                                    className={`p-2 rounded-xl border transition-all ${
                                        isLight 
                                            ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900' 
                                            : 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300 hover:text-white'
                                    }`}
                                    title="Copy Room Token"
                                >
                                    {copiedCode ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                                </button>
                            </div>
                            {copiedCode && (
                                <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider">
                                    Copied to clipboard!
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Grid: Operator Registry & Problem Sequence */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Operator Registry (2 Cols) */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                                <Users size={16} className="text-purple-500" />
                                <span>Connected Operators ({participants.length}/{room.capacity})</span>
                            </h3>
                            {isHost && (
                                <span className="text-[10px] text-purple-500 font-bold">You are the Room Host</span>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {participants.map((p: any, idx: number) => {
                                const participantId = String(p.userId?._id || p.userId || '');
                                const isThisHost = participantId === String(room.hostId) || participantId === String(room.hostId?._id);
                                const isMe = participantId === String(currentUserId) || participantId === String(currentUserId?._id);
                                return (
                                    <div 
                                        key={participantId || idx} 
                                        className={`p-4 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                                            isLight 
                                                ? 'bg-white border-slate-200 hover:border-slate-300 shadow-sm' 
                                                : 'bg-[#0c0d16] border-white/10 hover:border-white/20'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-violet-500/20 border border-purple-500/30 flex items-center justify-center font-black text-sm text-purple-400 uppercase">
                                                {p.username?.[0]}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>{p.username}</span>
                                                    {isMe && <span className="text-[9px] text-gray-400 font-semibold">(You)</span>}
                                                </div>
                                                <span className="text-[9px] font-bold text-gray-500 block uppercase tracking-wider">
                                                    {isThisHost ? 'Host Operator' : 'Combatant'} &bull; {p.tier || 'BRONZE'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${p.isReady ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30' : 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30'}`}>
                                                {p.isReady ? 'READY' : 'PENDING'}
                                            </span>

                                            {/* Host Kick Button */}
                                            {isHost && !isThisHost && (
                                                <button
                                                    onClick={() => handleKick(participantId)}
                                                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-500 transition-colors"
                                                    title="Kick Operator"
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Lobby Action Controls */}
                        <div className={`p-6 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 ${
                            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-white/[0.02] border-white/10'
                        }`}>
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <button
                                    onClick={handleToggleReady}
                                    className={`w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${isMeReady ? 'bg-emerald-500 text-black border-emerald-400 shadow-lg' : isLight ? 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200' : 'bg-white/10 text-white border-white/20 hover:bg-white/15'}`}
                                >
                                    {isMeReady ? 'Ready & Locked' : 'Mark As Ready'}
                                </button>
                                <button
                                    onClick={handleLeaveRoom}
                                    className={`px-4 py-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${
                                        isLight 
                                             ? 'border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100' 
                                             : 'border-white/10 text-gray-400 hover:text-white'
                                     }`}
                                 >
                                     Leave Room
                                 </button>
                            </div>

                            {isHost && (
                                <button
                                    onClick={handleStartSession}
                                    disabled={participants.length < 1}
                                    className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 disabled:opacity-40 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(139,92,246,0.35)] transition-all"
                                >
                                    <Play size={16} />
                                    <span>Start Combat Session</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Problem Set Sequence (1 Col) */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2 px-2">
                            <Terminal size={16} className="text-cyan-500" />
                            <span>Race Sequence ({room.problemSet?.length || 0})</span>
                        </h3>

                        <div className="space-y-3">
                            {room.problemSet?.map((prob: any, idx: number) => (
                                <div 
                                    key={idx} 
                                    className={`p-4 rounded-2xl border space-y-1.5 ${
                                        isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0c0d16] border-white/10'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-purple-500">#0{idx + 1}</span>
                                        <span className={`text-[9px] font-bold uppercase tracking-wider ${prob.difficulty === 'HARD' ? 'text-red-500' : prob.difficulty === 'MEDIUM' ? 'text-yellow-500' : 'text-emerald-500'}`}>
                                            {prob.difficulty}
                                        </span>
                                    </div>
                                    <h4 className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>{prob.title}</h4>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-medium text-gray-500">{prob.category}</span>
                                        {prob.isCustom && (
                                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 text-[8px] font-bold tracking-wider">
                                                CUSTOM
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
