import { AIProvider, AICapability, AICompletionOptions } from '../types';

export class OpenRouterProvider implements AIProvider {
    name = 'openrouter';
    capabilities = new Set<AICapability>([
        AICapability.TEXT_GEN,
        AICapability.CODE_GEN,
    ]);

    private apiKey: string;
    private baseUrl = 'https://openrouter.ai/api/v1/chat/completions';

    constructor(apiKey: string) {
        this.apiKey = apiKey ? apiKey.trim().replace(/^["']|["']$/g, '').trim() : '';
    }

    isAvailable(): boolean {
        return Boolean(this.apiKey && this.apiKey.length > 0);
    }

    async generateText(options: AICompletionOptions): Promise<string> {
        return this.callOpenRouter(options);
    }

    async generateCode(options: AICompletionOptions): Promise<string> {
        return this.callOpenRouter(options);
    }

    private async callOpenRouter(options: AICompletionOptions): Promise<string> {
        if (!this.isAvailable()) throw new Error('[OPENROUTER_UNAVAILABLE] API key missing');

        const messages = [];
        if (options.systemPrompt) {
            messages.push({ role: 'system', content: options.systemPrompt });
        }
        messages.push({ role: 'user', content: options.prompt });

        const response = await fetch(this.baseUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://codearena.dev',
                'X-Title': 'CodeArena',
            },
            body: JSON.stringify({
                model: 'deepseek/deepseek-r1:free',
                messages,
                temperature: options.temperature ?? 0.2,
                max_tokens: options.maxTokens ?? 2048,
            }),
        });

        if (!response.ok) {
            const errText = await response.text().catch(() => '');
            throw new Error(`[OPENROUTER_API_ERROR] (${response.status}): ${errText}`);
        }

        const data: any = await response.json();
        return data?.choices?.[0]?.message?.content || '';
    }
}
