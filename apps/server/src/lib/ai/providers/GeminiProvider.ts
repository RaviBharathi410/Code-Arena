import { AIProvider, AICapability, AICompletionOptions } from '../types';

export class GeminiProvider implements AIProvider {
    name = 'gemini';
    capabilities = new Set<AICapability>([
        AICapability.TEXT_GEN,
        AICapability.CODE_GEN,
        AICapability.VISION,
    ]);

    private apiKey: string;
    private primaryModel: string;

    constructor(apiKey: string, model = 'gemini-1.5-flash') {
        this.apiKey = apiKey ? apiKey.trim().replace(/^["']|["']$/g, '').trim() : '';
        this.primaryModel = model || 'gemini-1.5-flash';
    }

    isAvailable(): boolean {
        return Boolean(this.apiKey && this.apiKey.length > 0);
    }

    async generateText(options: AICompletionOptions): Promise<string> {
        return this.callGemini(options);
    }

    async generateCode(options: AICompletionOptions): Promise<string> {
        return this.callGemini(options);
    }

    async analyzeVision(imageBuffer: Buffer, prompt: string): Promise<string> {
        if (!this.isAvailable()) throw new Error('[GEMINI_UNAVAILABLE] API key missing');

        const base64Data = imageBuffer.toString('base64');
        const candidateModels = Array.from(new Set([
            this.primaryModel,
            'gemini-1.5-flash',
            'gemini-2.0-flash',
            'gemini-1.5-pro'
        ]));

        let lastErrorText = '';
        let lastStatus = 500;

        for (const model of candidateModels) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: prompt },
                                { inline_data: { mime_type: 'image/png', data: base64Data } }
                            ]
                        }]
                    })
                });

                if (response.ok) {
                    const data: any = await response.json();
                    return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                }

                lastStatus = response.status;
                lastErrorText = await response.text().catch(() => '');

                if (response.status === 404 || (response.status === 400 && lastErrorText.includes('models/'))) {
                    continue;
                }

                throw new Error(`[GEMINI_API_ERROR] Vision call failed (${response.status} on ${model}): ${lastErrorText}`);
            } catch (err: any) {
                if (err.message && err.message.includes('Vision call failed')) throw err;
                lastErrorText = err?.message || String(err);
            }
        }

        throw new Error(`[GEMINI_API_ERROR] Vision call failed (${lastStatus}): ${lastErrorText}`);
    }

    private async callGemini(options: AICompletionOptions): Promise<string> {
        if (!this.isAvailable()) throw new Error('[GEMINI_UNAVAILABLE] API key missing');

        const promptText = options.systemPrompt
            ? `${options.systemPrompt}\n\nUser Request: ${options.prompt}`
            : options.prompt;

        const candidateModels = Array.from(new Set([
            this.primaryModel,
            'gemini-1.5-flash',
            'gemini-2.0-flash',
            'gemini-1.5-pro'
        ]));

        let lastErrorText = '';
        let lastStatus = 500;

        for (const model of candidateModels) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: promptText }] }],
                        generationConfig: {
                            temperature: options.temperature ?? 0.2,
                            maxOutputTokens: options.maxTokens ?? 2048,
                        }
                    })
                });

                if (response.ok) {
                    const data: any = await response.json();
                    return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                }

                lastStatus = response.status;
                lastErrorText = await response.text().catch(() => '');

                // If model is not found or unsupported on this endpoint, try next candidate model
                if (response.status === 404 || (response.status === 400 && lastErrorText.includes('models/'))) {
                    continue;
                }

                // If authentication error or rate limit, fail immediately
                throw new Error(`[GEMINI_API_ERROR] (${response.status} on ${model}): ${lastErrorText}`);
            } catch (err: any) {
                if (err.message && err.message.includes('[GEMINI_API_ERROR]')) throw err;
                lastErrorText = err?.message || String(err);
            }
        }

        throw new Error(`[GEMINI_API_ERROR] (${lastStatus}): ${lastErrorText}`);
    }
}
