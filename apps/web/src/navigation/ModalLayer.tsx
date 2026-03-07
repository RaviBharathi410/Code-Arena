import React from 'react';
import { useNav, MODALS } from './NavigationContext';

// ── Modal Layer ───────────────────────────────────────────────────────────
// Renders the active modal from navigation context as a global overlay.
// Individual modal UIs can be defined inline here or imported from components.

const ModalLayer: React.FC = () => {
    const { modal, closeModal } = useNav();

    if (!modal) return null;

    return (
        <div className="fixed inset-0 z-[200]">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={closeModal}
            />

            {/* Modal Content */}
            <div className="relative z-10 flex items-center justify-center h-full p-6">
                {modal === MODALS.CONFIRM_LEAVE && (
                    <ConfirmLeaveModal onClose={closeModal} />
                )}
                {modal === MODALS.MATCH_RESULTS && (
                    <MatchResultsModal onClose={closeModal} />
                )}
            </div>
        </div>
    );
};

// ── Confirm Leave Modal ───────────────────────────────────────────────────

const ConfirmLeaveModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { goToDashboard } = useNav();

    return (
        <div className="w-full max-w-md bg-[#0a0a0a] border border-red-500/30 rounded-3xl p-8 space-y-6 shadow-[0_0_50px_rgba(239,68,68,0.1)]">
            <div className="flex items-center gap-4 text-red-500">
                <div className="w-10 h-10 rounded-2xl bg-red-500/20 flex items-center justify-center">
                    <span className="text-xl">⚠</span>
                </div>
                <div>
                    <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">Warning: Combat Active</h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">Protocol Abandonment Imminent</p>
                </div>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
                Leaving a live session will result in immediate rating penalty and disconnection from the arena protocols. Confirm termination?
            </p>
            <div className="flex gap-4">
                <button
                    onClick={onClose}
                    className="flex-1 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all text-white"
                >
                    Stay in Combat
                </button>
                <button
                    onClick={() => { onClose(); goToDashboard(); }}
                    className="flex-1 py-4 bg-red-500 hover:bg-red-400 text-black rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-red-500/20"
                >
                    Terminate Session
                </button>
            </div>
        </div>
    );
};

// ── Match Results Modal ───────────────────────────────────────────────────
// Placeholder — actual results UI remains in GameSpace/BattleArena for now.

const MatchResultsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { goToDashboard } = useNav();

    return (
        <div className="w-full max-w-md bg-[#0a0a0a] border border-cyan-500/30 rounded-3xl p-8 space-y-6 shadow-[0_0_50px_rgba(6,182,212,0.1)]">
            <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">Match Complete</h3>
            <p className="text-gray-400 text-sm">Results have been recorded.</p>
            <button
                onClick={() => { onClose(); goToDashboard(); }}
                className="w-full py-4 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-[0.98]"
            >
                Return to Command Center
            </button>
        </div>
    );
};

export default ModalLayer;
