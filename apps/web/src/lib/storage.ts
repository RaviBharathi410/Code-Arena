class SafeSessionStorage {
    private static memoryStore: Record<string, string> = {};

    static getItem(key: string): string | null {
        // Keep logo shown flag in memory only so it resets on page refresh (F5)
        if (key === 'arena_logo_shown_fixed') {
            return this.memoryStore[key] || null;
        }
        try {
            return sessionStorage.getItem(key);
        } catch (e) {
            return this.memoryStore[key] || null;
        }
    }

    static setItem(key: string, value: string): void {
        if (key === 'arena_logo_shown_fixed') {
            this.memoryStore[key] = value;
            return;
        }
        try {
            sessionStorage.setItem(key, value);
        } catch (e) {
            this.memoryStore[key] = value;
        }
    }

    static removeItem(key: string): void {
        if (key === 'arena_logo_shown_fixed') {
            delete this.memoryStore[key];
            return;
        }
        try {
            sessionStorage.removeItem(key);
        } catch (e) {
            delete this.memoryStore[key];
        }
    }
}

export default SafeSessionStorage;
