import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

interface VoiceVisualizerProps {
    isActive: boolean;
    color?: string;
}

export const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({
    isActive,
    color = 'var(--accent-primary)'
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const barsRef = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        if (!isActive) {
            gsap.to(barsRef.current, {
                height: 4,
                duration: 0.5,
                stagger: 0.05,
                ease: 'power2.out'
            });
            return;
        }

        const animations = barsRef.current.map((bar, i) => {
            if (!bar) return null;
            return gsap.to(bar, {
                height: 20 + Math.random() * 30,
                duration: 0.2 + Math.random() * 0.3,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut',
                delay: i * 0.05
            });
        });

        return () => {
            animations.forEach(anim => anim?.kill());
        };
    }, [isActive]);

    return (
        <div
            ref={containerRef}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                height: '60px',
                padding: '0 10px'
            }}
        >
            {[...Array(12)].map((_, i) => (
                <div
                    key={i}
                    ref={el => barsRef.current[i] = el}
                    style={{
                        width: '3px',
                        height: '4px',
                        borderRadius: '2px',
                        backgroundColor: color,
                        boxShadow: `0 0 10px ${color}`,
                        transition: 'background-color 0.3s ease'
                    }}
                />
            ))}
        </div>
    );
};
