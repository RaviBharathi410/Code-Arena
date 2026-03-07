import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { useSocket } from './SocketContext';
import { CLIENT_EVENTS, SERVER_EVENTS } from '../constants/socketEvents';
import type { Problem, MatchStatus } from '../types';

// ── State ─────────────────────────────────────────────────────────────────

interface MatchState {
    matchId: string | null;
    problem: Problem | null;
    opponentId: string | null;
    matchStatus: MatchStatus | 'idle';
    opponentCode: string;
    winner: string | null;
    socketConnected: boolean;
}

const initialMatchState: MatchState = {
    matchId: null,
    problem: null,
    opponentId: null,
    matchStatus: 'idle',
    opponentCode: '',
    winner: null,
    socketConnected: false,
};

// ── Actions ───────────────────────────────────────────────────────────────

type MatchAction =
    | { type: 'SOCKET_CONNECTED' }
    | { type: 'SOCKET_DISCONNECTED' }
    | { type: 'JOIN_MATCH'; matchId: string }
    | { type: 'MATCH_STARTED'; problem: Problem }
    | { type: 'OPPONENT_CODE_UPDATE'; code: string }
    | { type: 'MATCH_RESULT'; winner: string }
    | { type: 'RESET' };

// ── Reducer ───────────────────────────────────────────────────────────────

function matchReducer(state: MatchState, action: MatchAction): MatchState {
    switch (action.type) {
        case 'SOCKET_CONNECTED':
            return { ...state, socketConnected: true };

        case 'SOCKET_DISCONNECTED':
            return { ...state, socketConnected: false };

        case 'JOIN_MATCH':
            return {
                ...state,
                matchId: action.matchId,
                matchStatus: 'waiting',
                winner: null,
                opponentCode: '',
                problem: null,
            };

        case 'MATCH_STARTED':
            return {
                ...state,
                problem: action.problem,
                matchStatus: 'active',
            };

        case 'OPPONENT_CODE_UPDATE':
            return { ...state, opponentCode: action.code };

        case 'MATCH_RESULT':
            return {
                ...state,
                winner: action.winner,
                matchStatus: 'completed',
            };

        case 'RESET':
            return { ...initialMatchState, socketConnected: state.socketConnected };

        default:
            return state;
    }
}

// ── Context Shape ─────────────────────────────────────────────────────────

interface MatchContextType {
    state: MatchState;

    // Derived convenience accessors
    matchId: string | null;
    problem: Problem | null;
    opponentCode: string;
    isMatchActive: boolean;
    winner: string | null;
    socketConnected: boolean;

    // Action creators
    joinMatch: (matchId: string) => void;
    updateCode: (code: string) => void;
    submitCode: (code: string, language: string) => void;
    leaveMatch: () => void;
    resetMatch: () => void;
}

const MatchContext = createContext<MatchContextType | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────────

export const MatchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(matchReducer, initialMatchState);
    const { connected, on, emit } = useSocket();

    // ── Socket event listeners ────────────────────────────────────

    useEffect(() => {
        const cleanupStart = on(SERVER_EVENTS.MATCH_STARTED, ({ problem }: { problem: Problem }) => {
            dispatch({ type: 'MATCH_STARTED', problem });
        });

        const cleanupCode = on(SERVER_EVENTS.OPPONENT_CODE, ({ code }: { code: string }) => {
            dispatch({ type: 'OPPONENT_CODE_UPDATE', code });
        });

        const cleanupResult = on(SERVER_EVENTS.MATCH_RESULT, ({ winner }: { winner: string }) => {
            dispatch({ type: 'MATCH_RESULT', winner });
        });

        return () => {
            cleanupStart();
            cleanupCode();
            cleanupResult();
        };
    }, [on]);

    // ── Action creators ───────────────────────────────────────────────

    const joinMatch = useCallback((matchId: string) => {
        emit(CLIENT_EVENTS.JOIN_MATCH, matchId);
        dispatch({ type: 'JOIN_MATCH', matchId });
    }, [emit]);

    const updateCode = useCallback((code: string) => {
        if (state.matchId) {
            emit(CLIENT_EVENTS.CODE_UPDATE, {
                matchId: state.matchId,
                code,
            });
        }
    }, [state.matchId, emit]);

    const submitCode = useCallback((code: string, language: string) => {
        if (state.matchId) {
            emit(CLIENT_EVENTS.SUBMIT_CODE, {
                matchId: state.matchId,
                code,
                language,
            });
        }
    }, [state.matchId, emit]);

    const leaveMatch = useCallback(() => {
        if (state.matchId) {
            emit(CLIENT_EVENTS.LEAVE_MATCH, state.matchId);
        }
        dispatch({ type: 'RESET' });
    }, [state.matchId, emit]);

    const resetMatch = useCallback(() => {
        dispatch({ type: 'RESET' });
    }, []);

    // ── Context value ─────────────────────────────────────────────────

    const value: MatchContextType = {
        state,
        matchId: state.matchId,
        problem: state.problem,
        opponentCode: state.opponentCode,
        isMatchActive: state.matchStatus === 'active',
        winner: state.winner,
        socketConnected: connected,
        joinMatch,
        updateCode,
        submitCode,
        leaveMatch,
        resetMatch,
    };

    return (
        <MatchContext.Provider value={value}>
            {children}
        </MatchContext.Provider>
    );
};

// ── Hook ──────────────────────────────────────────────────────────────────

export function useMatch(): MatchContextType {
    const context = useContext(MatchContext);
    if (!context) {
        throw new Error('useMatch() must be used within a <MatchProvider>.');
    }
    return context;
}
