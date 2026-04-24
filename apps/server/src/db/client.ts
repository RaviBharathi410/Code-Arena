import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '@arena/database';
import { env } from '../config/env';
import path from 'path';

// Use the path relative to the server directory
const dbPath = path.resolve(__dirname, '../../', env.DATABASE_URL);
const sqlite = new Database(dbPath);

export const db = drizzle(sqlite, { schema });
