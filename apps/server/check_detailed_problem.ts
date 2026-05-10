import { db } from './src/db';
import { problems } from '@arena/database';

async function check() {
    try {
        const [p] = await db.select().from(problems).limit(1);
        console.log('PROBLEM:', p.title);
        console.log('EXAMPLES:', JSON.stringify(p.examples, null, 2));
        console.log('TEST CASES:', JSON.stringify(p.testCases, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
