import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '@arena/database';
import path from 'path';

// Load DB from root directory
const dbPath = path.resolve(process.cwd(), '../../sqlite2.db');
const sqlite = new Database(dbPath);

export const db = drizzle(sqlite, { schema });
