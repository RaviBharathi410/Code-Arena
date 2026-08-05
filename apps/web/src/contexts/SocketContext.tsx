import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';

interface SocketContextType {
    socket: Socket | null;
    connected: boolean;
    emit: (event: string, data?: any) => void;
    on: (event: string, callback: (...args: any[]) => void) => () => void;
    connect: () => void;
}

export const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const socketRef = useRef<Socket | null>(null);
    const [connected, setConnected] = useState(false);

    const token = useAuthStore((state) => state.token);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    useEffect(() => {
        // Do NOT connect if unauthenticated or token missing
        if (!isAuthenticated || !token) {
            setConnected(false);
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
            return;
        }

        const s = io(SOCKET_URL, {
            withCredentials: true,
            path: '/socket.io',
            autoConnect: true,
            transports: ['websocket', 'polling'],
            auth: { token }
        });
 
        s.on('connect', () => {
            console.log('[SOCKET] Connected to uplink');
            setConnected(true);
        });
        
        s.on('disconnect', (reason) => {
            console.warn('[SOCKET] Disconnected:', reason);
            setConnected(false);
        });

        s.on('connect_error', (err) => {
            console.error('[SOCKET] Connection Error:', err.message);
            setConnected(false);
            // If auth error, trigger full logout to clear bad token
            if (err.message.includes('Authentication error') || err.message.includes('Invalid token')) {
                useAuthStore.getState().logout();
            }
        });

        socketRef.current = s;
 
        return () => {
            s.disconnect();
            socketRef.current = null;
        };
    }, [isAuthenticated, token]);

    const connect = useCallback(() => {
        socketRef.current?.connect();
    }, []);

    const emit = useCallback((event: string, data?: any) => {
        socketRef.current?.emit(event, data);
    }, []);

    const on = useCallback((event: string, callback: (...args: any[]) => void) => {
        socketRef.current?.on(event, callback);
        return () => {
            socketRef.current?.off(event, callback);
        };
    }, []);

    const value = React.useMemo(() => ({
        socket: socketRef.current,
        connected,
        emit,
        on,
        connect
    }), [connected, emit, on, connect]);

    return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};
