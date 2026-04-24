import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';

/**
 * 32px lerp-following cursor circle — desktop only.
 * Uses gsap.quickTo for silky 60fps+ performance.
 * Scales 2× and fills when hovering interactive elements marked with
 * `data-cursor-hover` or common interactive tags (button, a).
 */
export const CursorFollower: React.FC = () => {
    const cursorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Only activate for fine pointer devices (mouse, not touch)
        if (!window.matchMedia('(pointer: fine)').matches) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const cursor = cursorRef.current;
        if (!cursor) return;

        // Make visible
        cursor.style.opacity = '1';

        const xTo = gsap.quickTo(cursor, 'x', { duration: 0.4, ease: 'power3' });
        const yTo = gsap.quickTo(cursor, 'y', { duration: 0.4, ease: 'power3' });

        const onMove = (e: MouseEvent) => {
            xTo(e.clientX - 16);
            yTo(e.clientY - 16);
        };

        const onEnterInteractive = () => {
            gsap.to(cursor, {
                scale: 2,
                borderColor: 'rgba(124,58,237,0)',
                backgroundColor: 'rgba(124,58,237,0.15)',
                duration: 0.3,
                ease: 'power2.out',
            });
        };

        const onLeaveInteractive = () => {
            gsap.to(cursor, {
                scale: 1,
                borderColor: 'rgba(124,58,237,0.6)',
                backgroundColor: 'transparent',
                duration: 0.25,
                ease: 'power2.out',
            });
        };

        window.addEventListener('mousemove', onMove);

        // Observe interactive elements
        const interactiveSelector = 'button, a, [data-cursor-hover]';
        const addListeners = (el: Element) => {
            el.addEventListener('mouseenter', onEnterInteractive);
            el.addEventListener('mouseleave', onLeaveInteractive);
        };
        const removeListeners = (el: Element) => {
            el.removeEventListener('mouseenter', onEnterInteractive);
            el.removeEventListener('mouseleave', onLeaveInteractive);
        };

        // Initial bind
        document.querySelectorAll(interactiveSelector).forEach(addListeners);

        // MutationObserver to catch dynamically added elements
        const observer = new MutationObserver(() => {
            document.querySelectorAll(interactiveSelector).forEach(addListeners);
        });
        observer.observe(document.body, { childList: true, subtree: true });

        return () => {
            window.removeEventListener('mousemove', onMove);
            document.querySelectorAll(interactiveSelector).forEach(removeListeners);
            observer.disconnect();
        };
    }, []);

    return (
        <div
            ref={cursorRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: 32,
                height: 32,
                borderRadius: '50%',
                border: '1.5px solid rgba(124,58,237,0.6)',
                pointerEvents: 'none',
                zIndex: 9998,
                opacity: 0,
                willChange: 'transform',
            }}
        />
    );
};
