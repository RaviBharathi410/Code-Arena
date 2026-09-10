import fs from 'fs';
import path from 'path';
import { LanguageConfig } from '../types';

export class LanguageRegistry {
  private languages: Map<string, LanguageConfig> = new Map();

  constructor(languagesDir?: string) {
    const dir = languagesDir || path.join(__dirname, '../../languages');
    this.loadLanguages(dir);
  }

  private loadLanguages(dir: string): void {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const fullPath = path.join(dir, file);
        const raw = fs.readFileSync(fullPath, 'utf8');
        const config = JSON.parse(raw) as LanguageConfig;
        this.languages.set(config.id, config);
      }
    }
  }

  public get(languageId: string): LanguageConfig | undefined {
    return this.languages.get(languageId);
  }

  public getAll(): LanguageConfig[] {
    return Array.from(this.languages.values());
  }

  public has(languageId: string): boolean {
    return this.languages.has(languageId);
  }
}
