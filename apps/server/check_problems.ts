import { db } from './src/db';
import { problems } from '@arena/database';

async function check() {
    try {
        const allProblems = await db.select().from(problems);
        console.log('PROBLEMS IN DB:', allProblems.map(p => ({ 
            id: p.id, 
            title: p.title, 
            testCases: p.testCases ? 'PRESENT' : 'MISSING' 
        })));
        
        if (allProblems.length > 0) {
            console.log('SAMPLE TEST CASES (First Problem):', JSON.stringify(allProblems[0].testCases, null, 2));
        }

        process.exit(0);
    } catch (err) {
        console.error('ERROR CHECKING DATA:', err);
        process.exit(1);
    }
}

check();
