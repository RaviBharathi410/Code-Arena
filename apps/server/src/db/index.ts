import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '@arena/database';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const dbPath = path.join(__dirname, '../../sqlite.db');
const sqlite = new Database(dbPath);

export const db = drizzle(sqlite, { schema });
