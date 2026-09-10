import React, { useEffect, useRef } from 'react';
import { Trophy, X, Zap, ArrowRight, BrainCircuit, Timer, ShieldAlert, Home } from 'lucide-react';
import { gsap } from 'gsap';
import { NeonButton } from '../ui/NeonButton';
import type { MatchResult, User } from '../../types';

interface ResultOverlayProps {
    result: MatchResult;
    currentUser: User;
    onClose: () => void;
}

export const ResultOverlay: React.FC<ResultOverlayProps> = ({ result, currentUser, onClose }) => {
    const isWinner = result.winnerId === currentUser.id;
    const overlayRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.5 });
            gsap.fromTo(contentRef.current, 
                { scale: 0.9, opacity: 0, y: 20 }, 
                { scale: 1, opacity: 1, y: 0, duration: 0.6, ease: 'back.out(1.7)', delay: 0.2 }
            );
            
            gsap.from('.stat-card', {
                y: 20,
                opacity: 0,
                stagger: 0.1,
                duration: 0.5,
                ease: 'power2.out',
                delay: 0.5
            });
        });
        return () => ctx.revert();
    }, []);

    return (
        <div ref={overlayRef} className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-2xl">
            <div ref={contentRef} className={`w-full max-w-4xl bg-[#050507] border rounded-[3rem] overflow-hidden shadow-2xl relative ${
                isWinner ? 'border-green-500/30 shadow-green-500/10' : 'border-red-500/30 shadow-red-500/10'
            }`}>
                {/* Header Decoration */}
                <div className={`absolute top-0 inset-x-0 h-1 ${isWinner ? 'bg-green-500' : 'bg-red-500'}`} />
                
                <div className="p-12 md:p-16 flex flex-col md:flex-row gap-12 items-center">
                    {/* Left: Trophy & Main Message */}
                    <div className="text-center md:text-left space-y-6 md:w-1/2">
                        <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto md:mx-0 mb-8 ${
                            isWinner ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                        }`}>
                            {isWinner ? <Trophy size={48} /> : <ShieldAlert size={48} />}
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-6xl font-black tracking-tighter uppercase leading-none text-white">
                                {isWinner ? 'Victory' : 'Defeat'}
                            </h1>
                            <p className="text-xs font-black uppercase tracking-[0.4em] text-accent-secondary opacity-60">
                                Match Protocol Terminated
                            </p>
                        </div>
                        <p className="text-gray-400 text-lg font-light leading-relaxed">
                            {isWinner 
                                ? "Excellent execution, Operator. You have successfully neutralized the opposition and secured ranking points."
                                : "Neural synchronization failed. The rival operator achieved accepted state faster. Review logs and retry."
                            }
                        </p>
                        
                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            <button 
                                onClick={onClose}
                                className="flex-1 px-8 py-4 bg-white text-black rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-all flex items-center justify-center gap-2"
                            >
                                <Home size={16} /> Dashboard
                            </button>
                            <button className="flex-1 px-8 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-white/10 transition-all">
                                Review Code
                            </button>
                        </div>
                    </div>

                    {/* Right: Detailed Stats */}
                    <div className="md:w-1/2 w-full grid grid-cols-2 gap-4">
                        <div className="stat-card p-6 rounded-3xl bg-white/2 border border-white/5 space-y-2">
                            <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-gray-500">
                                <Zap size={12} className="text-accent-secondary" /> Final Score
                            </div>
                            <div className="text-3xl font-black text-white">{isWinner ? result.p1Score : result.p2Score}</div>
                        </div>
                        <div className="stat-card p-6 rounded-3xl bg-white/2 border border-white/5 space-y-2">
                            <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-gray-500">
                                <ArrowRight size={12} className="text-green-500" /> Rank Delta
                            </div>
                            <div className={`text-3xl font-black ${isWinner ? 'text-green-500' : 'text-red-500'}`}>
                                {isWinner ? `+${result.rankDeltaP1 || 32}` : `${result.rankDeltaP2 || -15}`}
                            </div>
                        </div>
                        <div className="stat-card p-6 rounded-3xl bg-white/2 border border-white/5 space-y-2">
                            <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-gray-500">
                                <Timer size={12} className="text-blue-500" /> Execution
                            </div>
                            <div className="text-3xl font-black text-white">
                                {isWinner ? result.p1Sub?.timeMs : result.p2Sub?.timeMs}ms
                            </div>
                        </div>
                        <div className="stat-card p-6 rounded-3xl bg-white/2 border border-white/5 space-y-2">
                            <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-gray-500">
                                <BrainCircuit size={12} className="text-purple-500" /> Complexity
                            </div>
                            <div className="text-3xl font-black text-white uppercase">
                                {isWinner ? result.p1Sub?.timeComplexity : result.p2Sub?.timeComplexity}
                            </div>
                        </div>
                        
                        {/* Comparison Bar */}
                        <div className="stat-card col-span-2 p-6 rounded-3xl bg-white/2 border border-white/5 space-y-4">
                            <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-gray-500">
                                <span>Performance vs Rival</span>
                                <span className={isWinner ? 'text-green-500' : 'text-red-500'}>
                                    {isWinner ? '+18%' : '-12%'}
                                </span>
                            </div>
                            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden flex">
                                <div 
                                    className={`h-full ${isWinner ? 'bg-green-500' : 'bg-red-500'}`} 
                                    style={{ width: `${isWinner ? 65 : 45}%` }} 
                                />
                                <div 
                                    className="h-full bg-white/10" 
                                    style={{ width: `${isWinner ? 35 : 55}%` }} 
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
