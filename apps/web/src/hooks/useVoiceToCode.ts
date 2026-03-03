import { useState, useCallback } from 'react';

export const useVoiceToCode = (onTranscript: (code: string) => void) => {
    const [isListening, setIsListening] = useState(false);

    const startListening = useCallback(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Speech Recognition not supported in this browser.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript.toLowerCase();
            console.log('Transcript:', transcript);

            // Enhanced parser logic
            let generatedCode = '';
            if (transcript.includes('create function')) {
                const name = transcript.replace('create function', '').replace('called', '').trim().replace(/\s+/g, '_');
                generatedCode = `function ${name || 'myFunction'}() {\n  \n}`;
            } else if (transcript.includes('create variable')) {
                const name = transcript.replace('create variable', '').replace('called', '').trim().replace(/\s+/g, '_');
                generatedCode = `const ${name || 'myVar'} = '';`;
            } else if (transcript.includes('console log')) {
                const msg = transcript.replace('console log', '').trim();
                generatedCode = `console.log('${msg}');`;
            } else if (transcript.includes('add comment')) {
                const comment = transcript.replace('add comment', '').trim();
                generatedCode = `// ${comment}`;
            } else if (transcript.includes('create if statement')) {
                const condition = transcript.replace('create if statement', '').trim() || 'true';
                generatedCode = `if (${condition}) {\n  \n}`;
            } else if (transcript.includes('create for loop')) {
                generatedCode = `for (let i = 0; i < 10; i++) {\n  \n}`;
            } else if (transcript.includes('clear arena') || transcript.includes('clear code')) {
                onTranscript('__CLEAR__');
                return;
            }

            if (generatedCode) {
                onTranscript(generatedCode);
            }
        };

        recognition.start();
    }, [onTranscript]);

    return { isListening, startListening };
};
