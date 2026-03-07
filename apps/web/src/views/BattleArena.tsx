import React, { useEffect, useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { useMatch } from '../contexts/MatchContext';
import { useVoiceToCode } from '../hooks/useVoiceToCode';
import { useNav } from '../navigation/NavigationContext';
import { Trophy, Zap, Mic, ChevronRight, Activity, Sword, Target, FileText, Code2, BrainCircuit, X, Shield } from 'lucide-react';
import { NeonButton } from '../components/ui/NeonButton';
import { GlassCard } from '../components/ui/GlassCard';
import { VoiceVisualizer } from '../components/ui/VoiceVisualizer';
import { gsap } from 'gsap';
import './BattleArena.css';

// Pseudo-analysis function for demo purposes
const analyzeComplexity = (code: string) => {
    const hasNestedLoops = /for.*\{[\s\S]*for/.test(code) || /while.*\{[\s\S]*while/.test(code);
    const hasSingleLoop = /for.*\{/.test(code) || /while.*\{/.test(code);
    const hasRecursion = new RegExp(`${'function\\s+(\\w+)'}[\\s\\S]*?\\1\\s*\\(`).test(code);
    const usesMapOrSet = /new\s+(Map|Set|Array)/.test(code) || /\[\]/.test(code);

    let timeComplexity = 'O(1)';
    let spaceComplexity = 'O(1)';

    if (hasNestedLoops) timeComplexity = 'O(n²)';
    else if (hasRecursion) timeComplexity = 'O(2^n) / O(n log n)';
    else if (hasSingleLoop) timeComplexity = 'O(n)';

    if (usesMapOrSet) spaceComplexity = 'O(n)';
    else if (hasRecursion) spaceComplexity = 'O(n) - Call Stack';

    return { time: timeComplexity, space: spaceComplexity };
};

import { User, Problem } from '../types';

export const BattleArena: React.FC<{ currentUser: User, matchId: string, problem?: Problem }> = ({ currentUser, matchId, problem: propProblem }) => {
    const {
        updateCode,
        opponentCode,
        isMatchActive,
        winner,
        submitCode,
        joinMatch,
        problem: contextProblem
    } = useMatch();

    const currentProblem = contextProblem || propProblem;
    const { goToDashboard } = useNav();

    const [code, setCode] = useState(currentProblem?.baseCode || '// Your code here...');
    const [notes, setNotes] = useState('');
    const [activeTab, setActiveTab] = useState<'code' | 'notes'>('code');
    const [complexity, setComplexity] = useState({ time: 'O(1)', space: 'O(1)' });
    const [showExitWarning, setShowExitWarning] = useState(false);

    const headerRef = useRef<HTMLDivElement>(null);
    const arenaRef = useRef<HTMLDivElement>(null);

    const { isListening, startListening } = useVoiceToCode((newCode) => {
        if (newCode === '__CLEAR__') {
            setCode('');
            updateCode('');
            return;
        }
        const updated = code + '\n' + newCode;
        setCode(updated);
        updateCode(updated);
    });

    useEffect(() => {
        // Auto-join match on mount if we have a matchId
        if (matchId) {
            joinMatch(matchId);
        }

        // Entrance Animation for header
        const ctx = gsap.context(() => {
            gsap.from(headerRef.current, {
                y: -50,
                opacity: 0,
                duration: 0.8,
                ease: 'power3.out'
            });
        });

        return () => ctx.revert();
    }, [matchId, joinMatch]);

    useEffect(() => {
        if (isMatchActive) {
            const ctx = gsap.context(() => {
                gsap.from('.battle-card', {
                    y: 30,
                    opacity: 0,
                    duration: 1,
                    stagger: 0.2,
                    ease: 'power3.out',
                    delay: 0.3
                });
            }, arenaRef);
            return () => ctx.revert();
        }
    }, [isMatchActive]);

    useEffect(() => {
        if (winner) {
            setComplexity(analyzeComplexity(code));
        }
    }, [winner, code]);

    const handleExitClick = () => {
        if (isMatchActive && !winner) {
            setShowExitWarning(true);
        } else {
            goToDashboard();
        }
    };

    const confirmExit = () => {
        setShowExitWarning(false);
        goToDashboard();
    };

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isMatchActive && !winner) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isMatchActive, winner]);

    const handleJoin = () => {
        if (matchId) joinMatch(matchId);
    };

    const handleEditorChange = (value: string | undefined) => {
        if (value) {
            setCode(value);
            updateCode(value);
        }
    };

    return (
        <div className="flex flex-col h-full space-y-6" ref={arenaRef}>
            <header className="flex items-center justify-between" ref={headerRef}>
                <div className="flex items-center gap-6">
                    <button onClick={handleExitClick} className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-500 hover:text-white">
                        <X size={20} />
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                            <Activity size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">Cyber Battle Arena</h2>
                            <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-widest font-semibold">
                                <span className="text-cyan-400">Live Match</span>
                                <span>•</span>
                                <span className="font-mono">{matchId || 'Protocol Nexus-12'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <VoiceVisualizer isActive={isListening} />
                    <div className="flex items-center gap-2">
                        <NeonButton
                            variant={isListening ? 'danger' : 'secondary'}
                            onClick={startListening}
                            className={isListening ? 'pulse' : ''}
                            size="sm"
                        >
                            <Mic size={16} />
                            <span>{isListening ? 'Listening' : 'Voice Cmd'}</span>
                        </NeonButton>
                        <NeonButton variant="primary" size="sm" onClick={() => submitCode(code, 'javascript')}>
                            <Zap size={16} />
                            <span>Dispatch Code</span>
                        </NeonButton>
                    </div>
                </div>
            </header>

            <main className="flex-1 min-h-0">
                {!isMatchActive ? (
                    <div className="h-full flex items-center justify-center">
                        <GlassCard className="max-w-md w-full text-center border-cyan-400/20 p-10">
                            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 mx-auto mb-6">
                                <Sword size={32} />
                            </div>
                            <h1 className="text-3xl font-bold mb-4">Initialize Battle?</h1>
                            <p className="text-gray-400 mb-8 text-sm">
                                Enter the arena to challenge global opponents.
                                Your voice-to-code uplink will be initialized upon connection.
                            </p>
                            <NeonButton onClick={handleJoin} size="lg" className="w-full">
                                <span>Connect to Match</span>
                                <ChevronRight size={18} />
                            </NeonButton>
                        </GlassCard>
                    </div>
                ) : (
                    <div className="h-full grid grid-cols-1 lg:grid-cols-4 gap-6">
                        {/* Objectives Panel */}
                        <div className="lg:col-span-1 space-y-6">
                            <GlassCard className="h-full flex flex-col border-white/5 battle-card">
                                <div className="flex items-center gap-2 mb-4 text-cyan-400">
                                    <Target size={18} />
                                    <h3 className="font-bold uppercase tracking-wider text-sm">Objectives</h3>
                                </div>
                                <h4 className="text-lg font-bold mb-2">{currentProblem?.title || 'Loading Protocol...'}</h4>
                                <div className="text-xs inline-block px-2 py-1 rounded bg-white/5 text-gray-400 mb-4 self-start">
                                    {currentProblem?.difficulty || 'Standard'}
                                </div>
                                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                    <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap">
                                        {currentProblem?.description || 'Synchronizing currentProblem data from server...'}
                                    </p>
                                </div>
                            </GlassCard>
                        </div>

                        {/* Middle Workspace: Code & Notes */}
                        <div className="lg:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="flex flex-col space-y-3 battle-card h-full">
                                <div className="flex items-center justify-between px-2">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase">
                                        <div className="w-2 h-2 rounded-full bg-cyan-500" />
                                        <span>Local Uplink [{currentUser.username || 'You'}]</span>
                                    </div>
                                    <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg">
                                        <button
                                            onClick={() => setActiveTab('code')}
                                            className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${activeTab === 'code' ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-500 hover:text-white'}`}
                                        >
                                            <Code2 size={12} /> Code
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('notes')}
                                            className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${activeTab === 'notes' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-500 hover:text-white'}`}
                                        >
                                            <FileText size={12} /> Notes
                                        </button>
                                    </div>
                                </div>

                                <GlassCard className="flex-1 border-cyan-500/30 p-0 overflow-hidden group">
                                    {activeTab === 'code' ? (
                                        <Editor
                                            height="100%"
                                            theme="vs-dark"
                                            defaultLanguage="javascript"
                                            value={code}
                                            onChange={handleEditorChange}
                                            options={{
                                                fontSize: 15,
                                                fontFamily: 'JetBrains Mono',
                                                minimap: { enabled: false },
                                                padding: { top: 20 },
                                                cursorSmoothCaretAnimation: 'on',
                                                smoothScrolling: true,
                                                lineNumbersMinChars: 3,
                                            }}
                                        />
                                    ) : (
                                        <div className="h-full w-full bg-[#1e1e1e] p-4">
                                            <textarea
                                                className="w-full h-full bg-transparent text-gray-300 resize-none outline-none font-mono text-sm custom-scrollbar"
                                                placeholder="// Draft your algorithm approach, pseudo-code, or Big-O thoughts here..."
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                            />
                                        </div>
                                    )}
                                </GlassCard>
                            </div>

                            {/* Remote Opponent Panel */}
                            <div className="flex flex-col space-y-3 battle-card h-full">
                                <div className="flex items-center justify-between px-2">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase">
                                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                        <span>Remote Signal [Opponent]</span>
                                    </div>
                                    <div className="text-[10px] text-gray-600 font-mono tracking-tighter">INTERCEPTING_PACKETS</div>
                                </div>
                                <GlassCard className="flex-1 border-white/5 p-0 overflow-hidden">
                                    <Editor
                                        height="100%"
                                        theme="vs-dark"
                                        defaultLanguage="javascript"
                                        value={opponentCode}
                                        options={{
                                            readOnly: true,
                                            fontSize: 14,
                                            fontFamily: 'JetBrains Mono',
                                            minimap: { enabled: false },
                                            padding: { top: 20 },
                                            lineNumbersMinChars: 3
                                        }}
                                    />
                                </GlassCard>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {winner && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0A0A0F]/90 backdrop-blur-xl">
                    <GlassCard className={`max-w-xl w-full text-center p-10 transition-all ${winner === 'you' ? 'border-green-500/50 shadow-[0_0_50px_rgba(34,197,94,0.15)]' : 'border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.15)]'
                        }`}>
                        <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 ${winner === 'you' ? 'bg-green-500/10 text-green-500 border border-green-500/30' : 'bg-red-500/10 text-red-500 border border-red-500/30'
                            }`}>
                            <Trophy size={48} />
                        </div>
                        <h2 className="text-4xl font-bold mb-2">
                            {winner === 'you' ? 'Victory Secured' : 'Match Terminated'}
                        </h2>
                        <p className="text-gray-400 mb-8 italic">
                            {winner === 'you' ? 'Excellent performance, Operator. Sequence correct.' : 'Protocol failure detected. Faster sequence required.'}
                        </p>

                        {/* Big-O Complexity Metrics Card */}
                        <div className="bg-black/50 rounded-2xl border border-white/10 p-6 mb-8 text-left">
                            <div className="flex items-center gap-2 mb-4 text-cyan-400">
                                <BrainCircuit size={18} />
                                <h3 className="font-bold uppercase tracking-wider text-sm">Algorithm Analysis</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                    <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Time Complexity</div>
                                    <div className="text-2xl font-mono text-white tracking-tighter">{complexity.time}</div>
                                </div>
                                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                    <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Space Complexity</div>
                                    <div className="text-2xl font-mono text-white tracking-tighter">{complexity.space}</div>
                                </div>
                            </div>
                        </div>

                        <NeonButton className="w-full h-14 text-lg font-bold tracking-widest" onClick={() => goToDashboard()}>
                            Return to Command Center
                        </NeonButton>
                    </GlassCard>
                </div>
            )}

            {/* Exit Warning Modal */}
            {showExitWarning && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
                    <div className="w-full max-w-md bg-[#0a0a0a] border border-red-500/30 rounded-3xl p-8 space-y-6 shadow-[0_0_50px_rgba(239,68,68,0.1)]">
                        <div className="flex items-center gap-4 text-red-500">
                            <Shield size={32} />
                            <div>
                                <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">Warning: Combat Active</h3>
                                <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">Protocol Abandonment Imminent</p>
                            </div>
                        </div>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            Leaving a live session will result in immediate rating penalty and disconnection from the arena protocols. Confirm termination?
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowExitWarning(false)}
                                className="flex-1 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all text-white"
                            >
                                Stay in Combat
                            </button>
                            <button
                                onClick={confirmExit}
                                className="flex-1 py-4 bg-red-500 hover:bg-red-400 text-black rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-red-500/20"
                            >
                                Terminate Session
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
