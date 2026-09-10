import { useState, useCallback, useRef } from 'react';

export const useVoiceToCode = (onTranscript: (code: string) => void) => {
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    }, []);

    const startListening = useCallback(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Speech Recognition not supported in this browser.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = true; // Keep listening for multiple commands
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);

        recognition.onresult = (event: any) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript.toLowerCase();
                }
            }

            if (!finalTranscript) return;

            console.log('Final Transcript:', finalTranscript);

            // Enhanced tactical parser
            let generatedCode = '';
            if (finalTranscript.includes('create function')) {
                const name = finalTranscript.replace('create function', '').replace('called', '').trim().replace(/\s+/g, '_');
                generatedCode = `function ${name || 'myFunction'}() {\n  \n}`;
            } else if (finalTranscript.includes('create variable')) {
                const name = finalTranscript.replace('create variable', '').replace('called', '').trim().replace(/\s+/g, '_');
                generatedCode = `const ${name || 'myVar'} = '';`;
            } else if (finalTranscript.includes('console log')) {
                const msg = finalTranscript.replace('console log', '').trim();
                generatedCode = `console.log('${msg}');`;
            } else if (finalTranscript.includes('add comment')) {
                const comment = finalTranscript.replace('add comment', '').trim();
                generatedCode = `// ${comment}`;
            } else if (finalTranscript.includes('if statement')) {
                generatedCode = `if (condition) {\n  \n}`;
            } else if (finalTranscript.includes('for loop')) {
                generatedCode = `for (let i = 0; i < n; i++) {\n  \n}`;
            } else if (finalTranscript.includes('clear arena') || finalTranscript.includes('clear code')) {
                onTranscript('__CLEAR__');
                return;
            }

            if (generatedCode) {
                onTranscript(generatedCode);
            }
        };

        recognition.start();
    }, [onTranscript]);

    return { isListening, startListening, stopListening };
};
