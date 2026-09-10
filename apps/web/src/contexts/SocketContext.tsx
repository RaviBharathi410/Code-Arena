import React, { createContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';

// ── Types ─────────────────────────────────────────────────────────────────

interface SocketContextType {
    socket: Socket | null;
    connected: boolean;
    emit: (event: string, data?: any) => void;
    on: (event: string, callback: (...args: any[]) => void) => () => void;
    connect: () => void;
}

export const SocketContext = createContext<SocketContextType | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────────

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Store socket in state so that when it changes, all consumers re-render
    // and re-attach their listeners to the new, live socket instance.
    const [socket, setSocket] = useState<Socket | null>(null);
    const [connected, setConnected] = useState(false);

    // Keep a ref that always points to the latest socket for use inside
    // stable callbacks that must not cause re-renders when called.
    const socketRef = useRef<Socket | null>(null);

    const token = useAuthStore((state) => state.token);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    // ── Socket lifecycle: create once per auth session, destroy on logout ──
    useEffect(() => {
        if (!isAuthenticated || !token) {
            setConnected(false);
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
                setSocket(null);
            }
            return;
        }

        // Prevent double-creation in React Strict Mode
        if (socketRef.current) return;

        console.log('[SOCKET] Creating socket connection...');
        const s = io(SOCKET_URL, {
            withCredentials: true,
            path: '/socket.io',
            autoConnect: true,
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            auth: { token }
        });

        s.on('connect', () => {
            console.log('[SOCKET] Connected ─ id:', s.id);
            setConnected(true);
        });

        s.on('disconnect', (reason) => {
            console.warn('[SOCKET] Disconnected:', reason);
            setConnected(false);
        });

        s.on('connect_error', (err) => {
            console.error('[SOCKET] Connection Error:', err.message);
            setConnected(false);
            if (err.message.includes('Authentication error') || err.message.includes('Invalid token')) {
                useAuthStore.getState().logout();
            }
        });

        // Set both ref and state. Setting state triggers a re-render, which
        // causes MatchContext (and any other consumer of `on`) to re-run its
        // useEffect and attach listeners to THIS live socket.
        socketRef.current = s;
        setSocket(s);

        return () => {
            console.log('[SOCKET] Tearing down socket');
            s.removeAllListeners();
            s.disconnect();
            socketRef.current = null;
            setSocket(null);
        };
    }, [isAuthenticated, token]);

    // ── Stable helpers ─────────────────────────────────────────────────────
    // `emit` is safe to be stable (useRef) because emitting doesn't need
    // React to re-render. The ref always points to the live socket.

    const connect = useCallback(() => {
        socketRef.current?.connect();
    }, []);

    const emit = useCallback((event: string, data?: any) => {
        if (!socketRef.current) {
            console.warn(`[SOCKET] emit('${event}') skipped — socket not initialized`);
            return;
        }
        socketRef.current.emit(event, data);
    }, []);

    // `on` MUST depend on `socket` (state) so that when the socket instance
    // changes, every consumer's useEffect re-runs and re-attaches listeners
    // to the new socket. This is the KEY fix for the race condition.
    const on = useCallback((event: string, callback: (...args: any[]) => void): (() => void) => {
        if (!socket) {
            // Socket not yet created — return a no-op cleanup.
            // When socket is set, consumers will re-run because `on` identity changes.
            return () => {};
        }
        socket.on(event, callback);
        return () => {
            socket.off(event, callback);
        };
    }, [socket]);

    // Memoize the context value to prevent unnecessary re-renders of children
    // that don't depend on on/emit directly.
    const value = React.useMemo<SocketContextType>(() => ({
        socket,
        connected,
        emit,
        on,
        connect
    }), [socket, connected, emit, on, connect]);

    return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};
