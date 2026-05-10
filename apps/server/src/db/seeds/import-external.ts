import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { db } from '../index';
import { problems } from '@arena/database';

async function importProblems() {
    const filePath = process.argv[2];

    if (!filePath) {
        console.error('Please provide a path to the JSON file: npm run db:import path/to/file.json');
        process.exit(1);
    }

    const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);

    if (!fs.existsSync(absolutePath)) {
        console.error(`File not found: ${absolutePath}`);
        process.exit(1);
    }

    try {
        const rawData = fs.readFileSync(absolutePath, 'utf8');
        let data = JSON.parse(rawData);

        // Handle both Array and Object (Key-Value) formats
        if (!Array.isArray(data)) {
            if (typeof data === 'object' && data !== null) {
                if (Array.isArray(data.questions)) {
                    console.log('Detected "questions" wrapper. Using internal array...');
                    data = data.questions;
                } else {
                    console.log('Detected Object format. Converting values to array...');
                    data = Object.values(data);
                }
            } else {
                console.error('Invalid format: JSON must be an array or an object of problems.');
                process.exit(1);
            }
        }

        console.log(`Starting import of ${data.length} problems...`);

        let importedCount = 0;
        let skippedCount = 0;
        const batchSize = 100;
        let currentBatch: any[] = [];

        for (const item of data) {
            try {
                // Map LeetCode fields to our schema
                const problemData = {
                    id: item.id || crypto.randomUUID(),
                    title: item.title,
                    slug: item.problem_slug || item.slug || item.title.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                    description: item.description,
                    difficulty: item.difficulty?.toLowerCase() || 'easy',
                    testCases: item.testCases || item.test_cases || (item.examples?.map((ex: any) => ({
                        input: ex.example_text?.split('\nOutput:')[0]?.replace('Input: ', '') || '',
                        output: ex.example_text?.split('\nOutput: ')[1]?.split('\n')[0] || ''
                    }))) || [],
                    constraints: Array.isArray(item.constraints) ? item.constraints.join('\n') : (item.constraints || ''),
                    examples: item.examples || [],
                    baseCode: item.code_snippets?.typescript || item.baseCode || item.base_code || '',
                    solution: item.solution || null
                };

                currentBatch.push(problemData);

                if (currentBatch.length >= batchSize) {
                    await db.insert(problems)
                        .values(currentBatch)
                        .onConflictDoNothing();
                    
                    importedCount += currentBatch.length;
                    console.log(`Imported ${importedCount}...`);
                    currentBatch = [];
                }
            } catch (err) {
                console.warn(`Failed to process problem: ${item.title || 'Unknown'}`);
                skippedCount++;
            }
        }

        // Final batch
        if (currentBatch.length > 0) {
            await db.insert(problems)
                .values(currentBatch)
                .onConflictDoNothing();
            importedCount += currentBatch.length;
        }

        console.log(`Import complete!`);
        console.log(`- Imported: ${importedCount}`);
        console.log(`- Skipped: ${skippedCount}`);

    } catch (error) {
        console.error('Import failed:', error);
    } finally {
        process.exit(0);
    }
}

importProblems();
