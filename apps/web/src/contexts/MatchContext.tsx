import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { useSocket } from './SocketContext';
import type { Problem, MatchStatus, User, MatchResult } from '../types';

// ── State ─────────────────────────────────────────────────────────────────

interface MatchState {
    roomId: string | null;
    roomCode: string | null;
    status: MatchStatus | 'idle';
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
    result: MatchResult | null;
    startedAt: string | null;
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
    result: null,
    startedAt: null,
};

// ── Actions ───────────────────────────────────────────────────────────────

type MatchAction =
    | { type: 'ROOM_JOINED'; roomId: string, roomCode: string, players?: any[], problem?: Problem }
    | { type: 'PLAYER_JOINED'; player: any }
    | { type: 'PLAYER_READY'; userId: string, isMe: boolean }
    | { type: 'BOTH_READY'; problem: Problem, startedAt: string }
    | { type: 'OPPONENT_LANGUAGE'; language: string }
    | { type: 'OPPONENT_TYPING'; lines: number }
    | { type: 'OPPONENT_SPEAKING'; active: boolean }
    | { type: 'OPPONENT_SUBMITTED'; status: any }
    | { type: 'OPPONENT_DONE'; data: any }
    | { type: 'VERDICT'; verdict: any }
    | { type: 'RESULT'; result: MatchResult }
    | { type: 'RESET' };

// ── Reducer ───────────────────────────────────────────────────────────────

function matchReducer(state: MatchState, action: MatchAction): MatchState {
    switch (action.type) {
        case 'ROOM_JOINED':
            return { 
                ...state, 
                roomId: action.roomId, 
                roomCode: action.roomCode, 
                status: 'waiting',
                players: action.players || [],
                problem: action.problem || state.problem
            };
        case 'PLAYER_JOINED':
            const exists = state.players.find(p => p.id === action.player.id);
            return { 
                ...state, 
                players: exists ? state.players : [...state.players, action.player] 
            };
        case 'PLAYER_READY':
            return action.isMe ? { ...state, myReady: true } : { ...state, opponentReady: true };
        case 'BOTH_READY':
            return { ...state, status: 'active', problem: action.problem, startedAt: action.startedAt };
        case 'OPPONENT_LANGUAGE':
            return { ...state, opponentLanguage: action.language };
        case 'OPPONENT_TYPING':
            return { ...state, opponentTypingLines: action.lines };
        case 'OPPONENT_SPEAKING':
            return { ...state, opponentSpeaking: action.active };
        case 'OPPONENT_SUBMITTED':
            return { ...state, opponentSubmissionStatus: 'SUBMITTED' };
        case 'OPPONENT_DONE':
            return { ...state, opponentSubmissionStatus: action.data.status };
        case 'VERDICT':
            return { ...state, verdict: action.verdict };
        case 'RESULT':
            return { ...state, status: 'completed', result: action.result };
        case 'RESET':
            return initialState;
        default:
            return state;
    }
}

// ── Context ───────────────────────────────────────────────────────────────

interface MatchContextType {
    state: MatchState;
    createRoom: (mode: '1v1' | 'practice' | 'ranked') => void;
    joinRoom: (roomCode: string) => void;
    setReady: () => void;
    setLanguage: (lang: string) => void;
    runCode: (code: string, lang: string) => void;
    submitCode: (code: string, lang: string) => void;
    sendTyping: (lines: number) => void;
    sendSpeaking: (active: boolean) => void;
    reset: () => void;
}

const MatchContext = createContext<MatchContextType | undefined>(undefined);

export const MatchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(matchReducer, initialState);
    const { on, emit } = useSocket();

    useEffect(() => {
        const c1 = on('room:player_joined', (data: any) => dispatch({ type: 'PLAYER_JOINED', player: data.player }));
        const c2 = on('room:initial_data', (data: any) => dispatch({ type: 'ROOM_JOINED', roomId: data.roomId, roomCode: data.roomCode, players: data.players, problem: data.problem }));
        const c3 = on('room:player_ready', (data: any) => dispatch({ type: 'PLAYER_READY', userId: data.userId, isMe: false }));
        const c4 = on('room:both_ready', (data: any) => dispatch({ type: 'BOTH_READY', problem: data.problem, startedAt: data.startedAt }));
        const c5 = on('room:opponent_language', (data: any) => dispatch({ type: 'OPPONENT_LANGUAGE', language: data.language }));
        const c6 = on('presence:opponent_typing', (data: any) => dispatch({ type: 'OPPONENT_TYPING', lines: data.lines }));
        const c7 = on('voice:opponent_speaking', (data: any) => dispatch({ type: 'OPPONENT_SPEAKING', active: data.active }));
        const c8 = on('battle:opponent_submitted', (data: any) => dispatch({ type: 'OPPONENT_SUBMITTED', status: data.status }));
        const c9 = on('battle:opponent_done', (data: any) => dispatch({ type: 'OPPONENT_DONE', data }));
        const c10 = on('battle:run_result', (data: any) => dispatch({ type: 'VERDICT', verdict: data }));
        const c11 = on('battle:submission_result', (data: any) => dispatch({ type: 'VERDICT', verdict: data }));
        const c12 = on('match:result', (data: any) => dispatch({ type: 'RESULT', result: data }));
        const c13 = on('MATCH_FOUND', (data: any) => dispatch({ type: 'ROOM_JOINED', roomId: data.roomId, roomCode: data.roomCode, players: data.players, problem: data.problem }));

        return () => {
            [c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, c11, c12, c13].forEach(c => c());
        };
    }, [on]);

    const createRoom = useCallback((mode: '1v1' | 'practice' | 'ranked' = '1v1') => emit('room:create', { mode }), [emit]);
    const joinRoom = useCallback((roomCode: string) => emit('room:join', { roomCode }), [emit]);
    const setReady = useCallback(() => {
        emit('room:ready', {});
        dispatch({ type: 'PLAYER_READY', userId: 'me', isMe: true });
    }, [emit]);
    const setLanguage = useCallback((language: string) => emit('room:set_language', { language }), [emit]);
    const runCode = useCallback((code: string, language: string) => emit('battle:run_code', { code, language }), [emit]);
    const submitCode = useCallback((code: string, language: string) => emit('battle:submit', { code, language }), [emit]);
    const sendTyping = useCallback((lines: number) => emit('presence:typing', { lines }), [emit]);
    const sendSpeaking = useCallback((active: boolean) => emit('voice:speaking', { active }), [emit]);
    const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

    return (
        <MatchContext.Provider value={{ state, joinRoom, createRoom, setReady, setLanguage, runCode, submitCode, sendTyping, sendSpeaking, reset }}>
            {children}
        </MatchContext.Provider>
    );
};

export const useMatch = () => {
    const context = useContext(MatchContext);
    if (!context) throw new Error('useMatch must be used within MatchProvider');
    return context;
};
