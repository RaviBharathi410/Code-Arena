import { db } from './db/client';
import { refreshTokens } from '@arena/database';

async function checkTokens() {
    try {
        const tokens = await db.select().from(refreshTokens);
        console.log('--- Active Refresh Tokens ---');
        console.table(tokens);
        process.exit(0);
    } catch (err) {
        console.error('Error checking tokens:', err);
        process.exit(1);
    }
}

checkTokens();
