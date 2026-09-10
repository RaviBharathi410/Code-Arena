import React, { useEffect, useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { useMatch } from '../contexts/MatchContext';
import { useNav } from '../navigation/NavigationContext';
import {
    Zap, Terminal,
    Play, CheckCircle2
} from 'lucide-react';
import { ProblemPanel } from '../components/arena/ProblemPanel';
import { AnalysisPanel } from '../components/arena/AnalysisPanel';
import { Countdown } from '../components/arena/Countdown';
import { ResultOverlay } from '../components/arena/ResultOverlay';
import { NeonButton } from '../components/ui/NeonButton';
import { GlassCard } from '../components/ui/GlassCard';
import { ChevronLeft, ChevronRight as ChevronRightIcon, ChevronDown, Layout, Columns, Wand2, Copy, Check, AlertTriangle, LogOut } from 'lucide-react';
import type { User } from '../types';
import { VoiceWorkspaceModal } from '../components/arena/VoiceWorkspaceModal';
import { BattleFocusWarningModal } from '../components/arena/BattleFocusWarningModal';
import { useSocket } from '../hooks/useSocket';
import { useBattleFocusWarning } from '../hooks/useBattleFocusWarning';
import { useLayout } from '../contexts/LayoutContext';

export const BattleArena: React.FC<{ currentUser: User }> = ({ currentUser }) => {
    const { isLight } = useLayout();
    const { state, setReady, runCode, submitCode, sendTyping, reset, joinById } = useMatch();
    const { goToDashboard, params } = useNav();
    const { connected: isSocketConnected } = useSocket();

    const opponent = state.players.find(p => p.id !== currentUser.id);

    const [code, setCode] = useState('');
    const [language, setLang] = useState('js');
    const [showLangDropdown, setShowLangDropdown] = useState(false);
    const langDropdownRef = useRef<HTMLDivElement>(null);
    const [showCountdown, setShowCountdown] = useState(false);
    const [timeLeft, setTimeLeft] = useState(600);
    const [isRunningCode, setIsRunningCode] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [executionError, setExecutionError] = useState<string | null>(null);
    const [showProblem, setShowProblem] = useState(true);
    const [showAnalysis, setShowAnalysis] = useState(true);
    const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
    const [copiedCode, setCopiedCode] = useState(false);
    const [showAbandonModal, setShowAbandonModal] = useState(false);
    const [mobileTab, setMobileTab] = useState<'problem' | 'code' | 'rival' | 'output'>('code');

    // Auto-switch to output tab on mobile when verdict or execution error arrives
    useEffect(() => {
        if (state.verdict || state.runVerdict || executionError) {
            if (window.innerWidth < 768) {
                setMobileTab('output');
            }
        }
    }, [state.verdict, state.runVerdict, executionError]);

    const LANGUAGE_OPTIONS = [
        { id: 'js', label: 'JavaScript' },
        { id: 'py', label: 'Python' },
        { id: 'java', label: 'Java' },
        { id: 'cpp', label: 'C++' },
        { id: 'c', label: 'C' },
    ];

    // Close language dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
                setShowLangDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const [editorSettings, setEditorSettings] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('arena_settings_editor') || '{}');
        } catch {
            return {};
        }
    });

    useEffect(() => {
        const handleSettingsUpdate = () => {
            try {
                setEditorSettings(JSON.parse(localStorage.getItem('arena_settings_editor') || '{}'));
            } catch { }
        };
        window.addEventListener('arena-settings-updated', handleSettingsUpdate);
        return () => window.removeEventListener('arena-settings-updated', handleSettingsUpdate);
    }, []);

    // Monitor tab departures, focus breaches, and beforeunload during active battle
    const isBattleActive = state.status === 'active' && !state.result;
    const {
        infractionCount,
        showWarningModal: showFocusWarningModal,
        dismissWarning: dismissFocusWarning,
    } = useBattleFocusWarning({
        isActive: isBattleActive,
        battleType: state.matchType === 'quick' ? 'Quick Match' : 'Ranked 1v1 Arena',
    });

    const handleAbandonMatch = () => {
        if (state.status === 'active' && !state.result) {
            setShowAbandonModal(true);
            return;
        }
        confirmAbandonAndExit();
    };

    const confirmAbandonAndExit = () => {
        setShowAbandonModal(false);
        reset();
        goToDashboard();
    };

    // Auto-join room by matchId if navigated directly or reloaded
    const matchId = params?.matchId;
    useEffect(() => {
        if (matchId && matchId !== 'new' && (!state.roomId || state.roomId !== matchId)) {
            joinById(matchId);
        }
    }, [matchId, state.roomId, joinById]);

    // Reset loading state when run verdict arrives
    useEffect(() => {
        if (state.runVerdict) {
            setIsRunningCode(false);
            setExecutionError(null);
        }
    }, [state.runVerdict]);

    // Reset loading state when submission verdict arrives
    useEffect(() => {
        if (state.verdict) {
            setIsSubmitting(false);
            setExecutionError(null);
        }
    }, [state.verdict]);

    // Reset loading on error
    useEffect(() => {
        if (state.error) {
            setIsRunningCode(false);
            setIsSubmitting(false);
            setExecutionError(state.error);
        }
    }, [state.error]);

    // Handle mid-action socket disconnect
    useEffect(() => {
        if (!isSocketConnected) {
            if (isRunningCode) {
                setIsRunningCode(false);
                setExecutionError('Connection lost mid-run. Tactical uplink disconnected.');
            }
            if (isSubmitting) {
                setIsSubmitting(false);
                setExecutionError('Connection lost during submission. Tactical uplink disconnected.');
            }
        }
    }, [isSocketConnected, isRunningCode, isSubmitting]);

    const handleRunTests = () => {
        if (isRunningCode || isSubmitting) return;
        if (!isSocketConnected) {
            setExecutionError('Cannot execute: Uplink socket not connected. Re-authenticating...');
            return;
        }

        setIsRunningCode(true);
        setExecutionError(null);
        runCode(code, language);

        // 15s timeout fallback
        setTimeout(() => {
            setIsRunningCode(prev => {
                if (prev) setExecutionError('Run execution timed out. Judge engine did not respond within 15s.');
                return false;
            });
        }, 15000);
    };

    const handleSubmitSequence = () => {
        if (isRunningCode || isSubmitting) return;
        if (!isSocketConnected) {
            setExecutionError('Cannot submit: Uplink socket not connected. Re-authenticating...');
            return;
        }

        setIsSubmitting(true);
        setExecutionError(null);
        submitCode(code, language);

        // 20s timeout fallback
        setTimeout(() => {
            setIsSubmitting(prev => {
                if (prev) setExecutionError('Submission timed out. Judge engine did not respond within 20s.');
                return false;
            });
        }, 20000);
    };

    // Initial code setup when problem loads (supporting LeetCode arrays and dict formats)
    useEffect(() => {
        if (!state.problem) return;
        const bp = state.problem.boilerplate;
        if (!bp) return;

        let template = '';
        if (Array.isArray(bp)) {
            const snippet = bp.find((s: any) =>
                s.langSlug === language ||
                (language === 'js' && (s.langSlug === 'javascript' || s.langSlug === 'js')) ||
                (language === 'py' && (s.langSlug === 'python3' || s.langSlug === 'python' || s.langSlug === 'py')) ||
                (language === 'cpp' && (s.langSlug === 'cpp' || s.langSlug === 'c++')) ||
                (language === 'java' && s.langSlug === 'java')
            );
            if (snippet) template = snippet.code;
        } else if (typeof bp === 'object') {
            template = bp[language] || bp[language === 'js' ? 'javascript' : language === 'py' ? 'python' : language] || '';
        }

        if (template) {
            setCode(template);
        } else if (!code) {
            if (language === 'py') setCode('class Solution:\n    def solve(self):\n        pass\n');
            else if (language === 'cpp') setCode('#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}\n');
            else if (language === 'java') setCode('public class Solution {\n    public static void main(String[] args) {\n    }\n}\n');
            else setCode('function solution() {\n    // Write your solution here\n}\n');
        }
    }, [state.problem, language]);

    // Handle Countdown trigger
    useEffect(() => {
        if (state.status === 'active' && state.startedAt) {
            setShowCountdown(true);
        }
    }, [state.status, state.startedAt]);

    // Server-authoritative timer logic
    useEffect(() => {
        if (state.status === 'active' && !showCountdown) {
            const updateTimer = () => {
                if (state.startedAt && state.durationMs) {
                    const elapsed = Date.now() - new Date(state.startedAt).getTime();
                    const remaining = Math.max(0, Math.floor((state.durationMs - elapsed) / 1000));
                    setTimeLeft(remaining);
                } else {
                    setTimeLeft(prev => Math.max(0, prev - 1));
                }
            };
            updateTimer();
            const timer = setInterval(updateTimer, 1000);
            return () => clearInterval(timer);
        }
    }, [state.status, state.startedAt, state.durationMs, showCountdown]);

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const handleEditorChange = (val: string | undefined) => {
        const newCode = val || '';
        setCode(newCode);
        sendTyping(newCode.split('\n').length);
    };

    const handleAddGeneratedCode = (generatedCode: string) => {
        setCode(prev => prev ? prev + '\n' + generatedCode : generatedCode);
    };

    // Diagnostic Buffer renderer for both desktop popup & mobile full tab
    const renderDiagnosticContent = () => {
        const activeVerdict = state.verdict || state.runVerdict;
        if (!activeVerdict && !executionError) {
            return (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400">
                        <Terminal size={22} />
                    </div>
                    <div className="space-y-1">
                        <h4 className="text-xs font-black uppercase tracking-wider text-gray-300">No Execution Logs</h4>
                        <p className="text-[11px] text-gray-500 max-w-xs">
                            Execute "Run Tests" or "Submit Sequence" to evaluate your solution against test cases.
                        </p>
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <div className="flex items-center gap-2">
                        <Terminal size={14} className="text-accent-secondary" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Diagnostic Buffer</span>
                    </div>
                    {executionError ? (
                        <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                            SYSTEM ALERT
                        </span>
                    ) : activeVerdict && (
                        <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded border ${
                            activeVerdict.status === 'ACCEPTED'
                                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                : activeVerdict.status === 'COMPILATION_ERROR'
                                    ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                                    : 'bg-red-500/20 text-red-400 border-red-500/30'
                        }`}>
                            {activeVerdict.status}
                        </span>
                    )}
                </div>

                {/* Execution Error / Timeout / Disconnect */}
                {executionError && (
                    <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 font-mono text-xs flex items-center justify-between">
                        <span>⚠️ {executionError}</span>
                        <button
                            onClick={() => setExecutionError(null)}
                            className="text-gray-400 hover:text-white text-[10px] uppercase font-bold"
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                {/* Compilation Output if any */}
                {activeVerdict?.compile_output && (
                    <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/30 space-y-2">
                        <div className="text-red-400 font-bold uppercase text-[10px] tracking-widest">
                            Compilation Error ({language.toUpperCase()})
                        </div>
                        <pre className="p-3 bg-black/60 text-red-300 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap font-mono">
                            {activeVerdict.compile_output}
                        </pre>
                    </div>
                )}

                <div className="space-y-3 font-mono text-xs">
                    {activeVerdict?.results?.map((res: any, i: number) => (
                        <div key={i} className={`p-3 rounded-xl border flex flex-col gap-2 ${res.passed ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-400 font-bold">TestCase #{i + 1} {res.is_hidden ? '(Hidden)' : ''}</span>
                                <span className={res.passed ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                                    {res.passed ? 'PASSED' : res.status || 'FAILED'}
                                </span>
                            </div>
                            {res.input && (
                                <div>
                                    <span className="text-gray-500 text-[10px] block">Input</span>
                                    <pre className="p-2 bg-black/50 text-gray-300 rounded font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">{res.input}</pre>
                                </div>
                            )}
                            {res.expected && (
                                <div>
                                    <span className="text-gray-500 text-[10px] block">Expected</span>
                                    <pre className="p-2 bg-black/50 text-gray-300 rounded font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">{res.expected}</pre>
                                </div>
                            )}
                            {res.stdout && (
                                <div className="mt-1">
                                    <span className="text-gray-500 text-[10px] block">Output</span>
                                    <pre className="p-2 bg-black/50 text-gray-300 rounded font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">{res.stdout}</pre>
                                </div>
                            )}
                            {res.stderr && (
                                <div className="mt-1">
                                    <span className="text-red-400 text-[10px] block">Error</span>
                                    <pre className="p-2 bg-red-950/40 text-red-300 rounded font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">{res.stderr}</pre>
                                </div>
                            )}
                        </div>
                    ))}
                    {activeVerdict?.stdout && (
                        <div className="p-3 rounded-xl bg-white/2 border border-white/5">
                            <span className="text-gray-500 text-[10px] block mb-2">Standard Output</span>
                            <pre className="text-gray-400 p-2 rounded-xl border border-white/10 whitespace-pre-wrap font-mono text-xs">{activeVerdict.stdout}</pre>
                        </div>
                    )}
                    {activeVerdict?.stderr && (
                        <div className="p-3 rounded-xl bg-red-900/20 border border-red-500/20">
                            <span className="text-red-400 text-[10px] block mb-2">Standard Error</span>
                            <pre className="text-red-400 whitespace-pre-wrap font-mono text-xs">{activeVerdict.stderr}</pre>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (state.status === 'idle' || state.status === 'waiting') {
        return (
            <div className={`min-h-screen sm:h-screen ${isLight ? 'bg-[#f8f9fc] text-black' : 'bg-[#020202] text-white'} flex flex-col items-center justify-center p-3 sm:p-6 font-sans overflow-y-auto`}>
                <GlassCard className={`max-w-2xl w-full p-6 sm:p-10 md:p-12 relative overflow-hidden my-auto ${isLight ? 'bg-white border-black/10 text-black shadow-2xl' : 'border-white/10'}`}>
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-accent-secondary to-transparent" />

                    <div className="flex flex-col items-center text-center space-y-6 sm:space-y-10">
                        <div className="space-y-3 sm:space-y-4">
                            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter uppercase italic">Combat Waiting Room</h1>
                            <div className="flex items-center gap-2 sm:gap-3 justify-center flex-wrap">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Room Code:</span>
                                <span className="text-xl sm:text-2xl font-mono text-accent-secondary tracking-widest">{state.roomCode || 'XXXXXX'}</span>
                                {state.roomCode && (
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(state.roomCode || '');
                                            setCopiedCode(true);
                                            setTimeout(() => setCopiedCode(false), 2000);
                                        }}
                                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-all ml-1"
                                        title="Copy Room Code"
                                    >
                                        {copiedCode ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                    </button>
                                )}
                            </div>
                            {copiedCode && (
                                <p className="text-[10px] font-mono text-green-400 uppercase tracking-widest">
                                    Access token copied to clipboard
                                </p>
                            )}
                        </div>

                        {state.error && (
                            <div className="w-full p-3 sm:p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-between text-left">
                                <div className="flex items-center gap-2 sm:gap-3 text-red-400">
                                    <AlertTriangle size={18} className="shrink-0" />
                                    <span className="text-xs font-mono">{state.error}</span>
                                </div>
                                <button
                                    onClick={handleAbandonMatch}
                                    className="text-[10px] font-mono text-red-300 underline uppercase tracking-wider hover:text-white shrink-0 ml-2"
                                >
                                    Exit
                                </button>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 w-full max-w-4xl pt-2 sm:pt-6">
                            {/* Left: Player List */}
                            <div className="space-y-4 sm:space-y-6 text-left">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 border-b border-white/10 pb-3">Operator Registry</h3>
                                <div className="space-y-2.5 sm:space-y-3">
                                    {state.players.length === 0 && (
                                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 animate-pulse">
                                            <div className="w-10 h-10 rounded-xl bg-white/10" />
                                            <div className="space-y-2">
                                                <div className="w-24 h-2 bg-white/10 rounded" />
                                                <div className="w-16 h-1 bg-white/10 rounded" />
                                            </div>
                                        </div>
                                    )}
                                    {state.players.map((p, i) => (
                                        <div key={p.id} className="flex items-center justify-between p-3 sm:p-4 rounded-2xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-all">
                                            <div className="flex items-center gap-3 sm:gap-4">
                                                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black text-xs ${p.id === currentUser.id ? 'bg-accent-secondary text-white' : 'bg-white/10 text-gray-400'}`}>
                                                    {p.username?.[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black uppercase tracking-widest">{p.username}</p>
                                                    <p className="text-[8px] font-bold text-gray-500 uppercase">
                                                        {i === 0 ? (p.id === currentUser.id ? 'You (Host)' : 'Host') : (p.id === currentUser.id ? 'You (Rival)' : 'Rival Combatant')}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {i < 2 ? (
                                                    <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${state.myReady && p.id === currentUser.id || (p.id !== currentUser.id && state.opponentReady) ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                                                        {state.myReady && p.id === currentUser.id || (p.id !== currentUser.id && state.opponentReady) ? 'Ready' : 'Pending'}
                                                    </div>
                                                ) : (
                                                    <div className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-blue-500/20 text-blue-500">
                                                        Spectator
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Right: Tactical Actions */}
                            <div className="flex flex-col gap-4 sm:gap-6 justify-center">
                                <div className={`p-6 sm:p-8 rounded-3xl border-2 flex flex-col items-center gap-4 sm:gap-6 transition-all ${state.myReady ? 'border-green-500 bg-green-500/5' : 'border-white/10 bg-white/2'}`}>
                                    <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center ${state.myReady ? 'text-green-500' : 'text-gray-500'}`}>
                                        {state.myReady ? <CheckCircle2 size={42} /> : <Zap size={42} />}
                                    </div>

                                    {!state.myReady ? (
                                        <NeonButton onClick={() => setReady()} size="lg" className="w-full h-14 sm:h-16 text-xs font-black tracking-[0.3em] uppercase">
                                            Initiate Uplink
                                        </NeonButton>
                                    ) : (
                                        <div className="text-center space-y-2">
                                            <p className="text-sm font-black text-green-500 uppercase tracking-widest">Protocol Engaged</p>
                                            <p className="text-[10px] text-gray-500 uppercase font-bold">Awaiting neural lock from rivals</p>
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 sm:p-6 rounded-3xl border border-white/5 bg-white/2 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Sector Mode</span>
                                        <span className="text-[10px] font-black text-accent-secondary uppercase tracking-widest">1v1 Combat</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Participants</span>
                                        <span className="text-[10px] font-black text-white uppercase tracking-widest">{state.players.length} / 2</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button onClick={handleAbandonMatch} className="text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-white transition-colors cursor-pointer pt-2">
                            Abandon Mission
                        </button>
                    </div>
                </GlassCard>
            </div>
        );
    }

    return (
        <div className={`h-screen ${isLight ? 'bg-[#f8f9fc] text-black' : 'bg-[#020202] text-white'} flex flex-col font-sans selection:bg-white selection:text-black overflow-hidden`}>
            {showCountdown && <Countdown onComplete={() => setShowCountdown(false)} />}
            {state.result && <ResultOverlay result={state.result} currentUser={currentUser} onClose={() => { reset(); goToDashboard(); }} />}

            {/* Header: Tactical HUD */}
            <header className={`px-3 sm:px-6 h-14 sm:h-16 border-b flex items-center justify-between backdrop-blur-xl z-20 gap-2 sm:gap-6 min-w-0 ${
                isLight ? 'bg-white/90 border-black/10 text-black' : 'bg-black/80 border-white/5 text-white'
            }`}>
                <div className="flex items-center gap-2 sm:gap-6 min-w-0 flex-1 justify-start">
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-accent-secondary/10 flex items-center justify-center text-accent-secondary border border-accent-secondary/20">
                            <Terminal size={14} className="sm:w-4 sm:h-4" />
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest leading-none block">
                                <span className="sm:hidden">Arena</span>
                                <span className="hidden sm:inline">CodeArena_Arena</span>
                            </span>
                            <span className="text-[8px] font-bold text-gray-500 uppercase tracking-tighter leading-none mt-1 hidden xs:block">
                                Sektor_01 // Node_V7
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={handleAbandonMatch}
                        className={`px-2.5 sm:px-3 py-1.5 rounded-xl border text-[9px] font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 ${isLight
                                ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                            }`}
                        title="Forfeit and exit battle"
                    >
                        <LogOut size={12} />
                        <span className="hidden sm:inline">Abandon</span>
                    </button>

                    {infractionCount > 0 && (
                        <div
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-400 text-[10px] font-mono font-extrabold animate-pulse shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                            title="Focus departures recorded during this battle"
                        >
                            <AlertTriangle size={12} />
                            <span>Breaches: {infractionCount}</span>
                        </div>
                    )}
                </div>

                {/* Central Status: Timer & Mode */}
                <div className="flex items-center justify-center shrink-0">
                    <div className="flex flex-col items-center px-2 sm:px-4 py-1">
                        <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-gray-500 leading-none">Clock</span>
                        <span className={`text-xl sm:text-3xl font-black font-mono tracking-tighter mt-1 leading-none ${timeLeft > 120
                                ? (isLight ? 'text-black' : 'text-white')
                                : timeLeft >= 60
                                    ? 'text-amber-400'
                                    : 'text-red-500 animate-pulse'
                            }`}>{formatTime(timeLeft)}</span>
                    </div>
                </div>

                {/* Right: Actions & Tools (Desktop only in header; on mobile placed in bottom sticky tray) */}
                <div className="hidden md:flex items-center gap-3 sm:gap-6 min-w-0 flex-1 justify-end shrink-0">
                    <div className="flex items-center gap-3 shrink-0">
                        <button
                            onClick={() => setIsVoiceModalOpen(true)}
                            className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border transition-all bg-accent-secondary/10 border-accent-secondary/30 text-accent-secondary hover:bg-accent-secondary/20 flex items-center gap-2 font-black uppercase tracking-widest text-[10px] shrink-0"
                            title="Open Neural Voice Engine"
                        >
                            <Wand2 size={14} />
                            <span className="hidden sm:inline">Voice Coder</span>
                        </button>
                    </div>

                    <div className="h-6 sm:h-8 w-[1px] bg-white/5 hidden sm:block shrink-0" />

                    <div className="flex gap-2 shrink-0">
                        <button
                            onClick={handleRunTests}
                            disabled={isRunningCode || isSubmitting}
                            className="px-4 sm:px-6 py-2 sm:py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black uppercase tracking-widest text-[10px] rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                        >
                            {isRunningCode ? (
                                <>
                                    <Play size={14} className="animate-spin text-yellow-400" />
                                    <span className="hidden sm:inline">Running Tests...</span>
                                </>
                            ) : (
                                <>
                                    <Play size={14} />
                                    <span className="hidden sm:inline">Run Tests</span>
                                </>
                            )}
                        </button>
                        <button
                            onClick={handleSubmitSequence}
                            disabled={isRunningCode || isSubmitting}
                            className="px-5 sm:px-8 py-2 sm:py-2.5 bg-accent-secondary hover:bg-accent-secondary/90 text-white font-black uppercase tracking-widest text-[10px] rounded-xl transition-all flex items-center gap-2 shadow-[0_0_30px_rgba(139,92,246,0.3)] disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                        >
                            {isSubmitting ? (
                                <>
                                    <Zap size={14} className="animate-spin" fill="currentColor" />
                                    <span>Submitting...</span>
                                </>
                            ) : (
                                <>
                                    <Zap size={14} fill="currentColor" />
                                    <span>Submit Sequence</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile Segmented Tab Bar (Visible < md) */}
            <div className={`md:hidden flex items-center justify-between border-b shrink-0 h-10 px-1 text-xs select-none ${
                isLight ? 'bg-white border-slate-200' : 'bg-[#0d0e14] border-white/10'
            }`}>
                <button
                    onClick={() => setMobileTab('problem')}
                    className={`flex-1 py-2 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-all border-b-2 ${
                        mobileTab === 'problem'
                            ? (isLight ? 'border-purple-600 text-purple-700 bg-purple-50/50' : 'border-accent-secondary text-white bg-white/5')
                            : (isLight ? 'border-transparent text-slate-500' : 'border-transparent text-gray-400')
                    }`}
                >
                    <Layout size={12} />
                    <span>Problem</span>
                </button>
                <button
                    onClick={() => setMobileTab('code')}
                    className={`flex-1 py-2 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-all border-b-2 ${
                        mobileTab === 'code'
                            ? (isLight ? 'border-purple-600 text-purple-700 bg-purple-50/50' : 'border-accent-secondary text-white bg-white/5')
                            : (isLight ? 'border-transparent text-slate-500' : 'border-transparent text-gray-400')
                    }`}
                >
                    <Terminal size={12} />
                    <span>Editor</span>
                </button>
                <button
                    onClick={() => setMobileTab('rival')}
                    className={`flex-1 py-2 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-all border-b-2 ${
                        mobileTab === 'rival'
                            ? (isLight ? 'border-purple-600 text-purple-700 bg-purple-50/50' : 'border-accent-secondary text-white bg-white/5')
                            : (isLight ? 'border-transparent text-slate-500' : 'border-transparent text-gray-400')
                    }`}
                >
                    <Columns size={12} />
                    <span>Rival</span>
                </button>
                <button
                    onClick={() => setMobileTab('output')}
                    className={`flex-1 py-2 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-all border-b-2 relative ${
                        mobileTab === 'output'
                            ? (isLight ? 'border-purple-600 text-purple-700 bg-purple-50/50' : 'border-accent-secondary text-white bg-white/5')
                            : (isLight ? 'border-transparent text-slate-500' : 'border-transparent text-gray-400')
                    }`}
                >
                    <Zap size={12} />
                    <span>Output</span>
                    {(state.verdict || state.runVerdict || executionError) && (
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-secondary animate-pulse" />
                    )}
                </button>
            </div>

            {/* Mobile Tabbed Workspace View Container (< md) */}
            <div className="md:hidden flex-1 flex flex-col min-h-0 relative overflow-hidden">
                {mobileTab === 'problem' && (
                    <div className="flex-1 h-full overflow-y-auto">
                        <ProblemPanel problem={state.problem} />
                    </div>
                )}

                {mobileTab === 'code' && (
                    <section className={`flex-1 flex flex-col relative h-full min-h-0 ${isLight ? 'bg-slate-50' : 'bg-black'}`}>
                        {/* Floating Language Dropdown on mobile editor */}
                        <div className="absolute top-3 left-3 z-30 flex gap-2" ref={langDropdownRef}>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setShowLangDropdown(prev => !prev)}
                                    className={`border rounded-lg px-2.5 py-1 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 cursor-pointer transition-all ${isLight
                                            ? 'bg-white border-slate-300 text-purple-600 shadow-sm'
                                            : 'bg-black border-white/20 text-accent-secondary shadow-xl'
                                        }`}
                                    style={{ backgroundColor: isLight ? '#ffffff' : '#000000' }}
                                >
                                    <span>{LANGUAGE_OPTIONS.find(l => l.id === language)?.label || 'JavaScript'}</span>
                                    <ChevronDown size={11} className={`transition-transform duration-200 ${showLangDropdown ? 'rotate-180' : ''}`} />
                                </button>

                                {showLangDropdown && (
                                    <div
                                        className={`absolute top-full mt-1 left-0 w-32 py-1 rounded-xl border shadow-2xl z-50 overflow-hidden ${isLight ? 'bg-white border-slate-200' : 'bg-black border-white/20'
                                            }`}
                                        style={{ backgroundColor: isLight ? '#ffffff' : '#000000' }}
                                    >
                                        {LANGUAGE_OPTIONS.map((opt) => (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => {
                                                    setLang(opt.id);
                                                    setShowLangDropdown(false);
                                                }}
                                                className={`w-full px-3 py-1.5 text-left text-[9px] font-black uppercase tracking-wider flex items-center justify-between transition-colors ${language === opt.id
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
                        </div>

                        <div className="flex-1 min-h-0 h-full">
                            <Editor
                                height="100%"
                                language={language === 'js' ? 'javascript' : language === 'py' ? 'python' : language === 'c' ? 'c' : language}
                                theme={isLight ? "vs" : "vs-dark"}
                                value={code}
                                onChange={handleEditorChange}
                                options={{
                                    fontSize: 13,
                                    tabSize: 2,
                                    minimap: { enabled: false },
                                    lineNumbers: 'on',
                                    padding: { top: 48, bottom: 20 },
                                    backgroundColor: isLight ? '#ffffff' : '#000000',
                                    lineNumbersMinChars: 2,
                                    automaticLayout: true,
                                    scrollBeyondLastLine: false,
                                }}
                            />
                        </div>
                    </section>
                )}

                {mobileTab === 'rival' && (
                    <div className="flex-1 h-full overflow-y-auto">
                        <AnalysisPanel />
                    </div>
                )}

                {mobileTab === 'output' && (
                    <div className="flex-1 h-full overflow-y-auto p-4 custom-scrollbar bg-black/90">
                        {renderDiagnosticContent()}
                    </div>
                )}
            </div>

            {/* Mobile Sticky Bottom Action Bar (< md) */}
            <div className={`md:hidden border-t px-3 py-2 flex items-center gap-2 z-30 shrink-0 ${
                isLight ? 'bg-white/95 border-slate-200 backdrop-blur-md' : 'bg-black/95 border-white/10 backdrop-blur-md'
            }`}>
                <button
                    onClick={() => setIsVoiceModalOpen(true)}
                    className="p-2.5 rounded-xl border border-accent-secondary/30 bg-accent-secondary/10 text-accent-secondary shrink-0"
                    title="Neural Voice Coder"
                >
                    <Wand2 size={16} />
                </button>
                <button
                    onClick={handleRunTests}
                    disabled={isRunningCode || isSubmitting}
                    className="flex-1 py-2.5 px-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black uppercase tracking-wider text-[11px] rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                    <Play size={13} className={isRunningCode ? 'animate-spin text-yellow-400' : ''} />
                    <span>{isRunningCode ? 'Testing...' : 'Run Tests'}</span>
                </button>
                <button
                    onClick={handleSubmitSequence}
                    disabled={isRunningCode || isSubmitting}
                    className="flex-1 py-2.5 px-3 bg-accent-secondary hover:bg-accent-secondary/90 text-white font-black uppercase tracking-wider text-[11px] rounded-xl flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(139,92,246,0.3)] disabled:opacity-50"
                >
                    <Zap size={13} fill="currentColor" className={isSubmitting ? 'animate-spin' : ''} />
                    <span>{isSubmitting ? 'Submitting...' : 'Submit'}</span>
                </button>
            </div>

            {/* Main Battle Space (Desktop view: hidden md:grid) */}
            <main className={`hidden md:grid flex-1 overflow-hidden transition-all duration-500`} style={{
                gridTemplateColumns: `${showProblem ? '450px' : '60px'} 1fr ${showAnalysis ? '384px' : '60px'}`
            }}>
                <div className="relative group overflow-hidden border-r border-white/5">
                    <button
                        onClick={() => setShowProblem(!showProblem)}
                        className="absolute top-4 right-2 z-[30] p-1.5 rounded-lg bg-black/40 border border-white/10 text-gray-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                    >
                        {showProblem ? <ChevronLeft size={16} /> : <ChevronRightIcon size={16} />}
                    </button>
                    <div className={`h-full transition-all duration-500 ${showProblem ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                        <ProblemPanel problem={state.problem} />
                    </div>
                    {!showProblem && (
                        <div className="absolute inset-0 flex flex-col items-center pt-20 gap-8 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setShowProblem(true)}>
                            <Layout size={20} className="text-gray-700" />
                            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-gray-700 [writing-mode:vertical-lr] rotate-180">Objectives</span>
                        </div>
                    )}
                </div>

                <section className={`flex flex-col relative ${isLight ? 'bg-slate-50' : 'bg-black'}`}>
                    <div className="absolute top-4 left-6 z-30 flex gap-4" ref={langDropdownRef}>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowLangDropdown(prev => !prev)}
                                className={`border rounded-lg px-3.5 py-1.5 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 cursor-pointer transition-all ${isLight
                                        ? 'bg-white border-slate-300 text-purple-600 shadow-sm hover:border-purple-400'
                                        : 'bg-black border-white/20 text-accent-secondary shadow-xl hover:border-accent-secondary/60'
                                    }`}
                                style={{ backgroundColor: isLight ? '#ffffff' : '#000000' }}
                            >
                                <span>{LANGUAGE_OPTIONS.find(l => l.id === language)?.label || 'JavaScript'}</span>
                                <ChevronDown size={12} className={`transition-transform duration-200 ${showLangDropdown ? 'rotate-180' : ''}`} />
                            </button>

                            {showLangDropdown && (
                                <div
                                    className={`absolute top-full mt-2 left-0 w-36 py-1.5 rounded-xl border shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 overflow-hidden ${isLight ? 'bg-white border-slate-200' : 'bg-black border-white/20'
                                        }`}
                                    style={{ backgroundColor: isLight ? '#ffffff' : '#000000' }}
                                >
                                    {LANGUAGE_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => {
                                                setLang(opt.id);
                                                setShowLangDropdown(false);
                                            }}
                                            className={`w-full px-3.5 py-2 text-left text-[10px] font-black uppercase tracking-wider flex items-center justify-between transition-colors ${language === opt.id
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
                    </div>

                    <div className="flex-1 min-h-0">
                        <Editor
                            height="100%"
                            language={language === 'js' ? 'javascript' : language === 'py' ? 'python' : language === 'c' ? 'c' : language}
                            theme={isLight ? "vs" : "vs-dark"}
                            value={code}
                            onChange={handleEditorChange}
                            options={{
                                fontSize: editorSettings.fontSize || 15,
                                tabSize: editorSettings.tabSize || 4,
                                minimap: { enabled: editorSettings.minimap || false },
                                lineNumbers: editorSettings.lineNumbers === false ? 'off' : 'on',
                                padding: { top: 60, bottom: 20 },
                                backgroundColor: isLight ? '#ffffff' : '#000000',
                                fontFamily: editorSettings.typeface === 'fira' ? "'Fira Code', monospace" : editorSettings.typeface === 'inter' ? "'Inter', sans-serif" : "'JetBrains Mono', monospace",
                                lineNumbersMinChars: 3,
                                cursorSmoothCaretAnimation: 'on',
                                smoothScrolling: true,
                                scrollBeyondLastLine: false,
                            }}
                        />
                    </div>

                    {/* Quick Output Buffer (Desktop overlay) */}
                    {(state.verdict || state.runVerdict || executionError) && (
                        <div className="absolute bottom-6 left-6 right-6 p-6 rounded-3xl bg-black/90 backdrop-blur-xl border border-white/10 max-h-[300px] overflow-y-auto custom-scrollbar animate-in slide-in-from-bottom-5 duration-500 shadow-2xl z-20">
                            {renderDiagnosticContent()}
                        </div>
                    )}
                </section>

                <div className="relative group overflow-hidden border-l border-white/5">
                    <button
                        onClick={() => setShowAnalysis(!showAnalysis)}
                        className="absolute top-4 left-2 z-[30] p-1.5 rounded-lg bg-black/40 border border-white/10 text-gray-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                    >
                        {showAnalysis ? <ChevronRightIcon size={16} /> : <ChevronLeft size={16} />}
                    </button>
                    <div className={`h-full transition-all duration-500 ${showAnalysis ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                        <AnalysisPanel />
                    </div>
                    {!showAnalysis && (
                        <div className="absolute inset-0 flex flex-col items-center pt-20 gap-8 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setShowAnalysis(true)}>
                            <Columns size={20} className="text-gray-700" />
                            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-gray-700 [writing-mode:vertical-lr]">Intel_Hub</span>
                        </div>
                    )}
                </div>
            </main>

            <VoiceWorkspaceModal
                isOpen={isVoiceModalOpen}
                onClose={() => setIsVoiceModalOpen(false)}
                currentLanguage={language}
                onAddCode={handleAddGeneratedCode}
            />

            {/* Abandon Battle Warning Confirmation Modal */}
            {showAbandonModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="relative w-full max-w-md bg-[#0c0d16] border border-rose-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(244,63,94,0.25)] text-center space-y-6">
                        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
                            <AlertTriangle size={32} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-lg font-black uppercase tracking-wider text-white">
                                Forfeit Active Combat?
                            </h3>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                WARNING: Ranked combat is currently active! Abandoning now will count as an immediate forfeit, surrender the win to your opponent, and reduce your Rank Rating (RP).
                            </p>
                        </div>
                        <div className="flex gap-3 justify-center pt-2">
                            <button
                                onClick={() => setShowAbandonModal(false)}
                                className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono font-bold uppercase tracking-wider text-zinc-300 hover:text-white transition-all"
                            >
                                Resume Combat
                            </button>
                            <button
                                onClick={confirmAbandonAndExit}
                                className="flex-1 px-4 py-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-xs font-mono font-bold uppercase tracking-wider text-rose-300 hover:text-rose-100 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(244,63,94,0.3)]"
                            >
                                <LogOut size={14} />
                                Forfeit & Exit
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Battle Focus Tab Departure Warning Modal */}
            <BattleFocusWarningModal
                isOpen={showFocusWarningModal}
                infractionCount={infractionCount}
                battleType={state.matchType === 'quick' ? 'Quick Match' : 'Ranked 1v1 Arena'}
                onDismiss={dismissFocusWarning}
            />
        </div>
    );
};
