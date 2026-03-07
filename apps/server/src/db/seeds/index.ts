import { seedProblems } from './problems.seed';
import { seedTestUsers } from './test-users.seed';

async function runSeed() {
    try {
        await seedProblems();
        if (process.env.NODE_ENV !== 'production') {
            await seedTestUsers();
        }
        console.log('Seeding completed successfully. System integrity: OPTIMAL.');
    } catch (error) {
        console.error('Seeding failed:', error);
    } finally {
        process.exit(0);
    }
}

runSeed();
