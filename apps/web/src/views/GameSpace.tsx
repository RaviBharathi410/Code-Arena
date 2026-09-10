import React, { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import { useNav } from '../navigation/NavigationContext';
import gsap from 'gsap';
import { useMatch } from '../contexts/MatchContext';
import { useSocket } from '../hooks/useSocket';
import { useBattleFocusWarning } from '../hooks/useBattleFocusWarning';
import { VoiceWorkspaceModal } from '../components/arena/VoiceWorkspaceModal';
import { BattleFocusWarningModal } from '../components/arena/BattleFocusWarningModal';
import {
    Activity,
    X,
    CheckCircle2,
    Zap,
    Shield,
    Signal,
    WifiOff,
    Terminal,
    Cpu,
    Layers,
    Timer,
    Flame,
    TrendingUp,
    Menu,
    Wand2,
    BookOpen,
    Target,
    Clock,
    FileCode,
    RotateCcw,
    Sparkles,
    Copy,
    Check,
    Radio,
    ChevronRight,
    Users,
    AlertTriangle,
    Eye,
    Bug,
    Lightbulb,
    HelpCircle,
    ArrowRight,
    LogOut
} from 'lucide-react';
import { useLayout } from '../contexts/LayoutContext';
import api from '../lib/api';

// ── Types ────────────────────────────────────────────────────────────────
import type { Problem as SharedProblem } from '../types';

interface GameProblem extends Omit<SharedProblem, 'constraints' | 'testCases'> {
    timeLimit: number; // in seconds
    initialCode: string;
    examples: { input: string; output: string; explanation?: string }[];
    constraints: string | string[];
    testCases: { input: any; expected: any }[];
    tags?: string[];
    acceptanceRate?: string;
}

// ── Text Formatter Helper ──────────────────────────────────────────────────
// Formats inline code variables (e.g. `nums`, `target`, `A[i]`) into styled cyber monospace pills
export const renderCyberText = (text: string, isLight?: boolean) => {
    if (!text) return null;
    const parts = text.split(/(`[^`]+`)/g);
    return (
        <span>
            {parts.map((part, idx) => {
                if (part.startsWith('`') && part.endsWith('`')) {
                    const content = part.slice(1, -1);
                    return (
                        <code
                            key={idx}
                            className={`px-1.5 py-0.5 mx-0.5 rounded font-mono text-[12px] font-semibold ${isLight
                                    ? 'bg-purple-100 text-purple-900 border border-purple-300'
                                    : 'bg-accent-secondary/15 text-accent-primary border border-accent-secondary/30'
                                }`}
                        >
                            {content}
                        </code>
                    );
                }
                return <span key={idx}>{part}</span>;
            })}
        </span>
    );
};

// ── Data ──────────────────────────────────────────────────────────────────

const PROBLEMS: GameProblem[] = [
    {
        id: 'two-sum',
        title: 'Two Sum',
        slug: 'two-sum',
        category: 'Algorithms',
        tags: ['Array', 'Hash Table', 'Two Pointers'],
        acceptanceRate: '84.2%',
        boilerplate: {},
        difficulty: 'EASY',
        timeLimit: 300,
        description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`. You may assume that each input would have exactly one solution, and you may not use the same element twice.',
        examples: [
            { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]', explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].' },
            { input: 'nums = [3,2,4], target = 6', output: '[1,2]', explanation: 'Because nums[1] + nums[2] == 6, we return [1, 2].' }
        ],
        constraints: ['2 <= nums.length <= 10^4', '-10^9 <= nums[i] <= 10^9', '-10^9 <= target <= 10^9', 'Only one valid answer exists.'],
        initialCode: 'function twoSum(nums, target) {\n    // Write your code here\n}',
        testCases: [
            { input: [[2, 7, 11, 15], 9], expected: [0, 1] },
            { input: [[3, 2, 4], 6], expected: [1, 2] }
        ]
    },
    {
        id: 'reverse-list',
        title: 'Reverse Linked List',
        slug: 'reverse-list',
        category: 'Algorithms',
        tags: ['Linked List', 'Recursion'],
        acceptanceRate: '76.8%',
        boilerplate: {},
        difficulty: 'EASY',
        timeLimit: 300,
        description: 'Given the `head` of a singly linked list, reverse the list, and return the reversed list.',
        examples: [
            { input: 'head = [1,2,3,4,5]', output: '[5,4,3,2,1]' },
            { input: 'head = [1,2]', output: '[2,1]' }
        ],
        constraints: ['The number of nodes in the list is the range [0, 5000].', '-5000 <= Node.val <= 5000'],
        initialCode: 'function reverseList(head) {\n    // Write your code here\n}',
        testCases: []
    },
    {
        id: 'valid-parens',
        title: 'Valid Parentheses',
        slug: 'valid-parens',
        category: 'Algorithms',
        tags: ['String', 'Stack'],
        acceptanceRate: '68.5%',
        boilerplate: {},
        difficulty: 'MEDIUM',
        timeLimit: 600,
        description: 'Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid. An input string is valid if open brackets are closed by the same type of brackets, and in the correct order.',
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

function toGameProblem(prob: any): GameProblem {
    return {
        ...prob,
        id: prob.id || prob._id || prob.slug,
        timeLimit: prob.timeLimit || 600,
        initialCode: prob.baseCode || prob.boilerplate?.['javascript'] || prob.boilerplate?.['js'] || 'function solution() {\n    // Write your code here\n}',
        constraints: prob.constraints || [],
        examples: prob.examples || [],
        testCases: (prob.testCases || []).map((tc: any) => ({ input: tc.input, expected: tc.expected_output ?? tc.expected })),
    };
}

export const GameSpace: React.FC = () => {
    const { goToDashboard, goToProblems, params: navParams, currentPage } = useNav();
    const { setIsMenuOpen, isLight } = useLayout();
    const isPractice = currentPage === 'arena_practice' || currentPage === 'arena_solo' || navParams.practiceType != null;

    const { connect, socket, connected: isSocketConnected } = useSocket();
    const {
        createRoom, joinMatch, joinById, updateCode: syncCode,
        problem: activeProblem, winner,
        opponentCode: liveOpponentCode, submitCode: socketSubmit,
        runCode: socketRun,
        verdict, runVerdict, error: matchError,
        players, status: matchStatus, startedAt, durationMs
    } = useMatch();


    const [selectedProblem, setSelectedProblem] = useState<GameProblem>(PROBLEMS[0]);
    // Selected variables
    const [code, setCode] = useState(selectedProblem.initialCode);
    const [isComplete, setIsComplete] = useState(false);
    const [showProblem, setShowProblem] = useState(true);

    // Practice Lab: Problem Switching State (Task 1: Only in practice lab modes)
    const [showProblemPicker, setShowProblemPicker] = useState(false);
    const [practiceProblemList, setPracticeProblemList] = useState<any[]>(PROBLEMS);
    const [isSwitchingProblem, setIsSwitchingProblem] = useState(false);

    // Phase 14: Practice Lab Mode State
    const [practiceSession, setPracticeSession] = useState<{
        mode: string;
        title: string;
        description: string;
        timeLimitSeconds?: number;
        problems: any[];
        isDiagnostic?: boolean;
        targetCategory?: string;
    } | null>(null);
    const [practiceProblemIndex, setPracticeProblemIndex] = useState(0);
    const [advanceNotice, setAdvanceNotice] = useState<string | null>(null);
    const [practiceSolvedCount, setPracticeSolvedCount] = useState(0);

    // Phase 14B: AI Socratic Hint & Coaching Engine State
    const [aiHint, setAiHint] = useState<{ hint: string; focusArea?: string; level?: number } | null>(null);
    const [aiCoachTab, setAiCoachTab] = useState<'hint' | 'explain' | 'debug' | 'optimize'>('hint');
    const [aiExplanation, setAiExplanation] = useState<string | null>(null);
    const [aiDebugResult, setAiDebugResult] = useState<{ diagnosis: string; likelyCause: string; suggestedFix: string } | null>(null);
    const [aiOptimizeResult, setAiOptimizeResult] = useState<{ refactoredCode: string; timeComplexity: string; spaceComplexity: string; explanation: string } | null>(null);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [hintError, setHintError] = useState<string | null>(null);
    const [copiedOptCode, setCopiedOptCode] = useState(false);
    const [language, setLanguage] = useState('javascript');
    const [showAbandonModal, setShowAbandonModal] = useState(false);

    const handleAbandonBattle = useCallback(() => {
        try {
            if (socket && isSocketConnected) {
                socket.emit('match:forfeit', { matchId: navParams?.matchId });
                socket.emit('room:leave');
            }
        } catch (e) {
            console.warn('[ABANDON] Error emitting forfeit signal:', e);
        }
        setIsRunning(false);
        setIsComplete(true);
        goToDashboard();
    }, [socket, isSocketConnected, navParams?.matchId, goToDashboard]);

    // Switch practice problem handler
    const handleSelectPracticeProblem = useCallback((prob: any) => {
        try {
            const gameProb = toGameProblem(prob);
            setSelectedProblem(gameProb);
            const template = getTemplate(language, gameProb);
            setCode(template);
            syncCode(template);
            setShowProblem(true);
            setShowProblemPicker(false);
            if (isPractice) {
                createRoom('practice', gameProb.id);
            }
        } catch (err) {
            console.error('Failed to select practice problem', err);
        }
    }, [language, isPractice, syncCode, createRoom]);

    const handleNextRandomPracticeProblem = useCallback(async () => {
        try {
            setIsSwitchingProblem(true);
            const res = await api.get('/problems/random');
            const p = res.data?.data || res.data;
            if (p) {
                handleSelectPracticeProblem(p);
            }
        } catch (err) {
            console.error('Failed to roll random practice problem', err);
        } finally {
            setIsSwitchingProblem(false);
        }
    }, [handleSelectPracticeProblem]);

    // Fetch problem list for picker modal
    useEffect(() => {
        if (showProblemPicker && isPractice) {
            api.get('/problems?limit=40')
                .then(res => {
                    const list = res.data?.data || res.data;
                    if (Array.isArray(list) && list.length > 0) {
                        setPracticeProblemList(list);
                    }
                })
                .catch(() => { });
        }
    }, [showProblemPicker, isPractice]);

    // Timer state
    const [timeLeft, setTimeLeft] = useState(isPractice ? 0 : selectedProblem.timeLimit);
    const [isRunning, setIsRunning] = useState(isPractice); // Practice mode is active immediately
    const [showResults, setShowResults] = useState(false);
    const [score, setScore] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isRunningCode, setIsRunningCode] = useState(false);
    const [runResultData, setRunResultData] = useState<any>(null);

    // Auto-switch to terminal tab on mobile when code finishes executing
    useEffect(() => {
        if (runResultData && typeof window !== 'undefined' && window.innerWidth < 1024) {
            setMobileActiveTab('terminal');
        }
    }, [runResultData]);

    // Monaco Editor Ref & Resize Handling
    const editorRef = useRef<any>(null);
    const handleEditorMount = useCallback((editor: any) => {
        editorRef.current = editor;
    }, []);

    const triggerEditorLayout = useCallback(() => {
        if (editorRef.current) {
            editorRef.current.layout();
        }
    }, []);

    // Mobile / Responsive Layout Tab State ('problem' | 'editor' | 'terminal' | 'intel')
    const [mobileActiveTab, setMobileActiveTab] = useState<'problem' | 'editor' | 'terminal' | 'intel'>('editor');
    const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth < 1024);

    useEffect(() => {
        const handleResize = () => {
            const isMobile = window.innerWidth < 1024;
            setIsMobileViewport(isMobile);
            triggerEditorLayout();
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [triggerEditorLayout]);

    // Terminal Panel State
    const [isTerminalOpen, setIsTerminalOpen] = useState(true);
    const [isTerminalMaximized, setIsTerminalMaximized] = useState(false);
    const [activeTerminalTab, setActiveTerminalTab] = useState<'testcases' | 'terminal'>('testcases');
    const [selectedTestCaseTab, setSelectedTestCaseTab] = useState(0);
    const [useCustomTestcases, setUseCustomTestcases] = useState(false);
    const [customInputs, setCustomInputs] = useState('');

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
    const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
    const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
    // Cosmetic battle activity feed (derived purely from existing local state flags)
    const [battleFeed, setBattleFeed] = useState<Array<{ id: string; text: string; time: string; type: 'info' | 'warn' | 'success' }>>([
        { id: '1', text: 'Tactical Uplink established // Arena ready', time: '00:00', type: 'info' }
    ]);
    const [copiedInputIdx, setCopiedInputIdx] = useState<number | null>(null);

    const SUPPORTED_LANGUAGES = [
        { id: 'javascript', name: 'JS', icon: 'JS', backendId: 'js' },
        { id: 'python', name: 'PY', icon: 'PY', backendId: 'py' },
        { id: 'java', name: 'JV', icon: 'JV', backendId: 'java' },
        { id: 'cpp', name: 'C++', icon: 'C++', backendId: 'cpp' },
        { id: 'c', name: 'C', icon: 'C', backendId: 'c' },
    ];

    const getTemplate = (langId: string, problem: GameProblem) => {
        const lang = SUPPORTED_LANGUAGES.find(l => l.id === langId) || SUPPORTED_LANGUAGES[0];

        if (problem && problem.boilerplate) {
            let template = '';

            if (Array.isArray(problem.boilerplate)) {
                // Handle LeetCode style array
                const snippet = problem.boilerplate.find((s: any) =>
                    s.langSlug === lang.id ||
                    s.langSlug === lang.backendId ||
                    (lang.id === 'python' && (s.langSlug === 'python3' || s.langSlug === 'py'))
                );
                if (snippet) template = snippet.code;
            } else {
                // Handle dict style
                const bp = problem.boilerplate as Record<string, string>;
                template = bp[lang.id] || bp[lang.backendId] || bp[lang.id.replace('javascript', 'js').replace('python', 'py')];
            }
            if (template) return template;
        }

        switch (langId) {
            case 'python':
                return `class Solution:\n    def solve(self):\n        # Write your code here\n        pass\n`;
            case 'java':
                return `public class Solution {\n    public static void main(String[] args) {\n        // Write your code here\n    }\n}\n`;
            case 'cpp':
                return `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    return 0;\n}\n`;
            case 'c':
                return `#include <stdio.h>\n\nint main() {\n    // Write your code here\n    return 0;\n}\n`;
            default:
                return `function solution() {\n    // Write your code here\n}\n`;
        }
    };

    const timerRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Force show problem on load
    useEffect(() => {
        setShowProblem(true);
    }, []);

    // Initial State Setup
    useEffect(() => {
        connect();

        // If we have a matchId in nav params, join the room by ID
        const matchId = navParams.matchId;
        if (matchId) {
            joinById(matchId);
        } else if (isPractice) {
            // Auto create/join practice socket room with target problem ID
            const targetProblemId = navParams.practiceType || navParams.problemId || 'coach';
            const isSpecialMode = ['speed', 'focus', 'adaptive', 'coach'].includes(targetProblemId);
            const probIdToSend = isSpecialMode ? undefined : targetProblemId;
            createRoom('practice', probIdToSend);
        }
    }, [navParams.matchId, navParams.practiceType, navParams.problemId, isPractice, isSocketConnected, connect, joinById, createRoom]);

    useEffect(() => {
        const problemId = navParams.practiceType || navParams.problemId || (isPractice ? 'coach' : undefined);
        if (problemId) {
            const fetchProblem = async () => {
                try {
                    setIsAnalyzing(true);

                    const isSpecialMode = ['speed', 'focus', 'adaptive', 'coach'].includes(problemId);
                    if (isSpecialMode) {
                        try {
                            const sessionRes = await api.get(`/practice/session?mode=${problemId}`);
                            const sessionData = sessionRes.data;
                            if (sessionData && sessionData.problems && sessionData.problems.length > 0) {
                                setPracticeSession(sessionData);
                                setPracticeProblemIndex(0);
                                const firstProb = toGameProblem(sessionData.problems[0]);
                                setSelectedProblem(firstProb);
                                setCode(getTemplate(language, firstProb));
                                setTimeLeft(sessionData.timeLimitSeconds || 0);
                                setIsRunning(true);
                                setShowProblem(true);
                                // Ensure socket practice room is bound to this problem
                                createRoom('practice', firstProb.id);
                                return;
                            }
                        } catch (sessionErr) {
                            console.warn('Could not fetch practice session from /practice/session, falling back', sessionErr);
                        }
                    }

                    const url = isSpecialMode ? `/problems/random` : `/problems/${problemId}`;
                    const res = await api.get(url);
                    const prob = res.data;

                    if (prob) {
                        const gameProb = toGameProblem(prob);
                        setSelectedProblem(gameProb);
                        setCode(getTemplate(language, gameProb));
                        setShowProblem(true);
                        setIsRunning(true);
                    }
                } catch (err) {
                    console.error('Failed to fetch practice problem', err);
                } finally {
                    setIsAnalyzing(false);
                }
            };
            fetchProblem();
        }
    }, [navParams.practiceType, navParams.problemId, isPractice, createRoom, language]);

    useEffect(() => {
        if (activeProblem) {
            const gameProb: GameProblem = {
                ...activeProblem,
                id: (activeProblem as any).id || (activeProblem as any)._id || activeProblem.slug,
                initialCode: (activeProblem as any).baseCode || activeProblem.boilerplate?.['javascript'] || activeProblem.boilerplate?.['js'] || 'function solution() {\n    // Write your code here\n}',
                timeLimit: 600,
                constraints: activeProblem.constraints || [],
                examples: activeProblem.examples || [],
                testCases: (activeProblem.testCases || []).map((tc: any) => ({ input: tc.input, expected: tc.expected_output ?? tc.expected })),
            } as GameProblem;
            setSelectedProblem(gameProb);
            setCode(gameProb.initialCode);
        }
    }, [activeProblem]);

    // Monitor tab departures, focus breaches, and beforeunload during active battle
    const isBattleActive = isRunning && !isComplete;
    const {
        infractionCount,
        showWarningModal: showFocusWarningModal,
        dismissWarning: dismissFocusWarning,
    } = useBattleFocusWarning({
        isActive: isBattleActive,
        battleType: isPractice ? 'Practice Lab' : 'Ranked Duel Arena',
    });

    // Simulated WebRTC Signal Fluctuations
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowLanguageDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
        setIsAnalyzing(true);
        const debounceTimer = setTimeout(() => {
            const analyzeCode = (sourceCode: string) => {
                if (!sourceCode || sourceCode.trim().length === 0) {
                    return { complexity: 'O(1)', strategy: 'Idle', confidence: 0 };
                }

                const lines = sourceCode.split('\n');

                // --- Multi-Language Syntax Parsing ---
                // Detect recursion
                let hasRecursion = false;
                const funcMatches = [
                    // JS/TS: function foo( or const foo = (
                    sourceCode.match(/function\s+([a-zA-Z0-9_$]+)\s*\(/),
                    sourceCode.match(/(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\(/),
                    // Python: def foo(
                    sourceCode.match(/def\s+([a-zA-Z0-9_]+)\s*\(/),
                    // C/C++/Java: returnType foo(
                    sourceCode.match(/(?:void|int|bool|string|vector<[^>]+>|public\s+[a-zA-Z0-9_<>[\]]+\s+)([a-zA-Z0-9_]+)\s*\(/)
                ];

                for (const m of funcMatches) {
                    if (m && m[1] && m[1] !== 'main' && m[1] !== 'solve' && m[1] !== 'solution') {
                        const name = m[1];
                        const re = new RegExp(`\\b${name}\\s*\\(`, 'g');
                        const matches = sourceCode.match(re);
                        if (matches && matches.length > 1) {
                            hasRecursion = true;
                            break;
                        }
                    }
                }

                // If function name is generic like solve or solution, check recursive calls
                if (!hasRecursion) {
                    const genericMatches = sourceCode.match(/\b(solve|solution|dfs|bfs|helper|recurse)\s*\(/g);
                    if (genericMatches && genericMatches.length > 1) {
                        hasRecursion = true;
                    }
                }

                // Detect nested loop depth
                let maxLoopDepth = 0;
                let currentDepth = 0;

                // Indentation-based tracking for Python
                const isPython = language === 'python' || /def\s+\w+\s*\(/.test(sourceCode);
                if (isPython) {
                    const loopIndents: number[] = [];
                    lines.forEach(line => {
                        const trimmed = line.trim();
                        if (!trimmed || trimmed.startsWith('#')) return;

                        // Calculate indentation level
                        const indent = line.search(/\S/);
                        while (loopIndents.length > 0 && loopIndents[loopIndents.length - 1] >= indent) {
                            loopIndents.pop();
                        }

                        if (/^(for\s+\w+\s+in|while\s+)/.test(trimmed)) {
                            loopIndents.push(indent);
                            maxLoopDepth = Math.max(maxLoopDepth, loopIndents.length);
                        }
                    });
                } else {
                    // Bracket-based tracking for JS, C++, C, Java
                    lines.forEach(line => {
                        if (/for\s*\(|while\s*\(|\.forEach\s*\(|\.map\s*\(/.test(line)) {
                            currentDepth++;
                            maxLoopDepth = Math.max(maxLoopDepth, currentDepth);
                        }
                        if (line.includes('}')) {
                            currentDepth = Math.max(0, currentDepth - 1);
                        }
                    });
                }

                // Data structures & algorithms detection
                const hasHashMap = /Map|Set|\{\}|Object\.create|dict\(|defaultdict|Counter|unordered_map|unordered_set|HashMap|HashSet/.test(sourceCode);
                const hasBinarySearch = /(while\s*\(?.*[<]=?.*|while\s+.*[<]=?.*:)/.test(sourceCode) && /(mid|middle|\/\/\s*2|>>\s*1)/.test(sourceCode);
                const hasSorting = /(\.sort\(|sorted\(|\bsort\s*\(|Arrays\.sort|Collections\.sort)/.test(sourceCode);
                const hasDP = /(dp\[|memo\[|new\s+Array|dp\s*=\s*\[|@lru_cache)/.test(sourceCode) && (maxLoopDepth > 0 || hasRecursion);
                const hasStack = /(stack|push|pop|\.append\(|\.pop\()/.test(sourceCode.toLowerCase()) && /(\[\]|vector|Deque|Stack<)/.test(sourceCode);
                const hasPointers = /(left\s*\+\+|right\s*--|i\s*\+\+|j\s*--|left\s*\+=|right\s*-=)/.test(sourceCode) && /(left|right|start|end|low|high)/.test(sourceCode);
                const hasSlidingWindow = (hasPointers || hasHashMap) && /(window|size|k|len)/.test(sourceCode) && maxLoopDepth <= 1;

                // --- Determine Complexity ---
                let complexity = 'O(1)';
                if (hasRecursion) {
                    complexity = 'O(2^N)';
                } else if (maxLoopDepth >= 3) {
                    complexity = 'O(N³)';
                } else if (maxLoopDepth === 2) {
                    complexity = 'O(N²)';
                } else if (hasSorting) {
                    complexity = 'O(N log N)';
                } else if (hasBinarySearch) {
                    complexity = 'O(log N)';
                } else if (maxLoopDepth === 1) {
                    complexity = 'O(N)';
                } else if (sourceCode.length > 40) {
                    complexity = 'O(1)';
                }

                // Refine for JS functional iterations if not caught
                if (!isPython && (sourceCode.includes('.map(') || sourceCode.includes('.forEach(') || sourceCode.includes('.filter('))) {
                    if (complexity === 'O(1)') complexity = 'O(N)';
                    else if (complexity === 'O(N)' && maxLoopDepth >= 1) complexity = 'O(N²)';
                }

                // --- Strategy Detection ---
                let strategy = 'Iterative Scan';
                let conf = 75;

                if (hasDP) {
                    strategy = 'Dynamic Programming';
                    conf = 94;
                } else if (hasSlidingWindow) {
                    strategy = 'Sliding Window';
                    conf = 88;
                } else if (hasPointers) {
                    strategy = 'Two Pointers';
                    conf = 90;
                } else if (hasBinarySearch) {
                    strategy = 'Binary Search';
                    conf = 96;
                } else if (hasStack) {
                    strategy = 'Stack / LIFO';
                    conf = 91;
                } else if (hasHashMap && maxLoopDepth <= 1) {
                    strategy = 'Hash Map / Constant Lookup';
                    conf = 89;
                } else if (hasRecursion) {
                    strategy = 'Recursion / Divide & Conquer';
                    conf = 92;
                } else if (maxLoopDepth >= 2) {
                    strategy = 'Nested Scan / Brute Force';
                    conf = 85;
                } else if (maxLoopDepth === 1) {
                    strategy = 'Linear Traversal';
                    conf = 80;
                } else {
                    strategy = 'Direct Computation';
                    conf = 70;
                }

                return { complexity, strategy, confidence: conf };
            };

            const results = analyzeCode(code);

            setLiveComplexity(prev => {
                if (prev !== results.complexity) {
                    gsap.fromTo('.complexity-badge',
                        { scale: 1.2, color: '#22c55e' },
                        { scale: 1, color: '#4b5563', duration: 0.5 }
                    );
                }
                return results.complexity;
            });

            setLiveStrategy(results.strategy);
            setConfidence(results.confidence);
            setIsAnalyzing(false);
        }, 300);

        return () => clearTimeout(debounceTimer);
    }, [code, language]);

    useEffect(() => {
        if (matchStatus === 'active' && startedAt) {
            setIsRunning(true);
        }
    }, [matchStatus, startedAt]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const confirmExit = useCallback(() => {
        setIsRunning(false);
        setShowExitWarning(false);
        goToDashboard();
    }, [goToDashboard]);

    const handleSubmit = useCallback(() => {
        if (isSubmitting || isComplete) return;
        if (!isSocketConnected) {
            console.error('Socket not connected');
            return;
        }

        setIsSubmitting(true);
        setSubmissionStatus('running');
        setIsTerminalOpen(true);
        setActiveTerminalTab('terminal');

        // Safety timeout: 20s
        setTimeout(() => {
            setIsSubmitting(prev => {
                if (prev) {
                    console.warn('Submission timed out');
                    setSubmissionStatus('failed');
                }
                return false;
            });
        }, 20000);

        const langDef = SUPPORTED_LANGUAGES.find(l => l.id === language) || SUPPORTED_LANGUAGES[0];

        // Real submission via socket
        socketSubmit(code, langDef.backendId);

        // Mark local as complete
        setIsComplete(true);
    }, [isSubmitting, isComplete, socketSubmit, code, language, isSocketConnected]);

    const handleAutoSubmit = useCallback(() => {
        clearInterval(timerRef.current);
        handleSubmit();
    }, [handleSubmit]);

    useEffect(() => {
        if (isRunning) {
            timerRef.current = setInterval(() => {
                if (!isPractice && startedAt && durationMs) {
                    const now = Date.now();
                    const start = new Date(startedAt).getTime();
                    const elapsed = now - start;
                    const remaining = Math.max(0, Math.floor((durationMs - elapsed) / 1000));
                    setTimeLeft(remaining);
                    if (remaining <= 0) {
                        handleAutoSubmit();
                    }
                } else if (isPractice && practiceSession?.mode === 'speed') {
                    setTimeLeft(prev => {
                        if (prev <= 1) {
                            handleAutoSubmit();
                            return 0;
                        }
                        return prev - 1;
                    });
                } else if (isPractice) {
                    // Stopwatch elapsed counter for practice modes (AI Coach, Deep Focus, Weakness Fix)
                    setTimeLeft(prev => prev + 1);
                } else {
                    // Solo offline countdown
                    setTimeLeft(prev => {
                        if (prev <= 1) {
                            handleAutoSubmit();
                            return 0;
                        }
                        return prev - 1;
                    });
                }
            }, 1000);
        }

        return () => clearInterval(timerRef.current);
    }, [isRunning, isPractice, startedAt, durationMs, practiceSession, handleAutoSubmit]);

    const handleRun = useCallback(() => {
        if (isRunningCode || isSubmitting || isComplete) return;
        if (!isSocketConnected) {
            console.error('Socket not connected');
            return;
        }

        setIsRunningCode(true);
        setRunResultData(null);
        setIsTerminalOpen(true);
        setActiveTerminalTab('terminal');

        // Safety timeout: 15s
        setTimeout(() => {
            setIsRunningCode(prev => {
                if (prev) console.warn('Run execution timed out');
                return false;
            });
        }, 15000);

        const langDef = SUPPORTED_LANGUAGES.find(l => l.id === language) || SUPPORTED_LANGUAGES[0];
        const payloadCustomInputs = useCustomTestcases ? customInputs : undefined;
        socketRun(code, langDef.backendId, payloadCustomInputs);
    }, [isRunningCode, isSubmitting, isComplete, socketRun, code, language, isSocketConnected, useCustomTestcases, customInputs]);

    useEffect(() => {
        console.log("🔥 runVerdict =", runVerdict);

        if (runVerdict && isRunningCode) {
            console.log("🔥 Updating UI with verdict");

            setIsRunningCode(false);
            setRunResultData(runVerdict);
            if (runVerdict.timeComplexity) {
                setLiveComplexity(runVerdict.timeComplexity);
            }
        }
    }, [runVerdict, isRunningCode]);
    // Handle Match Errors to prevent hangs
    useEffect(() => {
        if (matchError) {
            setIsRunningCode(false);
            setIsSubmitting(false);
            // Optionally show error to user
            console.error('Match Error:', matchError);
        }
    }, [matchError]);

    useEffect(() => {
        if (verdict && isSubmitting) {
            const isSuccess = verdict.status?.toLowerCase() === 'accepted';
            setSubmissionStatus(isSuccess ? 'passed' : 'failed');
            setShowScoreImpact(true);
            setRunResultData(verdict);
            if (verdict.timeComplexity) {
                setLiveComplexity(verdict.timeComplexity);
            }

            if (!isSuccess) {
                // Allow user to edit and re-submit on wrong answer/failure
                setIsSubmitting(false);
                setIsComplete(false);
            }

            // If it's a practice session, check for speed run auto-advance or show completion
            if (isPractice) {
                if (isSuccess && practiceSession && practiceSession.mode === 'speed' && practiceProblemIndex < practiceSession.problems.length - 1) {
                    const nextIdx = practiceProblemIndex + 1;
                    const nextProb = toGameProblem(practiceSession.problems[nextIdx]);
                    setPracticeSolvedCount(c => c + 1);
                    setAdvanceNotice(`Problem ${practiceProblemIndex + 1} Cleared! Advancing to Problem ${nextIdx + 1} of ${practiceSession.problems.length}...`);
                    createRoom('practice', nextProb.id);
                    setTimeout(() => {
                        setPracticeProblemIndex(nextIdx);
                        setSelectedProblem(nextProb);
                        setCode(getTemplate(language, nextProb));
                        setIsSubmitting(false);
                        setIsComplete(false);
                        setSubmissionStatus('idle');
                        setRunResultData(null);
                        setAdvanceNotice(null);
                        setShowScoreImpact(false);
                        setAiHint(null);
                    }, 1800);
                    return;
                }

                setTimeout(() => {
                    setIsRunning(false);
                    const timeTaken = timeLeft;

                    setScore({
                        accuracy: isSuccess ? 100 : Math.round((verdict.testCasesPass / verdict.testCasesTotal) * 100),
                        timeBonus: 0,
                        rpGain: 0,
                        expectedGain: 0,
                        streakBonus: 0,
                        timeTaken,
                        executionTime: verdict.timeMs || 0,
                        memoryMB: verdict.memoryKb ? (verdict.memoryKb / 1024).toFixed(2) : 0,
                        cpuCycles: '2.1M',
                        inputSize: 'Practice Task',
                        percentileSpeed: isSuccess ? 85 : 0,
                        percentileMemory: isSuccess ? 40 : 0,
                        benchmarks: { top10Memory: 9.1, globalAvgMemory: 18.4 },
                        efficiency: isSuccess ? 95 : 0,
                        complexity: verdict.timeComplexity || liveComplexity,
                        heatmap: Array.from({ length: 12 }, () => Math.floor(Math.random() * 100)),
                        result: isSuccess ? 'COMPLETED' : 'FAILED',
                        practiceSummary: practiceSession ? {
                            mode: practiceSession.mode,
                            title: practiceSession.title,
                            solved: practiceSolvedCount + (isSuccess ? 1 : 0),
                            total: practiceSession.problems.length,
                        } : undefined
                    });

                    setIsSubmitting(false);
                    setShowResults(true);
                    setShowScoreImpact(false);
                }, 2000);
            }
        }
    }, [verdict, isSubmitting, isPractice, timeLeft, liveComplexity, practiceSession, practiceProblemIndex, language, createRoom, practiceSolvedCount]);

    // ── Phase 14B: AI Coach & Assistant Capabilities ─────────────────────────
    const requestAiHint = useCallback(async () => {
        if (isAiLoading) return;
        setIsAiLoading(true);
        setHintError(null);
        setAiCoachTab('hint');
        try {
            const res = await api.post('/ai/hint', {
                code,
                problemTitle: selectedProblem.title,
                problemDescription: selectedProblem.description,
                language,
                isPractice,
            });
            if (res.data?.hint) {
                setAiHint({
                    hint: res.data.hint,
                    focusArea: res.data.focusArea,
                    level: res.data.level,
                });
            }
        } catch (err: any) {
            const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to generate Socratic hint';
            setHintError(msg);
        } finally {
            setIsAiLoading(false);
        }
    }, [code, selectedProblem, language, isPractice, isAiLoading]);

    const requestAiExplain = useCallback(async () => {
        if (isAiLoading) return;
        setIsAiLoading(true);
        setHintError(null);
        setAiCoachTab('explain');
        try {
            const res = await api.post('/ai/explain', {
                code,
                language,
                isPractice,
            });
            if (res.data?.explanation) {
                setAiExplanation(res.data.explanation);
            }
        } catch (err: any) {
            const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to generate code explanation';
            setHintError(msg);
        } finally {
            setIsAiLoading(false);
        }
    }, [code, language, isPractice, isAiLoading]);

    const requestAiDebug = useCallback(async () => {
        if (isAiLoading) return;
        setIsAiLoading(true);
        setHintError(null);
        setAiCoachTab('debug');
        try {
            const stderr = runResultData?.stderr || runResultData?.compile_output || '';
            const status = runResultData?.status || 'RUNTIME_INSPECTION';
            const failedTestCase = runResultData?.results?.find((r: any) => !r.passed) || null;

            const res = await api.post('/ai/debug', {
                code,
                language,
                stderr,
                status,
                failedTestCase,
                isPractice,
            });
            if (res.data) {
                setAiDebugResult({
                    diagnosis: res.data.diagnosis || 'Analysis completed with neural heuristics.',
                    likelyCause: res.data.likelyCause || 'Boundary or algorithmic condition mismatch.',
                    suggestedFix: res.data.suggestedFix || 'Review variable mutations and base condition logic.',
                });
            }
        } catch (err: any) {
            const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to complete debug analysis';
            setHintError(msg);
        } finally {
            setIsAiLoading(false);
        }
    }, [code, language, runResultData, isPractice, isAiLoading]);

    const requestAiOptimize = useCallback(async () => {
        if (isAiLoading) return;
        setIsAiLoading(true);
        setHintError(null);
        setAiCoachTab('optimize');
        try {
            const res = await api.post('/ai/optimize', {
                code,
                language,
                timeMs: runResultData?.timeMs,
                memoryKb: runResultData?.memoryKb,
                isPractice,
            });
            if (res.data) {
                setAiOptimizeResult({
                    refactoredCode: res.data.refactoredCode || '',
                    timeComplexity: res.data.timeComplexity || 'O(N)',
                    spaceComplexity: res.data.spaceComplexity || 'O(1)',
                    explanation: res.data.explanation || 'Optimized runtime using algorithmic transformations.',
                });
            }
        } catch (err: any) {
            const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to optimize code complexity';
            setHintError(msg);
        } finally {
            setIsAiLoading(false);
        }
    }, [code, language, runResultData, isPractice, isAiLoading]);

    // Handle Match Result (Winner/Defeat)
    useEffect(() => {
        if (winner && !isPractice) {
            setIsRunning(false);
            setIsSubmitting(false);

            const myUserId = (socket as any)?.user?.id;
            const isMe = winner.winnerId === myUserId;

            // Check if player1 matches my user ID using context state players array
            const isPlayer1 = players[0]?.id === myUserId;
            const mySub = isPlayer1 ? winner.p1Sub : winner.p2Sub;
            const myDelta = isPlayer1 ? winner.rankDeltaP1 : winner.rankDeltaP2;

            setScore({
                accuracy: (mySub?.testCasesPass && mySub?.testCasesTotal) ? Math.round((mySub.testCasesPass / mySub.testCasesTotal) * 100) : 0,
                timeBonus: Math.round((mySub?.finalScore || 0) * 0.1),
                rpGain: myDelta || (isMe ? 32 : -15),
                expectedGain: 18,
                streakBonus: isMe ? 12 : 0,
                timeTaken: mySub?.timeMs ? Math.round(mySub.timeMs / 1000) : 0,
                executionTime: mySub?.timeMs || 0,
                memoryMB: mySub?.memoryKb ? (mySub.memoryKb / 1024).toFixed(2) : 0,
                cpuCycles: '2.4M',
                inputSize: 'Competition Set',
                percentileSpeed: isMe ? 78 : 20,
                percentileMemory: 50,
                benchmarks: { top10Memory: 8.5, globalAvgMemory: 15.2 },
                efficiency: isMe ? 92 : 45,
                complexity: mySub?.timeComplexity || 'O(N)',
                heatmap: Array.from({ length: 12 }, () => Math.floor(Math.random() * 100)),
                result: isMe ? 'VICTORY' : 'DEFEAT'
            });

            setShowResults(true);
            setShowScoreImpact(false);
        }
    }, [winner, isPractice, socket, players]);



    const handleStartMatch = useCallback(() => {
        if (!isSocketConnected) {
            console.error('Cannot start: Socket disconnected');
            connect();
            return;
        }

        setIsRunning(true);

        // In practice mode, we create a private room to enable code execution
        if (isPractice && selectedProblem) {
            createRoom('practice', selectedProblem.id);
        }

        const container = document.querySelector('.editor-container');
        if (container) {
            gsap.fromTo('.editor-container', { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.8 });
        }
    }, [isPractice, selectedProblem, createRoom, isSocketConnected, connect]);


    const handleAddGeneratedCode = (generatedCode: string) => {
        const newCode = code ? code + '\n' + generatedCode : generatedCode;
        setCode(newCode);
        syncCode(newCode);
    };


    // Results logic
    useEffect(() => {
        if (winner) {
            setShowResults(true);
        }
    }, [winner]);

    // Animation for score impact toast
    useEffect(() => {
        if (showScoreImpact) {
            gsap.fromTo('.score-impact-panel',
                { y: 50, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.5, ease: 'back.out' }
            );
        }
    }, [showScoreImpact]);

    const renderCoachHUD = () => (
        <div className={`flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar p-5 sm:p-6 space-y-6 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            {/* Header / Mode Indicator */}
            <div className={`flex items-center justify-between border-b pb-4 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
                <div className="flex items-center gap-2">
                    <Sparkles size={16} className={isLight ? 'text-purple-600' : 'text-accent-secondary'} />
                    <div>
                        <h3 className={`text-xs font-black uppercase tracking-widest ${isLight ? 'text-slate-900' : 'text-white'}`}>Neural Coach</h3>
                        <p className={`text-[9px] uppercase tracking-wider font-bold ${isLight ? 'text-purple-700' : 'text-zinc-500'}`}>
                            {practiceSession?.title || 'Interactive AI Mentorship'}
                        </p>
                    </div>
                </div>
                <span className={`cyber-badge-win text-[9px] flex items-center gap-1.5 ${isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : ''}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    ONLINE
                </span>
            </div>

            {/* Live Metrics */}
            <div className={`p-4 rounded-2xl border space-y-3 ${isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-[#0e0e18] border-white/10'}`}>
                <p className={`text-[9px] font-bold uppercase tracking-wider ${isLight ? 'text-purple-700' : 'text-zinc-500'}`}>Complexity & Pattern</p>
                <div className="flex items-center justify-between">
                    <span className={`text-2xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>{liveComplexity}</span>
                    <span className={`cyber-pill ${isLight ? 'bg-purple-100 text-purple-800 border-purple-300 font-bold' : 'text-accent-secondary'}`}>{liveStrategy}</span>
                </div>
            </div>

            {/* Neural Efficiency */}
            <div className="space-y-2">
                <div className={`flex justify-between text-[9px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>
                    <span>Logic Confidence</span>
                    <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{confidence}%</span>
                </div>
                <div className={`h-2 w-full rounded-full overflow-hidden ${isLight ? 'bg-slate-200' : 'bg-white/5'}`}>
                    <div className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary transition-all duration-1000 shadow-[0_0_12px_rgba(139,92,246,0.5)]" style={{ width: `${confidence}%` }} />
                </div>
            </div>

            {/* Navigation Tabs for 4 AI Capabilities */}
            <div className={`flex items-center justify-between p-1 rounded-xl border gap-1 text-[10px] font-bold select-none ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-black/60 border-white/10'}`}>
                <button
                    onClick={() => setAiCoachTab('hint')}
                    className={`flex-1 py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1 ${aiCoachTab === 'hint' ? (isLight ? 'bg-white text-purple-700 shadow-sm border border-slate-200' : 'bg-white/15 text-white shadow') : (isLight ? 'text-slate-600 hover:text-purple-700' : 'text-zinc-400 hover:text-white')}`}
                >
                    <Lightbulb size={12} />
                    <span className="hidden sm:inline">Hint</span>
                </button>
                <button
                    onClick={() => setAiCoachTab('explain')}
                    className={`flex-1 py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1 ${aiCoachTab === 'explain' ? (isLight ? 'bg-white text-purple-700 shadow-sm border border-slate-200' : 'bg-white/15 text-white shadow') : (isLight ? 'text-slate-600 hover:text-purple-700' : 'text-zinc-400 hover:text-white')}`}
                >
                    <BookOpen size={12} />
                    <span className="hidden sm:inline">Explain</span>
                </button>
                <button
                    onClick={() => setAiCoachTab('debug')}
                    className={`flex-1 py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1 ${aiCoachTab === 'debug' ? (isLight ? 'bg-white text-purple-700 shadow-sm border border-slate-200' : 'bg-white/15 text-white shadow') : (isLight ? 'text-slate-600 hover:text-purple-700' : 'text-zinc-400 hover:text-white')}`}
                >
                    <Bug size={12} />
                    <span className="hidden sm:inline">Debug</span>
                </button>
                <button
                    onClick={() => setAiCoachTab('optimize')}
                    className={`flex-1 py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1 ${aiCoachTab === 'optimize' ? (isLight ? 'bg-white text-purple-700 shadow-sm border border-slate-200' : 'bg-white/15 text-white shadow') : (isLight ? 'text-slate-600 hover:text-purple-700' : 'text-zinc-400 hover:text-white')}`}
                >
                    <Zap size={12} />
                    <span className="hidden sm:inline">Optimize</span>
                </button>
            </div>

            {/* Error Banner */}
            {hintError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center justify-between gap-2 font-medium">
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={14} className="shrink-0" />
                        <span>{hintError}</span>
                    </div>
                    <button onClick={() => setHintError(null)} className="hover:opacity-70">
                        <X size={12} />
                    </button>
                </div>
            )}

            {/* Loading Indicator */}
            {isAiLoading && (
                <div className={`p-4 rounded-2xl border flex items-center gap-3 animate-pulse text-xs font-bold uppercase tracking-wider ${isLight ? 'bg-purple-50 border-purple-200 text-purple-800' : 'bg-accent-primary/10 border-accent-primary/30 text-accent-primary'}`}>
                    <Sparkles size={16} className="animate-spin" />
                    <span>Neural Coach synthesizing telemetry...</span>
                </div>
            )}

            {/* TAB 1: SOCRATIC HINT */}
            {aiCoachTab === 'hint' && (
                <div className={`p-5 rounded-2xl border space-y-4 shadow-sm ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-gradient-to-br from-[#121020] to-[#0c0c14] border-accent-secondary/30'}`}>
                    <div className="flex items-center justify-between">
                        <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-purple-700' : 'text-accent-secondary'}`}>
                            <Lightbulb size={13} /> Socratic Guidance
                        </div>
                        {aiHint && (
                            <span className={`text-[9px] px-2 py-0.5 rounded uppercase font-bold border ${isLight ? 'bg-purple-100 text-purple-800 border-purple-300' : 'bg-accent-secondary/20 text-accent-secondary border-accent-secondary/30'}`}>
                                Level {aiHint.level || 1}
                            </span>
                        )}
                    </div>

                    {aiHint ? (
                        <div className="space-y-2">
                            {aiHint.focusArea && (
                                <div className={`text-[9px] uppercase font-bold tracking-wider ${isLight ? 'text-purple-700' : 'text-accent-primary'}`}>
                                    // FOCUS: {aiHint.focusArea}
                                </div>
                            )}
                            <p className={`text-xs font-light leading-relaxed p-3.5 rounded-xl border font-sans whitespace-pre-line ${isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-black/50 border-white/5 text-zinc-200'}`}>
                                {aiHint.hint}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <p className={`text-xs font-light leading-relaxed ${isLight ? 'text-slate-800' : 'text-zinc-300'}`}>
                                Welcome to Socratic Mentorship. Request incremental hints that illuminate the problem's invariant without spoiling the final answer.
                            </p>
                            <p className={`text-[11px] font-medium ${isLight ? 'text-purple-700 font-bold' : 'text-zinc-500'}`}>
                                Each successive clue unlocks deeper structural guidance as you code.
                            </p>
                        </div>
                    )}

                    <button
                        onClick={requestAiHint}
                        disabled={isAiLoading}
                        className={`w-full py-2.5 rounded-xl border font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${isLight ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-700 shadow-sm' : 'bg-accent-secondary/15 hover:bg-accent-secondary/25 text-accent-secondary border-accent-secondary/30'}`}
                    >
                        <Sparkles size={12} className={isAiLoading ? 'animate-spin' : ''} />
                        {isAiLoading ? 'Synthesizing...' : aiHint ? 'Request Next Clue' : 'Request Socratic Hint'}
                    </button>
                </div>
            )}

            {/* TAB 2: EXPLAIN LOGIC */}
            {aiCoachTab === 'explain' && (
                <div className={`p-5 rounded-2xl border space-y-4 shadow-sm ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-gradient-to-br from-[#121020] to-[#0c0c14] border-accent-secondary/30'}`}>
                    <div className="flex items-center justify-between">
                        <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-purple-700' : 'text-accent-secondary'}`}>
                            <BookOpen size={13} /> Logic & Architecture
                        </div>
                    </div>

                    {aiExplanation ? (
                        <div className="space-y-2">
                            <div className={`text-[9px] uppercase font-bold tracking-wider ${isLight ? 'text-purple-700' : 'text-accent-primary'}`}>
                                // SOLUTION DECONSTRUCTION
                            </div>
                            <div className={`text-xs font-light leading-relaxed p-3.5 rounded-xl border font-sans max-h-60 overflow-y-auto custom-scrollbar whitespace-pre-line ${isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-black/50 border-white/5 text-zinc-200'}`}>
                                {aiExplanation}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <p className={`text-xs font-light leading-relaxed ${isLight ? 'text-slate-800' : 'text-zinc-300'}`}>
                                Need an algorithmic breakdown? Request an architectural walkthrough of your current code, invariant properties, and time/space behavior.
                            </p>
                        </div>
                    )}

                    <button
                        onClick={requestAiExplain}
                        disabled={isAiLoading}
                        className={`w-full py-2.5 rounded-xl border font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${isLight ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-700 shadow-sm' : 'bg-accent-secondary/15 hover:bg-accent-secondary/25 text-accent-secondary border-accent-secondary/30'}`}
                    >
                        <BookOpen size={12} className={isAiLoading ? 'animate-spin' : ''} />
                        {isAiLoading ? 'Analyzing...' : aiExplanation ? 'Re-explain Current Logic' : 'Explain My Code'}
                    </button>
                </div>
            )}

            {/* TAB 3: DEBUGGER */}
            {aiCoachTab === 'debug' && (
                <div className={`p-5 rounded-2xl border space-y-4 shadow-sm ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-gradient-to-br from-[#121020] to-[#0c0c14] border-accent-secondary/30'}`}>
                    <div className="flex items-center justify-between">
                        <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-amber-600' : 'text-amber-400'}`}>
                            <Bug size={13} /> Edge Case & Bug Detection
                        </div>
                    </div>

                    {aiDebugResult ? (
                        <div className="space-y-3 font-sans text-xs">
                            <div className={`p-3 rounded-xl border space-y-1 ${isLight ? 'bg-rose-50 border-rose-200' : 'bg-red-950/20 border-red-500/20'}`}>
                                <span className={`text-[9px] uppercase font-bold tracking-wider flex items-center gap-1 ${isLight ? 'text-rose-700' : 'text-red-400'}`}>
                                    <AlertTriangle size={11} /> Diagnosis
                                </span>
                                <p className={`text-xs ${isLight ? 'text-slate-900 font-medium' : 'text-zinc-200'}`}>{aiDebugResult.diagnosis}</p>
                            </div>
                            <div className={`p-3 rounded-xl border space-y-1 ${isLight ? 'bg-amber-50 border-amber-200' : 'bg-amber-950/20 border-amber-500/20'}`}>
                                <span className={`text-[9px] uppercase font-bold tracking-wider ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
                                    ⚠️ Likely Cause
                                </span>
                                <p className={`text-xs ${isLight ? 'text-slate-900 font-medium' : 'text-zinc-200'}`}>{aiDebugResult.likelyCause}</p>
                            </div>
                            <div className={`p-3 rounded-xl border space-y-1 ${isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-950/20 border-emerald-500/20'}`}>
                                <span className={`text-[9px] uppercase font-bold tracking-wider ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                                    🛠️ Suggested Fix
                                </span>
                                <p className={`text-xs ${isLight ? 'text-slate-900 font-medium' : 'text-zinc-200'}`}>{aiDebugResult.suggestedFix}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <p className={`text-xs font-light leading-relaxed ${isLight ? 'text-slate-800' : 'text-zinc-300'}`}>
                                Stumbled on wrong outputs or runtime exceptions? The Neural Debugger scans for off-by-one errors, boundary breaches, and unhandled inputs.
                            </p>
                        </div>
                    )}

                    <button
                        onClick={requestAiDebug}
                        disabled={isAiLoading}
                        className={`w-full py-2.5 rounded-xl border font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${isLight ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-700 shadow-sm' : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30'}`}
                    >
                        <Bug size={12} className={isAiLoading ? 'animate-spin' : ''} />
                        {isAiLoading ? 'Scanning...' : 'Inspect Code For Bugs'}
                    </button>
                </div>
            )}

            {/* TAB 4: OPTIMIZE */}
            {aiCoachTab === 'optimize' && (
                <div className={`p-5 rounded-2xl border space-y-4 shadow-sm ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-gradient-to-br from-[#121020] to-[#0c0c14] border-accent-secondary/30'}`}>
                    <div className="flex items-center justify-between">
                        <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                            <Zap size={13} /> Runtime & Space Optimizer
                        </div>
                    </div>

                    {aiOptimizeResult ? (
                        <div className="space-y-3 font-sans text-xs">
                            <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-1 rounded-lg font-bold text-[10px] border ${isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'}`}>
                                    Time: {aiOptimizeResult.timeComplexity}
                                </span>
                                <span className={`px-2.5 py-1 rounded-lg font-bold text-[10px] border ${isLight ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-blue-500/15 border-blue-500/30 text-blue-400'}`}>
                                    Space: {aiOptimizeResult.spaceComplexity}
                                </span>
                            </div>

                            <p className={`text-xs leading-relaxed p-3 rounded-xl border ${isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-black/50 border-white/5 text-zinc-200'}`}>
                                {aiOptimizeResult.explanation}
                            </p>

                            {aiOptimizeResult.refactoredCode && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className={`text-[9px] uppercase font-bold tracking-wider ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>Refactored Snippet</span>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(aiOptimizeResult.refactoredCode);
                                                    setCopiedOptCode(true);
                                                    setTimeout(() => setCopiedOptCode(false), 2000);
                                                }}
                                                className={`text-[9px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 transition-all ${isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800' : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300'}`}
                                            >
                                                {copiedOptCode ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                                                {copiedOptCode ? 'Copied' : 'Copy'}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setCode(aiOptimizeResult.refactoredCode);
                                                    syncCode(aiOptimizeResult.refactoredCode);
                                                }}
                                                className={`text-[9px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 transition-all ${isLight ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700' : 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/40 text-emerald-300'}`}
                                            >
                                                Apply To Editor
                                            </button>
                                        </div>
                                    </div>
                                    <pre className={`p-3 rounded-xl font-mono text-[11px] overflow-x-auto max-h-48 custom-scrollbar border ${isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-black/70 border-white/5 text-zinc-200'}`}>
                                        {aiOptimizeResult.refactoredCode}
                                    </pre>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <p className={`text-xs font-light leading-relaxed ${isLight ? 'text-slate-800' : 'text-zinc-300'}`}>
                                Accelerate your asymptotic runtime. The optimizer analyzes your loop structures and recommends dynamic programming, hash indexing, or pointer optimizations.
                            </p>
                        </div>
                    )}

                    <button
                        onClick={requestAiOptimize}
                        disabled={isAiLoading}
                        className={`w-full py-2.5 rounded-xl border font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${isLight ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-sm' : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30'}`}
                    >
                        <Zap size={12} className={isAiLoading ? 'animate-spin' : ''} />
                        {isAiLoading ? 'Optimizing...' : 'Optimize Complexity'}
                    </button>
                </div>
            )}

            {/* Tactical Feed */}
            <div className={`p-5 rounded-2xl border space-y-2 text-[10px] ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/40 border-white/5'}`}>
                <div className={`uppercase font-black tracking-widest ${isLight ? 'text-purple-700' : 'text-zinc-500'}`}>Tactical Feed</div>
                {battleFeed.slice(0, 3).map((f) => (
                    <div key={f.id} className={isLight ? 'text-slate-700 font-medium' : 'text-zinc-400'}>
                        <span className={`mr-2 ${isLight ? 'text-purple-600 font-bold' : 'text-accent-secondary'}`}>[{f.time}]</span>
                        {f.text}
                    </div>
                ))}
            </div>
        </div>
    );

    const isCoachMode = isPractice && (practiceSession?.mode === 'coach' || navParams?.practiceType === 'coach');

    const renderPracticeSpecsHUD = () => (
        <div className={`flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar p-5 sm:p-6 space-y-6 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            <div className={`flex items-center justify-between border-b pb-4 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
                <div className="flex items-center gap-2">
                    <Target size={16} className={isLight ? 'text-purple-600' : 'text-accent-secondary'} />
                    <div>
                        <h3 className={`text-xs font-black uppercase tracking-widest ${isLight ? 'text-slate-900' : 'text-white'}`}>Practice Intel</h3>
                        <p className={`text-[9px] font-bold uppercase tracking-wider ${isLight ? 'text-purple-700' : 'text-zinc-500'}`}>
                            {practiceSession?.title || 'Solo Algorithm Protocol'}
                        </p>
                    </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${isLight
                        ? 'bg-purple-100 text-purple-800 border-purple-300'
                        : 'bg-blue-500/15 text-blue-400 border-blue-500/20'
                    }`}>
                    {practiceSession?.mode ? `${practiceSession.mode.toUpperCase()} MODE` : 'SOLO DRILL'}
                </span>
            </div>

            <div className="space-y-2 text-xs">
                <span className={`text-[8px] font-black uppercase tracking-widest ${isLight ? 'text-purple-700' : 'text-zinc-500'}`}>Problem Blueprint</span>
                <div className={`p-4 rounded-xl space-y-1.5 border ${isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-white/5 border-white/5'}`}>
                    <p className={`font-black text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>{selectedProblem?.title || 'Algorithm Challenge'}</p>
                    <div className={`flex items-center gap-2 text-[10px] ${isLight ? 'text-slate-700 font-medium' : 'text-zinc-400'}`}>
                        <span>Difficulty:</span>
                        <span className={`uppercase font-bold ${isLight ? 'text-purple-700' : 'text-accent-secondary'}`}>{selectedProblem?.difficulty || 'Medium'}</span>
                        <span className={isLight ? 'text-slate-400' : 'text-zinc-600'}>•</span>
                        <span>Category: {selectedProblem?.category || 'Algorithms'}</span>
                    </div>
                </div>
            </div>

            {selectedProblem?.constraints && (
                <div className="space-y-2 text-xs">
                    <span className={`text-[8px] font-black uppercase tracking-widest ${isLight ? 'text-purple-700' : 'text-zinc-500'}`}>Execution Constraints</span>
                    <div className={`p-3.5 rounded-xl text-[11px] whitespace-pre-line leading-relaxed border ${isLight
                            ? 'bg-slate-50 border-slate-200 text-slate-900 font-medium shadow-sm'
                            : 'bg-black/40 border-white/5 text-zinc-300'
                        }`}>
                        {selectedProblem.constraints}
                    </div>
                </div>
            )}

            <div className="space-y-2 text-xs">
                <span className={`text-[8px] font-black uppercase tracking-widest ${isLight ? 'text-purple-700' : 'text-zinc-500'}`}>Protocol Guidance</span>
                <div className={`p-3.5 rounded-xl text-[11px] leading-relaxed space-y-1 border ${isLight
                        ? 'bg-slate-50 border-slate-200 text-slate-900 shadow-sm'
                        : 'bg-white/5 border-white/10 text-zinc-300'
                    }`}>
                    <p className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Unranked Practice Environment</p>
                    <p className={isLight ? 'text-slate-700 font-medium' : 'text-zinc-400'}>
                        {practiceSession?.mode === 'speed'
                            ? 'Speed Run: Optimize your typing and logic execution time against the clock.'
                            : practiceSession?.mode === 'focus'
                                ? 'Deep Focus: Distraction-free problem breakdown. Test all edge cases before submission.'
                                : 'Refine, execute, and verify test cases with zero rating point risk.'}
                    </p>
                </div>
            </div>
        </div>
    );

    return (
        <div className={`h-screen flex flex-col font-sans selection:bg-purple-500 selection:text-white overflow-hidden ${isLight ? 'bg-[#f8f9fc] text-slate-900' : 'bg-[#020202] text-white'}`} ref={containerRef}>
            <header className={`px-3 sm:px-6 py-2.5 sm:py-3.5 border-b flex items-center justify-between backdrop-blur-xl z-20 gap-2 sm:gap-4 min-w-0 ${isLight ? 'border-slate-200 bg-white/95 text-slate-900 shadow-sm' : 'border-white/10 bg-black/80 text-white'}`}>
                {/* Left Section: Navigation, Mode, Status & Language */}
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 justify-start">
                    {/* Menu button ONLY in practice lab modes. Removed in quick match and ranked mode */}
                    {isPractice && (
                        <button
                            onClick={() => setIsMenuOpen(true)}
                            className={`p-2 sm:p-2.5 rounded-xl border transition-all group shrink-0 ${isLight ? 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}
                            title="Main Menu"
                        >
                            <Menu size={16} className="group-hover:scale-110 transition-transform" />
                        </button>
                    )}

                    {/* Abandon / Leave button in quick match and ranked mode */}
                    {!isPractice && (
                        <button
                            onClick={() => setShowAbandonModal(true)}
                            className={`px-3 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 ${isLight
                                ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                                }`}
                            title="Forfeit and leave battle"
                        >
                            <LogOut size={13} />
                            <span className="hidden sm:inline">Abandon</span>
                        </button>
                    )}

                    {infractionCount > 0 && (
                        <div
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-400 text-[10px] font-mono font-extrabold animate-pulse shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                            title="Focus departures recorded during this battle"
                        >
                            <AlertTriangle size={12} />
                            <span>Breaches: {infractionCount}</span>
                        </div>
                    )}
                    <button
                        onClick={() => setShowProblem(!showProblem)}
                        className={`p-2 sm:p-2.5 rounded-xl border transition-all group shrink-0 ${showProblem ? (isLight ? 'bg-purple-100 border-purple-300 text-purple-700 font-bold' : 'bg-white/10 border-white/20 text-white') : (isLight ? 'bg-slate-100 border-slate-300 text-slate-700 hover:text-purple-700' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white')}`}
                        title="Toggle Problem Info"
                    >
                        <Layers size={16} className="group-hover:scale-110 transition-transform" />
                    </button>
                    <div className="flex items-center gap-2 shrink-0">
                        {isPractice ? <Shield size={16} className={isLight ? 'text-purple-600' : 'text-accent-primary'} /> : <Activity size={16} className={isLight ? 'text-purple-600' : 'text-accent-primary'} />}
                        <span className={`text-xs sm:text-sm font-black tracking-widest uppercase hidden md:inline ${isLight ? 'text-slate-900 font-extrabold' : 'text-zinc-200'}`}>
                            {isPractice ? 'Practice_Lab' : 'Ranked_Duel'}
                        </span>
                    </div>

                    {/* Change Problem (ONLY in Practice Lab Modes) */}
                    {isPractice && (
                        <button
                            onClick={() => setShowProblemPicker(true)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all text-[10px] font-bold uppercase tracking-wider shrink-0 ${isLight
                                    ? 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100'
                                    : 'bg-white/5 border-white/10 hover:border-accent-secondary/50 text-zinc-300 hover:text-white'
                                }`}
                            title="Switch Practice Problem"
                        >
                            <Target size={13} className={isLight ? 'text-purple-600' : 'text-accent-primary'} />
                            <span className="hidden sm:inline">Change Problem</span>
                        </button>
                    )}

                    <div className={`hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg border shrink-0 ${isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-white/5 border-white/5'}`}>
                        {isSocketConnected ? (
                            <Signal size={14} className={isLight ? 'text-emerald-600' : 'text-green-500'} />
                        ) : (
                            <WifiOff size={14} className={isLight ? 'text-rose-600' : 'text-red-500'} />
                        )}
                        <span className={`text-[10px] uppercase font-bold tracking-wider ${isSocketConnected ? (isLight ? 'text-emerald-700 font-bold' : 'text-green-500/70') : (isLight ? 'text-rose-700 font-bold' : 'text-red-500/70')}`}>
                            {isSocketConnected ? 'Stable Link' : 'Disconnected'}
                        </span>
                    </div>

                    <div className="relative group shrink-0" ref={dropdownRef}>
                        <button
                            onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                            className={`flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 border rounded-xl transition-all ${isLight ? 'bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-900 font-black' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'}`}
                        >
                            <span className="text-[10px] font-black uppercase tracking-widest">{language === 'javascript' ? 'JS' : language === 'python' ? 'PY' : language === 'java' ? 'JV' : language === 'c' ? 'C' : 'C++'}</span>
                            <div className={`w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[4px] transition-transform ${isLight ? 'border-t-slate-700' : 'border-t-zinc-500'} ${showLanguageDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        {showLanguageDropdown && (
                            <div
                                className={`absolute top-full mt-2 left-0 w-32 py-2 rounded-2xl border shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200 overflow-hidden ${isLight ? 'bg-white border-slate-200 shadow-xl' : 'bg-black border-white/10'}`}
                            >
                                {SUPPORTED_LANGUAGES.map(lang => (
                                    <button
                                        key={lang.id}
                                        onClick={() => {
                                            const oldTemplate = getTemplate(language, selectedProblem);
                                            const isDefault = code.trim() === '' || code.trim() === oldTemplate.trim();

                                            if (!isDefault) {
                                                const confirmSwitch = window.confirm('Changing language will discard your current code. Are you sure?');
                                                if (!confirmSwitch) {
                                                    setShowLanguageDropdown(false);
                                                    return;
                                                }
                                            }

                                            setLanguage(lang.id);
                                            setCode(getTemplate(lang.id, selectedProblem));
                                            setShowLanguageDropdown(false);
                                        }}
                                        className={`w-full px-4 py-2 text-left text-xs font-bold transition-colors ${language === lang.id ? (isLight ? 'text-purple-700 bg-purple-50 font-black' : 'text-accent-secondary') : (isLight ? 'text-slate-700 hover:bg-slate-100 hover:text-purple-700' : 'text-zinc-400 hover:bg-white/10')}`}
                                    >
                                        {lang.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {!isPractice && (
                        <div className={`hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-lg border shrink-0 ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/5'}`}>
                            <Terminal size={14} className={submissionStatus === 'passed' ? 'text-green-500' : submissionStatus === 'failed' ? 'text-red-500' : (isLight ? 'text-slate-500' : 'text-gray-500')} />
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${submissionStatus === 'running' ? 'animate-pulse text-yellow-600' : (isLight ? 'text-slate-700' : 'text-zinc-400')}`}>
                                {isSocketConnected ? (submissionStatus === 'idle' ? 'Ready' : submissionStatus) : 'Offline'}
                            </span>
                        </div>
                    )}
                </div>

                {/* Center Status Hub: Timer & Session Info */}
                <div className="flex items-center justify-center gap-3 shrink-0">
                    <div className={`flex flex-col items-center px-4 sm:px-6 py-1 rounded-2xl border transition-all duration-300 ${!isRunning
                        ? (isLight ? 'border-slate-300 bg-slate-100 shadow-sm' : 'border-white/10 bg-white/5')
                        : (isPractice && practiceSession?.mode !== 'speed')
                            ? (isLight ? 'border-slate-300 bg-slate-100 shadow-sm' : 'border-white/10 bg-white/5')
                            : timeLeft > 120
                                ? (isLight ? 'border-slate-300 bg-slate-100 shadow-sm' : 'border-white/10 bg-white/5')
                                : timeLeft >= 60
                                    ? (isLight ? 'border-amber-300 bg-amber-50' : 'border-amber-500/30 bg-amber-500/10')
                                    : (isLight ? 'border-red-300 bg-red-50 animate-pulse' : 'border-red-500/40 bg-red-500/15 animate-pulse')
                        }`}>
                        <span className={`text-xl sm:text-2xl font-black tracking-tight tabular-nums ${!isRunning
                            ? (isLight ? 'text-slate-400' : 'text-zinc-500')
                            : (isPractice && practiceSession?.mode !== 'speed')
                                ? (isLight ? 'text-slate-900 font-extrabold' : 'text-white')
                                : timeLeft > 120
                                    ? (isLight ? 'text-slate-900 font-extrabold' : 'text-white')
                                    : timeLeft >= 60
                                        ? (isLight ? 'text-amber-600 font-black' : 'text-amber-400')
                                        : (isLight ? 'text-red-600 font-black' : 'text-red-500')
                            }`}>
                            {formatTime(timeLeft)}
                        </span>
                        <span className={`text-[8px] font-black uppercase tracking-[0.3em] -mt-1 ${isLight ? 'text-purple-700 font-bold' : 'text-zinc-400 opacity-40'}`}>{isPractice && practiceSession?.mode !== 'speed' ? 'Time Elapsed' : 'Time Remaining'}</span>
                    </div>

                    {practiceSession && (
                        <div className={`hidden 2xl:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider ${isLight
                                ? 'bg-purple-100 border-purple-300 text-purple-800 shadow-sm'
                                : 'bg-accent-primary/10 border-accent-primary/20 text-accent-primary'
                            }`}>
                            <Sparkles size={12} />
                            {practiceSession.mode === 'speed'
                                ? `Speed Run: ${practiceProblemIndex + 1}/${practiceSession.problems?.length || 0}`
                                : practiceSession.title}
                        </div>
                    )}
                </div>

                {/* Action Controls */}
                <div className="flex items-center gap-2 min-w-0 justify-end shrink-0">
                    {isCoachMode && (
                        <button
                            onClick={requestAiHint}
                            disabled={isAiLoading}
                            className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl border transition-all flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] disabled:opacity-50 shrink-0 ${isLight
                                    ? 'bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100'
                                    : 'bg-accent-primary/10 border-accent-primary/30 text-accent-primary hover:bg-accent-primary/20'
                                }`}
                            title="Request Socratic AI Hint"
                        >
                            <Sparkles size={13} className={isAiLoading ? 'animate-spin' : ''} />
                            <span className="hidden lg:inline">{isAiLoading ? 'Thinking...' : 'AI Coach'}</span>
                        </button>
                    )}

                    <button
                        onClick={() => setIsVoiceModalOpen(true)}
                        className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl border transition-all flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] shrink-0 ${isLight
                                ? 'bg-purple-100 border-purple-300 text-purple-800 hover:bg-purple-200'
                                : 'bg-accent-secondary/10 border-accent-secondary/30 text-accent-secondary hover:bg-accent-secondary/20'
                            }`}
                        title="Open Neural Voice Engine"
                    >
                        <Wand2 size={13} />
                        <span className="hidden lg:inline">Voice Coder</span>
                    </button>

                    {!isRunning ? (
                        <div className="flex items-center gap-2 shrink-0">
                            {!isPractice && (
                                <div className={`hidden md:flex items-center gap-1 p-1 border rounded-xl ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/10'}`}>
                                    {[
                                        { label: 'Blitz', seconds: 120, rp: '1.2×' },
                                        { label: 'Standard', seconds: 300, rp: '1.0×' },
                                        { label: 'Deep Focus', seconds: 600, rp: '0.8×' },
                                    ].map(mode => (
                                        <button
                                            key={mode.seconds}
                                            onClick={() => setSelectedProblem(p => ({ ...p, timeLimit: mode.seconds }))}
                                            className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.15em] transition-all flex flex-col items-center leading-tight ${selectedProblem.timeLimit === mode.seconds
                                                ? (isLight ? 'bg-white text-purple-900 font-extrabold shadow' : 'bg-white text-black shadow')
                                                : (isLight ? 'text-slate-600 hover:text-slate-900' : 'text-gray-500 hover:text-white')}`}
                                        >
                                            <span>{mode.label}</span>
                                            <span className={`text-[8px] ${selectedProblem.timeLimit === mode.seconds ? (isLight ? 'text-purple-700 font-bold' : 'text-black/50') : 'text-accent-secondary opacity-70'}`}>{mode.rp} RP</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                            <button
                                onClick={() => {
                                    setTimeLeft(isPractice ? 0 : selectedProblem.timeLimit);
                                    handleStartMatch();
                                }}
                                className={`px-3.5 sm:px-5 py-2 rounded-xl font-black text-xs tracking-wider uppercase hover:scale-105 transition-all shadow-md shrink-0 ${isLight
                                        ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-[0_0_15px_rgba(147,51,234,0.35)]'
                                        : 'bg-white text-black'
                                    }`}
                            >
                                {isPractice ? 'Start Session' : 'Begin Uplink'}
                            </button>
                        </div>
                    ) : (
                        <div className="hidden sm:flex items-center gap-2 shrink-0">
                            <button
                                onClick={handleRun}
                                className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-bold uppercase text-xs tracking-wider transition-all hover:scale-105 active:scale-95 shadow-md shrink-0 ${isLight
                                        ? 'bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-900 shadow-sm'
                                        : 'bg-white/10 hover:bg-white/15 text-white'
                                    } ${isRunningCode ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                                <Zap size={13} className={isLight ? 'text-purple-600' : ''} />
                                <span className="hidden sm:inline">{isRunningCode ? 'Running...' : 'Run Code'}</span>
                            </button>
                            <button
                                onClick={handleSubmit}
                                className={`flex items-center gap-1.5 px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-xl font-black uppercase text-xs tracking-wider transition-all hover:scale-105 active:scale-95 shadow-md shrink-0 ${isLight
                                        ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-[0_0_15px_rgba(147,51,234,0.35)]'
                                        : 'bg-accent-primary hover:bg-accent-secondary text-black hover:text-white shadow-[0_0_15px_rgba(124,58,237,0.3)]'
                                    } ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                                <Zap size={13} />
                                <span>{isSubmitting ? 'Transmitting...' : isPractice ? 'Submit Solution' : 'Execute Uplink'}</span>
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* ── Main Workspace ── */}
            <main className={`flex-1 flex flex-col overflow-hidden relative ${isLight ? 'bg-[#f8f9fc]' : 'bg-[#020202]'}`}>
                {advanceNotice && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 backdrop-blur-xl text-emerald-300 font-black text-xs uppercase tracking-widest animate-bounce shadow-2xl flex items-center gap-2">
                        <Sparkles size={14} className="text-emerald-400 animate-spin" />
                        {advanceNotice}
                    </div>
                )}
                {/* Mobile / Tablet Tab Navigation Bar (Visible only below lg breakpoint) */}
                <div className={`flex lg:hidden items-center justify-around border-b h-11 shrink-0 text-xs select-none ${isLight ? 'bg-white border-slate-200' : 'bg-[#121216] border-white/10'}`}>
                    <button
                        onClick={() => { setMobileActiveTab('problem'); triggerEditorLayout(); }}
                        className={`flex items-center gap-1.5 px-3 py-2 uppercase font-bold text-[11px] border-b-2 transition-colors ${mobileActiveTab === 'problem' ? (isLight ? 'border-purple-600 text-purple-700 bg-purple-50' : 'border-accent-secondary text-white bg-white/5') : (isLight ? 'border-transparent text-slate-600 hover:text-purple-700' : 'border-transparent text-zinc-400')}`}
                    >
                        <Shield size={13} /> Question
                    </button>
                    <button
                        onClick={() => { setMobileActiveTab('editor'); triggerEditorLayout(); }}
                        className={`flex items-center gap-1.5 px-3 py-2 uppercase font-bold text-[11px] border-b-2 transition-colors ${mobileActiveTab === 'editor' ? (isLight ? 'border-purple-600 text-purple-700 bg-purple-50' : 'border-accent-secondary text-white bg-white/5') : (isLight ? 'border-transparent text-slate-600 hover:text-purple-700' : 'border-transparent text-zinc-400')}`}
                    >
                        <Cpu size={13} /> Code Editor
                    </button>
                    <button
                        onClick={() => { setMobileActiveTab('terminal'); triggerEditorLayout(); }}
                        className={`flex items-center gap-1.5 px-3 py-2 uppercase font-bold text-[11px] border-b-2 transition-colors ${mobileActiveTab === 'terminal' ? (isLight ? 'border-purple-600 text-purple-700 bg-purple-50' : 'border-accent-secondary text-white bg-white/5') : (isLight ? 'border-transparent text-slate-600 hover:text-purple-700' : 'border-transparent text-zinc-400')}`}
                    >
                        <Terminal size={13} /> Terminal
                    </button>
                    <button
                        onClick={() => { setMobileActiveTab('intel'); triggerEditorLayout(); }}
                        className={`flex items-center gap-1.5 px-3 py-2 uppercase font-bold text-[11px] border-b-2 transition-colors ${mobileActiveTab === 'intel' ? (isLight ? 'border-purple-600 text-purple-700 bg-purple-50' : 'border-accent-secondary text-white bg-white/5') : (isLight ? 'border-transparent text-slate-600 hover:text-purple-700' : 'border-transparent text-zinc-400')}`}
                    >
                        <Activity size={13} /> Intel
                    </button>
                </div>

                {/* ── Desktop Resizable Workspace (lg breakpoint and above) ── */}
                {!isMobileViewport ? (
                    <PanelGroup id="workspace-horizontal" direction="horizontal" onLayout={triggerEditorLayout} className="flex-1 min-h-0">
                        {/* ── Left Pane: Question Description ── */}
                        {showProblem && (
                            <>
                                <Panel id="panel-problem" defaultSize={28} minSize={15} maxSize={45} className={`flex flex-col min-w-0 overflow-hidden ${isLight ? 'bg-white' : 'bg-[#07070d]'}`}>
                                    <aside className={`problem-panel h-full flex flex-col overflow-hidden border-r ${isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#07070d] border-white/10 text-white'}`}>
                                        <div className="p-6 lg:p-8 overflow-y-auto flex-1 custom-scrollbar space-y-8">
                                            {/* Problem Title & Meta Stats */}
                                            <div className="space-y-3">
                                                <h2 className={`text-2xl lg:text-3xl font-black tracking-tight uppercase drop-shadow-sm leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                                    {selectedProblem.title}
                                                </h2>
                                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                                    {(selectedProblem.tags || ['Algorithms', 'Logic']).map((tag, idx) => (
                                                        <span key={idx} className={`cyber-pill transition-colors ${isLight ? 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100 font-bold' : 'text-zinc-400 hover:text-white'}`}>
                                                            {tag}
                                                        </span>
                                                    ))}
                                                    <span className={`cyber-pill ${isLight ? 'bg-purple-100 text-purple-800 border-purple-300 font-bold' : 'text-accent-primary'}`}>
                                                        <Target size={11} className={isLight ? 'text-purple-600' : ''} /> {selectedProblem.acceptanceRate || '82.4%'}
                                                    </span>
                                                    <span className={`cyber-pill ${isLight ? 'bg-slate-100 text-slate-800 border-slate-300 font-bold' : 'text-zinc-500'}`}>
                                                        <Clock size={11} className={isLight ? 'text-slate-600' : ''} /> {selectedProblem.timeLimit || 300}s
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Problem Statement Body */}
                                            <div className="space-y-4">
                                                <div className={`text-base font-normal leading-relaxed ${isLight ? 'text-slate-900 font-medium' : 'text-zinc-300'}`}>
                                                    {renderCyberText(selectedProblem.description, isLight)}
                                                </div>
                                            </div>

                                            {/* Examples Section */}
                                            <div className="space-y-4">
                                                <div className={`flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] ${isLight ? 'text-purple-700' : 'text-accent-secondary'}`}>
                                                    <Zap size={14} className={isLight ? 'text-purple-600' : ''} /> Example Patterns
                                                </div>
                                                <div className="space-y-4">
                                                    {selectedProblem.examples.map((ex, i) => (
                                                        <div key={i} className={`p-5 rounded-2xl space-y-3 text-xs transition-all shadow-md ${isLight
                                                                ? 'bg-slate-50 border border-slate-200 group hover:border-purple-300'
                                                                : 'bg-[#0e0e18] border border-white/10 group hover:border-accent-secondary/40'
                                                            }`}>
                                                            <div className={`flex justify-between items-center pb-2 border-b ${isLight ? 'border-slate-200' : 'border-white/5'}`}>
                                                                <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${isLight ? 'text-purple-700' : 'text-accent-primary'}`}>
                                                                    <div className={`w-1.5 h-1.5 rounded-full ${isLight ? 'bg-purple-600' : 'bg-accent-primary animate-pulse'}`} /> Example {i + 1}
                                                                </span>
                                                                <button
                                                                    onClick={() => {
                                                                        navigator.clipboard.writeText(ex.input);
                                                                        setCopiedInputIdx(i);
                                                                        setTimeout(() => setCopiedInputIdx(null), 1500);
                                                                    }}
                                                                    className={`text-[10px] uppercase flex items-center gap-1 transition-colors ${isLight ? 'text-slate-600 hover:text-purple-700 font-bold' : 'text-zinc-500 hover:text-white'}`}
                                                                    title="Copy Input"
                                                                >
                                                                    {copiedInputIdx === i ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                                                    <span>{copiedInputIdx === i ? 'COPIED' : 'COPY'}</span>
                                                                </button>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className={`text-[9px] uppercase font-bold tracking-wider ${isLight ? 'text-purple-700' : 'text-zinc-500'}`}>Input</p>
                                                                <div className={`p-3 rounded-xl whitespace-pre-wrap select-all border ${isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-black/70 border-white/5 text-zinc-200'}`}>
                                                                    {ex.input}
                                                                </div>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className={`text-[9px] uppercase font-bold tracking-wider ${isLight ? 'text-purple-700' : 'text-zinc-500'}`}>Expected Output</p>
                                                                <div className={`p-3 rounded-xl font-semibold whitespace-pre-wrap select-all border ${isLight ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400'}`}>
                                                                    {ex.output}
                                                                </div>
                                                            </div>
                                                            {ex.explanation && (
                                                                <div className={`pt-2 text-xs italic font-sans leading-relaxed border-t ${isLight ? 'border-slate-200 text-slate-800 font-medium' : 'border-white/5 text-zinc-400'}`}>
                                                                    <span className={`text-[10px] font-bold uppercase not-italic block mb-0.5 ${isLight ? 'text-purple-700' : 'text-zinc-500'}`}>Explanation:</span>
                                                                    {renderCyberText(ex.explanation, isLight)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Constraints Section */}
                                            <div className={`p-6 rounded-2xl border space-y-4 ${isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-[#0e0e18] border-white/10'}`}>
                                                <h3 className={`text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 ${isLight ? 'text-purple-700' : 'text-accent-secondary'}`}>
                                                    <Shield size={14} className={isLight ? 'text-purple-600' : ''} /> Operational Constraints
                                                </h3>
                                                <div className="space-y-2.5">
                                                    {(Array.isArray(selectedProblem.constraints)
                                                        ? selectedProblem.constraints
                                                        : (typeof selectedProblem.constraints === 'string'
                                                            ? selectedProblem.constraints.split('\n').flatMap((s: string) => s.split(', '))
                                                            : [])
                                                    ).map((c: string, i: number) => (
                                                        <div key={i} className="flex items-start gap-3 group/c">
                                                            <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${isLight ? 'bg-purple-600' : 'bg-accent-secondary shadow-[0_0_8px_rgba(124,58,237,0.7)]'}`} />
                                                            <code className={`text-xs tracking-tight px-2.5 py-1 rounded-md border ${isLight ? 'bg-white border-slate-200 text-slate-900 font-semibold shadow-sm' : 'bg-white/5 border-white/5 text-zinc-200'}`}>
                                                                {c}
                                                            </code>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </aside>
                                </Panel>
                                <PanelResizeHandle
                                    id="handle-problem"
                                    hitAreaMargins={{ coarse: 20, fine: 15 }}
                                    className="w-2 relative flex items-center justify-center bg-white/5 hover:bg-accent-secondary/60 active:bg-accent-secondary transition-colors cursor-col-resize z-20 group focus:outline-none before:absolute before:inset-y-0 before:-left-2 before:-right-2 before:z-30 before:content-['']"
                                >
                                    <div className="w-1 h-8 rounded-full bg-white/30 group-hover:bg-white group-active:bg-white transition-colors" />
                                </PanelResizeHandle>
                            </>
                        )}

                        {/* ── Center Pane: Editor + Terminal Split ── */}
                        <Panel id="panel-center" defaultSize={48} minSize={30} className="flex flex-col min-w-0 overflow-hidden">
                            <PanelGroup id="workspace-vertical" direction="vertical" onLayout={triggerEditorLayout} className="flex-1 min-h-0">
                                {/* Top-Center: Monaco Editor with Real IDE Tab Bar */}
                                <Panel id="panel-editor" defaultSize={65} minSize={25} className="flex flex-col min-h-0 min-w-0 relative">
                                    <section className={`editor-container flex-1 flex flex-col transition-[opacity,filter] duration-300 relative min-w-0 ${isLight ? 'bg-slate-50' : 'bg-black'} ${!isRunning ? 'blur-sm grayscale opacity-30 pointer-events-none scale-[1.02]' : ''}`}>
                                        {/* Real IDE Tab Bar */}
                                        <div className={`flex items-center justify-between px-4 h-10 border-b text-xs select-none shrink-0 ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#0c0c14] border-white/10'}`}>
                                            <div className="flex items-center gap-2">
                                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-t-lg border-t-2 text-[11px] font-bold shadow-sm ${isLight ? 'bg-white border-purple-600 text-slate-900' : 'bg-black/80 border-accent-secondary text-white'}`}>
                                                    <FileCode size={13} className={isLight ? 'text-purple-600' : 'text-accent-secondary'} />
                                                    <span>solution.{language === 'javascript' ? 'js' : language === 'python' ? 'py' : language === 'java' ? 'java' : language === 'c' ? 'c' : 'cpp'}</span>
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.8)]" title="Uplink Synchronized" />
                                                </div>
                                                <span className={`text-[10px] hidden sm:inline uppercase tracking-widest pl-2 font-bold ${isLight ? 'text-purple-700' : 'text-zinc-500'}`}>
                                                    UTF-8 // {language.toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => {
                                                        if (window.confirm('Reset code to initial template? Current progress will be lost.')) {
                                                            const tpl = getTemplate(language, selectedProblem);
                                                            setCode(tpl);
                                                            syncCode(tpl);
                                                        }
                                                    }}
                                                    className={`flex items-center gap-1 text-[10px] uppercase font-bold transition-colors ${isLight ? 'text-slate-700 hover:text-purple-700' : 'text-zinc-400 hover:text-white'}`}
                                                    title="Reset code template"
                                                >
                                                    <RotateCcw size={11} /> Reset
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex-1 min-h-0 relative">
                                            <Editor
                                                height="100%"
                                                language={language}
                                                defaultLanguage="javascript"
                                                theme={isLight ? 'vs' : 'vs-dark'}
                                                value={code}
                                                onMount={handleEditorMount}
                                                onChange={(val) => {
                                                    setCode(val || '');
                                                    syncCode(val || '');
                                                }}
                                                options={{
                                                    fontSize: 14,
                                                    minimap: { enabled: false },
                                                    padding: { top: 16 },
                                                    backgroundColor: '#06060c',
                                                    scrollBeyondLastLine: false,
                                                    automaticLayout: true,
                                                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                                    lineNumbers: 'on',
                                                    glyphMargin: false,
                                                    folding: true,
                                                    lineDecorationsWidth: 10,
                                                    lineNumbersMinChars: 3,
                                                    autoClosingBrackets: 'always',
                                                    autoIndent: 'full',
                                                    formatOnPaste: true,
                                                    formatOnType: true,
                                                    bracketPairColorization: { enabled: true },
                                                    cursorBlinking: 'smooth',
                                                    renderLineHighlight: 'all',
                                                    smoothScrolling: true
                                                }}
                                            />
                                        </div>
                                    </section>
                                </Panel>

                                <PanelResizeHandle
                                    id="handle-terminal"
                                    hitAreaMargins={{ coarse: 20, fine: 15 }}
                                    className="h-2 relative flex items-center justify-center bg-white/5 hover:bg-accent-secondary/60 active:bg-accent-secondary transition-colors cursor-row-resize z-20 group focus:outline-none before:absolute before:inset-x-0 before:-top-2 before:-bottom-2 before:z-30 before:content-['']"
                                >
                                    <div className="h-1 w-8 rounded-full bg-white/30 group-hover:bg-white group-active:bg-white transition-colors" />
                                </PanelResizeHandle>

                                {/* Bottom-Center: Collapsible Terminal Panel */}
                                <Panel id="panel-terminal" defaultSize={35} minSize={15} collapsible={true} onCollapse={() => setIsTerminalOpen(false)} onExpand={() => setIsTerminalOpen(true)} className={`flex flex-col min-h-0 min-w-0 ${isLight ? 'bg-white border-t border-slate-200 text-slate-800' : 'bg-[#0c0c0c]'}`}>
                                    <div className="h-full flex flex-col relative z-20 overflow-hidden">
                                        {/* Panel Header / Tab Bar */}
                                        <div className={`flex items-center justify-between px-4 h-10 border-b text-xs select-none shrink-0 ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#141414] border-white/5'}`}>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => {
                                                        setIsTerminalOpen(true);
                                                        setActiveTerminalTab('testcases');
                                                    }}
                                                    className={`flex items-center gap-2 px-4 py-2 text-[11px] font-bold tracking-wider uppercase transition-colors border-b-2 ${isTerminalOpen && activeTerminalTab === 'testcases'
                                                            ? (isLight ? 'border-purple-600 text-purple-700 bg-purple-50 font-black' : 'border-accent-secondary text-white bg-white/5')
                                                            : (isLight ? 'border-transparent text-slate-600 hover:text-purple-700' : 'border-transparent text-zinc-400 hover:text-zinc-200')
                                                        }`}
                                                >
                                                    <CheckCircle2 size={13} className={isTerminalOpen && activeTerminalTab === 'testcases' ? (isLight ? 'text-purple-600' : 'text-accent-secondary') : (isLight ? 'text-slate-500' : 'text-zinc-500')} />
                                                    Testcase
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setIsTerminalOpen(true);
                                                        setActiveTerminalTab('terminal');
                                                    }}
                                                    className={`flex items-center gap-2 px-4 py-2 text-[11px] font-bold tracking-wider uppercase transition-colors border-b-2 ${isTerminalOpen && activeTerminalTab === 'terminal'
                                                            ? (isLight ? 'border-purple-600 text-purple-700 bg-purple-50 font-black' : 'border-accent-secondary text-white bg-white/5')
                                                            : (isLight ? 'border-transparent text-slate-600 hover:text-purple-700' : 'border-transparent text-zinc-400 hover:text-zinc-200')
                                                        }`}
                                                >
                                                    <Terminal size={13} className={isTerminalOpen && activeTerminalTab === 'terminal' ? (isLight ? 'text-purple-600' : 'text-accent-secondary') : (isLight ? 'text-slate-500' : 'text-zinc-500')} />
                                                    Terminal Output
                                                    {runResultData && (
                                                        <span className={`w-2 h-2 rounded-full ${runResultData.status === 'ACCEPTED' ? 'bg-green-500' : 'bg-red-500'}`} />
                                                    )}
                                                </button>
                                            </div>

                                            <div className={`flex items-center gap-2 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                                                <button
                                                    onClick={() => setIsTerminalOpen(prev => !prev)}
                                                    className={`p-1 transition-colors ${isLight ? 'hover:text-purple-700' : 'hover:text-white'}`}
                                                    title={isTerminalOpen ? "Collapse Terminal" : "Expand Terminal"}
                                                >
                                                    <Layers size={14} />
                                                </button>
                                                <button
                                                    onClick={() => setIsTerminalMaximized(prev => !prev)}
                                                    className={`p-1 transition-colors ${isLight ? 'hover:text-purple-700' : 'hover:text-white'}`}
                                                    title={isTerminalMaximized ? "Restore Height" : "Maximize Height"}
                                                >
                                                    <TrendingUp size={14} className={isTerminalMaximized ? 'rotate-180' : ''} />
                                                </button>
                                                <button
                                                    onClick={() => setIsTerminalOpen(false)}
                                                    className={`p-1 transition-colors ${isLight ? 'hover:text-purple-700' : 'hover:text-white'}`}
                                                    title="Close Terminal"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Panel Body */}
                                        {isTerminalOpen && (
                                            <div className="flex-1 min-h-0 overflow-y-auto p-4 custom-scrollbar font-mono text-xs">
                                                {activeTerminalTab === 'testcases' ? (
                                                    <div className="space-y-4">
                                                        <div className={`flex items-center gap-4 border-b pb-2 ${isLight ? 'border-slate-200' : 'border-white/5'}`}>
                                                            <button
                                                                onClick={() => setUseCustomTestcases(false)}
                                                                className={`text-xs font-bold transition-colors ${!useCustomTestcases ? (isLight ? 'text-purple-700 font-black' : 'text-accent-secondary') : (isLight ? 'text-slate-600 hover:text-purple-700' : 'text-zinc-500 hover:text-zinc-300')}`}
                                                            >
                                                                Default Testcases
                                                            </button>
                                                            <button
                                                                onClick={() => setUseCustomTestcases(true)}
                                                                className={`text-xs font-bold transition-colors ${useCustomTestcases ? (isLight ? 'text-purple-700 font-black' : 'text-accent-secondary') : (isLight ? 'text-slate-600 hover:text-purple-700' : 'text-zinc-500 hover:text-zinc-300')}`}
                                                            >
                                                                Custom Testcase
                                                            </button>
                                                        </div>

                                                        {!useCustomTestcases ? (
                                                            <>
                                                                <div className="flex items-center gap-2">
                                                                    {(selectedProblem.examples || []).map((_, idx) => (
                                                                        <button
                                                                            key={idx}
                                                                            onClick={() => setSelectedTestCaseTab(idx)}
                                                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedTestCaseTab === idx
                                                                                    ? (isLight ? 'bg-purple-100 text-purple-900 border border-purple-300 shadow-sm font-extrabold' : 'bg-white/10 text-white border border-white/20')
                                                                                    : (isLight ? 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 hover:text-purple-700' : 'bg-white/5 text-zinc-400 border border-transparent hover:text-zinc-200')
                                                                                }`}
                                                                        >
                                                                            Case {idx + 1}
                                                                        </button>
                                                                    ))}
                                                                </div>

                                                                {selectedProblem.examples && selectedProblem.examples[selectedTestCaseTab] ? (
                                                                    <div className={`space-y-3 max-w-2xl p-4 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-black/40 border-white/5'}`}>
                                                                        <div>
                                                                            <div className={`text-[10px] font-bold uppercase mb-1 ${isLight ? 'text-purple-700' : 'text-zinc-500'}`}>Input</div>
                                                                            <div className={`p-3 rounded-lg border overflow-x-auto whitespace-pre-wrap font-mono ${isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-[#181818] border-white/5 text-zinc-200'}`}>
                                                                                {selectedProblem.examples[selectedTestCaseTab].input}
                                                                            </div>
                                                                        </div>
                                                                        <div>
                                                                            <div className={`text-[10px] font-bold uppercase mb-1 ${isLight ? 'text-purple-700' : 'text-zinc-500'}`}>Expected Output</div>
                                                                            <div className={`p-3 rounded-lg border overflow-x-auto whitespace-pre-wrap font-mono ${isLight ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold' : 'bg-[#181818] border-white/5 text-green-400/90'}`}>
                                                                                {selectedProblem.examples[selectedTestCaseTab].output}
                                                                            </div>
                                                                        </div>
                                                                        {runResultData?.results && runResultData.results[selectedTestCaseTab] && (
                                                                            <div>
                                                                                <div className="flex items-center justify-between mb-1">
                                                                                    <div className={`text-[10px] font-bold uppercase ${isLight ? 'text-purple-700' : 'text-zinc-500'}`}>Actual Output</div>
                                                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${runResultData.results[selectedTestCaseTab].passed ? (isLight ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-green-500/20 text-green-400 border border-green-500/30') : (isLight ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-red-500/20 text-red-400 border border-red-500/30')}`}>
                                                                                        {runResultData.results[selectedTestCaseTab].passed ? 'PASSED' : (runResultData.results[selectedTestCaseTab].status || 'WRONG ANSWER')}
                                                                                    </span>
                                                                                </div>
                                                                                <div className={`p-3 rounded-lg border overflow-x-auto whitespace-pre-wrap font-mono ${runResultData.results[selectedTestCaseTab].passed ? (isLight ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-green-950/20 text-green-400 border-green-500/30') : (isLight ? 'bg-rose-50 text-rose-900 border-rose-200' : 'bg-red-950/20 text-red-400 border-red-500/30')}`}>
                                                                                    {runResultData.results[selectedTestCaseTab].actual !== undefined && runResultData.results[selectedTestCaseTab].actual !== ''
                                                                                        ? runResultData.results[selectedTestCaseTab].actual
                                                                                        : (runResultData.results[selectedTestCaseTab].stdout?.trim() || (runResultData.results[selectedTestCaseTab].passed ? runResultData.results[selectedTestCaseTab].expected : '(No output returned / null)'))}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                        {selectedProblem.examples[selectedTestCaseTab].explanation && (
                                                                            <div>
                                                                                <div className={`text-[10px] font-bold uppercase mb-1 ${isLight ? 'text-purple-700' : 'text-zinc-500'}`}>Explanation</div>
                                                                                <div className={`text-xs italic ${isLight ? 'text-slate-800 font-medium' : 'text-zinc-400'}`}>
                                                                                    {selectedProblem.examples[selectedTestCaseTab].explanation}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <div className={`py-4 ${isLight ? 'text-slate-600' : 'text-zinc-500'}`}>No example test cases available.</div>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <div className={`space-y-3 max-w-2xl p-4 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-black/40 border-white/5'}`}>
                                                                <div>
                                                                    <div className={`text-[10px] font-bold uppercase mb-1 ${isLight ? 'text-purple-700' : 'text-zinc-500'}`}>Custom Input</div>
                                                                    <textarea
                                                                        value={customInputs}
                                                                        onChange={(e) => setCustomInputs(e.target.value)}
                                                                        placeholder="e.g. [[1,2,3], 5]"
                                                                        className={`w-full p-3 rounded-lg border outline-none overflow-x-auto whitespace-pre-wrap font-mono min-h-[120px] resize-y custom-scrollbar ${isLight ? 'bg-white border-slate-300 text-slate-900 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 placeholder:text-slate-400 shadow-sm' : 'bg-[#181818] text-zinc-200 border-white/10 focus:border-accent-secondary focus:ring-1 focus:ring-accent-secondary'}`}
                                                                    />
                                                                </div>
                                                                <div className={`text-xs ${isLight ? 'text-slate-600 font-medium' : 'text-zinc-500'}`}>
                                                                    Enter the inputs as a JSON array matching the function parameters. The code will execute against this input when you click "Run Code".
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="space-y-4">
                                                        {isRunningCode || isSubmitting ? (
                                                            <div className={`flex items-center gap-3 py-4 animate-pulse ${isLight ? 'text-amber-600 font-bold' : 'text-yellow-400'}`}>
                                                                <Zap size={16} className="animate-spin" />
                                                                <span>Running code...</span>
                                                            </div>
                                                        ) : runResultData ? (
                                                            <div className="space-y-4">
                                                                <div className={`flex items-center justify-between p-3 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-white/5 border-white/10'}`}>
                                                                    <div className="flex items-center gap-3">
                                                                        <span className={`px-3 py-1 rounded-md font-extrabold uppercase text-[11px] tracking-wider ${runResultData.status === 'ACCEPTED' ? (isLight ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-green-500/20 text-green-400 border border-green-500/30') : (isLight ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-red-500/20 text-red-400 border border-red-500/30')}`}>
                                                                            {runResultData.status || 'FINISHED'}
                                                                        </span>
                                                                        <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-zinc-300'}`}>
                                                                            Passed: {runResultData.testCasesPass ?? 0} / {runResultData.testCasesTotal ?? 0}
                                                                        </span>
                                                                    </div>
                                                                    <div className={`flex items-center gap-4 text-[11px] ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>
                                                                        <span>Runtime: <strong className={isLight ? 'text-slate-900 font-bold' : 'text-white'}>{runResultData.timeMs ?? 0} ms</strong></span>
                                                                        <span>Memory: <strong className={isLight ? 'text-slate-900 font-bold' : 'text-white'}>{runResultData.memoryKb ? (runResultData.memoryKb / 1024).toFixed(1) : 0} MB</strong></span>
                                                                        <span>Language: <strong className={`uppercase ${isLight ? 'text-purple-700 font-bold' : 'text-accent-secondary'}`}>{language}</strong></span>
                                                                    </div>
                                                                </div>

                                                                {runResultData.compile_output && (
                                                                    <div className={`p-4 rounded-xl border space-y-2 ${isLight ? 'bg-rose-50 border-rose-300 text-rose-900' : 'bg-red-950/30 border-red-500/30'}`}>
                                                                        <div className={`font-bold uppercase text-[10px] tracking-widest flex items-center gap-2 ${isLight ? 'text-rose-700' : 'text-red-400'}`}>
                                                                            <X size={14} /> Compilation / Build Error ({language.toUpperCase()})
                                                                        </div>
                                                                        <pre className={`p-3 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap font-mono border ${isLight ? 'bg-white border-rose-200 text-rose-900' : 'bg-black/60 text-red-300'}`}>
                                                                            {runResultData.compile_output}
                                                                        </pre>
                                                                    </div>
                                                                )}

                                                                {runResultData.results && runResultData.results.length > 0 && (
                                                                    <div className="space-y-3">
                                                                        <div className={`text-[10px] uppercase font-black tracking-widest ${isLight ? 'text-purple-700' : 'text-zinc-400'}`}>
                                                                            {runResultData.testCasesTotal === 1 && runResultData.results[0].expected === '""' ? 'Custom Input Result' : 'Test Results'}
                                                                        </div>
                                                                        <div className="grid grid-cols-1 gap-2">
                                                                            {runResultData.results.map((r: any, idx: number) => {
                                                                                const isCustom = runResultData.testCasesTotal === 1 && r.expected === '""';
                                                                                return (
                                                                                    <div key={idx} className={`p-3 rounded-xl border transition-colors ${r.passed ? (isLight ? 'bg-emerald-50/70 border-emerald-200' : 'bg-green-500/5 border-green-500/20') : (isLight ? 'bg-rose-50/70 border-rose-200' : 'bg-red-500/5 border-red-500/20')}`}>
                                                                                        {!isCustom && (
                                                                                            <div className="flex justify-between items-center mb-1">
                                                                                                <span className={`font-bold flex items-center gap-2 ${r.passed ? (isLight ? 'text-emerald-700 font-extrabold' : 'text-green-400') : (isLight ? 'text-rose-700 font-extrabold' : 'text-red-400')}`}>
                                                                                                    {r.passed ? <CheckCircle2 size={14} /> : <X size={14} />}
                                                                                                    Testcase {idx + 1} {r.is_hidden ? '(Hidden Case)' : ''}
                                                                                                </span>
                                                                                                <span className={`text-[10px] ${isLight ? 'text-slate-600' : 'text-zinc-500'}`}>{r.time ? `${(parseFloat(r.time) * 1000).toFixed(0)} ms` : 'N/A'}</span>
                                                                                            </div>
                                                                                        )}
                                                                                        {isCustom && (
                                                                                            <div className={`flex justify-between items-center mb-2 pb-2 border-b ${isLight ? 'border-slate-200' : 'border-white/5'}`}>
                                                                                                <span className={`font-bold flex items-center gap-2 ${isLight ? 'text-purple-800' : 'text-zinc-300'}`}>
                                                                                                    <Zap size={14} className={isLight ? 'text-purple-600' : 'text-accent-secondary'} />
                                                                                                    Custom Execution
                                                                                                </span>
                                                                                                <span className={`text-[10px] ${isLight ? 'text-slate-600' : 'text-zinc-500'}`}>{r.time ? `${(parseFloat(r.time) * 1000).toFixed(0)} ms` : 'N/A'}</span>
                                                                                            </div>
                                                                                        )}
                                                                                        <div className="space-y-2 mt-2 text-xs">
                                                                                            {r.status && !isCustom && <div className={`font-bold ${r.passed ? (isLight ? 'text-emerald-700' : 'text-green-400') : (isLight ? 'text-rose-700' : 'text-red-400')}`}>Status: {r.status}</div>}
                                                                                            {r.input && (
                                                                                                <div>
                                                                                                    <span className={`text-[10px] block mb-1 font-bold uppercase ${isLight ? 'text-purple-700' : 'text-zinc-500'}`}>Input</span>
                                                                                                    <pre className={`p-2 rounded-lg font-mono text-[11px] overflow-x-auto whitespace-pre-wrap border ${isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-black/50 text-zinc-300'}`}>{r.input}</pre>
                                                                                                </div>
                                                                                            )}
                                                                                            <div>
                                                                                                <div className="flex items-center justify-between mb-1">
                                                                                                    <span className={`text-[10px] font-bold uppercase ${isLight ? 'text-purple-700' : 'text-zinc-500'}`}>Actual Output</span>
                                                                                                    {!isCustom && (
                                                                                                        <span className={`text-[10px] font-semibold ${r.passed ? (isLight ? 'text-emerald-700' : 'text-green-400') : (isLight ? 'text-rose-700' : 'text-red-400')}`}>
                                                                                                            {r.passed ? '✓ Matches Expected' : '✗ Differs from Expected'}
                                                                                                        </span>
                                                                                                    )}
                                                                                                </div>
                                                                                                <pre className={`p-2 rounded-lg font-mono text-[11px] overflow-x-auto whitespace-pre-wrap border ${r.passed
                                                                                                    ? (isLight ? 'bg-white border-emerald-300 text-emerald-900' : 'bg-green-950/20 text-green-300 border-green-500/20')
                                                                                                    : (isLight ? 'bg-white border-rose-300 text-rose-900' : 'bg-red-950/20 text-red-300 border-red-500/20')
                                                                                                    }`}>
                                                                                                    {r.actual !== undefined && r.actual !== null && r.actual !== ''
                                                                                                        ? r.actual
                                                                                                        : (r.stdout !== undefined && r.stdout !== null && r.stdout.trim() !== ''
                                                                                                            ? r.stdout.trim()
                                                                                                            : (r.passed ? (r.expected ?? 'null') : '(No output returned / undefined)'))}
                                                                                                </pre>
                                                                                            </div>
                                                                                            {!isCustom && r.expected !== null && r.expected !== undefined && (
                                                                                                <div>
                                                                                                    <span className={`text-[10px] block mb-1 font-bold uppercase ${isLight ? 'text-purple-700' : 'text-zinc-500'}`}>Expected Output</span>
                                                                                                    <pre className={`p-2 rounded-lg font-mono text-[11px] overflow-x-auto whitespace-pre-wrap border ${isLight ? 'bg-white border-slate-200 text-emerald-800' : 'bg-black/50 text-emerald-400/90 border-white/5'}`}>{r.expected}</pre>
                                                                                                </div>
                                                                                            )}
                                                                                            {r.stdout && r.stdout.trim() !== (r.actual ?? '').trim() && (
                                                                                                <div>
                                                                                                    <span className={`text-[10px] block mb-1 font-bold uppercase ${isLight ? 'text-purple-700' : 'text-zinc-500'}`}>Standard Output / Console Logs</span>
                                                                                                    <pre className={`p-3 rounded-lg font-mono text-[11px] overflow-x-auto border shadow-inner ${isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0a0a0a] text-zinc-300 border-white/5'}`}>{r.stdout}</pre>
                                                                                                </div>
                                                                                            )}
                                                                                            {r.stderr && (
                                                                                                <div>
                                                                                                    <span className={`text-[10px] block mb-1 font-bold uppercase ${isLight ? 'text-rose-700' : 'text-red-400'}`}>Standard Error</span>
                                                                                                    <pre className={`p-2 rounded-lg font-mono text-[11px] overflow-x-auto border ${isLight ? 'bg-white border-rose-200 text-rose-800' : 'bg-red-950/30 text-red-300 border-red-500/30'}`}>{r.stderr}</pre>
                                                                                                </div>
                                                                                            )}
                                                                                            {r.compile_output && (
                                                                                                <div>
                                                                                                    <span className={`text-[10px] block mb-1 font-bold uppercase ${isLight ? 'text-amber-700' : 'text-yellow-400'}`}>Compiler Output</span>
                                                                                                    <pre className={`p-2 rounded-lg font-mono text-[11px] overflow-x-auto border ${isLight ? 'bg-white border-amber-200 text-amber-900' : 'bg-black/50 text-yellow-200'}`}>{r.compile_output}</pre>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                )
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className={`py-6 text-center italic ${isLight ? 'text-slate-600 font-medium' : 'text-zinc-500'}`}>
                                                                Click "Run Code" or "Execute Uplink" to view compiler output, console logs, and test results here.
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </Panel>
                            </PanelGroup>
                        </Panel>

                        <PanelResizeHandle
                            id="handle-intel"
                            hitAreaMargins={{ coarse: 20, fine: 15 }}
                            className="w-2 relative flex items-center justify-center bg-white/5 hover:bg-accent-secondary/60 active:bg-accent-secondary transition-colors cursor-col-resize z-20 group focus:outline-none before:absolute before:inset-y-0 before:-left-2 before:-right-2 before:z-30 before:content-['']"
                        >
                            <div className="w-1 h-8 rounded-full bg-white/30 group-hover:bg-white group-active:bg-white transition-colors" />
                        </PanelResizeHandle>

                        {/* ── Right Pane: Agent Intel & Opponent Buffer ── */}
                        {/* ── Right Pane: Split-Screen Battle HUD / Opponent Buffer ── */}
                        <Panel id="panel-intel" defaultSize={24} minSize={15} maxSize={35} className={`flex flex-col min-w-0 overflow-hidden ${isLight ? 'bg-white' : 'bg-[#07070d]'}`}>
                            <aside className={`h-full border-l flex flex-col overflow-hidden min-w-0 ${isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#07070d] border-white/10 text-white'}`}>
                                {!isPractice ? (
                                    /* 1v1 Battle HUD Mode */
                                    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar">
                                        {/* Rival Header */}
                                        <div className={`p-5 border-b space-y-4 ${isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-black/40 border-white/10'}`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Shield size={14} className="text-red-500" />
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-rose-700 font-bold' : 'text-zinc-400'}`}>Rival Combatant</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.7)]" />
                                                    <span className="text-[9px] font-bold uppercase tracking-wider text-red-500">1v1 Combat</span>
                                                </div>
                                            </div>

                                            <div className={`flex items-center gap-3.5 p-3 rounded-2xl border ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-white/5 border-white/5'}`}>
                                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-500/30 via-purple-600/20 to-black border border-red-500/30 flex items-center justify-center text-red-400 font-black text-lg shadow-md">
                                                    {players.find(p => p.id !== null)?.username?.[0]?.toUpperCase() || 'R'}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className={`text-sm font-black uppercase tracking-tight truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                                            {players.find(p => p.id !== null)?.username || 'RIVAL_OPERATOR'}
                                                        </h4>
                                                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${opponentStatus.typing ? (isLight ? 'text-emerald-700 bg-emerald-100 border border-emerald-300 animate-pulse' : 'text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 animate-pulse') :
                                                            opponentStatus.submitted ? (isLight ? 'text-amber-700 bg-amber-100 border border-amber-300' : 'text-amber-400 bg-amber-950/40 border border-amber-500/30') :
                                                                (isLight ? 'text-slate-600 bg-slate-100 border border-slate-200' : 'text-zinc-500 bg-black/40')
                                                            }`}>
                                                            {opponentStatus.typing ? 'Typing...' : opponentStatus.submitted ? 'Transmitting' : 'Standby'}
                                                        </span>
                                                    </div>
                                                    <p className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${isLight ? 'text-purple-700' : 'text-zinc-500'}`}>
                                                        DIAMOND TIER // 2420 RP
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Head-to-Head Comparative Metrics */}
                                        <div className={`p-5 border-b space-y-4 ${isLight ? 'bg-white border-slate-200' : 'border-white/10 bg-white/[0.01]'}`}>
                                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                                                <span className={isLight ? 'text-purple-700 font-bold' : 'text-zinc-400'}>Comparative Intel</span>
                                                <span className={`font-bold ${isLight ? 'text-purple-700' : 'text-accent-secondary'}`}>Synced</span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2.5 text-xs">
                                                <div className={`p-3 rounded-xl border space-y-1 ${isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-black/50 border-white/5'}`}>
                                                    <div className={`text-[8px] font-black uppercase tracking-wider ${isLight ? 'text-purple-700' : 'text-zinc-500'}`}>Your Strategy</div>
                                                    <div className={`font-bold text-xs truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>{liveStrategy}</div>
                                                    <div className={`text-[9px] font-semibold ${isLight ? 'text-purple-700' : 'text-accent-secondary'}`}>{liveComplexity}</div>
                                                </div>
                                                <div className={`p-3 rounded-xl border space-y-1 ${isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-black/50 border-white/5'}`}>
                                                    <div className={`text-[8px] font-black uppercase tracking-wider ${isLight ? 'text-purple-700' : 'text-zinc-500'}`}>Rival Strategy</div>
                                                    <div className="text-red-500 font-bold text-xs truncate">Dynamic Heuristic</div>
                                                    <div className={`text-[9px] font-semibold ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>O(N log N)</div>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex justify-between text-[9px] font-black uppercase tracking-wider">
                                                    <span className={isLight ? 'text-slate-700 font-bold' : 'text-zinc-400'}>Logic Efficiency Vector</span>
                                                    <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{confidence}%</span>
                                                </div>
                                                <div className={`h-1.5 w-full rounded-full overflow-hidden ${isLight ? 'bg-slate-200' : 'bg-white/5'}`}>
                                                    <div className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary transition-all duration-1000 shadow-[0_0_8px_rgba(139,92,246,0.4)]" style={{ width: `${confidence}%` }} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Live Battle Feed */}
                                        <div className={`p-5 border-b space-y-3 ${isLight ? 'bg-slate-50 border-slate-200' : 'border-white/10'}`}>
                                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                                                <span className={`flex items-center gap-1.5 ${isLight ? 'text-purple-700' : 'text-zinc-400'}`}><Radio size={12} className={isLight ? 'text-purple-600' : 'text-accent-secondary'} /> Combat Feed</span>
                                                <span className={`text-[8px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-zinc-600'}`}>LIVE</span>
                                            </div>
                                            <div className="space-y-2 text-[10px]">
                                                {battleFeed.slice(0, 4).map((f) => (
                                                    <div key={f.id} className={`flex items-start gap-2 p-2 rounded-lg border ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-black/40 border-white/5'}`}>
                                                        <span className={`text-[9px] shrink-0 font-medium ${isLight ? 'text-slate-500' : 'text-zinc-600'}`}>{f.time}</span>
                                                        <span className={`leading-tight ${isLight ? (f.type === 'success' ? 'text-emerald-700 font-bold' : f.type === 'warn' ? 'text-amber-700 font-bold' : 'text-slate-800') : (f.type === 'success' ? 'text-emerald-400' : f.type === 'warn' ? 'text-amber-400' : 'text-zinc-300')}`}>
                                                            {f.text}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Opponent Code Buffer Stream */}
                                        <div className={`flex-1 flex flex-col min-h-[160px] ${isLight ? 'bg-slate-100' : 'bg-black/40'}`}>
                                            <div className={`px-5 py-3 flex items-center justify-between border-b ${isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-black/60 border-white/5 text-zinc-400'}`}>
                                                <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-purple-700' : 'text-zinc-400'}`}>
                                                    <Terminal size={12} />
                                                    Rival Intercept Buffer
                                                </div>
                                                {opponentStatus.typing && <span className={`text-[8px] animate-pulse uppercase font-bold tracking-wider ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>STREAMING...</span>}
                                            </div>
                                            <div className="flex-1 min-h-0">
                                                <Editor
                                                    height="100%"
                                                    defaultLanguage="javascript"
                                                    theme={isLight ? 'vs' : 'vs-dark'}
                                                    value={liveOpponentCode || "// Intercepting rival stream...\n// Awaiting logic uplink..."}
                                                    options={{
                                                        fontSize: 11,
                                                        minimap: { enabled: false },
                                                        readOnly: true,
                                                        backgroundColor: isLight ? '#f8f9fc' : '#050508',
                                                        domReadOnly: true,
                                                        lineNumbers: 'off',
                                                        folding: false,
                                                        scrollBeyondLastLine: false,
                                                        glyphMargin: false,
                                                        lineDecorationsWidth: 0,
                                                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace"
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* Practice Lab: AI Coach in coach mode, otherwise practice specs */
                                    isCoachMode ? renderCoachHUD() : renderPracticeSpecsHUD()
                                )}
                            </aside>
                        </Panel>
                    </PanelGroup>
                ) : (
                    /* ── Mobile / Tablet Single View Container ── */
                    <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
                        {mobileActiveTab === 'problem' && (
                            <div className={`flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar ${isLight ? 'bg-white text-slate-900' : 'bg-[#07070d] text-white'}`}>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <h2 className={`text-2xl font-black tracking-tight uppercase leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                            {selectedProblem.title}
                                        </h2>
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${selectedProblem.difficulty === 'HARD' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                                selectedProblem.difficulty === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                                    'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                            }`}>
                                            {selectedProblem.difficulty}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 pt-1">
                                        {(selectedProblem.tags || ['Algorithms', 'Logic']).map((tag, idx) => (
                                            <span key={idx} className={`cyber-pill text-[10px] ${isLight ? 'bg-purple-50 text-purple-800 border-purple-200 font-bold' : 'text-zinc-400'}`}>
                                                {tag}
                                            </span>
                                        ))}
                                        <span className={`cyber-pill text-[10px] ${isLight ? 'bg-purple-100 text-purple-800 border-purple-300 font-bold' : 'text-accent-primary'}`}>
                                            <Target size={10} className={isLight ? 'text-purple-600' : ''} /> {selectedProblem.acceptanceRate || '82.4%'}
                                        </span>
                                        <span className={`cyber-pill text-[10px] ${isLight ? 'bg-slate-100 text-slate-800 border-slate-300 font-bold' : 'text-zinc-500'}`}>
                                            <Clock size={10} className={isLight ? 'text-slate-600' : ''} /> {selectedProblem.timeLimit || 300}s
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className={`text-sm font-normal leading-relaxed ${isLight ? 'text-slate-900 font-medium' : 'text-zinc-300'}`}>
                                        {renderCyberText(selectedProblem.description, isLight)}
                                    </div>
                                </div>

                                {/* Examples */}
                                {selectedProblem.examples && selectedProblem.examples.length > 0 && (
                                    <div className="space-y-3">
                                        <div className={`text-xs font-black uppercase tracking-[0.2em] flex items-center gap-1.5 ${isLight ? 'text-purple-700' : 'text-accent-secondary'}`}>
                                            <Zap size={13} /> Example Patterns
                                        </div>
                                        <div className="space-y-3">
                                            {selectedProblem.examples.map((ex, i) => (
                                                <div key={i} className={`p-4 rounded-xl space-y-2 text-xs border ${isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-[#0e0e18] border-white/10'
                                                    }`}>
                                                    <div className={`font-bold text-[11px] ${isLight ? 'text-purple-700' : 'text-accent-secondary'}`}>Example {i + 1}</div>
                                                    <div>
                                                        <span className="text-gray-500 text-[10px] block">Input</span>
                                                        <pre className={`p-2 rounded font-mono text-[11px] overflow-x-auto whitespace-pre-wrap ${isLight ? 'bg-white border border-slate-200 text-slate-900' : 'bg-black/50 text-zinc-300'}`}>{ex.input}</pre>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500 text-[10px] block">Output</span>
                                                        <pre className={`p-2 rounded font-mono text-[11px] overflow-x-auto whitespace-pre-wrap ${isLight ? 'bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold' : 'bg-black/50 text-emerald-400'}`}>{ex.output}</pre>
                                                    </div>
                                                    {ex.explanation && (
                                                        <div className={`text-[11px] italic pt-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                                                            {ex.explanation}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Constraints */}
                                {selectedProblem.constraints && (
                                    <div className={`p-4 rounded-xl border space-y-2 ${isLight ? 'bg-purple-50/50 border-purple-200' : 'bg-white/2 border-white/10'}`}>
                                        <div className={`text-[10px] font-black uppercase tracking-wider ${isLight ? 'text-purple-700' : 'text-gray-400'}`}>Constraints</div>
                                        <ul className="space-y-1 text-xs font-mono">
                                            {(Array.isArray(selectedProblem.constraints) ? selectedProblem.constraints : [selectedProblem.constraints]).map((c, i) => (
                                                <li key={i} className={`flex items-start gap-2 ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>
                                                    <span className="text-purple-500">&bull;</span>
                                                    <span>{c}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        {mobileActiveTab === 'editor' && (
                            <div className={`flex-1 flex flex-col min-h-0 relative h-full ${isLight ? 'bg-white' : 'bg-black'}`}>
                                {/* Language indicator on mobile */}
                                <div className={`px-4 py-2 border-b flex items-center justify-between text-[11px] shrink-0 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0a0a0f] border-white/10'}`}>
                                    <div className="flex items-center gap-2">
                                        <FileCode size={13} className={isLight ? 'text-purple-600' : 'text-accent-secondary'} />
                                        <span className={`font-mono uppercase font-black ${isLight ? 'text-purple-700' : 'text-accent-secondary'}`}>{language}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setIsVoiceModalOpen(true)}
                                            className={`px-2 py-1 rounded-lg border text-[10px] font-black uppercase flex items-center gap-1.5 ${isLight ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-white/5 border-white/10 text-accent-secondary'
                                                }`}
                                        >
                                            <Wand2 size={12} /> Voice
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1 min-h-0 h-full">
                                    <Editor
                                        height="100%"
                                        language={language}
                                        defaultLanguage="javascript"
                                        theme={isLight ? 'vs' : 'vs-dark'}
                                        value={code}
                                        onMount={handleEditorMount}
                                        onChange={(val) => {
                                            setCode(val || '');
                                            syncCode(val || '');
                                        }}
                                        options={{
                                            fontSize: 13,
                                            minimap: { enabled: false },
                                            automaticLayout: true,
                                            lineNumbersMinChars: 2,
                                            scrollBeyondLastLine: false,
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {mobileActiveTab === 'terminal' && (
                            <div className={`flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs custom-scrollbar ${isLight ? 'bg-white text-slate-900' : 'bg-[#07070d] text-white'}`}>
                                {/* Testcase vs Terminal Tabs */}
                                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setActiveTerminalTab('testcases')}
                                            className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${activeTerminalTab === 'testcases'
                                                    ? (isLight ? 'bg-purple-100 text-purple-900 font-bold' : 'bg-accent-secondary/20 text-accent-primary border border-accent-secondary/30')
                                                    : 'text-gray-500'
                                                }`}
                                        >
                                            Test Cases
                                        </button>
                                        <button
                                            onClick={() => setActiveTerminalTab('terminal')}
                                            className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${activeTerminalTab === 'terminal'
                                                    ? (isLight ? 'bg-purple-100 text-purple-900 font-bold' : 'bg-accent-secondary/20 text-accent-primary border border-accent-secondary/30')
                                                    : 'text-gray-500'
                                                }`}
                                        >
                                            Execution Logs
                                        </button>
                                    </div>
                                    {runResultData && (
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${runResultData.status === 'ACCEPTED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                                            }`}>
                                            {runResultData.status || 'FINISHED'}
                                        </span>
                                    )}
                                </div>

                                {activeTerminalTab === 'testcases' ? (
                                    <div className="space-y-3">
                                        {/* Test Case Buttons */}
                                        <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                            {selectedProblem.examples.map((_, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => setSelectedTestCaseTab(idx)}
                                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase shrink-0 transition-all ${selectedTestCaseTab === idx
                                                            ? (isLight ? 'bg-purple-600 text-white' : 'bg-white text-black font-black')
                                                            : (isLight ? 'bg-slate-100 text-slate-700' : 'bg-white/5 text-gray-400')
                                                        }`}
                                                >
                                                    Case {idx + 1}
                                                </button>
                                            ))}
                                        </div>

                                        {selectedProblem.examples && selectedProblem.examples[selectedTestCaseTab] && (
                                            <div className={`p-4 rounded-xl border space-y-3 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/40 border-white/10'}`}>
                                                <div>
                                                    <span className="text-gray-500 text-[10px] uppercase font-bold block mb-1">Input</span>
                                                    <pre className={`p-2.5 rounded font-mono text-xs overflow-x-auto whitespace-pre-wrap ${isLight ? 'bg-white border border-slate-200 text-slate-900' : 'bg-[#141418] text-zinc-200'}`}>
                                                        {selectedProblem.examples[selectedTestCaseTab].input}
                                                    </pre>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500 text-[10px] uppercase font-bold block mb-1">Expected Output</span>
                                                    <pre className={`p-2.5 rounded font-mono text-xs overflow-x-auto whitespace-pre-wrap ${isLight ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-[#141418] text-emerald-400'}`}>
                                                        {selectedProblem.examples[selectedTestCaseTab].output}
                                                    </pre>
                                                </div>
                                                {runResultData?.results && runResultData.results[selectedTestCaseTab] && (
                                                    <div>
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-gray-500 text-[10px] uppercase font-bold">Actual Output</span>
                                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${runResultData.results[selectedTestCaseTab].passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                                                                }`}>
                                                                {runResultData.results[selectedTestCaseTab].passed ? 'PASSED' : 'FAILED'}
                                                            </span>
                                                        </div>
                                                        <pre className={`p-2.5 rounded font-mono text-xs overflow-x-auto whitespace-pre-wrap ${runResultData.results[selectedTestCaseTab].passed
                                                                ? (isLight ? 'bg-emerald-50 text-emerald-900' : 'bg-emerald-950/20 text-emerald-300')
                                                                : (isLight ? 'bg-rose-50 text-rose-900' : 'bg-rose-950/20 text-rose-300')
                                                            }`}>
                                                            {runResultData.results[selectedTestCaseTab].actual !== undefined
                                                                ? runResultData.results[selectedTestCaseTab].actual
                                                                : runResultData.results[selectedTestCaseTab].stdout || '(No output)'}
                                                        </pre>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {isRunningCode || isSubmitting ? (
                                            <div className="flex items-center gap-2 py-6 text-amber-400 justify-center">
                                                <Zap size={16} className="animate-spin" />
                                                <span className="text-xs font-bold uppercase tracking-wider">Evaluating Solution in Judge Engine...</span>
                                            </div>
                                        ) : runResultData ? (
                                            <div className="space-y-3">
                                                <div className={`p-3 rounded-xl border flex items-center justify-between flex-wrap gap-2 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'}`}>
                                                    <span className={`text-xs font-black uppercase px-2 py-0.5 rounded ${runResultData.status === 'ACCEPTED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                                        {runResultData.status || 'VERDICT'}
                                                    </span>
                                                    <span className="text-xs text-gray-400">
                                                        Passed: {runResultData.testCasesPass ?? 0} / {runResultData.testCasesTotal ?? 0}
                                                    </span>
                                                    <span className="text-xs text-gray-400">
                                                        Time: {runResultData.timeMs ?? 0}ms
                                                    </span>
                                                </div>
                                                {runResultData.compile_output && (
                                                    <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 space-y-1">
                                                        <div className="text-rose-400 font-bold uppercase text-[10px]">Compilation Error</div>
                                                        <pre className="text-rose-300 whitespace-pre-wrap text-xs font-mono">{runResultData.compile_output}</pre>
                                                    </div>
                                                )}
                                                {runResultData.stdout && (
                                                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                                                        <div className="text-gray-400 font-bold uppercase text-[10px]">Standard Output</div>
                                                        <pre className="text-zinc-300 whitespace-pre-wrap text-xs font-mono">{runResultData.stdout}</pre>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="py-12 text-center text-gray-500 text-xs italic">
                                                No execution logs yet. Tap "Run Code" below to test.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {mobileActiveTab === 'intel' && (
                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                {isPractice ? (
                                    <div className={`rounded-2xl border overflow-hidden ${isLight ? 'bg-white border-slate-200' : 'bg-[#080808] border-white/10'}`}>
                                        {isCoachMode ? renderCoachHUD() : renderPracticeSpecsHUD()}
                                    </div>
                                ) : (
                                    <div className={`p-4 rounded-2xl border space-y-4 text-xs ${isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#080808] border-white/10 text-white'}`}>
                                        <div className={`font-bold uppercase ${isLight ? 'text-purple-700' : 'text-blue-400'}`}>Agent Intel & Opponent</div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className={`p-3 rounded-lg border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-transparent'}`}>Complexity: {liveComplexity}</div>
                                            <div className={`p-3 rounded-lg border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-transparent'}`}>Strategy: {liveStrategy}</div>
                                        </div>
                                        <div className={`p-3 rounded-xl border text-[10px] ${isLight ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-red-950/20 border-red-500/20 text-zinc-400'}`}>
                                            <Shield size={12} className="text-red-500 inline mr-1" />
                                            Competitive Integrity Rule 14E: Real-time AI coaching is disabled during active combat matches.
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Sticky Bottom Action Tray on Mobile (< lg) */}
                        <div className={`lg:hidden border-t px-3 py-2 flex items-center gap-2 z-30 shrink-0 ${isLight ? 'bg-white/95 border-slate-200 backdrop-blur-md' : 'bg-black/95 border-white/10 backdrop-blur-md'
                            }`}>
                            <button
                                onClick={() => setIsVoiceModalOpen(true)}
                                className="p-2.5 rounded-xl border border-accent-secondary/30 bg-accent-secondary/10 text-accent-secondary shrink-0"
                                title="Voice Coder"
                            >
                                <Wand2 size={16} />
                            </button>
                            <button
                                onClick={handleRun}
                                disabled={isRunningCode || isSubmitting}
                                className={`flex-1 py-2.5 px-3 rounded-xl font-bold uppercase text-[11px] tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm ${isLight ? 'bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-900' : 'bg-white/10 hover:bg-white/15 text-white'
                                    } ${isRunningCode ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                                <Zap size={13} className={isRunningCode ? 'animate-spin text-amber-400' : (isLight ? 'text-purple-600' : '')} />
                                <span>{isRunningCode ? 'Running...' : 'Run Code'}</span>
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isRunningCode || isSubmitting}
                                className={`flex-1 py-2.5 px-3 rounded-xl font-black uppercase text-[11px] tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md ${isLight
                                        ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-[0_0_15px_rgba(147,51,234,0.35)]'
                                        : 'bg-accent-primary hover:bg-accent-secondary text-black hover:text-white shadow-[0_0_15px_rgba(124,58,237,0.3)]'
                                    } ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                                <Zap size={13} className={isSubmitting ? 'animate-spin' : ''} />
                                <span>{isSubmitting ? 'Submitting...' : isPractice ? 'Submit Solution' : 'Execute'}</span>
                            </button>
                        </div>
                    </div>
                )}
            </main>

            {/* ── Results Overlay ── */}
            {showResults && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/95 backdrop-blur-2xl animate-in fade-in duration-700">
                    <div className="w-full max-w-5xl bg-[#080808] border border-white/10 rounded-[3.5rem] overflow-hidden shadow-[0_0_120px_rgba(0,0,0,0.5)] flex flex-col lg:flex-row h-[85vh]">
                        {/* Summary Panel */}
                        <div className={`w-full lg:w-96 p-12 flex flex-col justify-between relative overflow-hidden ${score.result === 'VICTORY' ? 'bg-accent-secondary' : 'bg-red-500'}`}>
                            <div className="relative z-10 space-y-3">
                                <p className="text-black text-[10px] font-black uppercase tracking-[0.4em]">Protocol Status</p>
                                <h2 className="text-7xl font-black text-black leading-none tracking-tighter">{score.result}</h2>
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
                                    <h3 className="text-3xl font-black tracking-tight uppercase">Match Analytics</h3>
                                    <p className="text-gray-500 text-[10px] font-bold mt-2 tracking-widest uppercase opacity-40">Session ID: {Math.random().toString(36).substr(2, 12).toUpperCase()}</p>
                                </div>
                                <button onClick={() => goToDashboard()} className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white hover:text-black transition-all group">
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
                                        <div className="text-gray-600 group-hover:text-accent-secondary transition-colors">{m.icon}</div>
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
                                        <div key={i} className="flex-1 bg-accent-secondary/15 rounded-md hover:bg-accent-secondary transition-all duration-500" style={{ height: v + '%' }} />
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={() => goToDashboard()}
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
                                <h3 className="text-xl font-black uppercase tracking-tighter text-white">Warning: Combat Active</h3>
                                <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">Protocol Abandonment Imminent</p>
                            </div>
                        </div>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            Leaving a live session will result in immediate rating penalty and disconnection from CodeArena. Confirm termination?
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

            <VoiceWorkspaceModal
                isOpen={isVoiceModalOpen}
                onClose={() => setIsVoiceModalOpen(false)}
                currentLanguage={language === 'javascript' ? 'js' : language === 'python' ? 'py' : language === 'java' ? 'java' : language === 'c' ? 'c' : 'cpp'}
                onAddCode={handleAddGeneratedCode}
            />

            {/* Practice Lab Problem Switcher Modal (ONLY in Practice Lab Modes) */}
            {showProblemPicker && isPractice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
                    <div className={`relative w-full max-w-xl p-6 sm:p-8 rounded-3xl border overflow-hidden flex flex-col max-h-[85vh] ${isLight
                            ? 'bg-white border-slate-200 text-slate-900 shadow-2xl'
                            : 'bg-[#0c0c14] border-white/10 text-white shadow-[0_0_50px_rgba(124,58,237,0.15)]'
                        }`}>
                        <div className={`flex items-center justify-between pb-6 border-b ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl border ${isLight ? 'bg-purple-100 border-purple-300 text-purple-700' : 'bg-accent-secondary/10 border-accent-secondary/20 text-accent-primary'
                                    }`}>
                                    <Target size={20} />
                                </div>
                                <div>
                                    <h3 className={`text-xl font-black uppercase tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>Practice Lab // Change Problem</h3>
                                    <p className={`text-xs font-medium ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>Switch target module or roll a new algorithmic challenge</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowProblemPicker(false)}
                                className={`p-2 rounded-xl border transition-colors ${isLight ? 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                                    }`}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Quick Action Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-6">
                            <button
                                onClick={handleNextRandomPracticeProblem}
                                disabled={isSwitchingProblem}
                                className={`p-4 rounded-2xl border transition-all text-left flex items-center justify-between group disabled:opacity-50 ${isLight
                                        ? 'border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-900 shadow-sm'
                                        : 'border-accent-secondary/30 bg-accent-secondary/10 hover:bg-accent-secondary/20 text-accent-secondary'
                                    }`}
                            >
                                <div>
                                    <div className={`text-[10px] font-mono font-bold uppercase tracking-wider ${isLight ? 'text-purple-700' : 'text-accent-primary'}`}>Instant Reroll</div>
                                    <div className={`text-sm font-black uppercase tracking-tight mt-0.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                        {isSwitchingProblem ? 'Selecting Module...' : 'Random Problem'}
                                    </div>
                                </div>
                                <Zap size={20} className={`group-hover:scale-125 transition-transform ${isSwitchingProblem ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                                onClick={() => {
                                    setShowProblemPicker(false);
                                    goToProblems({ mode: 'practice' });
                                }}
                                className={`p-4 rounded-2xl border transition-all text-left flex items-center justify-between group ${isLight
                                        ? 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-900 shadow-sm'
                                        : 'border-white/10 bg-white/5 hover:bg-white/10 text-white'
                                    }`}
                            >
                                <div>
                                    <div className={`text-[10px] font-mono font-bold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-gray-400'}`}>Tactical Armory</div>
                                    <div className={`text-sm font-black uppercase tracking-tight mt-0.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>Browse All Problems</div>
                                </div>
                                <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>

                        {/* In-Editor Problem List */}
                        <div className={`text-xs font-mono font-bold uppercase tracking-wider mb-3 flex items-center justify-between ${isLight ? 'text-slate-700' : 'text-gray-400'}`}>
                            <span>Select From Arsenal</span>
                            <span className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>{practiceProblemList.length} Modules</span>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                            {practiceProblemList.map((p: any) => {
                                const pid = (p.id || p._id || p.slug || '').toString();
                                const isCurrent = selectedProblem.id === pid;
                                return (
                                    <div
                                        key={pid}
                                        onClick={() => handleSelectPracticeProblem(p)}
                                        className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${isCurrent
                                            ? (isLight ? 'bg-purple-100 border-purple-300 text-slate-900 shadow-sm' : 'bg-accent-secondary/15 border-accent-secondary/40 text-white shadow-md')
                                            : (isLight ? 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800' : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-200')
                                            }`}
                                    >
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs font-bold uppercase ${isLight ? 'text-slate-900' : 'text-white'}`}>{p.title}</span>
                                                {isCurrent && <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${isLight ? 'bg-purple-200 border-purple-400 text-purple-900 font-bold' : 'bg-accent-secondary/25 border-accent-secondary/30 text-accent-primary'}`}>Active</span>}
                                            </div>
                                            <span className={`text-[9px] font-mono uppercase ${isLight ? 'text-slate-500 font-medium' : 'text-gray-500'}`}>{p.category || 'Algorithms'}</span>
                                        </div>
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase ${p.difficulty?.toLowerCase() === 'easy'
                                                ? (isLight ? 'text-emerald-800 border-emerald-300 bg-emerald-100' : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10')
                                                : p.difficulty?.toLowerCase() === 'medium'
                                                    ? (isLight ? 'text-amber-800 border-amber-300 bg-amber-100' : 'text-amber-400 border-amber-500/30 bg-amber-500/10')
                                                    : (isLight ? 'text-rose-800 border-rose-300 bg-rose-100' : 'text-red-400 border-red-500/30 bg-red-500/10')
                                            }`}>
                                            {p.difficulty || 'MEDIUM'}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Abandon Battle Warning Confirmation Modal */}
            {showAbandonModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
                    <div className={`relative w-full max-w-md rounded-3xl p-6 sm:p-8 text-center space-y-6 ${isLight
                            ? 'bg-white border border-rose-300 shadow-2xl'
                            : 'bg-[#0c0d16] border border-rose-500/30 shadow-[0_0_60px_rgba(244,63,94,0.25)]'
                        }`}>
                        <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center mx-auto ${isLight
                                ? 'bg-rose-100 border-rose-300 text-rose-600'
                                : 'bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.2)]'
                            }`}>
                            <AlertTriangle size={32} />
                        </div>
                        <div className="space-y-2">
                            <h3 className={`text-lg font-black uppercase tracking-wider ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                Forfeit Active Combat?
                            </h3>
                            <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-700 font-medium' : 'text-zinc-400'}`}>
                                {isPractice
                                    ? 'Are you sure you want to exit your practice session? Any unsaved edits will be discarded.'
                                    : 'WARNING: Ranked combat is currently active! Abandoning now will count as an immediate forfeit, award the victory to your opponent, and reduce your Rank Rating (RP).'}
                            </p>
                        </div>
                        <div className="flex gap-3 justify-center pt-2">
                            <button
                                onClick={() => setShowAbandonModal(false)}
                                className={`flex-1 px-4 py-3 rounded-xl border text-xs font-mono font-bold uppercase tracking-wider transition-all ${isLight
                                        ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                                        : 'bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white'
                                    }`}
                            >
                                Resume Combat
                            </button>
                            <button
                                onClick={() => {
                                    setShowAbandonModal(false);
                                    handleAbandonBattle();
                                }}
                                className={`flex-1 px-4 py-3 rounded-xl border text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${isLight
                                        ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700 shadow-md'
                                        : 'bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 hover:text-rose-100 shadow-[0_0_20px_rgba(244,63,94,0.3)]'
                                    }`}
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
                battleType={isPractice ? 'Practice Lab' : 'Ranked Duel Arena'}
                onDismiss={dismissFocusWarning}
            />
        </div>
    );
};
