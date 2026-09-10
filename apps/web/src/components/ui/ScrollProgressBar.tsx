import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Fixed 2px progress bar spanning full viewport width.
 * Fills left→right with a purple→green gradient as total page scroll increases.
 */
export const ScrollProgressBar: React.FC = () => {
    const barRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const bar = barRef.current;
        if (!bar) return;

        gsap.set(bar, { scaleX: 0, transformOrigin: 'left center' });

        const trigger = ScrollTrigger.create({
            trigger: document.documentElement,
            start: 'top top',
            end: 'bottom bottom',
            onUpdate: (self) => {
                gsap.set(bar, { scaleX: self.progress });
            },
        });

        return () => {
            trigger.kill();
        };
    }, []);

    return (
        <div
            ref={barRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                height: '2px',
                zIndex: 9999,
                background: 'linear-gradient(90deg, #7c3aed, #00e5a0)',
                transformOrigin: 'left center',
                pointerEvents: 'none',
            }}
        />
    );
};
