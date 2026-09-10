import React, { useEffect } from 'react';
import { AlertTriangle, ShieldAlert, EyeOff, CheckCircle2 } from 'lucide-react';

interface BattleFocusWarningModalProps {
    isOpen: boolean;
    infractionCount: number;
    battleType?: string;
    onDismiss: () => void;
}

export const BattleFocusWarningModal: React.FC<BattleFocusWarningModalProps> = ({
    isOpen,
    infractionCount,
    battleType = 'Battle Arena',
    onDismiss,
}) => {
    // Allow pressing Enter or Escape to quickly resume combat
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === 'Escape') {
                e.preventDefault();
                onDismiss();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onDismiss]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
            <div className="relative w-full max-w-lg bg-[#0c0d16] border-2 border-amber-500/50 rounded-3xl p-6 sm:p-8 shadow-[0_0_70px_rgba(245,158,11,0.25)] text-center space-y-6 overflow-hidden">
                {/* Background ambient glow */}
                <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-red-500/15 rounded-full blur-3xl pointer-events-none" />

                {/* Top Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-[11px] font-mono font-bold tracking-widest text-amber-400 uppercase">
                    <EyeOff size={13} className="animate-pulse" />
                    <span>Focus Breach Detected</span>
                </div>

                {/* Alert Icon */}
                <div className="relative w-20 h-20 mx-auto">
                    <div className="absolute inset-0 rounded-2xl bg-amber-500/20 animate-ping opacity-30" />
                    <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-b from-amber-500/20 to-red-500/20 border-2 border-amber-500/50 flex items-center justify-center text-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.3)]">
                        <AlertTriangle size={40} className="stroke-[2.5]" />
                    </div>
                </div>

                {/* Content */}
                <div className="space-y-2">
                    <h3 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white">
                        Tab Departure Detected!
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans max-w-md mx-auto">
                        You navigated away from the active <strong className="text-amber-400">{battleType}</strong> window.
                        Competitive arena telemetry requires continuous window focus during active combat.
                    </p>
                </div>

                {/* Infraction Card */}
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-left">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                            <ShieldAlert size={18} />
                        </div>
                        <div>
                            <p className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Combat Monitor</p>
                            <p className="text-xs font-bold text-white">Focus Breach Count</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="inline-block px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-xs font-mono font-extrabold text-amber-300">
                            Infraction #{infractionCount}
                        </span>
                    </div>
                </div>

                <p className="text-[11px] text-zinc-500 font-mono">
                    ⚠️ Repeated departures or leaving the match tab may lead to rank penalties or match forfeit.
                </p>

                {/* Action Button */}
                <div className="pt-2">
                    <button
                        onClick={onDismiss}
                        className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-mono font-black text-xs sm:text-sm uppercase tracking-widest transition-all duration-200 shadow-[0_0_30px_rgba(245,158,11,0.4)] hover:shadow-[0_0_40px_rgba(245,158,11,0.6)] hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
                    >
                        <CheckCircle2 size={16} />
                        <span>Resume Combat (Enter)</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
