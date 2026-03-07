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

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [connected, setConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);

    const connect = useCallback(() => {
        if (socketRef.current?.connected) return;

        const token = useAuthStore.getState().token;
        if (!token) return;

        const socket = io(SOCKET_URL, {
            auth: { token },
            reconnection: true,
        });

        socket.on('connect', () => {
            console.log('Socket connected:', socket.id);
            setConnected(true);
        });

        socket.on('disconnect', () => {
            console.log('Socket disconnected');
            setConnected(false);
        });

        socketRef.current = socket;
    }, []);

    const emit = useCallback((event: string, data?: any) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit(event, data);
        } else {
            console.warn(`Socket not connected. Cannot emit: ${event}`);
        }
    }, []);

    const on = useCallback((event: string, callback: (...args: any[]) => void) => {
        socketRef.current?.on(event, callback);
        return () => {
            socketRef.current?.off(event, callback);
        };
    }, []);

    useEffect(() => {
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, []);

    const value = {
        socket: socketRef.current,
        connected,
        emit,
        on,
        connect
    };

    return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) throw new Error('useSocket must be used within a SocketProvider');
    return context;
};
