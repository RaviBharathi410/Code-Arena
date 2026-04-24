import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../lib/api';

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

        socketRef.current = io(SOCKET_URL, {
            withCredentials: true,
            path: '/socket.io'
        });

        socketRef.current.on('connect', () => {
            setConnected(true);
        });

        socketRef.current.on('disconnect', () => {
            setConnected(false);
        });
    }, []);

    const emit = useCallback((event: string, data?: any) => {
        socketRef.current?.emit(event, data);
    }, []);

    const on = useCallback((event: string, callback: (...args: any[]) => void) => {
        // Queue the event registration if socket is not ready, or just attach it.
        // It's safer to attach it when the component renders.
        // If socketRef isn't initialized yet, this might attach late if we aren't careful.
        // For simplicity now, we assume connect() is called early.
        if (socketRef.current) {
            socketRef.current.on(event, callback);
        }
        
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
