import React, { useState, useEffect, useRef } from 'react';
import { useNav } from '../navigation/NavigationContext';
import { NeonButton } from '../components/ui/NeonButton';
import { GlassCard } from '../components/ui/GlassCard';
import api from '../lib/api';
import { Search, Cpu, Zap, Target, Sword, ArrowLeft } from 'lucide-react';
import { gsap } from 'gsap';
import { useLayout } from '../components/layout/MainLayout';

interface Problem {
    id: string;
    title: string;
    difficulty: string;
    description: string;
}

export const ProblemsList: React.FC = () => {
    const { goToDashboard, goToArenaPractice, goToOpponents } = useNav();
    const [problems, setProblems] = useState<Problem[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const { isLight } = useLayout();
    const containerRef = useRef<HTMLDivElement>(null);
    const LIMIT = 30;

    useEffect(() => {
        const fetchProblems = async () => {
            try {
                setLoading(true);
                const query = new URLSearchParams({
                    limit: LIMIT.toString(),
                    offset: (page * LIMIT).toString(),
                });
                if (difficultyFilter !== 'all') {
                    query.append('difficulty', difficultyFilter);
                }
                if (searchQuery) {
                    query.append('search', searchQuery);
                }
                const res = await api.get(`/problems?${query.toString()}`);
                const newData = res.data.data || [];
                
                if (page === 0) {
                    setProblems(newData);
                } else {
                    setProblems(prev => [...prev, ...newData]);
                }
                
                setHasMore(newData.length === LIMIT);
            } catch (err) {
                console.error('Failed to fetch problems', err);
            } finally {
                setLoading(false);
            }
        };

        const timeoutId = setTimeout(() => {
            fetchProblems();
        }, 300); // Debounce search

        return () => clearTimeout(timeoutId);
    }, [page, difficultyFilter, searchQuery]);

    // Intersection Observer for Infinite Scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loading) {
                    setPage(prev => prev + 1);
                }
            },
            { threshold: 0.1 }
        );

        const trigger = document.getElementById('scroll-trigger');
        if (trigger) observer.observe(trigger);

        return () => observer.disconnect();
    }, [hasMore, loading]);

    // Reset when filter changes
    useEffect(() => {
        setPage(0);
        setProblems([]);
    }, [difficultyFilter, searchQuery]);

    useEffect(() => {
        if (!loading && problems.length > 0) {
            gsap.fromTo('.problem-card', 
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: 0.5, stagger: 0.05, ease: 'power2.out' }
            );
        }
    }, [loading, problems]);

    const getDifficultyColor = (diff: string) => {
        switch (diff.toLowerCase()) {
            case 'easy': return 'text-green-400 border-green-400/20 bg-green-400/5';
            case 'medium': return 'text-yellow-400 border-yellow-400/20 bg-yellow-400/5';
            case 'hard': return 'text-red-400 border-red-400/20 bg-red-400/5';
            default: return 'text-gray-400 border-gray-400/20 bg-gray-400/5';
        }
    };

    const displayProblems = problems;

    return (
        <div ref={containerRef} className={`h-screen w-full flex flex-col relative overflow-hidden transition-colors duration-500 ${isLight ? 'bg-gray-50 text-black' : 'bg-[#050507] text-white'}`}>
            {/* Background elements to match Dashboard */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className={`absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full blur-[120px] ${isLight ? 'bg-accent-primary/5' : 'bg-accent-primary/10'}`} />
                <div className={`absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] rounded-full blur-[120px] ${isLight ? 'bg-accent-secondary/5' : 'bg-accent-secondary/10'}`} />
            </div>

            <div className="flex-1 flex flex-col px-6 md:px-12 py-8 lg:py-12 relative z-10 overflow-hidden">
                
                <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-4">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border backdrop-blur-sm ${isLight ? 'border-black/5 bg-black/5' : 'border-white/10 bg-white/5'}`}>
                            <Cpu size={14} className="text-accent-secondary" />
                            <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>Tactical Armory // V2.9</span>
                        </div>
                        <h1 className="text-5xl md:text-6xl font-black tracking-tighter uppercase leading-none">
                            Problem <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-primary to-accent-secondary">Arsenal</span>
                        </h1>
                    </div>
                    <div className="absolute top-8 lg:top-12 right-6 md:right-12">
                        <NeonButton onClick={() => goToDashboard()} variant="secondary" className={`px-8 font-black tracking-[0.2em] uppercase text-[10px] ${isLight ? 'bg-black text-white border-black' : ''}`}>
                            <ArrowLeft size={14} /> Back to Hub
                        </NeonButton>
                    </div>
                </header>

                <div className="flex flex-col md:flex-row gap-6 mb-8">
                    {/* Search Bar */}
                    <div className="flex-1 relative group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-accent-secondary transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Identify specific module..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full border rounded-2xl py-4 pl-14 pr-6 text-sm font-bold placeholder-gray-500 focus:outline-none focus:border-accent-secondary/40 transition-all backdrop-blur-md ${isLight ? 'bg-white border-black/10 text-black' : 'bg-white/5 border-white/10 text-white'}`}
                        />
                    </div>

                    {/* Difficulty Filters & Random Selection */}
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className={`flex p-1 border rounded-2xl backdrop-blur-md ${isLight ? 'bg-black/5 border-black/5' : 'bg-white/5 border-white/10'}`}>
                            {['all', 'easy', 'medium', 'hard'].map(diff => (
                                <button
                                    key={diff}
                                    onClick={() => { setDifficultyFilter(diff); setPage(0); }}
                                    className={`px-6 py-3 rounded-xl uppercase text-[10px] font-black tracking-[0.2em] transition-all ${difficultyFilter === diff
                                        ? (isLight ? 'bg-black text-white shadow-xl' : 'bg-white text-black shadow-lg')
                                        : (isLight ? 'text-gray-400 hover:bg-black/5' : 'text-gray-500 hover:bg-white/5')
                                        } ${
                                            diff === 'easy' ? 'hover:text-green-500' :
                                            diff === 'medium' ? 'hover:text-amber-500' :
                                            diff === 'hard' ? 'hover:text-red-500' :
                                            'hover:text-accent-secondary'
                                        }`}
                                >
                                    {diff}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={async () => {
                                try {
                                    const diffQuery = difficultyFilter !== 'all' ? `?difficulty=${difficultyFilter}` : '';
                                    const res = await api.get(`/problems/random${diffQuery}`);
                                    if (res.data && res.data.id) {
                                        goToArenaPractice(res.data.id);
                                    }
                                } catch (err) {
                                    console.error('Failed to fetch random problem', err);
                                }
                            }}
                            className={`px-6 py-3 rounded-2xl border text-accent-secondary hover:scale-105 uppercase text-[10px] font-black tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${isLight ? 'bg-white border-accent-secondary/50 hover:bg-accent-secondary hover:text-white shadow-lg' : 'bg-accent-secondary/10 border-accent-secondary/20 hover:bg-accent-secondary hover:text-black'}`}
                        >
                            <Zap size={14} /> Random Selection
                        </button>
                    </div>
                </div>

                {/* Main Content Area with Scroll */}
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {loading && problems.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-30">
                            <div className={`w-12 h-12 border-2 rounded-full animate-spin mb-4 ${isLight ? 'border-black/20 border-t-black' : 'border-white/20 border-t-white'}`} />
                            <p className="text-[10px] font-black uppercase tracking-[0.4em]">Establishing Neural Uplink...</p>
                        </div>
                    ) : displayProblems.length === 0 && !loading ? (
                        <div className={`h-full flex flex-col items-center justify-center text-center opacity-20 py-20 border border-dashed rounded-[3rem] ${isLight ? 'border-black/20' : 'border-white/10'}`}>
                            <Target size={48} className="mb-6" />
                            <p className="text-xl font-black uppercase tracking-tighter">No modules matching signature</p>
                            <p className="text-[10px] uppercase tracking-widest mt-2">Modify your acquisition parameters</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4 pb-12">
                            {displayProblems.map((prob) => (
                                <GlassCard key={prob.id} className={`problem-card group hover:border-accent-secondary/50 transition-all p-6 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 ${isLight ? 'bg-white border-black/5 shadow-md' : 'bg-[#12121a] border-white/10 hover:bg-[#1a1a24] hover:border-white/40 shadow-xl'}`}>
                                    <div className="flex-1 flex flex-col md:flex-row items-center gap-8 relative z-10 w-full">
                                        <div className="flex flex-col items-center md:items-start min-w-[200px]">
                                            <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border mb-3 ${
                                                prob.difficulty.toLowerCase() === 'easy' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                                prob.difficulty.toLowerCase() === 'medium' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                                'bg-red-500/10 text-red-500 border-red-500/20'
                                            }`}>
                                                {prob.difficulty}
                                            </span>
                                            <h3 className={`text-xl font-black uppercase tracking-tighter group-hover:text-accent-secondary transition-colors line-clamp-1 ${isLight ? 'text-black' : 'text-white'}`}>
                                                {prob.title}
                                            </h3>
                                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-1">MODULE ID: {prob.id.slice(0, 8)}</p>
                                        </div>
                                        
                                        <div className="flex-1 hidden lg:block">
                                            <p className={`text-sm font-light leading-relaxed line-clamp-2 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                                                {prob.description}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="relative z-10 flex flex-row gap-3 w-full md:w-auto">
                                        <button
                                            onClick={() => goToArenaPractice(prob.id)}
                                            className={`flex-1 md:w-48 py-3 rounded-xl border text-[10px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 active:scale-95 ${isLight ? 'bg-black text-white border-black hover:bg-accent-secondary hover:border-accent-secondary' : 'bg-white/5 border-white/10 text-white hover:bg-white hover:text-black hover:border-white'}`}
                                        >
                                            <Cpu size={14} /> Practice
                                        </button>
                                        <button
                                            onClick={() => goToOpponents(prob.id)}
                                            className={`flex-1 md:w-48 py-3 rounded-xl border text-[10px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 active:scale-95 ${isLight ? 'bg-accent-secondary/10 border-accent-secondary/20 text-accent-secondary hover:bg-accent-secondary hover:text-black' : 'bg-accent-secondary/10 border-accent-secondary/20 text-accent-secondary hover:bg-accent-secondary hover:text-black'}`}
                                        >
                                            <Sword size={14} /> Challenge
                                        </button>
                                    </div>

                                    {/* Subtle background glow */}
                                    <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-accent-secondary/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                </GlassCard>
                            ))}
                            
                            {/* Infinite Scroll Trigger */}
                            {hasMore && (
                                <div id="scroll-trigger" className="col-span-full py-12 flex justify-center">
                                    <div className="w-6 h-6 border-2 border-white/10 border-t-accent-secondary rounded-full animate-spin" />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: ${isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)'}; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(34,211,238,0.2)'}; border-radius: 10px; transition: all 0.3s; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: ${isLight ? 'rgba(0,0,0,0.2)' : 'rgba(34,211,238,0.5)'}; }
                h1, h2, h3, button, span { font-family: 'Inter', sans-serif; }
            `}</style>
        </div>
    );
};
