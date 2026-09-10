import React, { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';
import logoDark from '../../assets/codearena-logo-dark.png';
import SafeSessionStorage from '../../lib/storage';

export const LogoReveal: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const [isVisible, setIsVisible] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);
    const logoRef = useRef<HTMLImageElement>(null);
    const textRef = useRef<HTMLHeadingElement>(null);
    const subtitleRef = useRef<HTMLDivElement>(null);
    const progressRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const hasShown = SafeSessionStorage.getItem('arena_logo_shown_fixed');
        if (hasShown) {
            setIsVisible(false);
            onComplete();
            return;
        }

        const ctx = gsap.context(() => {
            const tl = gsap.timeline({
                onComplete: () => {
                    SafeSessionStorage.setItem('arena_logo_shown_fixed', 'true');
                    setIsVisible(false);
                    onComplete();
                }
            });

            // Initial states
            gsap.set(logoRef.current, {
                opacity: 0,
                scale: 0.7,
                rotate: -15,
                filter: 'drop-shadow(0 0 0px rgba(0, 240, 255, 0))'
            });
            gsap.set(textRef.current, {
                opacity: 0,
                letterSpacing: '0.1em',
                y: 15,
                filter: 'blur(8px)'
            });
            gsap.set(subtitleRef.current, {
                opacity: 0,
                y: 10
            });
            gsap.set(progressRef.current, {
                width: '0%'
            });

            // Reveal Timeline
            tl.to(logoRef.current, {
                opacity: 1,
                scale: 1,
                rotate: 0,
                filter: 'drop-shadow(0 0 25px rgba(0, 240, 255, 0.6))',
                duration: 1.4,
                ease: 'back.out(1.7)'
            })
                .to(textRef.current, {
                    opacity: 1,
                    y: 0,
                    filter: 'blur(0px)',
                    letterSpacing: '0.3em',
                    duration: 1.2,
                    ease: 'power3.out'
                }, '-=0.6')
                .to(subtitleRef.current, {
                    opacity: 1,
                    y: 0,
                    duration: 0.8,
                    ease: 'power2.out'
                }, '-=0.8')
                .to(progressRef.current, {
                    width: '100%',
                    duration: 1.5,
                    ease: 'power1.inOut'
                }, '-=1.0')
                // Delay for premium look
                .to(logoRef.current, {
                    scale: 1.05,
                    filter: 'drop-shadow(0 0 35px rgba(139, 92, 246, 0.8))',
                    duration: 0.8,
                    ease: 'power1.out'
                })
                // High-fidelity fade out sequence
                .to(containerRef.current, {
                    opacity: 0,
                    duration: 0.8,
                    ease: 'power3.inOut'
                }, '+=0.2');
        });

        return () => ctx.revert();
    }, [onComplete]);

    if (!isVisible) return null;

    return (
        <div
            ref={containerRef}
            className="reveal-container fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black overflow-hidden"
            style={{
                background: 'radial-gradient(circle, #0c0818 0%, #020205 100%)'
            }}
        >
            {/* Scanlines effect overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%]" />

            {/* Glowing orb in the background */}
            <div className="absolute w-[500px] h-[500px] rounded-full bg-accent-secondary/5 blur-[120px] pointer-events-none animate-pulse" />

            <div className="flex flex-col items-center gap-6 z-10">
                {/* Logo Image */}
                <img
                    ref={logoRef}
                    src={logoDark}
                    alt="CodeArena Logo"
                    className="w-32 h-32 object-contain"
                />

                {/* Brand Name */}
                <h1
                    ref={textRef}
                    className="reveal-text text-4xl md:text-5xl font-black uppercase text-white tracking-widest text-center"
                    style={{ fontFamily: "'Orbitron', sans-serif" }}
                >
                    CODE<span className="text-accent-secondary">ARENA</span>
                </h1>

                {/* Subtitle / Status */}
                <div
                    ref={subtitleRef}
                    className="flex flex-col items-center gap-2"
                >


                    {/* Futuristic progress bar */}
                    <div className="w-64 h-[2px] bg-white/10 rounded-full overflow-hidden mt-1">
                        <div ref={progressRef} className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary" />
                    </div>
                </div>
            </div>
        </div>
    );
};
