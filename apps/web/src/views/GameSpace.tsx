import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { gsap } from 'gsap';
import {
    Sword, Clock, Target,
    BrainCircuit, Activity,
    X, CheckCircle2, AlertCircle, Zap,
    Award, BarChart2, Shield
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
    const [selectedOpponent, setSelectedOpponent] = useState(OPPONENTS[0]);
    const [code, setCode] = useState(selectedProblem.initialCode);

    // Timer counts up in practice, down in rank
    const [timeLeft, setTimeLeft] = useState(isPractice ? 0 : selectedProblem.timeLimit);
    const [isRunning, setIsRunning] = useState(false);
    const [showResult, setShowResult] = useState(false);
    const [score, setScore] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const timerRef = useRef<any>(null);

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
        setIsRunning(false);

        // Simulate algorithm evaluation
        setTimeout(() => {
            const timeTaken = isPractice ? timeLeft : (selectedProblem.timeLimit - timeLeft);
            const accuracy = Math.floor(Math.random() * 40) + 60; // 60-100%
            const timeBonus = isPractice ? 0 : Math.max(0, Math.floor(timeLeft / 10));
            const totalScore = (accuracy * 10) + timeBonus;

            setScore({
                accuracy,
                timeBonus,
                totalScore,
                timeTaken,
                result: isPractice ? 'COMPLETED' : (accuracy > 80 ? 'VICTORY' : 'DEFEAT')
            });
            setIsSubmitting(false);
            setShowResult(true);
        }, 2000);
    };

    return (
        <div className="min-h-screen bg-[#020202] text-white flex flex-col font-sans selection:bg-white selection:text-black">
            {/* ── Header ────────────────────────────────────────────────────── */}
            <header className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/50 backdrop-blur-xl z-20">
                <div className="flex items-center gap-6">
                    <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                    <div className="flex items-center gap-2">
                        {isPractice ? <Shield size={20} className="text-blue-400" /> : <Activity size={20} className="text-white" />}
                        <span className="text-lg font-bold tracking-tight">
                            Arena<span className="text-gray-500">{isPractice ? 'Practice' : 'Space'}</span>
                        </span>
                    </div>
                </div>

                {isRunning && (
                    <div className="flex items-center gap-8">
                        <div className={`flex items-center gap-3 px-4 py-2 border rounded-xl ${isPractice ? 'bg-blue-500/10 border-blue-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                            <Clock size={18} className={isPractice ? 'text-blue-400' : 'text-red-400'} />
                            <span className={`font-mono text-xl font-bold ${isPractice ? 'text-blue-400' : 'text-red-400'}`}>
                                {formatTime(timeLeft)}
                            </span>
                        </div>

                        {!isPractice && (
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p className="text-xs text-gray-500 uppercase tracking-widest leading-none">Opponent Progress</p>
                                    <p className="text-sm font-bold text-white mt-1">{selectedOpponent.name}</p>
                                </div>
                                <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 w-[45%] animate-pulse" />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-4">
                    {!isRunning ? (
                        <button
                            onClick={handleStartMatch}
                            className="bg-white text-black px-6 py-2.5 rounded-full font-bold flex items-center gap-2 hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                        >
                            <Zap size={18} /> {isPractice ? 'START PRACTICE' : 'INITIALIZE PROTOCOL'}
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="bg-green-500 text-white px-6 py-2.5 rounded-full font-bold flex items-center gap-2 hover:bg-green-600 transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)] disabled:opacity-50"
                        >
                            {isSubmitting ? 'UPLOADING...' : <><CheckCircle2 size={18} /> SUBMIT ALGORITHM</>}
                        </button>
                    )}
                </div>
            </header>

            {/* ── Main Layout ───────────────────────────────────────────────── */}
            <main className="flex-1 flex overflow-hidden">

                {/* ── Left Sidebar: Opponents & Problems ── */}
                <aside className={`w-80 border-r border-white/10 flex flex-col bg-[#050505] overflow-y-auto transition-all duration-500 ${isPractice && isRunning ? 'w-0 opacity-0 pointer-events-none' : 'w-80'}`}>
                    <div className="p-6">
                        <h3 className="text-xs uppercase tracking-widest font-bold text-gray-500 mb-6 flex items-center gap-2">
                            <Target size={14} /> {isPractice ? 'Select Training' : 'Global Matchmaking'}
                        </h3>

                        {!isPractice ? (
                            <div className="space-y-3">
                                {OPPONENTS.map((opp) => (
                                    <button
                                        key={opp.id}
                                        onClick={() => !isRunning && setSelectedOpponent(opp)}
                                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${selectedOpponent.id === opp.id
                                            ? 'bg-white/10 border-white/20 ring-1 ring-white/10'
                                            : 'border-transparent hover:bg-white/5 opacity-60'
                                            }`}
                                    >
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center font-bold text-sm">
                                            {opp.avatar}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{opp.name}</p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-gray-400 font-mono">{opp.rp} RP</span>
                                                <span className={`text-[10px] font-bold ${opp.difficulty === 'Master' ? 'text-red-400' :
                                                    opp.difficulty === 'Expert' ? 'text-blue-400' : 'text-green-400'
                                                    }`}>{opp.difficulty}</span>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="p-6 rounded-2xl bg-blue-500/5 border border-blue-500/20">
                                <Shield className="text-blue-500 mb-4" size={32} />
                                <h4 className="font-bold text-lg">Practice Mode</h4>
                                <p className="text-sm text-gray-500 mt-2">No opponents or pressure. Focus on efficiency and code quality.</p>
                            </div>
                        )}
                    </div>
                </aside>

                {/* ── Center: Problem Description ── */}
                <section className="flex-1 flex flex-col overflow-y-auto bg-[#080808]">
                    <div className="p-10 max-w-3xl mx-auto space-y-10">
                        {/* Problem Selection (only before start) */}
                        {!isRunning && (
                            <div className="space-y-4">
                                <h3 className="text-xs uppercase tracking-widest font-bold text-gray-500 flex items-center gap-2">
                                    <BrainCircuit size={14} /> Current Objective
                                </h3>
                                <div className="flex gap-2">
                                    {PROBLEMS.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => {
                                                setSelectedProblem(p);
                                                if (!isPractice) setTimeLeft(p.timeLimit);
                                                setCode(p.initialCode);
                                            }}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${selectedProblem.id === p.id
                                                ? 'bg-white text-black border-white'
                                                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                                                }`}
                                        >
                                            {p.title}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Description Content */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <h1 className="text-4xl font-bold tracking-tight">{selectedProblem.title}</h1>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase border ${selectedProblem.difficulty === 'Easy' ? 'text-green-400 border-green-400/20 bg-green-400/5' :
                                    selectedProblem.difficulty === 'Medium' ? 'text-yellow-400 border-yellow-400/20 bg-yellow-400/5' :
                                        'text-red-400 border-red-400/20 bg-red-400/5'
                                    }`}>
                                    {selectedProblem.difficulty}
                                </span>
                            </div>

                            <p className="text-lg text-gray-300 leading-relaxed font-light">
                                {selectedProblem.description}
                            </p>

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500">Examples</h3>
                                {selectedProblem.examples.map((ex, i) => (
                                    <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6 font-mono text-sm space-y-3">
                                        <div className="flex gap-4">
                                            <span className="text-gray-500 w-12 shrink-0">Input:</span>
                                            <span className="text-blue-400">{ex.input}</span>
                                        </div>
                                        <div className="flex gap-4">
                                            <span className="text-gray-500 w-12 shrink-0">Output:</span>
                                            <span className="text-green-400">{ex.output}</span>
                                        </div>
                                        {ex.explanation && (
                                            <div className="flex gap-4 pt-2 border-t border-white/5">
                                                <span className="text-gray-500 w-12 shrink-0">Note:</span>
                                                <span className="text-gray-400/80 italic">{ex.explanation}</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500">Constraints</h3>
                                <ul className="space-y-2">
                                    {selectedProblem.constraints.map((c, i) => (
                                        <li key={i} className="flex items-center gap-3 text-sm text-gray-400">
                                            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                                            <code>{c}</code>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── Right: Code Editor ── */}
                <section className={`flex-1 flex flex-col border-l border-white/10 transition-all duration-700 bg-black editor-container ${!isRunning ? 'blur-md grayscale opacity-50 pointer-events-none' : ''}`}>
                    <div className="flex-1 relative">
                        <Editor
                            height="100%"
                            defaultLanguage="javascript"
                            theme="vs-dark"
                            value={code}
                            onChange={(val) => setCode(val || '')}
                            options={{
                                fontSize: 14,
                                minimap: { enabled: false },
                                padding: { top: 20 },
                                fontFamily: 'JetBrains Mono, Menlo, Monaco, Courier New, monospace',
                                lineNumbers: 'on',
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                            }}
                        />
                    </div>
                    {/* Visualizer Footer */}
                    <div className="h-48 border-t border-white/10 bg-[#050505] p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Runtime Analysis</h3>
                            <div className="flex gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                    <span className="text-xs text-green-500">Logic Stream Active</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                    <BarChart2 size={12} />
                                    <span className="text-xs uppercase font-mono">Real-time Big O</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-4 h-24 items-end">
                            {[40, 60, 30, 80, 50, 90, 45, 70, 55, 65, 35, 85].map((h, i) => (
                                <div
                                    key={i}
                                    className="flex-1 bg-white/5 rounded-t-sm relative group overflow-hidden"
                                    style={{ height: `${h}%` }}
                                >
                                    <div className="absolute inset-x-0 bottom-0 bg-white/10 group-hover:bg-white/20 transition-all animate-pulse" style={{ height: '30%' }} />
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            {/* ── Match Notification (Ranked Only) ── */}
            {!isRunning && !showResult && !isPractice && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 w-[400px] text-center space-y-6">
                    <div className="p-8 rounded-3xl bg-black border border-white/10 shadow-2xl space-y-6">
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/30 to-white/5 flex items-center justify-center font-bold">
                                    {selectedOpponent.avatar}
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-bold">{selectedOpponent.name}</p>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">{selectedOpponent.rank}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-mono text-gray-400">DIFFICULTY</p>
                                <p className={`text-xs font-bold ${selectedOpponent.difficulty === 'Master' ? 'text-red-400' : 'text-blue-400'
                                    }`}>{selectedOpponent.difficulty}</p>
                            </div>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight">Arena Uplink Ready</h2>
                            <p className="text-sm text-gray-500 mt-2 italic">Waiting for operator initialization...</p>
                        </div>
                        <button
                            onClick={handleStartMatch}
                            className="w-full bg-white text-black py-4 rounded-2xl font-black text-sm tracking-widest uppercase hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                        >
                            <Sword size={18} /> INITIALIZE BATTLE
                        </button>
                    </div>
                </div>
            )}

            {/* ── Practice Notification ── */}
            {!isRunning && !showResult && isPractice && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 w-[400px] text-center space-y-6">
                    <div className="p-8 rounded-3xl bg-black border border-white/10 shadow-2xl space-y-6">
                        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex flex-col items-center gap-3">
                            <Shield className="text-blue-400" size={40} />
                            <div className="text-center">
                                <p className="text-lg font-bold">Training Protocol</p>
                                <p className="text-xs text-blue-400 uppercase tracking-widest font-mono">Unranked • No Limits</p>
                            </div>
                        </div>
                        <button
                            onClick={handleStartMatch}
                            className="w-full bg-white text-black py-4 rounded-2xl font-black text-sm tracking-widest uppercase hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                        >
                            <Zap size={18} /> BEGIN TRAINING
                        </button>
                    </div>
                </div>
            )}

            {/* ── Result Modal ───────────────────────────────────────────── */}
            {showResult && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
                    <div className="w-full max-w-lg bg-[#080808] border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className={`p-1 text-center text-[10px] font-black tracking-[0.2em] uppercase ${isPractice ? 'bg-blue-500 text-white' : (score.result === 'VICTORY' ? 'bg-green-500 text-black' : 'bg-red-500 text-white')
                            }`}>
                            Session Conclusion: {score.result}
                        </div>

                        <div className="p-10 space-y-8">
                            <div className="flex justify-center">
                                <div className="w-24 h-24 rounded-full border border-white/10 bg-white/5 flex items-center justify-center relative">
                                    {isPractice ? (
                                        <BrainCircuit size={40} className="text-blue-400" />
                                    ) : (score.result === 'VICTORY' ? (
                                        <Award size={40} className="text-yellow-400" />
                                    ) : (
                                        <AlertCircle size={40} className="text-red-400" />
                                    ))}
                                    <div className="absolute inset-0 rounded-full border border-white/20 animate-ping opacity-20" />
                                </div>
                            </div>

                            <div className="text-center space-y-2">
                                <h2 className="text-4xl font-bold">{isPractice ? 'Module Completed' : (score.result === 'VICTORY' ? 'Objective Secured' : 'System Failure')}</h2>
                                <p className="text-gray-500 font-mono text-xs">LOG_ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                                    <p className="text-[10px] uppercase text-gray-500 font-bold mb-1">Code Accuracy</p>
                                    <p className="text-2xl font-bold">{score.accuracy}%</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                                    <p className="text-[10px] uppercase text-gray-500 font-bold mb-1">{isPractice ? 'Time Taken' : 'Time Bonus'}</p>
                                    <p className={`text-2xl font-bold ${isPractice ? 'text-white' : 'text-blue-400'}`}>
                                        {isPractice ? formatTime(score.timeTaken) : `+${score.timeBonus}`}
                                    </p>
                                </div>
                            </div>

                            {!isPractice && (
                                <div className="p-6 rounded-2xl bg-gradient-to-r from-white/10 to-transparent border border-white/10 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-bold">Protocol Rating Change</p>
                                        <p className="text-xs text-gray-400 mt-0.5">Updated Rank Data Synchronized</p>
                                    </div>
                                    <div className={`text-2xl font-black ${score.result === 'VICTORY' ? 'text-green-400' : 'text-red-400'}`}>
                                        {score.result === 'VICTORY' ? '+42' : '-18'} RP
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => navigate('/dashboard')}
                                    className="flex-1 bg-white text-black py-4 rounded-2xl font-bold text-sm hover:bg-gray-200 transition-colors"
                                >
                                    RETURN TO COMMAND
                                </button>
                                <button
                                    onClick={() => { setShowResult(false); setIsRunning(false); setTimeLeft(isPractice ? 0 : selectedProblem.timeLimit); }}
                                    className="px-6 border border-white/10 rounded-2xl hover:bg-white/5 transition-colors"
                                >
                                    RETRY
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
