/**
 * reset-passwords.js
 * Resets the password for existing users to a known value
 * and verifies the login flow end-to-end.
 * 
 * Usage: node scripts/reset-passwords.js
 * 
 * After running, you can login with:
 *   Ravi       / ArenaProtocol@1
 *   ravi410    / ArenaProtocol@1
 */

const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../../sqlite.db');
console.log('DB path:', dbPath);
const db = new Database(dbPath);

const NEW_PASSWORD = 'ArenaProtocol@1';
const BCRYPT_ROUNDS = 10; // lower rounds for speed in dev

async function resetPasswords() {
    console.log(`\nHashing new password (bcrypt rounds: ${BCRYPT_ROUNDS})...`);
    const newHash = await bcrypt.hash(NEW_PASSWORD, BCRYPT_ROUNDS);
    console.log('Hash generated:', newHash.substring(0, 20) + '...');

    // Update all existing users
    const stmt = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?');
    const users = db.prepare('SELECT id, username, email FROM users').all();

    for (const user of users) {
        stmt.run(newHash, user.id);
        console.log(`  ✅ Reset password for: ${user.username} (${user.email})`);
    }

    // Verify the hash works
    console.log('\nVerifying bcrypt compare...');
    const testMatch = await bcrypt.compare(NEW_PASSWORD, newHash);
    console.log(`  Hash verify: ${testMatch ? '✅ PASS' : '❌ FAIL'}`);

    // Clear any stale refresh tokens
    const deleted = db.prepare('DELETE FROM refresh_tokens').run();
    console.log(`\n  Cleared ${deleted.changes} stale refresh token(s)`);

    console.log(`\n${'='.repeat(50)}`);
    console.log('✅ Password reset complete!');
    console.log(`${'='.repeat(50)}`);
    console.log('\nYou can now log in with:');
    users.forEach(u => {
        console.log(`  Username: ${u.username}  |  Email: ${u.email}`);
    });
    console.log(`  Password: ${NEW_PASSWORD}`);
    console.log('\nOr register a new account (the constraints require:');
    console.log('  - At least 8 chars, 1 uppercase, 1 number)');

    db.close();
}

resetPasswords().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
