import React, { createContext, useEffect, useRef, useState } from 'react';
import Lenis from '@studio-freight/lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const LenisContext = createContext<Lenis | null>(null);

export const ScrollProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [lenis, setLenis] = useState<Lenis | null>(null);
    const lenisRef = useRef<Lenis | null>(null);

    useEffect(() => {
        // Respect reduced motion
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const instance = new Lenis({
            duration: 1.4,
            easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
        });

        lenisRef.current = instance;
        setLenis(instance);

        // Connect Lenis RAF to GSAP ticker for perfectly synced updates
        gsap.ticker.add((time) => {
            instance.raf(time * 1000);
        });
        gsap.ticker.lagSmoothing(0);

        // Sync ScrollTrigger with Lenis scroll position
        instance.on('scroll', ScrollTrigger.update);

        return () => {
            instance.destroy();
            lenisRef.current = null;
        };
    }, []);

    return (
        <LenisContext.Provider value={lenis}>
            {children}
        </LenisContext.Provider>
    );
};
