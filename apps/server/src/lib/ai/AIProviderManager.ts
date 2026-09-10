import { env } from '../../config/env';
import { logger } from '../logger';
import { AIProvider, AICapability, AIServiceResult, AICompletionOptions } from './types';
import { GeminiProvider } from './providers/GeminiProvider';
import { GroqProvider } from './providers/GroqProvider';
import { OpenRouterProvider } from './providers/OpenRouterProvider';
import { CerebrasProvider } from './providers/CerebrasProvider';

export class AIProviderManager {
    private providers: Map<string, AIProvider> = new Map();
    private primaryProviderName: string;

    constructor() {
        this.primaryProviderName = env.AI_PRIMARY_PROVIDER || process.env.AI_PRIMARY_PROVIDER || 'gemini';
        this.registerProviders();
    }

    private clean(key?: string): string {
        if (!key) return '';
        return key.trim().replace(/^["']|["']$/g, '').trim();
    }

    private registerProviders() {
        const geminiKey = this.clean(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY);
        const groqKey = this.clean(env.GROQ_API_KEY || process.env.GROQ_API_KEY);
        const openrouterKey = this.clean(env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY);
        const cerebrasKey = this.clean(env.CEREBRAS_API_KEY || process.env.CEREBRAS_API_KEY);
        const geminiModel = env.GEMINI_MODEL || process.env.GEMINI_MODEL || 'gemini-1.5-flash';

        const gemini = new GeminiProvider(geminiKey, geminiModel);
        const groq = new GroqProvider(groqKey);
        const openrouter = new OpenRouterProvider(openrouterKey);
        const cerebras = new CerebrasProvider(cerebrasKey);

        if (gemini.isAvailable()) this.providers.set(gemini.name, gemini);
        if (groq.isAvailable()) this.providers.set(groq.name, groq);
        if (openrouter.isAvailable()) this.providers.set(openrouter.name, openrouter);
        if (cerebras.isAvailable()) this.providers.set(cerebras.name, cerebras);

        logger.info({
            activeProviders: Array.from(this.providers.keys()),
            primaryProvider: this.primaryProviderName,
        }, '[AI_MANAGER] Registered available AI providers');
    }

    public reloadProviders(): void {
        this.providers.clear();
        this.registerProviders();
    }

    isAvailable(): boolean {
        if (this.providers.size === 0) {
            this.registerProviders();
        }
        return this.providers.size > 0;
    }

    getAvailableProviders(): string[] {
        if (this.providers.size === 0) {
            this.registerProviders();
        }
        return Array.from(this.providers.keys());
    }

    async executeCapability<T = string>(
        capability: AICapability,
        executor: (provider: AIProvider) => Promise<T>
    ): Promise<AIServiceResult<T>> {
        const candidates = this.getCandidateProviders(capability);

        if (candidates.length === 0) {
            throw new Error(`[AI_NO_CAPABLE_PROVIDER] No active AI provider supports capability '${capability}'`);
        }

        let lastError: any = null;
        for (const provider of candidates) {
            try {
                logger.info({ provider: provider.name, capability }, '[AI_MANAGER] Routing AI request');
                const result = await executor(provider);
                return {
                    providerName: provider.name,
                    data: result,
                };
            } catch (err: any) {
                lastError = err;
                logger.warn({ provider: provider.name, error: err?.message }, '[AI_MANAGER] Provider failed, attempting fallback');
            }
        }

        throw new Error(`[AI_ALL_PROVIDERS_FAILED] All providers for ${capability} failed. Last error: ${lastError?.message}`);
    }

    private getCandidateProviders(capability: AICapability): AIProvider[] {
        const matching: AIProvider[] = [];
        for (const provider of this.providers.values()) {
            if (provider.capabilities.has(capability) && provider.isAvailable()) {
                matching.push(provider);
            }
        }

        // Sort so primary provider is tried first
        matching.sort((a, b) => {
            if (a.name === this.primaryProviderName) return -1;
            if (b.name === this.primaryProviderName) return 1;
            return 0;
        });

        return matching;
    }
}

export const aiProviderManager = new AIProviderManager();
