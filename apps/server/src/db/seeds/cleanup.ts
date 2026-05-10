import { db } from '../client';
import { problems } from '@arena/database';
import { inArray } from 'drizzle-orm';

const MOCK_SLUGS = [
    'neural-link-reversal',
    'cyber-vault-access',
    'grid-runner-optimization',
    'binary-protocol-audit',
    'matrix-frame-rotation',
    'core-memory-trap',
    'quantum-entanglement-check',
    'neural-pathfinding-extreme',
    'void-singularity-compression',
    'parallel-stream-processor'
];

async function cleanup() {
    console.log('Cleaning up mock problems...');
    try {
        const result = await db.delete(problems)
            .where(inArray(problems.slug, MOCK_SLUGS));
        console.log('Mock problems removed.');
    } catch (error) {
        console.error('Cleanup failed:', error);
    } finally {
        process.exit(0);
    }
}

cleanup();
