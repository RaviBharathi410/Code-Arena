import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { useSocket } from '../hooks/useSocket';
import type { Problem, MatchStatus, User, MatchResult } from '../types';

// ── State ─────────────────────────────────────────────────────────────────

interface MatchState {
    roomId: string | null;
    roomCode: string | null;
    status: MatchStatus | 'idle' | 'searching';
    problem: Problem | null;
    players: Partial<User>[];
    opponentReady: boolean;
    myReady: boolean;
    opponentLanguage: string | null;
    opponentCode: string;
    opponentTypingLines: number;
    opponentSpeaking: boolean;
    opponentSubmissionStatus: 'CODING' | 'SUBMITTED' | 'ACCEPTED' | 'FAILED';
    verdict: any | null;
    runVerdict: any | null;
    result: MatchResult | null;
    startedAt: string | null;
    durationMs: number;
    error: string | null;
}

const initialState: MatchState = {
    roomId: null,
    roomCode: null,
    status: 'idle',
    problem: null,
    players: [],
    opponentReady: false,
    myReady: false,
    opponentLanguage: null,
    opponentCode: '',
    opponentTypingLines: 0,
    opponentSpeaking: false,
    opponentSubmissionStatus: 'CODING',
    verdict: null,
    runVerdict: null,
    result: null,
    startedAt: null,
    durationMs: 0,
    error: null,
};

// ── Actions ───────────────────────────────────────────────────────────────

type MatchAction =
    | { type: 'SET_SEARCHING' }
    | { type: 'ROOM_JOINED'; roomId: string, roomCode: string, players?: any[], problem?: Problem }
    | { type: 'PLAYER_JOINED'; player: any }
    | { type: 'PLAYER_READY'; userId: string, isMe: boolean }
    | { type: 'BOTH_READY'; problem: Problem, startedAt: string, durationMs: number }
    | { type: 'OPPONENT_LANGUAGE'; language: string }
    | { type: 'OPPONENT_TYPING'; lines: number }
    | { type: 'OPPONENT_CODE'; code: string }
    | { type: 'OPPONENT_SPEAKING'; active: boolean }
    | { type: 'OPPONENT_SUBMITTED'; status: any }
    | { type: 'OPPONENT_DONE'; data: any }
    | { type: 'VERDICT'; verdict: any }
    | { type: 'RUN_VERDICT'; verdict: any }
    | { type: 'RESULT'; result: MatchResult }
    | { type: 'ERROR'; message: string }
    | { type: 'CLEAR_ERROR' }
    | { type: 'CLEAR_VERDICT' }
    | { type: 'RESET' };

// ── Reducer ───────────────────────────────────────────────────────────────

function matchReducer(state: MatchState, action: MatchAction): MatchState {
    switch (action.type) {
        case 'SET_SEARCHING':
            return { ...state, status: 'searching' };
        case 'ROOM_JOINED':
            return {
                ...state,
                roomId: action.roomId,
                roomCode: action.roomCode,
                status: 'waiting',
                players: action.players || [],
                problem: action.problem || state.problem
            };
        case 'PLAYER_JOINED': {
            const exists = state.players.find(p => p.id === action.player.id);
            return {
                ...state,
                players: exists ? state.players : [...state.players, action.player]
            };
        }
        case 'PLAYER_READY':
            return action.isMe ? { ...state, myReady: true } : { ...state, opponentReady: true };
        case 'BOTH_READY':
            return { ...state, status: 'active', problem: action.problem, startedAt: action.startedAt, durationMs: action.durationMs };
        case 'OPPONENT_LANGUAGE':
            return { ...state, opponentLanguage: action.language };
        case 'OPPONENT_TYPING':
            return { ...state, opponentTypingLines: action.lines };
        case 'OPPONENT_CODE':
            return { ...state, opponentCode: action.code };
        case 'OPPONENT_SPEAKING':
            return { ...state, opponentSpeaking: action.active };
        case 'OPPONENT_SUBMITTED':
            return { ...state, opponentSubmissionStatus: 'SUBMITTED' };
        case 'OPPONENT_DONE':
            return { ...state, opponentSubmissionStatus: action.data.status };
        case 'VERDICT':
            return { ...state, verdict: action.verdict };
        case 'RUN_VERDICT':
            console.log('[MATCH] RUN_VERDICT dispatched', action.verdict?.status);
            return { ...state, runVerdict: action.verdict };
        case 'RESULT':
            return { ...state, status: 'completed', result: action.result };
        case 'ERROR':
            return { ...state, error: action.message };
        case 'CLEAR_ERROR':
            return { ...state, error: null };
        case 'CLEAR_VERDICT':
            return { ...state, verdict: null, runVerdict: null, error: null };
        case 'RESET':
            return initialState;
        default:
            return state;
    }
}

// ── Context ───────────────────────────────────────────────────────────────

interface MatchContextType {
    state: MatchState;
    createRoom: (mode: '1v1' | 'practice' | 'ranked', problemId?: string) => void;
    joinRoom: (roomCode: string) => void;
    joinById: (matchId: string) => void;
    findMatch: () => void;
    cancelSearch: () => void;
    setReady: () => void;
    setLanguage: (lang: string) => void;
    runCode: (code: string, lang: string, customInputs?: string) => void;
    submitCode: (code: string, lang: string) => void;
    updateCode: (code: string) => void;
    sendTyping: (lines: number) => void;
    sendSpeaking: (active: boolean) => void;
    clearError: () => void;
    reset: () => void;
}

const MatchContext = createContext<MatchContextType | undefined>(undefined);

export const MatchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(matchReducer, initialState);
    const { socket, on, emit } = useSocket();

    // ── Register ALL socket event listeners ───────────────────────────────
    //
    // CRITICAL: This effect depends on [on, emit].
    //
    // Because SocketContext's `on` callback depends on `[socket]` (useState),
    // its identity changes whenever the socket instance changes. That causes
    // this effect to re-run, which:
    //   1. Cleans up old listeners (via the returned cleanup functions)
    //   2. Attaches new listeners to the CURRENT live socket
    //
    // This eliminates the race condition where listeners were attached to a
    // null or stale socket reference.
    //
    useEffect(() => {
        // If socket isn't ready yet, `on` returns no-op cleanups.
        // When socket connects, `on` identity changes and this effect re-runs.
        console.log('[MATCH] Attaching socket listeners, socket ready:', !!socket);

        const cleanups = [
            on('room:player_joined', (data: any) =>
                dispatch({ type: 'PLAYER_JOINED', player: data.player })),

            on('room:initial_data', (data: any) =>
                dispatch({ type: 'ROOM_JOINED', roomId: data.roomId, roomCode: data.roomCode, players: data.players, problem: data.problem })),

            on('room:player_ready', (data: any) =>
                dispatch({ type: 'PLAYER_READY', userId: data.userId, isMe: false })),

            on('room:both_ready', (data: any) =>
                dispatch({ type: 'BOTH_READY', problem: data.problem, startedAt: data.startedAt, durationMs: data.durationMs || (30 * 60 * 1000) })),

            on('room:opponent_language', (data: any) =>
                dispatch({ type: 'OPPONENT_LANGUAGE', language: data.language })),

            on('presence:opponent_typing', (data: any) =>
                dispatch({ type: 'OPPONENT_TYPING', lines: data.lines })),

            on('voice:opponent_speaking', (data: any) =>
                dispatch({ type: 'OPPONENT_SPEAKING', active: data.active })),

            on('battle:opponent_submitted', (data: any) =>
                dispatch({ type: 'OPPONENT_SUBMITTED', status: data.status })),

            on('battle:opponent_done', (data: any) =>
                dispatch({ type: 'OPPONENT_DONE', data })),

            on('battle:run_result', (data: any) => {
                console.log('🔥 [MATCH] RECEIVED battle:run_result', data?.status);
                dispatch({ type: 'RUN_VERDICT', verdict: data });
            }),

            on('battle:submission_result', (data: any) =>
                dispatch({ type: 'VERDICT', verdict: data })),

            on('match:result', (data: any) =>
                dispatch({ type: 'RESULT', result: data })),

            on('battle:error', (data: any) =>
                dispatch({ type: 'ERROR', message: data.message })),

            on('room:error', (data: any) => {
                console.error('[ROOM_ERROR]', data?.message);
                dispatch({ type: 'ERROR', message: data?.message || 'Room error' });
            }),

            on('match:error', (data: any) => {
                console.error('[MATCH_ERROR]', data?.message);
                dispatch({ type: 'ERROR', message: data?.message || 'Matchmaking error' });
            }),

            on('MATCH_FOUND', (data: any) => {
                const matchId = data.matchId || data.roomId;
                dispatch({ type: 'ROOM_JOINED', roomId: matchId, roomCode: data.roomCode, players: data.players, problem: data.problem });
                emit('room:join_by_id', { matchId });
            }),

            on('battle:opponent_code', (data: any) =>
                dispatch({ type: 'OPPONENT_CODE', code: data.code })),

            on('notification:new', (data: any) => {
                console.log('[NOTIFICATION]', data.message);
            }),
        ];

        return () => {
            console.log('[MATCH] Cleaning up socket listeners');
            cleanups.forEach(cleanup => cleanup && cleanup());
        };
    }, [on, emit, socket]);

    // ── Action creators ───────────────────────────────────────────────────

    const createRoom = useCallback((mode: '1v1' | 'practice' | 'ranked' = '1v1', problemId?: string) => {
        dispatch({ type: 'CLEAR_ERROR' });
        emit('room:create', { mode, problemId });
    }, [emit]);

    const joinRoom = useCallback((roomCode: string) => {
        dispatch({ type: 'CLEAR_ERROR' });
        const sanitized = roomCode ? roomCode.trim().toUpperCase() : '';
        emit('room:join', { roomCode: sanitized });
    }, [emit]);

    const clearError = useCallback(() => dispatch({ type: 'CLEAR_ERROR' }), []);

    const joinById = useCallback((matchId: string) =>
        emit('room:join_by_id', { matchId }), [emit]);

    const findMatch = useCallback(() => {
        dispatch({ type: 'SET_SEARCHING' });
        emit('find_match', {});
    }, [emit]);

    const cancelSearch = useCallback(() => {
        dispatch({ type: 'RESET' });
        emit('cancel_search', {});
    }, [emit]);

    const setReady = useCallback(() => {
        emit('room:ready', {});
        dispatch({ type: 'PLAYER_READY', userId: 'me', isMe: true });
    }, [emit]);

    const setLanguage = useCallback((language: string) =>
        emit('room:set_language', { language }), [emit]);

    const runCode = useCallback((code: string, language: string, customInputs?: string) => {
        dispatch({ type: 'CLEAR_VERDICT' });
        emit('battle:run_code', { code, language, customInputs });
    }, [emit]);

    const submitCode = useCallback((code: string, language: string) => {
        dispatch({ type: 'CLEAR_VERDICT' });
        emit('battle:submit', { code, language });
    }, [emit]);

    const codeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const updateCode = useCallback((code: string) => {
        const lines = code.split('\n').length;
        emit('presence:typing', { lines });

        if (codeTimeoutRef.current) clearTimeout(codeTimeoutRef.current);
        codeTimeoutRef.current = setTimeout(() => {
            emit('battle:code_update', { code });
        }, 300);
    }, [emit]);

    const sendTyping = useCallback((lines: number) =>
        emit('presence:typing', { lines }), [emit]);

    const sendSpeaking = useCallback((active: boolean) =>
        emit('voice:speaking', { active }), [emit]);

    const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

    return (
        <MatchContext.Provider value={{
            state,
            createRoom,
            joinRoom,
            joinById,
            findMatch,
            cancelSearch,
            setReady,
            setLanguage,
            runCode,
            submitCode,
            updateCode,
            sendTyping,
            sendSpeaking,
            clearError,
            reset
        }}>
            {children}
        </MatchContext.Provider>
    );
};

export const useMatch = () => {
    const context = useContext(MatchContext);
    if (!context) throw new Error('useMatch must be used within MatchProvider');

    return {
        ...context.state,
        state: context.state,
        createRoom: context.createRoom,
        joinMatch: context.joinRoom,
        joinById: context.joinById,
        findMatch: context.findMatch,
        cancelSearch: context.cancelSearch,
        setReady: context.setReady,
        setLanguage: context.setLanguage,
        runCode: context.runCode,
        submitCode: context.submitCode,
        updateCode: context.updateCode,
        sendTyping: context.sendTyping,
        sendSpeaking: context.sendSpeaking,
        clearError: context.clearError,
        reset: context.reset,
        winner: context.state.result,
        activeProblem: context.state.problem,
        liveOpponentCode: context.state.opponentCode,
    };
};
