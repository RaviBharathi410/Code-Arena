import React, { useState, useEffect } from 'react';
import { gsap } from 'gsap';

interface CountdownProps {
    onComplete: () => void;
}

export const Countdown: React.FC<CountdownProps> = ({ onComplete }) => {
    const [count, setCount] = useState(3);

    useEffect(() => {
        if (count > 0) {
            const timer = setTimeout(() => setCount(count - 1), 1000);
            
            // Pulse animation
            gsap.fromTo('.countdown-number', 
                { scale: 2, opacity: 0 }, 
                { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.7)' }
            );

            return () => clearTimeout(timer);
        } else {
            onComplete();
        }
    }, [count, onComplete]);

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-md">
            <div className="text-center space-y-8">
                <div className="text-[150px] font-black italic tracking-tighter text-white countdown-number leading-none">
                    {count}
                </div>
                <div className="text-[10px] font-black uppercase tracking-[1em] text-accent-secondary animate-pulse">
                    Initializing Neural Uplink
                </div>
            </div>
        </div>
    );
};
