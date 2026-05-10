import { db } from './src/db';
import { problems } from '@arena/database';
import { sql } from 'drizzle-orm';

async function check() {
    try {
        const [totalCount] = await db.select({ value: sql<number>`count(*)` }).from(problems);
        console.log('TOTAL PROBLEMS IN DB:', totalCount.value);
        const data = await db.select().from(problems).limit(5);
        console.log('SAMPLE DATA:', JSON.stringify(data, null, 2));
        process.exit(0);
    } catch (err) {
        console.error('ERROR CHECKING DB:', err);
        process.exit(1);
    }
}

check();
