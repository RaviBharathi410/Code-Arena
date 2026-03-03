import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

import { useAuthStore } from './useAuthStore';

interface BattleState {
    socket: Socket | null;
    matchId: string | null;
    opponentCode: string;
    isMatchActive: boolean;
    problem: any | null;
    winner: string | null;

    initializeSocket: () => void;
    joinMatch: (id: string) => void;
    updateCode: (code: string) => void;
    submitCode: (code: string, language: string) => void;
}

export const useBattleStore = create<BattleState>((set, get) => ({
    socket: null,
    matchId: null,
    opponentCode: '',
    isMatchActive: false,
    problem: null,
    winner: null,

    initializeSocket: () => {
        if (get().socket) return;

        const token = useAuthStore.getState().token;
        const socket = io('http://localhost:3001', {
            auth: { token }
        });

        socket.on('opponent_code_update', ({ code }) => {
            set({ opponentCode: code });
        });

        socket.on('match_result', ({ winner }) => {
            set({ winner, isMatchActive: false });
        });

        socket.on('match_start', ({ problem }) => {
            set({ problem, isMatchActive: true });
        });

        set({ socket });
    },

    joinMatch: (id: string) => {
        const { socket } = get();
        if (socket) {
            socket.emit('join_match', id);
            set({ matchId: id, winner: null });
        }
    },

    updateCode: (code: string) => {
        const { socket, matchId } = get();
        if (socket && matchId) {
            socket.emit('code_update', { matchId, code });
        }
    },

    submitCode: (code: string, language: string) => {
        const { socket, matchId } = get();
        if (socket && matchId) {
            socket.emit('submit_code', { matchId, code, language });
        }
    }
}));
