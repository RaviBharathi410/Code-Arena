import { useEffect, useRef, useState, useCallback } from 'react';

export const useSocket = () => {
    const [connected, setConnected] = useState(false);
    const socketRef = useRef<null>(null);

    const connect = useCallback(() => {
        // Backend connectivity removed: keep UI stable in offline mode.
        setConnected(false);
    }, []);

    const disconnect = useCallback(() => {
        setConnected(false);
    }, []);

    const emit = useCallback((event: string, data?: any) => {
        void event;
        void data;
    }, []);

    const on = useCallback((event: string, callback: (...args: any[]) => void) => {
        void event;
        void callback;
        return () => {
            // no-op
        };
    }, []);

    useEffect(() => {
        return () => {
            // no-op
        };
    }, []);

    return {
        connected,
        connect,
        disconnect,
        emit,
        on,
        socket: socketRef.current
    };
};
