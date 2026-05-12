import { db } from '../db';
import { problems } from '@arena/database';
import { eq } from 'drizzle-orm';

async function check() {
    const p = await db.select().from(problems).where(eq(problems.slug, 'task-scheduler-ii')).limit(1);
    console.log(JSON.stringify(p, null, 2));
    process.exit(0);
}

check();
