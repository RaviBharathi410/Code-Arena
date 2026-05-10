/**
 * fix-db.js
 * 1. Verifies the password reset worked
 * 2. Clears stale refresh tokens safely (disabling FK constraints)
 * 3. Rebuilds the refresh_tokens table if the migration artifact is broken
 */

const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../../sqlite.db');
const db = new Database(dbPath);

const KNOWN_PASSWORD = 'ArenaProtocol@1';

async function fixDb() {
    // ── 1. Verify password reset worked ──────────────────────────────────────
    console.log('=== Step 1: Verify password hashes ===');
    const users = db.prepare('SELECT id, username, email, password_hash FROM users').all();
    for (const user of users) {
        const match = await bcrypt.compare(KNOWN_PASSWORD, user.password_hash);
        console.log(`  ${match ? '✅' : '❌'} ${user.username} (${user.email}) - hash match: ${match}`);
    }

    // ── 2. Check migration artifacts ─────────────────────────────────────────
    console.log('\n=== Step 2: Check DB state ===');
    const allTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('  Tables:', allTables.map(t => t.name));

    const allTriggers = db.prepare("SELECT name FROM sqlite_master WHERE type='trigger'").all();
    console.log('  Triggers:', allTriggers.map(t => t.name));

    // ── 3. Disable FK constraints and clear refresh_tokens ───────────────────
    console.log('\n=== Step 3: Clear stale refresh tokens ===');
    db.pragma('foreign_keys = OFF');
    try {
        const result = db.prepare('DELETE FROM refresh_tokens').run();
        console.log(`  ✅ Cleared ${result.changes} stale refresh token(s)`);
    } catch (e) {
        console.log('  ⚠️  Could not clear refresh_tokens:', e.message);
        
        // Nuclear option: drop and recreate the table
        console.log('  🔧 Attempting to recreate refresh_tokens table...');
        try {
            db.prepare('DROP TABLE IF EXISTS refresh_tokens').run();
            db.prepare(`
                CREATE TABLE refresh_tokens (
                    id TEXT PRIMARY KEY NOT NULL,
                    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    token_hash TEXT UNIQUE NOT NULL,
                    expires_at TEXT NOT NULL,
                    revoked_at TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            `).run();
            console.log('  ✅ refresh_tokens table recreated successfully');
        } catch (e2) {
            console.log('  ❌ Recreation failed:', e2.message);
        }
    }
    db.pragma('foreign_keys = ON');

    // ── 4. Final state summary ────────────────────────────────────────────────
    console.log('\n=== Step 4: Final DB state ===');
    const finalUsers = db.prepare('SELECT id, username, email FROM users').all();
    const tokenCount = db.prepare('SELECT COUNT(*) as n FROM refresh_tokens').get();
    console.log(`  Users: ${finalUsers.length}`);
    finalUsers.forEach(u => console.log(`    - ${u.username} (${u.email})`));
    console.log(`  Refresh tokens: ${tokenCount.n}`);

    console.log('\n' + '='.repeat(50));
    console.log('✅ DB fix complete! You can now log in with:');
    finalUsers.forEach(u => {
        console.log(`  • ${u.username}  |  ${u.email}`);
    });
    console.log(`  Password: ${KNOWN_PASSWORD}`);
    console.log('='.repeat(50));

    db.close();
}

fixDb().catch(err => {
    console.error('Fatal error:', err);
    db.close();
    process.exit(1);
});
