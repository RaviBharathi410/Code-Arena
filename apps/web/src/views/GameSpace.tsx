import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { gsap } from 'gsap';
import {
    Activity,
    X, CheckCircle2, Zap,
    BarChart2, Shield, Signal,
    SignalLow, WifiOff, Terminal,
    Cpu, Layers, Timer,
    Flame, TrendingUp, ChevronRight
} from 'lucide-react';

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

interface Opponent {
    id: string;
    name: string;
    rank: string;
    rp: number;
    avatar: string;
    difficulty: 'Novice' | 'Expert' | 'Master';
    status: 'online' | 'searching' | 'in-game';
}

// ── Data ──────────────────────────────────────────────────────────────────
const OPPONENTS: Opponent[] = [
    { id: '1', name: 'Ghost_Runner_32', rank: 'Platinum', rp: 4820, avatar: 'G', difficulty: 'Expert', status: 'online' },
    { id: '2', name: 'NeonShadow_X', rank: 'Diamond', rp: 5100, avatar: 'N', difficulty: 'Master', status: 'online' },
    { id: '3', name: 'CipherKnight', rank: 'Gold', rp: 3200, avatar: 'C', difficulty: 'Expert', status: 'online' },
    { id: '4', name: 'NullPointer_77', rank: 'Silver', rp: 1800, avatar: 'N', difficulty: 'Novice', status: 'online' },
    { id: '5', name: 'VoidPulse_9', rank: 'Platinum', rp: 4500, avatar: 'V', difficulty: 'Expert', status: 'online' },
    { id: '6', name: 'DataPhantom', rank: 'Gold', rp: 3400, avatar: 'D', difficulty: 'Expert', status: 'online' },
    { id: '7', name: 'QuantumByte', rank: 'Master', rp: 6200, avatar: 'Q', difficulty: 'Master', status: 'online' },
    { id: '8', name: 'AlphaBit_0', rank: 'Silver', rp: 1600, avatar: 'A', difficulty: 'Novice', status: 'online' },
];

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
    const [searchParams] = useSearchParams();
    const mode = searchParams.get('mode');
    const isPractice = mode === 'practice';

    const [selectedProblem, setSelectedProblem] = useState(PROBLEMS[0]);
    const selectedOpponent = OPPONENTS[0]; // Pre-selected for current match logic
    const [code, setCode] = useState(selectedProblem.initialCode);

    // Timer state
    const [timeLeft, setTimeLeft] = useState(isPractice ? 0 : selectedProblem.timeLimit);
    const [isRunning, setIsRunning] = useState(false);
    const [showResult, setShowResult] = useState(false);
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

    const timerRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);

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
    }, [code, isRunning]);

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
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const handleStartMatch = () => {
        setIsRunning(true);
        gsap.fromTo('.editor-container', { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.8 });
    };

    const handleAutoSubmit = () => {
        clearInterval(timerRef.current);
        handleSubmit();
    };

    const handleSubmit = () => {
        setIsSubmitting(true);
        setSubmissionStatus('running');

        // Simulate test case execution
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
                    efficiency,
                    complexity,
                    heatmap,
                    result: isPractice ? 'COMPLETED' : (accuracy > 85 ? 'VICTORY' : 'DEFEAT')
                });
                setIsSubmitting(false);
                setShowResult(true);
                setShowScoreImpact(false);
            }, 3500);
        }, 2000);
    };

    return (
        <div className="h-screen bg-[#020202] text-white flex flex-col font-sans selection:bg-white selection:text-black" ref={containerRef}>
            {/* ── Match Status Bar (Top Center) ── */}
            <header className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/80 backdrop-blur-xl z-20">
                <div className="flex items-center gap-6">
                    <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-500 hover:text-white">
                        <X size={20} />
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
                    {/* Connection Status */}
                    <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                        {signalStrength === 'stable' && <Signal size={14} className="text-green-500" />}
                        {signalStrength === 'weak' && <SignalLow size={14} className="text-yellow-500" />}
                        {signalStrength === 'critical' && <WifiOff size={14} className="text-red-500" />}
                        <span className="text-[10px] font-mono opacity-50 uppercase">{signalStrength}</span>
                    </div>

                    {/* Central Timer */}
                    <div className={`flex flex-col items-center px-6 py-1 rounded-2xl border transition-all duration-300 ${isRunning ? (isPractice ? 'border-blue-500/20 bg-blue-500/5' : 'border-red-500/20 bg-red-500/5') : 'border-white/5 bg-white/2'}`}>
                        <span className={`text-2xl font-black font-mono tracking-tighter ${isRunning ? (isPractice ? 'text-blue-400' : 'text-red-500') : 'text-gray-600'}`}>
                            {formatTime(timeLeft)}
                        </span>
                        <span className="text-[8px] font-black uppercase tracking-[0.3em] opacity-30 -mt-1">{isPractice ? 'Time Elapsed' : 'Time Remaining'}</span>
                    </div>

                    {/* Submission Status */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                        <Terminal size={14} className={submissionStatus === 'passed' ? 'text-green-500' : 'text-gray-500'} />
                        <span className={`text-[10px] font-mono uppercase ${submissionStatus === 'running' ? 'animate-pulse text-yellow-500' : ''}`}>
                            {submissionStatus === 'idle' ? 'Ready' : submissionStatus}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {!isRunning ? (
                        <button onClick={handleStartMatch} className="bg-white text-black px-6 py-2 rounded-xl font-black text-xs tracking-widest uppercase hover:scale-105 transition-all shadow-xl">
                            {isPractice ? 'Start Session' : 'Begin Uplink'}
                        </button>
                    ) : (
                        <button disabled={isSubmitting} onClick={handleSubmit} className="bg-green-500 text-white px-6 py-2 rounded-xl font-black text-xs tracking-widest uppercase hover:bg-green-600 transition-all disabled:opacity-50 flex items-center gap-2">
                            {isSubmitting ? 'Processing...' : 'Submit Agent'}
                        </button>
                    )}
                </div>
            </header>

            {/* ── Main Layout ───────────────────────────────────────────────── */}
            <main className="flex-1 flex overflow-hidden">
                {/* ── Left Sidebar ── */}
                <aside className={`w-80 border-r border-white/10 flex flex-col bg-[#050505] overflow-y-auto ${isPractice && isRunning ? 'hidden' : ''}`}>

                    {/* Opponent Info / Match Stats */}
                    {!isPractice && isRunning && (
                        <div className="p-6 border-b border-white/10 space-y-6">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-gray-500">
                                    <span>Opponent Activity</span>
                                    {opponentStatus.typing && <span className="text-green-500 flex items-center gap-1 animate-pulse"><div className="w-1 h-1 bg-current rounded-full" /> Typing</span>}
                                    {opponentStatus.idle && <span className="text-yellow-500">Idle</span>}
                                </div>

                                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-black relative ${opponentStatus.submitted ? 'border-green-500' : 'border-white/10'}`}>
                                        {selectedOpponent.avatar}
                                        {opponentStatus.typing && <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-black rounded-full" />}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold flex items-center justify-between">
                                            {selectedOpponent.name}
                                            <span className="text-xs font-mono opacity-40">{selectedOpponent.rp} RP</span>
                                        </p>
                                        <div className="w-full h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
                                            <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: opponentStatus.submitted ? '100%' : '45%' }} />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="p-3 rounded-xl bg-white/2 border border-white/5 text-center">
                                        <p className="text-[8px] font-black opacity-40 uppercase">Attempts</p>
                                        <p className="text-sm font-bold font-mono">{opponentStatus.attempts}</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-white/2 border border-white/5 text-center">
                                        <p className="text-[8px] font-black opacity-40 uppercase">Status</p>
                                        <p className={`text-sm font-bold truncate ${opponentStatus.submitted ? 'text-green-500 animate-pulse' : 'text-gray-500'}`}>
                                            {opponentStatus.submitted ? 'SUBMITTED' : 'SOLVING'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="p-6 space-y-8">
                        <div>
                            <h3 className="text-[10px] uppercase tracking-[0.3em] font-black text-gray-500 mb-6 flex items-center gap-2">
                                <Activity size={12} /> {isPractice ? 'Practice Focus' : 'Arena Objectives'}
                            </h3>
                            <div className="space-y-2">
                                {PROBLEMS.map(p => (
                                    <button key={p.id} onClick={() => !isRunning && setSelectedProblem(p)} className={`w-full text-left p-4 rounded-xl border transition-all ${selectedProblem.id === p.id ? 'bg-white/10 border-white/10' : 'border-transparent opacity-40 hover:opacity-100 hover:bg-white/5'}`}>
                                        <p className="text-xs font-bold">{p.title}</p>
                                        <p className="text-[10px] opacity-40 uppercase tracking-widest mt-1">{p.difficulty}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </aside>

                {/* ── Center: Problem ── */}
                <section className="flex-1 flex flex-col overflow-y-auto bg-[#080808]">
                    <div className="p-10 max-w-4xl mx-auto space-y-12">
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <h1 className="text-5xl font-black tracking-tighter uppercase">{selectedProblem.title}</h1>
                                <span className={`px-2 py-1 rounded text-[10px] font-black tracking-widest uppercase border ${selectedProblem.difficulty === 'Easy' ? 'text-green-400 border-green-500/20 bg-green-500/5' : 'text-red-400 border-red-500/20 bg-red-500/5'}`}>
                                    {selectedProblem.difficulty}
                                </span>
                            </div>
                            <p className="text-xl text-gray-400 font-light leading-relaxed">{selectedProblem.description}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {selectedProblem.examples.map((ex, i) => (
                                <div key={i} className="p-6 rounded-3xl bg-white/2 border border-white/5 space-y-4 font-mono text-sm group hover:border-white/10 transition-colors">
                                    <div className="flex justify-between items-start">
                                        <span className="text-[10px] font-black text-gray-600 uppercase">Example {i + 1}</span>
                                        <Zap size={14} className="text-gray-700" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-gray-500 text-xs uppercase">Input</p>
                                        <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-blue-400">{ex.input}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-gray-500 text-xs uppercase">Output</p>
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
                </section>

                {/* ── Right: Editor ── */}
                <section className={`flex-1 flex flex-col border-l border-white/10 transition-all duration-700 bg-black editor-container ${!isRunning ? 'blur-sm grayscale opacity-30 pointer-events-none scale-105' : ''}`}>
                    <div className="flex-1 relative">
                        <Editor
                            height="100%"
                            defaultLanguage="javascript"
                            theme="vs-dark"
                            value={code}
                            onChange={(val) => setCode(val || '')}
                            options={{
                                fontSize: 16,
                                minimap: { enabled: false },
                                padding: { top: 30 },
                                fontFamily: 'JetBrains Mono, Menlo, monospace',
                                lineNumbers: 'on',
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                                letterSpacing: -0.5,
                                cursorStyle: 'block',
                                lineDecorationsWidth: 15
                            }}
                        />
                    </div>

                    {/* Real-time Score Impact Preview */}
                    {showScoreImpact && (
                        <div className="absolute bottom-52 right-8 z-40 score-impact-panel w-56 p-6 rounded-3xl bg-black border border-green-500/50 shadow-[0_0_40px_rgba(34,197,94,0.2)]">
                            <div className="flex items-center gap-2 text-green-500 mb-4">
                                <Zap size={16} fill="currentColor" />
                                <span className="text-xs font-black uppercase tracking-widest">Score Forecast</span>
                            </div>
                            <div className="space-y-4">
                                <div className="text-4xl font-black text-white">+32 <span className="text-xs text-gray-500 uppercase tracking-tighter">Rank Points</span></div>
                                <div className="space-y-2 pt-4 border-t border-white/10">
                                    <div className="flex justify-between text-[10px] font-black uppercase">
                                        <span className="opacity-40">Base Reward</span>
                                        <span className="text-gray-300">+18</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] font-black uppercase">
                                        <span className="text-orange-500">Streak Bonus</span>
                                        <span className="text-orange-500">+14</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="h-48 border-t border-white/10 bg-[#050505] p-6 relative overflow-hidden">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Cpu size={14} className="text-blue-500" />
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Live Agent Analytics</h3>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex items-center gap-1.5 group cursor-help relative">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-[10px] font-mono text-green-500">
                                        {isAnalyzing ? 'Scanning Pattern...' : `${liveStrategy} (${confidence}%)`}
                                    </span>
                                    <div className="absolute bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-black border border-white/10 rounded-lg text-[8px] text-gray-400 z-50">
                                        Pattern detection based on data structure usage, control flow, and variable tracking.
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 text-gray-600">
                                    <BarChart2 size={12} className={isAnalyzing ? 'animate-spin' : ''} />
                                    <span className="text-[10px] font-mono uppercase complexity-badge">
                                        {isAnalyzing ? 'Analyzing Structure...' : `${liveComplexity} Prediction`}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 h-20 items-end">
                            {Array.from({ length: 24 }).map((_, i) => (
                                <div key={i} className="flex-1 bg-white/5 rounded-t-sm relative group overflow-hidden" style={{ height: `${Math.random() * 80 + 20}%` }}>
                                    <div className="absolute inset-x-0 bottom-0 bg-white/10 animate-pulse" style={{ height: '20%' }} />
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            {/* ── Post-Match breakdown screen (within Result Modal) ── */}
            {showResult && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-500">
                    <div className="w-full max-w-4xl bg-[#080808] border border-white/10 rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(255,255,255,0.05)] flex flex-col lg:flex-row h-[90vh]">

                        {/* Side Branding/Summary */}
                        <div className={`w-full lg:w-80 p-12 flex flex-col justify-between relative overflow-hidden ${score.result === 'VICTORY' ? 'bg-green-500' : 'bg-red-500'}`}>
                            <div className="relative z-10 space-y-2">
                                <p className="text-black text-xs font-black uppercase tracking-[0.3em]">Protocol Result</p>
                                <h2 className="text-6xl font-black text-black leading-none italic">{score.result}</h2>
                            </div>

                            <div className="relative z-10">
                                <div className="text-black font-black text-sm uppercase tracking-widest mb-1 flex items-center gap-2">
                                    <TrendingUp size={16} /> Impact
                                </div>
                                <div className="text-5xl font-black text-black">+{score.rpGain}</div>
                                <p className="text-black/60 text-[10px] font-black uppercase tracking-widest mt-2">New Rank Points: {selectedOpponent.rp + score.rpGain}</p>
                            </div>

                            <div className="absolute top-0 right-0 -mr-20 -mt-20 opacity-20">
                                <Activity size={300} strokeWidth={4} />
                            </div>
                        </div>

                        {/* Detailed Metrics */}
                        <div className="flex-1 p-12 overflow-y-auto space-y-12">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-2xl font-black tracking-tight uppercase">Performance Breakdown</h3>
                                    <p className="text-gray-500 text-xs font-mono mt-1">LOG_ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => navigate('/dashboard')} className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white text-black transition-all group">
                                        <ChevronRight size={20} className="text-white group-hover:text-black" />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { icon: <CheckCircle2 size={16} />, label: 'Accuracy', val: score.accuracy + '%', sub: 'Passed 12/12' },
                                    { icon: <Timer size={16} />, label: 'Solve Time', val: formatTime(score.timeTaken), sub: '25% Faster' },
                                    { icon: <Cpu size={16} />, label: 'Efficiency', val: score.efficiency + '%', sub: 'O(N) Optimal' },
                                    { icon: <BarChart2 size={16} />, label: 'Rank Gain', val: '+' + score.rpGain, sub: 'Rank Up Soon' },
                                ].map((m, i) => (
                                    <div key={i} className="p-6 rounded-3xl bg-white/2 border border-white/5 space-y-3">
                                        <div className="text-gray-500">{m.icon}</div>
                                        <div>
                                            <p className="text-2xl font-black">{m.val}</p>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 opacity-40">{m.label}</p>
                                        </div>
                                        <p className="text-[10px] font-mono text-green-500/80">{m.sub}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Heatmap & Efficiency Compare */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                                        <Flame size={14} className="text-orange-500" /> Interaction Heatmap
                                    </h4>
                                    <div className="flex gap-1 h-24 items-end bg-white/2 p-4 rounded-2xl border border-white/5">
                                        {score.heatmap.map((v: number, i: number) => (
                                            <div key={i} className="flex-1 bg-white/10 rounded-sm hover:bg-white/40 transition-colors" style={{ height: v + '%' }} />
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-gray-500 font-mono">Visualizing coding intensity and test execution frequency over duration.</p>
                                </div>
                                <div className="space-y-6">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                                        <Layers size={14} className="text-blue-500" /> Complexity Profile
                                    </h4>
                                    <div className="p-6 rounded-3xl bg-blue-500/5 border border-blue-500/10 flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-black uppercase opacity-60">Estimated Big O</p>
                                            <p className="text-3xl font-black text-blue-400 mt-1">{score.complexity}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-black uppercase opacity-60">Memory Usage</p>
                                            <p className="text-lg font-bold text-white mt-1">12.4 MB</p>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-500 font-mono">Algorithm evaluated against spatial and temporal constraints. Efficiency score: 9.4/10.</p>
                                </div>
                            </div>

                            <button onClick={() => navigate('/dashboard')} className="w-full py-6 rounded-3xl bg-white text-black font-black uppercase tracking-widest text-sm hover:scale-[1.01] transition-all shadow-2xl">
                                Return to Command Center
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
