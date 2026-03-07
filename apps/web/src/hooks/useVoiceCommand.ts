import { useState, useEffect, useCallback, useRef } from 'react';

interface VoiceCommandOptions {
    commands: Record<string, () => void>;
    onInterimResults?: (text: string) => void;
    autoStart?: boolean;
}

export const useVoiceCommand = ({ commands, onInterimResults, autoStart = false }: VoiceCommandOptions) => {
    const [isListening, setIsListening] = useState(false);
    const isListeningRef = useRef(false);
    const recognitionRef = useRef<any>(null);
    const commandsRef = useRef(commands);
    const onInterimResultsRef = useRef(onInterimResults);

    // Keep refs up to date
    useEffect(() => {
        commandsRef.current = commands;
    }, [commands]);

    useEffect(() => {
        onInterimResultsRef.current = onInterimResults;
    }, [onInterimResults]);

    const startListening = useCallback(() => {
        if (!recognitionRef.current) return;
        try {
            isListeningRef.current = true;
            setIsListening(true);
            recognitionRef.current.start();
        } catch (e: any) {
            if (e.name === 'InvalidStateError') {
                // Already started, ignore
            } else {
                console.error('Speech recognition error:', e);
            }
        }
    }, [setIsListening]);

    const stopListening = useCallback(() => {
        if (!recognitionRef.current) return;
        isListeningRef.current = false;
        setIsListening(false);
        recognitionRef.current.stop();
    }, [setIsListening]);

    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
            console.warn('Speech Recognition API not supported in this browser.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            if (onInterimResultsRef.current) onInterimResultsRef.current(interimTranscript);

            if (finalTranscript) {
                const lowerTranscript = finalTranscript.toLowerCase().trim();
                console.log('Voice Command Received:', lowerTranscript);

                // Check for commands
                Object.entries(commandsRef.current).forEach(([command, action]) => {
                    if (lowerTranscript.includes(command.toLowerCase())) {
                        console.log('Executing match for command:', command);
                        action();
                    }
                });
            }
        };

        recognition.onend = () => {
            // Restart if we are still supposed to be listening
            if (isListeningRef.current) {
                try {
                    recognition.start();
                } catch (e: any) {
                    if (e.name !== 'InvalidStateError') {
                        console.error('Auto-restart failed:', e);
                    }
                }
            }
        };

        recognitionRef.current = recognition;

        if (autoStart) {
            startListening();
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.onend = null;
                recognitionRef.current.stop();
            }
        };
    }, [autoStart, startListening]);

    return {
        isListening,
        startListening,
        stopListening,
    };
};
