import React, { useEffect, useState } from 'react';
import gsap from 'gsap';

export const LogoReveal: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const [isVisible, setIsVisible] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLHeadingElement>(null);

    useEffect(() => {
        const hasShown = sessionStorage.getItem('arena_logo_shown_fixed');
        if (hasShown) {
            setIsVisible(false);
            onComplete();
            return;
        }

        const ctx = gsap.context(() => {
            const tl = gsap.timeline({
                onComplete: () => {
                    sessionStorage.setItem('arena_logo_shown_fixed', 'true');
                    setIsVisible(false);
                    onComplete();
                }
            });

            // Initial state
            gsap.set(textRef.current, { 
                opacity: 0, 
                letterSpacing: '0.1em',
                y: 10,
                filter: 'blur(10px)'
            });

            // Elegant reveal sequence
            tl.to(textRef.current, {
                opacity: 1,
                y: 0,
                filter: 'blur(0px)',
                letterSpacing: '0.4em',
                duration: 2,
                ease: 'expo.out'
            })
            // High-fidelity fade out animation
            .to(textRef.current, {
                opacity: 0,
                y: -10,
                filter: 'blur(12px)',
                letterSpacing: '0.6em',
                duration: 1.2,
                ease: 'expo.in',
                delay: 0.8
            })
            .to(containerRef.current, {
                opacity: 0,
                duration: 0.8,
                ease: 'power2.inOut',
            }, "-=0.4");
        });

        return () => ctx.revert();
    }, [onComplete]);

    if (!isVisible) return null;

    return (
        <div ref={containerRef} className="reveal-container fixed inset-0 z-[9999] flex items-center justify-center bg-black overflow-hidden">
            <h1 ref={textRef} className="reveal-text text-4xl md:text-6xl font-black font-orbitron text-white">
                CODEARENA
            </h1>
        </div>
    );
};
