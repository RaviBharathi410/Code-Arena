import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { useBattleStore } from '../store/useBattleStore';
import { useVoiceCommand } from '../hooks/useVoiceCommand';
import { VoiceVisualizer } from '../components/ui/VoiceVisualizer';
import {
    Activity,
    X,
    CheckCircle2,
    Zap,
    Shield,
    Signal,
    SignalLow,
    WifiOff,
    Terminal,
    Cpu,
    Layers,
    Timer,
    Mic,
    MicOff,
    Flame,
    TrendingUp,
    Menu
} from 'lucide-react';
import { useLayout } from '../components/layout/MainLayout';

// ── Types ────────────────────────────────────────────────────────────────
interface Problem {
    id: string;
    title: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    timeLimit: number; // in seconds
    description: string;
    examples: { input: string; output: string; explanation?: string }[];
    constraints: string[];
    initialCode: string;
    testCases: { input: any; expected: any }[];
}

// ── Data ──────────────────────────────────────────────────────────────────

const PROBLEMS: Problem[] = [
    {
        id: 'two-sum',
        title: 'Two Sum',
        difficulty: 'Easy',
        timeLimit: 300,
        description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.',
        examples: [
            { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]', explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].' }
        ],
        constraints: ['2 <= nums.length <= 10^4', '-10^9 <= nums[i] <= 10^9', '-10^9 <= target <= 10^9'],
        initialCode: 'function twoSum(nums, target) {\n    // Write your code here\n}',
        testCases: [
            { input: [[2, 7, 11, 15], 9], expected: [0, 1] },
            { input: [[3, 2, 4], 6], expected: [1, 2] }
        ]
    },
    {
        id: 'reverse-list',
        title: 'Reverse Linked List',
        difficulty: 'Easy',
        timeLimit: 300,
        description: 'Given the head of a singly linked list, reverse the list, and return the reversed list.',
        examples: [
            { input: 'head = [1,2,3,4,5]', output: '[5,4,3,2,1]' }
        ],
        constraints: ['The number of nodes in the list is the range [0, 5000].', '-5000 <= Node.val <= 5000'],
        initialCode: 'function reverseList(head) {\n    // Write your code here\n}',
        testCases: []
    },
    {
        id: 'valid-parens',
        title: 'Valid Parentheses',
        difficulty: 'Medium',
        timeLimit: 600,
        description: 'Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid.',
        examples: [
            { input: 's = "()"', output: 'true' },
            { input: 's = "()[]{}"', output: 'true' },
            { input: 's = "(]"', output: 'false' }
        ],
        constraints: ['1 <= s.length <= 10^4', 's consists of parentheses only `()[]{}`.'],
        initialCode: 'function isValid(s) {\n    // Write your code here\n}',
        testCases: []
    }
];

export const GameSpace: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { setIsMenuOpen } = useLayout();
    const [searchParams] = useSearchParams();
    const mode = searchParams.get('mode');
    const isPractice = mode === 'practice' || location.pathname.includes('practice');

    const {
        initializeSocket, joinMatch, updateCode: syncCode,
        problem: activeProblem, winner,
        opponentCode: liveOpponentCode, submitCode: socketSubmit
    } = useBattleStore();


    const [selectedProblem, setSelectedProblem] = useState(PROBLEMS[0]);
    // Selected variables
    const [code, setCode] = useState(selectedProblem.initialCode);
    const [isComplete, setIsComplete] = useState(false);
    const [showProblem, setShowProblem] = useState(true);

    // Timer state
    const [timeLeft, setTimeLeft] = useState(isPractice ? 0 : selectedProblem.timeLimit);
    const [isRunning, setIsRunning] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [score, setScore] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Esports features state
    const [signalStrength, setSignalStrength] = useState<'stable' | 'weak' | 'critical'>('stable');
    const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'running' | 'passed' | 'failed'>('idle');
    const [opponentStatus, setOpponentStatus] = useState({
        typing: false,
        idle: false,
        attempts: 0,
        submitted: false
    });
    const [showScoreImpact, setShowScoreImpact] = useState(false);
    const [liveComplexity, setLiveComplexity] = useState<string>('O(1)');
    const [liveStrategy, setLiveStrategy] = useState<string>('Brute Force');
    const [confidence, setConfidence] = useState<number>(0);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showExitWarning, setShowExitWarning] = useState(false);

    const timerRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Initial State Setup
    useEffect(() => {
        initializeSocket();

        // If we have a matchId in location state or search params
        const matchId = searchParams.get('id') || (location.state as any)?.matchId;
        if (matchId) {
            joinMatch(matchId);
        }
    }, [searchParams, location.state, initializeSocket, joinMatch]); // Added dependencies

    useEffect(() => {
        if (activeProblem) {
            setSelectedProblem({
                ...activeProblem,
                initialCode: activeProblem.baseCode || activeProblem.initialCode || '',
                timeLimit: 600,
                constraints: [],
                examples: []
            });
            setCode(activeProblem.baseCode || '');
        }
    }, [activeProblem]);

    // Warn before browser reload/close
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isRunning && !isComplete) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isRunning, isComplete]);

    // Simulated WebRTC Signal Fluctuations
    useEffect(() => {
        const interval = setInterval(() => {
            const r = Math.random();
            if (r > 0.95) setSignalStrength('critical');
            else if (r > 0.8) setSignalStrength('weak');
            else setSignalStrength('stable');
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    // Simulated Opponent Activity
    useEffect(() => {
        if (!isRunning || isPractice) return;
        const interval = setInterval(() => {
            const r = Math.random();
            setOpponentStatus(prev => ({
                ...prev,
                typing: r > 0.4,
                idle: r < 0.1,
                attempts: r > 0.9 ? prev.attempts + 1 : prev.attempts,
                submitted: prev.submitted || (timeLeft < 60 && r > 0.98)
            }));
        }, 3000);
        return () => clearInterval(interval);
    }, [isRunning, isPractice, timeLeft]);

    // Live Code Analysis Engine
    useEffect(() => {
        if (!isRunning) return;

        setIsAnalyzing(true);
        const debounceTimer = setTimeout(() => {
            const analyzeCode = (sourceCode: string) => {
                const lines = sourceCode.split('\n');

                // --- Complexity Analysis (Step 1) ---
                let nestedLoops = 0;
                let hasHashMap = /Map|Set|\{\}|Object\.create/.test(sourceCode);
                let hasRecursion = false;
                let hasBinarySearch = /while\s*\(.*<=.*\)/.test(sourceCode) && /mid/.test(sourceCode);
                let hasSorting = /\.sort\(/.test(sourceCode);

                const funcMatch = sourceCode.match(/function\s+(\w+)\s*\(/);
                if (funcMatch && funcMatch[1]) {
                    const funcName = funcMatch[1];
                    const recursionRegex = new RegExp(`${funcName}\\s*\\(`, 'g');
                    const matches = sourceCode.match(recursionRegex);
                    if (matches && matches.length > 1) hasRecursion = true;
                }

                let currentDepth = 0;
                lines.forEach(line => {
                    if (/for\s*\(|while\s*\(/.test(line)) {
                        currentDepth++;
                        nestedLoops = Math.max(nestedLoops, currentDepth);
                    }
                    if (line.includes('}')) {
                        currentDepth = Math.max(0, currentDepth - 1);
                    }
                });

                let complexity = 'O(1)';
                if (hasRecursion) complexity = 'O(2^N)';
                else if (nestedLoops >= 2) complexity = 'O(N²)';
                else if (hasBinarySearch) complexity = 'O(log N)';
                else if (hasSorting) complexity = 'O(N log N)';
                else if (nestedLoops === 1) complexity = 'O(N)';

                // --- Strategy Detection (Step 2) ---
                let strategy = 'Brute Force';
                let conf = 0;

                const hasPointers = /(left\+\+|right--|i\+\+|j--|while\s*\(.*<.*\))/.test(sourceCode) && /left|right|pointer/.test(sourceCode);
                const hasSlidingWindow = hasHashMap && /(left|right|window|size)/.test(sourceCode) && nestedLoops === 1;
                const hasStack = /(stack|push|pop)/.test(sourceCode.toLowerCase()) && /\[\]/.test(sourceCode);
                const hasDP = /(dp\[|memo\[|new\s+Array)/.test(sourceCode) && /for/.test(sourceCode);

                if (hasDP) { strategy = 'Dynamic Programming'; conf = 92; }
                else if (hasSlidingWindow) { strategy = 'Sliding Window'; conf = 85; }
                else if (hasPointers) { strategy = 'Two Pointers'; conf = 88; }
                else if (hasStack) { strategy = 'Stack / LIFO'; conf = 94; }
                else if (hasHashMap && nestedLoops === 1) { strategy = 'Hash Map'; conf = 87; }
                else if (hasBinarySearch) { strategy = 'Binary Search'; conf = 96; }
                else if (nestedLoops > 0) { strategy = 'Iterative'; conf = 100; }

                return { complexity, strategy, confidence: conf };
            };

            const results = analyzeCode(code);

            if (results.complexity !== liveComplexity) {
                gsap.fromTo('.complexity-badge',
                    { scale: 1.2, color: '#22c55e' },
                    { scale: 1, color: '#4b5563', duration: 0.5 }
                );
            }

            setLiveComplexity(results.complexity);
            setLiveStrategy(results.strategy);
            setConfidence(results.confidence);
            setIsAnalyzing(false);
        }, 1000);

        return () => clearTimeout(debounceTimer);
    }, [code, isRunning, liveComplexity]);

    useEffect(() => {
        if (isRunning) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => isPractice ? prev + 1 : prev - 1);
            }, 1000);
        }

        if (!isPractice && timeLeft === 0 && isRunning) {
            handleAutoSubmit();
        }

        return () => clearInterval(timerRef.current);
    }, [isRunning, timeLeft, isPractice]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const confirmExit = useCallback(() => {
        setIsRunning(false);
        setShowExitWarning(false);
        navigate('/dashboard', { replace: true });
    }, [navigate]);

    const handleSubmit = useCallback(() => {
        if (isSubmitting || isComplete) return;
        setIsSubmitting(true);
        setSubmissionStatus('running');

        // Real submission via socket
        socketSubmit(code, 'javascript');

        // Mark local as complete
        setIsComplete(true);

        // Simulate test case execution locally for instant feedback
        setTimeout(() => {
            setSubmissionStatus('passed');

            // Show real-time score impact preview before the final result modal
            setShowScoreImpact(true);
            gsap.fromTo('.score-impact-panel',
                { y: 50, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.5, ease: 'back.out' }
            );

            // Wait a bit to show the modal
            setTimeout(() => {
                setIsRunning(false);
                const timeTaken = isPractice ? timeLeft : (selectedProblem.timeLimit - timeLeft);
                const accuracy = Math.floor(Math.random() * 20) + 80; // 80-100%
                const timeBonus = isPractice ? 0 : Math.max(0, Math.floor(timeLeft / 10));

                // Detailed breakdown metrics
                const efficiency = 92;
                const complexity = 'O(N)';
                const heatmap = Array.from({ length: 12 }, () => Math.floor(Math.random() * 100));

                setScore({
                    accuracy,
                    timeBonus,
                    rpGain: 32,
                    expectedGain: 18,
                    streakBonus: 14,
                    timeTaken,
                    executionTime: Math.floor(Math.random() * 200) + 50, // ms
                    memoryMB: 14.2,
                    cpuCycles: '2.4M',
                    inputSize: '10^4 elements',
                    percentileSpeed: 72,
                    percentileMemory: 30,
                    benchmarks: {
                        top10Memory: 9.1,
                        globalAvgMemory: 18.4
                    },
                    efficiency,
                    complexity,
                    heatmap,
                    result: isPractice ? 'COMPLETED' : (accuracy > 85 ? 'VICTORY' : 'DEFEAT')
                });
                setIsSubmitting(false);
                setShowResults(true);
                setShowScoreImpact(false);

                // Animate bars after a short delay to ensure modal is rendered
                setTimeout(() => {
                    gsap.fromTo('.benchmark-bar',
                        { width: 0 },
                        { width: (_i, target) => (target as HTMLElement).dataset.width + '%', duration: 1, ease: 'power2.out', stagger: 0.1 }
                    );
                }, 600);
            }, 3500);
        }, 2000);
    }, [isSubmitting, isComplete, socketSubmit, code, isPractice, timeLeft, selectedProblem]);

    const handleAutoSubmit = useCallback(() => {
        clearInterval(timerRef.current);
        handleSubmit();
    }, [handleSubmit]);

    const handleStartMatch = useCallback(() => {
        setIsRunning(true);
        gsap.fromTo('.editor-container', { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.8 });
    }, []);


    // Voice Commands
    const [voiceFeedback, setVoiceFeedback] = useState('');
    const commands = useMemo(() => ({
        'submit code': handleSubmit,
        'run tests': handleSubmit,
        'reset code': () => setCode(selectedProblem?.initialCode || ''),
        'show problem': () => setShowProblem(true),
        'hide problem': () => setShowProblem(false),
        'clear feedback': () => setVoiceFeedback(''),
    }), [handleSubmit, selectedProblem]);

    const { isListening, startListening, stopListening } = useVoiceCommand({
        commands,
        onInterimResults: (text) => setVoiceFeedback(text),
        autoStart: true
    });


    // Results logic
    useEffect(() => {
        if (winner) {
            setShowResults(true);
        }
    }, [winner]);

    return (
        <div className="h-screen bg-[#020202] text-white flex flex-col font-sans selection:bg-white selection:text-black overflow-hidden" ref={containerRef}>
            {/* ── Match Header ── */}
            <header className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/80 backdrop-blur-xl z-20">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => setIsMenuOpen(true)}
                        className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all group"
                    >
                        <Menu size={18} className="group-hover:scale-110 transition-transform" />
                    </button>
                    <div className="flex items-center gap-2">
                        {isPractice ? <Shield size={18} className="text-blue-500" /> : <Activity size={18} className="text-green-500" />}
                        <span className="text-sm font-black tracking-widest uppercase italic">
                            {isPractice ? 'Practice_Lab' : 'Ranked_Dual'}
                        </span>
                    </div>
                </div>

                {/* Center Status Hub */}
                <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-4">
                    <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                        {signalStrength === 'stable' && <Signal size={14} className="text-green-500" />}
                        {signalStrength === 'weak' && <SignalLow size={14} className="text-yellow-500" />}
                        {signalStrength === 'critical' && <WifiOff size={14} className="text-red-500" />}
                        <span className="text-[10px] font-mono opacity-50 uppercase">{signalStrength}</span>
                    </div>

                    <div className={`flex flex-col items-center px-6 py-1 rounded-2xl border transition-all duration-300 ${isRunning ? (isPractice ? 'border-blue-500/20 bg-blue-500/5' : 'border-red-500/20 bg-red-500/5') : 'border-white/5 bg-white/2'}`}>
                        <span className={`text-2xl font-black font-mono tracking-tighter ${isRunning ? (isPractice ? 'text-blue-400' : 'text-red-500') : 'text-gray-600'}`}>
                            {formatTime(timeLeft)}
                        </span>
                        <span className="text-[8px] font-black uppercase tracking-[0.3em] opacity-30 -mt-1">{isPractice ? 'Time Elapsed' : 'Time Remaining'}</span>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                        <Terminal size={14} className={submissionStatus === 'passed' ? 'text-green-500' : 'text-gray-500'} />
                        <span className={`text-[10px] font-mono uppercase ${submissionStatus === 'running' ? 'animate-pulse text-yellow-500' : ''}`}>
                            {submissionStatus === 'idle' ? 'Ready' : submissionStatus}
                        </span>
                    </div>
                </div>

                {/* Action Controls */}
                <div className="flex items-center gap-4">
                    {!isRunning ? (
                        <button onClick={handleStartMatch} className="bg-white text-black px-6 py-2 rounded-xl font-black text-xs tracking-widest uppercase hover:scale-105 transition-all shadow-xl">
                            {isPractice ? 'Start Session' : 'Begin Uplink'}
                        </button>
                    ) : (
                        <div className="flex items-center gap-3">
                            <div className="flex flex-col items-end">
                                <div className="flex items-center gap-2">
                                    <VoiceVisualizer isActive={isListening} color="#22d3ee" />
                                    <button
                                        onClick={isListening ? stopListening : startListening}
                                        className={`p-2 rounded-lg border transition-all ${isListening
                                            ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                                            : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                                            }`}
                                    >
                                        {isListening ? <Mic size={18} /> : <MicOff size={18} />}
                                    </button>
                                </div>
                                {voiceFeedback && (
                                    <span className="text-[10px] font-mono text-cyan-400/70 animate-pulse mt-1 max-w-[150px] truncate">
                                        {voiceFeedback}
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || isComplete}
                                className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-700 text-black font-black uppercase tracking-widest text-xs rounded-lg transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                            >
                                <Zap size={14} />
                                {isSubmitting ? 'Transmitting...' : 'Execute Uplink'}
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* ── Main Workspace ── */}
            <main className="flex-1 flex overflow-hidden">
                {/* ── Left: Problem Description ── */}
                <aside
                    className={`border-r border-white/10 flex flex-col bg-[#050505] overflow-hidden transition-all duration-500 ease-in-out ${showProblem ? 'w-[450px] opacity-100' : 'w-0 opacity-0'}`}
                >
                    <div className="p-8 overflow-y-auto flex-1 custom-scrollbar min-w-[450px]">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-3xl font-black tracking-tighter uppercase italic">{selectedProblem.title}</h2>
                            <button onClick={() => setShowProblem(false)} className="p-2 text-gray-500 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-8">
                            <p className="text-xl text-gray-400 font-light leading-relaxed">{selectedProblem.description}</p>

                            <div className="space-y-6">
                                {selectedProblem.examples.map((ex, i) => (
                                    <div key={i} className="p-6 rounded-3xl bg-white/2 border border-white/5 space-y-4 font-mono text-sm group hover:border-white/10 transition-colors">
                                        <div className="flex justify-between items-start">
                                            <span className="text-[10px] font-black text-gray-600 uppercase">Example {i + 1}</span>
                                            <Zap size={14} className="text-gray-700" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-gray-500 text-[10px] uppercase">Input</p>
                                            <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-blue-400">{ex.input}</div>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-gray-500 text-[10px] uppercase">Output</p>
                                            <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-green-400">{ex.output}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="p-8 rounded-3xl bg-white/2 border border-white/5 space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Constraints</h3>
                                <div className="flex flex-wrap gap-2">
                                    {selectedProblem.constraints.map((c, i) => (
                                        <code key={i} className="px-3 py-1.5 rounded-lg bg-black text-xs font-mono text-gray-400 border border-white/5">{c}</code>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* ── Center: Editor ── */}
                <section className={`flex-1 flex flex-col transition-all duration-700 bg-black relative ${!isRunning ? 'blur-sm grayscale opacity-30 pointer-events-none scale-105' : ''}`}>
                    <div className="flex-1 min-h-0 relative">
                        <Editor
                            height="100%"
                            defaultLanguage="javascript"
                            theme="vs-dark"
                            value={code}
                            onChange={(val) => {
                                setCode(val || '');
                                syncCode(val || '');
                            }}
                            options={{
                                fontSize: 14,
                                minimap: { enabled: false },
                                padding: { top: 20 },
                                backgroundColor: '#000000',
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                lineNumbers: 'on',
                                glyphMargin: false,
                                folding: true,
                                lineDecorationsWidth: 10,
                                lineNumbersMinChars: 3
                            }}
                        />
                    </div>

                    {/* Score Impact Toast */}
                    {showScoreImpact && (
                        <div className="absolute bottom-10 right-10 z-30 p-6 rounded-3xl bg-black border border-green-500/50 shadow-[0_0_40px_rgba(34,197,94,0.2)] animate-in slide-in-from-bottom-5 duration-500">
                            <div className="flex items-center gap-2 text-green-500 mb-2">
                                <Zap size={16} fill="currentColor" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Score Prediction</span>
                            </div>
                            <div className="text-4xl font-black text-white">+32 <span className="text-[10px] text-gray-500 uppercase tracking-tighter">RP</span></div>
                        </div>
                    )}
                </section>

                {/* ── Right: Analytics & Opponent ── */}
                <aside className="w-96 border-l border-white/10 flex flex-col bg-[#050505]">
                    {/* Real-time Analytics */}
                    <div className="p-6 border-b border-white/10 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Cpu size={14} className="text-blue-500" />
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Agent Intel</h3>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className={`w-1.5 h-1.5 rounded-full ${isAnalyzing ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
                                <span className="text-[10px] font-mono text-gray-400">
                                    {isAnalyzing ? 'Analyzing...' : 'Standby'}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-4 rounded-2xl bg-white/2 border border-white/5 space-y-1">
                                <p className="text-[8px] font-black text-gray-600 uppercase">Complexity</p>
                                <p className="text-sm font-bold text-white complexity-badge">{liveComplexity}</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-white/2 border border-white/5 space-y-1">
                                <p className="text-[8px] font-black text-gray-600 uppercase">Strategy</p>
                                <p className="text-sm font-bold text-cyan-400">{liveStrategy}</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between text-[8px] font-black uppercase tracking-[0.2em] text-gray-500">
                                <span>Logic Efficiency</span>
                                <span className="text-white">{confidence}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-1000" style={{ width: `${confidence}%` }} />
                            </div>
                        </div>
                    </div>

                    {/* Opponent Code Buffer */}
                    {!isPractice && (
                        <div className="flex-1 flex flex-col min-h-0 bg-black/40">
                            <div className="px-6 py-4 flex items-center justify-between border-b border-white/5">
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                    <Terminal size={12} />
                                    Opponent Buffer
                                </div>
                                {opponentStatus.typing && <span className="text-green-500 text-[8px] animate-pulse uppercase font-black">Typing...</span>}
                            </div>
                            <div className="flex-1 min-h-0">
                                <Editor
                                    height="100%"
                                    defaultLanguage="javascript"
                                    theme="vs-dark"
                                    value={liveOpponentCode || "// Awaiting data uplink..."}
                                    options={{
                                        fontSize: 11,
                                        minimap: { enabled: false },
                                        readOnly: true,
                                        backgroundColor: '#000000',
                                        domReadOnly: true,
                                        lineNumbers: 'off',
                                        folding: false,
                                        scrollBeyondLastLine: false,
                                        glyphMargin: false,
                                        lineDecorationsWidth: 0
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Bottom Meta */}
                    <div className="p-6 border-t border-white/10 bg-black/20">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Signal Stability</span>
                            <span className={`text-[10px] font-mono ${signalStrength === 'stable' ? 'text-green-500' : 'text-yellow-500'}`}>{signalStrength.toUpperCase()}</span>
                        </div>
                        <div className="flex gap-1 h-8 items-end">
                            {Array.from({ length: 20 }).map((_, i) => (
                                <div key={i} className="flex-1 bg-white/5 rounded-t-sm" style={{ height: `${Math.random() * 80 + 20}%` }} />
                            ))}
                        </div>
                    </div>
                </aside>
            </main>

            {/* ── Results Overlay ── */}
            {showResults && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/95 backdrop-blur-2xl animate-in fade-in duration-700">
                    <div className="w-full max-w-5xl bg-[#080808] border border-white/10 rounded-[3.5rem] overflow-hidden shadow-[0_0_120px_rgba(0,0,0,0.5)] flex flex-col lg:flex-row h-[85vh]">
                        {/* Summary Panel */}
                        <div className={`w-full lg:w-96 p-12 flex flex-col justify-between relative overflow-hidden ${score.result === 'VICTORY' ? 'bg-cyan-500' : 'bg-red-500'}`}>
                            <div className="relative z-10 space-y-3">
                                <p className="text-black text-[10px] font-black uppercase tracking-[0.4em]">Protocol Status</p>
                                <h2 className="text-7xl font-black text-black leading-none italic tracking-tighter">{score.result}</h2>
                            </div>

                            <div className="relative z-10">
                                <div className="text-black font-black text-xs uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                                    <TrendingUp size={16} /> Rating Adjustment
                                </div>
                                <div className="text-6xl font-black text-black">+{score.rpGain}</div>
                                <p className="text-black/50 text-[10px] font-black uppercase tracking-widest mt-4 underline decoration-2 offset-4">Baseline Calibration Complete</p>
                            </div>

                            <div className="absolute top-0 right-0 -mr-24 -mt-24 opacity-10 rotate-12">
                                <Activity size={400} strokeWidth={2} />
                            </div>
                        </div>

                        {/* Metrics Panel */}
                        <div className="flex-1 p-16 overflow-y-auto custom-scrollbar space-y-16">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-3xl font-black tracking-tight uppercase italic">Match Analytics</h3>
                                    <p className="text-gray-500 text-[10px] font-mono mt-2 tracking-widest uppercase opacity-40">Session ID: {Math.random().toString(36).substr(2, 12).toUpperCase()}</p>
                                </div>
                                <button onClick={() => navigate('/dashboard')} className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white hover:text-black transition-all group">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                {[
                                    { icon: <CheckCircle2 size={18} />, label: 'Accuracy', val: score.accuracy + '%', sub: 'Passed All Tests' },
                                    { icon: <Timer size={18} />, label: 'Efficiency', val: formatTime(score.timeTaken), sub: 'Elite Performance' },
                                    { icon: <Cpu size={18} />, label: 'Cycle Load', val: score.cpuCycles, sub: 'Optimized Path' },
                                    { icon: <Layers size={18} />, label: 'Input Load', val: score.inputSize, sub: 'High Stress' },
                                ].map((m, i) => (
                                    <div key={i} className="p-8 rounded-[2rem] bg-white/2 border border-white/5 space-y-4 hover:border-white/20 transition-all group">
                                        <div className="text-gray-600 group-hover:text-cyan-400 transition-colors">{m.icon}</div>
                                        <div>
                                            <p className="text-3xl font-black text-white">{m.val}</p>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1">{m.label}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-10">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-3">
                                    <Flame size={14} className="text-orange-500" /> Interaction Density Map
                                </h4>
                                <div className="flex gap-2 h-32 items-end bg-black/40 p-6 rounded-[2rem] border border-white/5">
                                    {score.heatmap.map((v: number, i: number) => (
                                        <div key={i} className="flex-1 bg-cyan-500/20 rounded-md hover:bg-cyan-500 transition-all duration-500" style={{ height: v + '%' }} />
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={() => navigate('/dashboard')}
                                className="w-full py-8 rounded-[2rem] bg-white text-black font-black uppercase tracking-[0.3em] text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_50px_rgba(255,255,255,0.1)]"
                            >
                                Return to Previous Sector
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Exit Warning Modal */}
            {showExitWarning && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
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
                                className="flex-1 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
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
