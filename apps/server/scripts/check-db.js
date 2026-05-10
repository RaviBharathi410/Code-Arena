const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');
const crypto = require('crypto');

const dbPath = path.resolve(__dirname, '../../../sqlite.db');
console.log('DB path:', dbPath);

const db = new Database(dbPath);

// Check tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('\nTables:', tables.map(t => t.name));

// Check users
const users = db.prepare('SELECT id, username, email FROM users').all();
console.log('\nExisting users:', JSON.stringify(users, null, 2));

// Check refresh_tokens
try {
    const cols = db.prepare('PRAGMA table_info(refresh_tokens)').all();
    console.log('\nrefresh_tokens columns:', cols.map(c => c.name));
    const count = db.prepare('SELECT COUNT(*) as n FROM refresh_tokens').get();
    console.log('refresh_tokens row count:', count.n);
} catch (e) {
    console.log('refresh_tokens ERROR:', e.message);
}

db.close();
