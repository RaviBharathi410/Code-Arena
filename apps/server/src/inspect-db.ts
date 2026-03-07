import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), '../../sqlite2.db');
const db = new Database(dbPath);

console.log('Columns in "problems" table:');
const info = db.prepare('PRAGMA table_info(problems)').all();
console.table(info);
