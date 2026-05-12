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
    const [socket, setSocket] = useState<Socket | null>(null);
    const [connected, setConnected] = useState(false);

    const { token } = useAuthStore();

    useEffect(() => {
        if (!token) {
            setConnected(false);
            setSocket(null);
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
        });

        setSocket(s);
 
        return () => {
            s.disconnect();
        };
    }, [token]);

    const connect = useCallback(() => {
        socket?.connect();
    }, [socket]);

    const emit = useCallback((event: string, data?: any) => {
        socket?.emit(event, data);
    }, [socket]);

    const on = useCallback((event: string, callback: (...args: any[]) => void) => {
        if (socket) {
            socket.on(event, callback);
        }
        
        return () => {
            socket?.off(event, callback);
        };
    }, [socket]);

    const value = {
        socket,
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
