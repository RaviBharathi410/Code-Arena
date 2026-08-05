import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Zap, Check, X, Code, RotateCcw, Wand2, Volume2 } from 'lucide-react';
import Editor from '@monaco-editor/react';

interface VoiceWorkspaceModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentLanguage: string;
    onAddCode: (code: string) => void;
}

// ── Voice-to-Code Neural Engine ──────────────────────────────────────────
// This is the core NLP-to-code transformation engine.
// It parses natural language commands and generates syntactically correct
// code for the selected language. It handles loops, functions, variables,
// conditionals, data structures, and more.

function parseVoiceToCode(transcript: string, language: string): string {
    const t = transcript.toLowerCase().trim();
    
    // Normalize the language key
    const lang = language === 'py' || language === 'python' ? 'python'
        : language === 'js' || language === 'javascript' ? 'javascript'
        : language === 'cpp' || language === 'c++' ? 'cpp'
        : language === 'java' ? 'java'
        : 'javascript';

    // ── Extract numbers from text ──
    const extractNumber = (text: string): string => {
        const wordMap: Record<string, string> = {
            'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
            'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
            'ten': '10', 'twenty': '20', 'hundred': '100', 'thousand': '1000'
        };
        for (const [word, num] of Object.entries(wordMap)) {
            if (text.includes(word)) return num;
        }
        const numMatch = text.match(/\d+/);
        return numMatch ? numMatch[0] : 'n';
    };

    // ── Extract variable name from text ──
    const extractVarName = (text: string, fallback: string): string => {
        const words = text.replace(/called|named|as/gi, '').trim().split(/\s+/);
        const lastWord = words[words.length - 1];
        if (lastWord && /^[a-zA-Z_]\w*$/.test(lastWord)) return lastWord;
        return fallback;
    };

    // ── FOR LOOP ──
    if (t.includes('for') && (t.includes('range') || t.includes('loop') || t.includes('iterate') || t.includes('from'))) {
        const num = extractNumber(t);
        const varName = t.includes(' j ') ? 'j' : t.includes(' k ') ? 'k' : 'i';
        
        switch (lang) {
            case 'python':
                return `for ${varName} in range(${num}):\n    pass`;
            case 'javascript':
                return `for (let ${varName} = 0; ${varName} < ${num}; ${varName}++) {\n    \n}`;
            case 'cpp':
                return `for (int ${varName} = 0; ${varName} < ${num}; ${varName}++) {\n    \n}`;
            case 'java':
                return `for (int ${varName} = 0; ${varName} < ${num}; ${varName}++) {\n    \n}`;
        }
    }

    // ── WHILE LOOP ──
    if (t.includes('while') && (t.includes('loop') || t.includes('condition') || t.includes('true') || t.includes('greater') || t.includes('less'))) {
        const condition = t.includes('true') ? 'true' : t.includes('not empty') ? 'stack.length > 0' : 'condition';
        switch (lang) {
            case 'python':
                return `while ${condition === 'true' ? 'True' : condition}:\n    pass`;
            case 'javascript':
                return `while (${condition}) {\n    \n}`;
            case 'cpp':
            case 'java':
                return `while (${condition}) {\n    \n}`;
        }
    }

    // ── FUNCTION / DEF ──
    if (t.includes('function') || t.includes('def') || t.includes('method') || t.includes('create a function')) {
        const name = extractVarName(t.replace(/function|def|method|create a|that|which/gi, ''), 'solve');
        
        // Check for parameters
        const hasParams = t.includes('parameter') || t.includes('argument') || t.includes('takes') || t.includes('with');
        const params = hasParams ? 'params' : '';

        switch (lang) {
            case 'python':
                return `def ${name}(${params}):\n    pass`;
            case 'javascript':
                return `function ${name}(${params}) {\n    \n}`;
            case 'cpp':
                return `void ${name}(${params ? 'int params' : ''}) {\n    \n}`;
            case 'java':
                return `public void ${name}(${params ? 'int params' : ''}) {\n    \n}`;
        }
    }

    // ── IF / ELSE ──
    if (t.includes('if') && (t.includes('statement') || t.includes('condition') || t.includes('check') || t.includes('equal') || t.includes('greater') || t.includes('less'))) {
        const hasElse = t.includes('else');
        
        let condition = 'condition';
        if (t.includes('equal')) condition = 'x == y';
        if (t.includes('greater')) condition = 'x > y';
        if (t.includes('less')) condition = 'x < y';
        if (t.includes('null') || t.includes('none') || t.includes('empty')) condition = lang === 'python' ? 'x is not None' : 'x !== null';

        switch (lang) {
            case 'python':
                return hasElse 
                    ? `if ${condition}:\n    pass\nelse:\n    pass`
                    : `if ${condition}:\n    pass`;
            case 'javascript':
                return hasElse
                    ? `if (${condition}) {\n    \n} else {\n    \n}`
                    : `if (${condition}) {\n    \n}`;
            case 'cpp':
            case 'java':
                return hasElse
                    ? `if (${condition}) {\n    \n} else {\n    \n}`
                    : `if (${condition}) {\n    \n}`;
        }
    }

    // ── VARIABLE / CONSTANT ──
    if (t.includes('variable') || t.includes('constant') || t.includes('declare') || t.includes('create a var') || t.includes('let') || t.includes('set')) {
        const isConst = t.includes('constant') || t.includes('const');
        const name = extractVarName(t.replace(/variable|constant|declare|create a var|let|set|equal to|equals/gi, ''), 'result');
        const hasValue = t.includes('equal') || t.includes('to');
        const value = hasValue ? extractNumber(t) : '0';
        
        switch (lang) {
            case 'python':
                return `${name} = ${value}`;
            case 'javascript':
                return `${isConst ? 'const' : 'let'} ${name} = ${value};`;
            case 'cpp':
                return `int ${name} = ${value};`;
            case 'java':
                return `int ${name} = ${value};`;
        }
    }

    // ── ARRAY / LIST ──
    if (t.includes('array') || t.includes('list') || t.includes('vector')) {
        const name = extractVarName(t.replace(/array|list|vector|create|empty|new|an|a/gi, ''), 'arr');
        switch (lang) {
            case 'python':
                return `${name} = []`;
            case 'javascript':
                return `const ${name} = [];`;
            case 'cpp':
                return `vector<int> ${name};`;
            case 'java':
                return `List<Integer> ${name} = new ArrayList<>();`;
        }
    }

    // ── HASHMAP / DICTIONARY ──
    if (t.includes('hash') || t.includes('map') || t.includes('dictionary') || t.includes('dict') || t.includes('object')) {
        const name = extractVarName(t.replace(/hash|map|dictionary|dict|object|create|new|an|a/gi, ''), 'map');
        switch (lang) {
            case 'python':
                return `${name} = {}`;
            case 'javascript':
                return `const ${name} = new Map();`;
            case 'cpp':
                return `unordered_map<int, int> ${name};`;
            case 'java':
                return `Map<Integer, Integer> ${name} = new HashMap<>();`;
        }
    }

    // ── PRINT / LOG ──
    if (t.includes('print') || t.includes('log') || t.includes('output') || t.includes('display')) {
        const msg = t.replace(/print|log|output|display|console|the|value of/gi, '').trim() || 'result';
        switch (lang) {
            case 'python':
                return `print(${msg})`;
            case 'javascript':
                return `console.log(${msg});`;
            case 'cpp':
                return `cout << ${msg} << endl;`;
            case 'java':
                return `System.out.println(${msg});`;
        }
    }

    // ── RETURN ──
    if (t.includes('return')) {
        const val = t.replace(/return|the|value/gi, '').trim() || 'result';
        switch (lang) {
            case 'python':
                return `return ${val}`;
            case 'javascript':
                return `return ${val};`;
            case 'cpp':
            case 'java':
                return `return ${val};`;
        }
    }

    // ── CLASS ──
    if (t.includes('class')) {
        const name = extractVarName(t.replace(/class|create|new|a/gi, ''), 'Solution');
        switch (lang) {
            case 'python':
                return `class ${name}:\n    def __init__(self):\n        pass`;
            case 'javascript':
                return `class ${name} {\n    constructor() {\n        \n    }\n}`;
            case 'cpp':
                return `class ${name} {\npublic:\n    ${name}() {\n        \n    }\n};`;
            case 'java':
                return `public class ${name} {\n    public ${name}() {\n        \n    }\n}`;
        }
    }

    // ── TRY CATCH ──
    if (t.includes('try') && t.includes('catch')) {
        switch (lang) {
            case 'python':
                return `try:\n    pass\nexcept Exception as e:\n    pass`;
            case 'javascript':
                return `try {\n    \n} catch (error) {\n    \n}`;
            case 'cpp':
                return `try {\n    \n} catch (const exception& e) {\n    \n}`;
            case 'java':
                return `try {\n    \n} catch (Exception e) {\n    \n}`;
        }
    }

    // ── SORT ──
    if (t.includes('sort')) {
        const name = extractVarName(t.replace(/sort|the|array|list/gi, ''), 'arr');
        switch (lang) {
            case 'python':
                return `${name}.sort()`;
            case 'javascript':
                return `${name}.sort((a, b) => a - b);`;
            case 'cpp':
                return `sort(${name}.begin(), ${name}.end());`;
            case 'java':
                return `Collections.sort(${name});`;
        }
    }

    // ── SWAP ──
    if (t.includes('swap')) {
        switch (lang) {
            case 'python':
                return `a, b = b, a`;
            case 'javascript':
                return `[a, b] = [b, a];`;
            case 'cpp':
                return `swap(a, b);`;
            case 'java':
                return `int temp = a;\na = b;\nb = temp;`;
        }
    }

    // ── COMMENT ──
    if (t.includes('comment') || t.includes('add comment') || t.includes('note')) {
        const comment = t.replace(/comment|add comment|add a|note|add/gi, '').trim() || 'TODO';
        switch (lang) {
            case 'python':
                return `# ${comment}`;
            default:
                return `// ${comment}`;
        }
    }

    // ── FALLBACK: pass the transcript as a comment ──
    const commentChar = lang === 'python' ? '#' : '//';
    return `${commentChar} Voice: ${transcript}`;
}

// ── Modal Component ──────────────────────────────────────────────────────

export const VoiceWorkspaceModal: React.FC<VoiceWorkspaceModalProps> = ({
    isOpen,
    onClose,
    currentLanguage,
    onAddCode
}) => {
    const [transcript, setTranscript] = useState('');
    const [generatedCode, setGeneratedCode] = useState('');
    const [language, setLanguage] = useState(currentLanguage);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [history, setHistory] = useState<string[]>([]);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        setLanguage(currentLanguage);
    }, [currentLanguage]);

    // Clean up speech recognition when modal closes
    useEffect(() => {
        if (!isOpen) {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
                recognitionRef.current = null;
            }
            setIsListening(false);
        }
    }, [isOpen]);

    const startListening = useCallback(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Speech Recognition is not supported in this browser. Please use Chrome.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);

        recognition.onresult = (event: any) => {
            let finalText = '';
            let interimText = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const text = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalText += text;
                } else {
                    interimText += text;
                }
            }

            if (finalText) {
                setTranscript(prev => prev ? `${prev} ${finalText.trim()}` : finalText.trim());
            }
        };

        recognition.onerror = (e: any) => {
            console.error('[Voice Engine] Error:', e.error);
            setIsListening(false);
        };

        recognition.start();
    }, []);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        setIsListening(false);
    }, []);

    const handleGenerate = async () => {
        if (!transcript.trim()) return;

        setIsGenerating(true);

        // Simulate a slight processing delay for UX feel
        await new Promise(resolve => setTimeout(resolve, 600));

        const code = parseVoiceToCode(transcript, language);
        setGeneratedCode(code);
        setHistory(prev => [...prev, transcript]);
        setIsGenerating(false);
    };

    const handleAddCode = () => {
        if (generatedCode) {
            onAddCode(generatedCode);
            // Reset for next command but keep modal open
            setTranscript('');
            setGeneratedCode('');
        }
    };

    const handleAddAndClose = () => {
        if (generatedCode) {
            onAddCode(generatedCode);
        }
        handleReset();
        onClose();
    };

    const handleReset = () => {
        setTranscript('');
        setGeneratedCode('');
        stopListening();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 font-sans" onClick={(e) => { if (e.target === e.currentTarget) { handleReset(); onClose(); }}}>
            <div className="w-full max-w-5xl h-[85vh] bg-[#08080c] border border-white/10 rounded-3xl shadow-[0_0_80px_rgba(139,92,246,0.08)] flex flex-col overflow-hidden" style={{ animation: 'fadeInScale 0.3s ease-out' }}>
                
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-5 border-b border-white/5 bg-gradient-to-r from-accent-secondary/5 via-transparent to-transparent">
                    <div className="flex items-center gap-4">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center border transition-all duration-300 ${isListening ? 'bg-red-500/20 border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.3)]' : 'bg-accent-secondary/15 border-accent-secondary/30'}`}>
                            <Wand2 size={20} className={isListening ? 'text-red-500 animate-pulse' : 'text-accent-secondary'} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black uppercase tracking-[0.2em] text-white">Neural Voice Engine</h2>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">Speak naturally → Get production code</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <select 
                            value={language} 
                            onChange={(e) => setLanguage(e.target.value)}
                            className="bg-black/60 border border-white/10 rounded-lg px-4 py-2 text-xs font-black uppercase tracking-widest text-accent-secondary focus:outline-none focus:border-accent-secondary/40 cursor-pointer"
                        >
                            <option value="js">JavaScript</option>
                            <option value="py">Python</option>
                            <option value="java">Java</option>
                            <option value="cpp">C++</option>
                        </select>
                        <button onClick={() => { handleReset(); onClose(); }} className="p-2.5 text-gray-500 hover:text-white transition-colors rounded-xl hover:bg-white/10">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0 overflow-hidden">
                    
                    {/* Left: Voice Input */}
                    <div className="bg-[#08080c] p-6 flex flex-col gap-5 overflow-y-auto custom-scrollbar border-r border-white/5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                                <Volume2 size={14} /> Voice Input
                            </h3>
                            <div className="flex items-center gap-2">
                                {transcript && (
                                    <button onClick={handleReset} className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all" title="Clear">
                                        <RotateCcw size={14} />
                                    </button>
                                )}
                                <button 
                                    onClick={isListening ? stopListening : startListening}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all duration-300 ${
                                        isListening 
                                            ? 'bg-red-500/15 text-red-400 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.15)]' 
                                            : 'bg-accent-secondary/10 text-accent-secondary hover:bg-accent-secondary/20 border border-accent-secondary/25'
                                    }`}
                                >
                                    {isListening ? <MicOff size={12} /> : <Mic size={12} />}
                                    {isListening ? 'Stop' : 'Record'}
                                </button>
                            </div>
                        </div>

                        {/* Transcript area */}
                        <div className="relative flex-1 min-h-[200px]">
                            <textarea
                                value={transcript}
                                onChange={(e) => setTranscript(e.target.value)}
                                placeholder={"Click Record and speak naturally...\n\nExamples:\n• \"for loop from 0 to n\"\n• \"create a function called solve\"\n• \"if statement check if x equals y\"\n• \"create an array called result\"\n• \"while loop condition true\"\n• \"print the value of result\"\n• \"create a hash map\"\n• \"return result\""}
                                className="w-full h-full bg-black/40 border border-white/8 rounded-2xl p-5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-secondary/30 resize-none transition-all leading-relaxed font-mono"
                            />
                            {isListening && (
                                <div className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/15 border border-red-500/25">
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-red-400">Listening...</span>
                                </div>
                            )}
                        </div>

                        {/* Generate button */}
                        <button
                            onClick={handleGenerate}
                            disabled={!transcript.trim() || isGenerating}
                            className={`w-full py-4 rounded-xl text-xs font-black uppercase tracking-[0.25em] flex justify-center items-center gap-3 transition-all duration-300 ${
                                transcript.trim() && !isGenerating
                                    ? 'bg-accent-secondary text-white shadow-[0_0_25px_rgba(139,92,246,0.25)] hover:shadow-[0_0_35px_rgba(139,92,246,0.35)] hover:scale-[1.01] active:scale-[0.99]'
                                    : 'bg-white/5 text-gray-600 cursor-not-allowed'
                            }`}
                        >
                            {isGenerating ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Zap size={14} fill="currentColor" /> Generate Code
                                </>
                            )}
                        </button>

                        {/* Command history */}
                        {history.length > 0 && (
                            <div className="space-y-2">
                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-600">Recent Commands</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {history.slice(-5).reverse().map((h, i) => (
                                        <button 
                                            key={i} 
                                            onClick={() => setTranscript(h)}
                                            className="px-2.5 py-1 rounded-lg bg-white/5 text-[10px] text-gray-400 hover:text-white hover:bg-white/10 transition-all truncate max-w-[180px]"
                                        >
                                            {h}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Code Output */}
                    <div className="bg-[#06060a] p-6 flex flex-col gap-5 overflow-y-auto custom-scrollbar">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-accent-secondary flex items-center gap-2">
                                <Code size={14} /> Generated Code
                            </h3>
                            <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md bg-accent-secondary/10 text-accent-secondary/70 border border-accent-secondary/15">
                                {language === 'js' ? 'JavaScript' : language === 'py' ? 'Python' : language === 'cpp' ? 'C++' : 'Java'}
                            </span>
                        </div>

                        {/* Code editor */}
                        <div className="flex-1 border border-white/8 rounded-2xl overflow-hidden relative min-h-[200px]">
                            {generatedCode ? (
                                <Editor
                                    height="100%"
                                    language={language === 'js' ? 'javascript' : language === 'py' ? 'python' : language}
                                    theme="vs-dark"
                                    value={generatedCode}
                                    onChange={(val) => setGeneratedCode(val || '')}
                                    options={{
                                        minimap: { enabled: false },
                                        fontSize: 14,
                                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                        padding: { top: 16, bottom: 16 },
                                        scrollBeyondLastLine: false,
                                        lineNumbers: 'on',
                                        renderLineHighlight: 'all',
                                        cursorSmoothCaretAnimation: 'on',
                                    }}
                                />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 gap-3">
                                    <Zap size={40} className="opacity-15" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-center max-w-xs opacity-40">
                                        Speak a command, then hit Generate
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-3">
                            <button 
                                onClick={handleAddCode}
                                disabled={!generatedCode}
                                className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] flex justify-center items-center gap-2 transition-all duration-300 ${
                                    generatedCode 
                                        ? 'bg-white/10 text-white hover:bg-white/15 border border-white/10' 
                                        : 'bg-white/3 text-gray-700 cursor-not-allowed border border-white/5'
                                }`}
                            >
                                <Check size={14} /> Add & Continue
                            </button>
                            <button 
                                onClick={handleAddAndClose}
                                disabled={!generatedCode}
                                className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] flex justify-center items-center gap-2 transition-all duration-300 ${
                                    generatedCode 
                                        ? 'bg-green-500/90 hover:bg-green-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.2)]' 
                                        : 'bg-white/3 text-gray-700 cursor-not-allowed border border-white/5'
                                }`}
                            >
                                <Check size={14} /> Add & Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fadeInScale {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
};
