import React, { useState } from 'react';
import { Target, Zap, Shield, Copy, Check, Clock, BookOpen, ShieldAlert } from 'lucide-react';
import type { Problem } from '../../types';
import { useLayout } from '../../contexts/LayoutContext';

interface ProblemPanelProps {
    problem: Problem | null;
}

// Formats inline code variables (e.g. `nums`, `target`, `A[i]`) into styled cyber monospace pills
const renderCyberText = (text: string, isLight?: boolean) => {
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
                            className={`px-1.5 py-0.5 mx-0.5 rounded font-mono text-[12px] font-semibold inline-block ${
                                isLight
                                    ? 'bg-purple-100 text-purple-900 border border-purple-300 shadow-sm'
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

export const ProblemPanel: React.FC<ProblemPanelProps> = ({ problem }) => {
    const { isLight } = useLayout();
    const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

    if (!problem) return (
        <div className={`flex flex-col items-center justify-center h-full p-10 text-center ${isLight ? 'bg-white opacity-40' : 'bg-[#07070d] opacity-30'}`}>
            <ShieldAlert size={48} className={`mb-4 animate-pulse ${isLight ? 'text-purple-600' : 'text-accent-secondary'}`} />
            <p className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-zinc-400'}`}>Tactical Link Offline</p>
            <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-zinc-600'}`}>Awaiting data stream from core</p>
        </div>
    );

    const constraintsList = Array.isArray(problem.constraints)
        ? problem.constraints
        : (typeof problem.constraints === 'string'
            ? problem.constraints.split('\n').filter(Boolean)
            : []);

    return (
        <div className={`flex flex-col h-full overflow-hidden border-r ${isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#07070d] border-white/10 text-white'}`}>
            {/* Top Meta Bar */}
            <div className={`p-4 px-6 border-b flex items-center justify-between backdrop-blur-md shrink-0 ${isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-black/40'}`}>
                <div className="flex items-center gap-2">
                    <BookOpen size={14} className={isLight ? 'text-purple-700' : 'text-accent-secondary'} />
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-purple-800' : 'text-zinc-400'}`}>
                        Target Protocol // {problem.category || 'Algorithms'}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        problem.difficulty === 'EASY'
                            ? (isLight ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]')
                            : problem.difficulty === 'MEDIUM'
                            ? (isLight ? 'bg-amber-100 text-amber-800 border border-amber-300 shadow-sm' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]')
                            : (isLight ? 'bg-rose-100 text-rose-800 border border-rose-300 shadow-sm' : 'bg-red-500/15 text-red-400 border border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]')
                    }`}>
                        {problem.difficulty}
                    </span>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8 custom-scrollbar">
                {/* Title & Metadata */}
                <section className="space-y-3">
                    <h1 className={`text-2xl lg:text-3xl font-black tracking-tight uppercase leading-tight drop-shadow-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {problem.title}
                    </h1>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className={`cyber-pill ${isLight ? 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100 font-bold' : 'text-zinc-400'}`}>
                            {problem.category || 'Algorithms'}
                        </span>
                        <span className={`cyber-pill ${isLight ? 'bg-purple-100 text-purple-800 border-purple-300 font-bold' : 'text-accent-primary'}`}>
                            <Target size={11} className={isLight ? 'text-purple-600' : ''} /> 81.6% Acceptance
                        </span>
                        <span className={`cyber-pill ${isLight ? 'bg-slate-100 text-slate-800 border-slate-300 font-bold' : 'text-zinc-500'}`}>
                            <Clock size={11} className={isLight ? 'text-slate-600' : ''} /> 300s Limit
                        </span>
                    </div>
                </section>

                {/* Description */}
                <section className={`text-base font-normal leading-relaxed ${isLight ? 'text-slate-900 font-medium' : 'text-zinc-300'}`}>
                    {renderCyberText(problem.description, isLight)}
                </section>

                {/* Examples Section */}
                <section className="space-y-4">
                    <h3 className={`text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 ${isLight ? 'text-purple-700' : 'text-accent-secondary'}`}>
                        <Zap size={14} className={isLight ? 'text-purple-600' : ''} /> Example Patterns
                    </h3>
                    <div className="grid gap-4">
                        {(problem.examples || []).map((ex, i) => (
                            <div
                                key={i}
                                className={`p-5 rounded-2xl space-y-3 text-xs transition-all shadow-md ${
                                    isLight
                                        ? 'bg-slate-50 border border-slate-200 group hover:border-purple-300'
                                        : 'bg-[#0e0e18] border border-white/10 group hover:border-accent-secondary/40 shadow-lg'
                                }`}
                            >
                                <div className={`flex justify-between items-center pb-2 border-b ${isLight ? 'border-slate-200' : 'border-white/5'}`}>
                                    <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${isLight ? 'text-purple-700' : 'text-accent-primary'}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${isLight ? 'bg-purple-600' : 'bg-accent-primary animate-pulse'}`} /> Example {i + 1}
                                    </span>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(ex.input);
                                            setCopiedIdx(i);
                                            setTimeout(() => setCopiedIdx(null), 1500);
                                        }}
                                        className={`text-[10px] uppercase flex items-center gap-1 transition-colors ${
                                            isLight ? 'text-slate-600 hover:text-purple-700 font-bold' : 'text-zinc-500 hover:text-white'
                                        }`}
                                        title="Copy Input"
                                    >
                                        {copiedIdx === i ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                        <span>{copiedIdx === i ? 'COPIED' : 'COPY'}</span>
                                    </button>
                                </div>

                                <div className="space-y-1">
                                    <p className={`text-[9px] uppercase font-bold tracking-wider ${isLight ? 'text-purple-700' : 'text-zinc-500'}`}>Input</p>
                                    <div className={`p-3 rounded-xl font-mono whitespace-pre-wrap select-all shadow-sm ${
                                        isLight ? 'bg-white border border-slate-200 text-slate-900' : 'bg-black/70 border border-white/5 text-zinc-200'
                                    }`}>
                                        {ex.input}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className={`text-[9px] uppercase font-bold tracking-wider ${isLight ? 'text-purple-700' : 'text-zinc-500'}`}>Expected Output</p>
                                    <div className={`p-3 rounded-xl font-mono whitespace-pre-wrap select-all shadow-sm ${
                                        isLight
                                            ? 'bg-emerald-50 border border-emerald-300 text-emerald-800 font-bold'
                                            : 'bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 font-semibold'
                                    }`}>
                                        {ex.output}
                                    </div>
                                </div>
                                {ex.explanation && (
                                    <div className={`pt-2 text-xs italic font-sans leading-relaxed border-t ${
                                        isLight ? 'text-slate-800 border-slate-200' : 'text-zinc-400 border-white/5'
                                    }`}>
                                        <span className={`text-[10px] font-bold uppercase not-italic block mb-0.5 ${
                                            isLight ? 'text-purple-700' : 'text-zinc-500'
                                        }`}>Explanation:</span>
                                        {renderCyberText(ex.explanation, isLight)}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                {/* Constraints */}
                {constraintsList.length > 0 && (
                    <section className={`p-6 rounded-2xl space-y-4 shadow-sm ${
                        isLight ? 'bg-slate-50 border border-slate-200' : 'bg-[#0e0e18] border border-white/10'
                    }`}>
                        <h3 className={`text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 ${
                            isLight ? 'text-purple-700' : 'text-accent-secondary'
                        }`}>
                            <Shield size={14} className={isLight ? 'text-purple-600' : ''} /> Operational Constraints
                        </h3>
                        <div className="space-y-2.5">
                            {constraintsList.map((c, i) => (
                                <div key={i} className="flex items-start gap-3 group/c">
                                    <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${
                                        isLight ? 'bg-purple-600 shadow-[0_0_8px_rgba(147,51,234,0.4)]' : 'bg-accent-secondary shadow-[0_0_8px_rgba(124,58,237,0.7)]'
                                    }`} />
                                    <code className={`text-xs font-mono tracking-tight px-2 py-1 rounded-md border shadow-sm ${
                                        isLight ? 'bg-white border-slate-200 text-slate-900 font-semibold' : 'text-zinc-200 bg-white/5 border-white/5'
                                    }`}>
                                        {c}
                                    </code>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};
