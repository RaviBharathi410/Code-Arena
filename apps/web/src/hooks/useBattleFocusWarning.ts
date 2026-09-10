import { useEffect, useState, useRef, useCallback } from 'react';

export interface BattleFocusWarningOptions {
    isActive: boolean;
    battleType?: string;
    onFocusLost?: (infractions: number) => void;
    onFocusRestored?: (infractions: number) => void;
}

export function playCyberAlertSound() {
    try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();

        // First beep
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(520, ctx.currentTime);
        osc1.frequency.exponentialRampToValueAtTime(330, ctx.currentTime + 0.15);
        gain1.gain.setValueAtTime(0.12, ctx.currentTime);
        gain1.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start();
        osc1.stop(ctx.currentTime + 0.15);

        // Second warning pulse
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(660, ctx.currentTime + 0.18);
        osc2.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.35);
        gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.18);
        gain2.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(ctx.currentTime + 0.18);
        osc2.stop(ctx.currentTime + 0.35);
    } catch {
        // Audio playback may be restricted by browser policy
    }
}

export function useBattleFocusWarning({
    isActive,
    battleType = 'Battle Arena',
    onFocusLost,
    onFocusRestored,
}: BattleFocusWarningOptions) {
    const [infractionCount, setInfractionCount] = useState<number>(0);
    const [showWarningModal, setShowWarningModal] = useState<boolean>(false);
    const [isAway, setIsAway] = useState<boolean>(false);

    const originalTitleRef = useRef<string>(document.title);
    const titleIntervalRef = useRef<number | null>(null);
    const wasAwayRef = useRef<boolean>(false);

    const dismissWarning = useCallback(() => {
        setShowWarningModal(false);
    }, []);

    // Warn on window close / reload
    useEffect(() => {
        if (!isActive) return;

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = `${battleType} in progress! Leaving now will count as a forfeit and terminate your match.`;
            return e.returnValue;
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isActive, battleType]);

    // Track tab visibility changes
    useEffect(() => {
        if (!isActive) {
            // If match becomes inactive, reset title and state
            if (titleIntervalRef.current) {
                clearInterval(titleIntervalRef.current);
                titleIntervalRef.current = null;
                document.title = originalTitleRef.current || 'CodeArena';
            }
            setIsAway(false);
            wasAwayRef.current = false;
            return;
        }

        originalTitleRef.current = document.title;

        const handleVisibilityChange = () => {
            if (!isActive) return;

            if (document.hidden) {
                // User switched away from the battle tab
                setIsAway(true);
                wasAwayRef.current = true;

                setInfractionCount((prev) => {
                    const next = prev + 1;
                    if (onFocusLost) onFocusLost(next);
                    return next;
                });

                // Start flashing title to warn user in other tabs
                if (!titleIntervalRef.current) {
                    let flip = false;
                    titleIntervalRef.current = window.setInterval(() => {
                        document.title = flip
                            ? '⚠️ RETURN TO BATTLE! - CodeArena'
                            : '🚨 COMBAT IN PROGRESS - CodeArena';
                        flip = !flip;
                    }, 1000);
                }
            } else {
                // User returned to the battle tab
                setIsAway(false);

                // Clear title flashing
                if (titleIntervalRef.current) {
                    clearInterval(titleIntervalRef.current);
                    titleIntervalRef.current = null;
                }
                document.title = originalTitleRef.current || 'CodeArena';

                // If user was away, show modal warning and sound alert
                if (wasAwayRef.current) {
                    wasAwayRef.current = false;
                    setShowWarningModal(true);
                    playCyberAlertSound();
                    if (onFocusRestored) {
                        onFocusRestored(infractionCount);
                    }
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (titleIntervalRef.current) {
                clearInterval(titleIntervalRef.current);
                titleIntervalRef.current = null;
            }
            document.title = originalTitleRef.current || 'CodeArena';
        };
    }, [isActive, onFocusLost, onFocusRestored, infractionCount]);

    return {
        infractionCount,
        showWarningModal,
        dismissWarning,
        isAway,
    };
}
