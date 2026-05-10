import React from 'react';
import { Target, Zap, ChevronRight, BookOpen, ShieldAlert } from 'lucide-react';
import type { Problem } from '../../types';

interface ProblemPanelProps {
    problem: Problem | null;
}

export const ProblemPanel: React.FC<ProblemPanelProps> = ({ problem }) => {
    if (!problem) return (
        <div className="flex flex-col items-center justify-center h-full opacity-20 p-10 text-center">
            <ShieldAlert size={48} className="mb-4" />
            <p className="text-xs font-black uppercase tracking-[0.3em]">Neural Link Offline</p>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-[#050507] border-r border-white/5 overflow-hidden">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <BookOpen size={16} className="text-accent-secondary" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Objective: {problem.category}</span>
                </div>
                <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${
                    problem.difficulty === 'EASY' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                    problem.difficulty === 'MEDIUM' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                    'bg-red-500/10 text-red-500 border border-red-500/20'
                }`}>
                    {problem.difficulty}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                <section className="space-y-4">
                    <h1 className="text-4xl font-black tracking-tighter uppercase leading-none text-white">
                        {problem.title}
                    </h1>
                    <div className="text-lg text-gray-400 font-light leading-relaxed whitespace-pre-wrap">
                        {problem.description}
                    </div>
                </section>

                <section className="space-y-6">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-accent-secondary flex items-center gap-2">
                        <ChevronRight size={14} /> Neural Patterns (Examples)
                    </h3>
                    <div className="grid gap-4">
                        {problem.examples.map((ex, i) => (
                            <div key={i} className="p-5 rounded-2xl bg-white/2 border border-white/5 space-y-4 group hover:border-white/10 transition-colors">
                                <div className="space-y-1.5">
                                    <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Input Buffer</p>
                                    <pre className="p-3 rounded-xl bg-black border border-white/5 text-xs text-blue-400 font-mono overflow-x-auto">
                                        {ex.input}
                                    </pre>
                                </div>
                                <div className="space-y-1.5">
                                    <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Expected State</p>
                                    <pre className="p-3 rounded-xl bg-black border border-white/5 text-xs text-green-400 font-mono overflow-x-auto">
                                        {ex.output}
                                    </pre>
                                </div>
                                {ex.explanation && (
                                    <p className="text-[10px] text-gray-500 font-light italic leading-relaxed">
                                        // {ex.explanation}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                <section className="p-6 rounded-2xl bg-accent-secondary/5 border border-accent-secondary/10 space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-accent-secondary">Operational Constraints</h3>
                    <div className="flex flex-wrap gap-2">
                        {problem.constraints.split('\n').filter(Boolean).map((c, i) => (
                            <code key={i} className="px-3 py-1.5 rounded-lg bg-black text-[10px] font-mono text-gray-400 border border-white/10 group hover:border-accent-secondary/30 transition-colors">
                                {c}
                            </code>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};
