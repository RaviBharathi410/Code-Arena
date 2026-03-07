import { problemsService } from './modules/problems/problems.service';
import { logger } from './lib/logger';

async function test() {
    try {
        console.log('--- DB PATH CHECK ---');
        const path = await import('path');
        const dbPath = path.resolve(process.cwd(), '../../sqlite2.db');
        console.log('Expected DB Path:', dbPath);
        const fs = await import('fs');
        console.log('DB File Exists?', fs.existsSync(dbPath));

        console.log('\n--- TESTING ProblemsService.findAll() ---');
        const result = await problemsService.findAll({});
        console.log('SUCCESS!');
        console.log('Result:', JSON.stringify(result, null, 2).slice(0, 500) + '...');
    } catch (err: any) {
        console.error('\n--- FAILED ---');
        console.error('Error Message:', err.message);
        console.error('Stack Trace:');
        console.error(err.stack);
        process.exit(1);
    }
}

test();
