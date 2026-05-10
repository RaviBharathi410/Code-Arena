import React, { useEffect, useState, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { useMatch } from '../contexts/MatchContext';
import { useVoiceToCode } from '../hooks/useVoiceToCode';
import { useNav } from '../navigation/NavigationContext';
import { 
    Zap, Mic, MicOff, Terminal, Activity, 
    ChevronRight, Timer, Cpu, Shield, 
    Play, CheckCircle2, X
} from 'lucide-react';
import { ProblemPanel } from '../components/arena/ProblemPanel';
import { AnalysisPanel } from '../components/arena/AnalysisPanel';
import { Countdown } from '../components/arena/Countdown';
import { ResultOverlay } from '../components/arena/ResultOverlay';
import { NeonButton } from '../components/ui/NeonButton';
import { GlassCard } from '../components/ui/GlassCard';
import { VoiceVisualizer } from '../components/ui/VoiceVisualizer';
import { ChevronLeft, ChevronRight as ChevronRightIcon, Layout, Columns } from 'lucide-react';
import type { User } from '../types';
import gsap from 'gsap';

export const BattleArena: React.FC<{ currentUser: User }> = ({ currentUser }) => {
    const { state, setReady, setLanguage, runCode, submitCode, sendTyping, sendSpeaking, reset } = useMatch();
    const { goToDashboard } = useNav();

    const opponent = state.players.find(p => p.id !== currentUser.id);
    
    const [code, setCode] = useState('');
    const [language, setLang] = useState('js');
    const [showCountdown, setShowCountdown] = useState(false);
    const [timeLeft, setTimeLeft] = useState(600);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showProblem, setShowProblem] = useState(true);
    const [showAnalysis, setShowAnalysis] = useState(true);

    // Initial code setup when problem loads
    useEffect(() => {
        if (state.problem?.boilerplate?.[language]) {
            setCode(state.problem.boilerplate[language]);
        }
    }, [state.problem, language]);

    // Handle Countdown trigger
    useEffect(() => {
        if (state.status === 'active' && state.startedAt) {
            setShowCountdown(true);
        }
    }, [state.status, state.startedAt]);

    // Timer logic
    useEffect(() => {
        if (state.status === 'active' && !showCountdown) {
            const timer = setInterval(() => {
                setTimeLeft(prev => Math.max(0, prev - 1));
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [state.status, showCountdown]);

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

    const { isListening, startListening, stopListening } = useVoiceToCode((newCode) => {
        if (newCode === '__CLEAR__') setCode('');
        else setCode(prev => prev + '\n' + newCode);
    });

    useEffect(() => {
        sendSpeaking(isListening);
    }, [isListening, sendSpeaking]);

    if (state.status === 'idle' || state.status === 'waiting') {
        return (
            <div className="h-screen bg-[#020202] text-white flex flex-col items-center justify-center p-6 font-sans">
                <GlassCard className="max-w-2xl w-full p-12 border-white/10 relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-accent-secondary to-transparent" />
                    
                    <div className="flex flex-col items-center text-center space-y-10">
                        <div className="space-y-4">
                            <h1 className="text-5xl font-black tracking-tighter uppercase italic">Combat Waiting Room</h1>
                            <div className="flex items-center gap-3 justify-center">
                                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">Room Code:</span>
                                <span className="text-2xl font-mono text-accent-secondary tracking-widest">{state.roomCode || 'XXXXXX'}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl pt-6">
                            {/* Left: Player List */}
                            <div className="space-y-6 text-left">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 border-b border-white/10 pb-4">Operator Registry</h3>
                                <div className="space-y-3">
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
                                        <div key={p.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${p.id === currentUser.id ? 'bg-accent-secondary text-white' : 'bg-white/10 text-gray-400'}`}>
                                                    {p.username?.[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black uppercase tracking-widest">{p.username}</p>
                                                    <p className="text-[8px] font-bold text-gray-500 uppercase">{p.id === currentUser.id ? 'You (Host)' : 'Combatant'}</p>
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
                            <div className="flex flex-col gap-6 justify-center">
                                <div className={`p-8 rounded-3xl border-2 flex flex-col items-center gap-6 transition-all ${state.myReady ? 'border-green-500 bg-green-500/5' : 'border-white/10 bg-white/2'}`}>
                                    <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${state.myReady ? 'text-green-500' : 'text-gray-500'}`}>
                                        {state.myReady ? <CheckCircle2 size={48} /> : <Zap size={48} />}
                                    </div>
                                    
                                    {!state.myReady ? (
                                        <NeonButton onClick={() => setReady()} size="lg" className="w-full h-16 text-xs font-black tracking-[0.4em] uppercase">
                                            Initiate Uplink
                                        </NeonButton>
                                    ) : (
                                        <div className="text-center space-y-2">
                                            <p className="text-sm font-black text-green-500 uppercase tracking-widest">Protocol Engaged</p>
                                            <p className="text-[10px] text-gray-500 uppercase font-bold">Awaiting neural lock from rivals</p>
                                        </div>
                                    )}
                                </div>

                                <div className="p-6 rounded-3xl border border-white/5 bg-white/2 space-y-4">
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
                        
                        <button onClick={() => goToDashboard()} className="text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-white transition-colors">
                            Abandon Mission
                        </button>
                    </div>
                </GlassCard>
            </div>
        );
    }

    return (
        <div className="h-screen bg-[#020202] text-white flex flex-col font-sans selection:bg-white selection:text-black overflow-hidden">
            {showCountdown && <Countdown onComplete={() => setShowCountdown(false)} />}
            {state.result && <ResultOverlay result={state.result} currentUser={currentUser} onClose={() => { reset(); goToDashboard(); }} />}

            {/* Header: Tactical HUD */}
            <header className="px-6 h-16 border-b border-white/5 flex items-center justify-between bg-black/80 backdrop-blur-xl z-20">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-accent-secondary/10 flex items-center justify-center text-accent-secondary border border-accent-secondary/20">
                            <Terminal size={16} />
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest leading-none block">CodeArena_Arena</span>
                            <span className="text-[8px] font-bold text-gray-600 uppercase tracking-tighter leading-none mt-1">Sektor_01 // Node_V7</span>
                        </div>
                    </div>

                    <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/5">
                        <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[9px] font-mono text-gray-500 uppercase tracking-tighter">Signal: Max_Uplink</span>
                    </div>
                </div>

                {/* Central Status: Timer & Mode */}
                <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-8">
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600 leading-none">Battle Clock</span>
                        <span className="text-3xl font-black font-mono tracking-tighter text-white mt-1 leading-none">{formatTime(timeLeft)}</span>
                    </div>
                </div>

                {/* Right: Actions & Tools */}
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <VoiceVisualizer isActive={isListening} color="#8b5cf6" />
                        <button 
                            onClick={isListening ? stopListening : startListening}
                            className={`p-2.5 rounded-xl border transition-all ${isListening ? 'bg-accent-secondary/15 border-accent-secondary/40 text-accent-secondary' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'}`}
                        >
                            {isListening ? <Mic size={18} /> : <MicOff size={18} />}
                        </button>
                    </div>

                    <div className="h-8 w-[1px] bg-white/5" />

                    <div className="flex gap-2">
                        <button 
                            onClick={() => runCode(code, language)}
                            className="px-6 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black uppercase tracking-widest text-[10px] rounded-xl transition-all flex items-center gap-2"
                        >
                            <Play size={14} /> Run Tests
                        </button>
                        <button 
                            onClick={() => { setIsSubmitting(true); submitCode(code, language); }}
                            disabled={isSubmitting}
                            className="px-8 py-2.5 bg-accent-secondary hover:bg-accent-secondary/90 text-white font-black uppercase tracking-widest text-[10px] rounded-xl transition-all flex items-center gap-2 shadow-[0_0_30px_rgba(139,92,246,0.3)] disabled:opacity-50"
                        >
                            <Zap size={14} fill="currentColor" /> Submit Sequence
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Battle Space */}
            <main className={`flex-1 grid overflow-hidden transition-all duration-500`} style={{ 
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
                
                <section className="flex flex-col bg-black relative">
                    <div className="absolute top-4 left-6 z-10 flex gap-4">
                        <select 
                            value={language} 
                            onChange={(e) => setLang(e.target.value)}
                            className="bg-black/50 backdrop-blur-md border border-white/10 rounded-lg px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-accent-secondary focus:outline-none"
                        >
                            <option value="js">JavaScript</option>
                            <option value="py">Python</option>
                            <option value="java">Java</option>
                            <option value="cpp">C++</option>
                        </select>
                    </div>

                    <div className="flex-1 min-h-0">
                        <Editor
                            height="100%"
                            language={language === 'js' ? 'javascript' : language === 'py' ? 'python' : language}
                            theme="vs-dark"
                            value={code}
                            onChange={handleEditorChange}
                            options={{
                                fontSize: 16,
                                minimap: { enabled: false },
                                padding: { top: 60, bottom: 20 },
                                backgroundColor: '#000000',
                                fontFamily: "'JetBrains Mono', monospace",
                                lineNumbersMinChars: 3,
                                cursorSmoothCaretAnimation: 'on',
                                smoothScrolling: true,
                                scrollBeyondLastLine: false,
                            }}
                        />
                    </div>

                    {/* Quick Output Buffer */}
                    {state.verdict && (
                        <div className="absolute bottom-6 left-6 right-6 p-6 rounded-3xl bg-black/80 backdrop-blur-xl border border-white/10 max-h-[250px] overflow-y-auto custom-scrollbar animate-in slide-in-from-bottom-5 duration-500">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Terminal size={14} className="text-accent-secondary" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Diagnostic Buffer</span>
                                </div>
                                <span className={`text-[10px] font-black uppercase ${state.verdict.status === 'ACCEPTED' ? 'text-green-500' : 'text-red-500'}`}>
                                    {state.verdict.status}
                                </span>
                            </div>
                            <div className="space-y-4 font-mono text-xs">
                                {state.verdict.results?.map((res: any, i: number) => (
                                    <div key={i} className="p-3 rounded-xl bg-white/2 border border-white/5 flex items-center justify-between">
                                        <span className="text-gray-500">TestCase #{i + 1}</span>
                                        <span className={res.passed ? 'text-green-500' : 'text-red-500'}>{res.passed ? 'PASSED' : 'FAILED'}</span>
                                    </div>
                                ))}
                                {state.verdict.stderr && (
                                    <pre className="text-red-400 bg-red-400/5 p-4 rounded-xl border border-red-500/20">{state.verdict.stderr}</pre>
                                )}
                            </div>
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
        </div>
    );
};
