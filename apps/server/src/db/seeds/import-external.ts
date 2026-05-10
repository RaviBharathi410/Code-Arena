import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { db } from '../index';
import { problems } from '@arena/database';
import { sql } from 'drizzle-orm';

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

        const cleanText = (text: string) => {
            if (!text) return '';
            return text
                .replace(/Â/g, ' ') // Fix encoding glitches
                .replace(/\b10([3-9])\b/g, '10^$1') // Fix 104 -> 10^4, 109 -> 10^9
                .replace(/\b2(31)\b/g, '2^$1') // Fix 231 -> 2^31
                .replace(/\b([nka])i\b/g, '$1[i]') // Fix ni -> n[i], ki -> k[i]
                .replace(/\b([nka])j\b/g, '$1[j]') // Fix nj -> n[j], kj -> k[j]
                .trim();
        };

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
                    title: item.title || 'Untitled Problem',
                    slug: item.problem_slug || item.slug || (item.title ? item.title.toLowerCase().replace(/[^a-z0-9]/g, '-') : crypto.randomUUID()),
                    description: cleanText(item.description || 'No description available.'),
                    difficulty: (item.difficulty || 'Easy').toUpperCase(),
                    category: item.category || 'Algorithms',
                    testCases: item.testCases || item.test_cases || (item.examples?.map((ex: any) => {
                        const parts = ex.example_text?.split('\nOutput:');
                        return {
                            input: parts?.[0]?.replace('Input: ', '')?.trim() || '',
                            output: parts?.[1]?.split('\nExplanation:')?.[0]?.trim() || '',
                            is_hidden: false
                        };
                    })) || [],
                    constraints: (Array.isArray(item.constraints) ? item.constraints : [item.constraints || 'None']).map(c => cleanText(c)).join('\n'),
                    examples: item.examples?.map((ex: any) => {
                        const parts = ex.example_text?.split('\nOutput:');
                        return {
                            input: cleanText(parts?.[0]?.replace('Input: ', '') || ''),
                            output: cleanText(parts?.[1]?.split('\nExplanation:')?.[0] || ''),
                            explanation: cleanText(parts?.[1]?.split('\nExplanation:')?.[1] || '')
                        };
                    }) || [],
                    boilerplate: item.boilerplate || item.code_snippets || {
                        js: 'function solution() {\n    // Write your code here\n}',
                        py: 'class Solution:\n    def solve(self):\n        pass',
                        java: 'class Solution {\n    public static void main(String[] args) {\n    }\n}',
                        cpp: '#include <iostream>\nusing namespace std;\nint main() {\n    return 0;\n}'
                    },
                    optimalTimeComplexity: item.optimalTimeComplexity || item.optimal_time_complexity || 'O(N)',
                    optimalSpaceComplexity: item.optimalSpaceComplexity || item.optimal_space_complexity || 'O(1)',
                    tags: Array.isArray(item.tags) ? item.tags : []
                };

                currentBatch.push(problemData);

                if (currentBatch.length >= batchSize) {
                    await db.insert(problems)
                        .values(currentBatch)
                        .onConflictDoUpdate({
                            target: problems.slug,
                            set: {
                                title: sql`excluded.title`,
                                description: sql`excluded.description`,
                                difficulty: sql`excluded.difficulty`,
                                category: sql`excluded.category`,
                                testCases: sql`excluded.test_cases`,
                                constraints: sql`excluded.constraints`,
                                examples: sql`excluded.examples`,
                                boilerplate: sql`excluded.boilerplate`,
                                optimalTimeComplexity: sql`excluded.optimal_time_complexity`,
                                optimalSpaceComplexity: sql`excluded.optimal_space_complexity`,
                                tags: sql`excluded.tags`
                            }
                        });
                    
                    importedCount += currentBatch.length;
                    console.log(`Imported ${importedCount}...`);
                    currentBatch = [];
                }
            } catch (err: any) {
                console.warn(`Failed to process problem: ${item.title || 'Unknown'}. Error: ${err.message}`);
                skippedCount++;
            }
        }

        // Final batch
        if (currentBatch.length > 0) {
            await db.insert(problems)
                .values(currentBatch)
                .onConflictDoUpdate({
                    target: problems.slug,
                    set: {
                        title: sql`excluded.title`,
                        description: sql`excluded.description`,
                        difficulty: sql`excluded.difficulty`,
                        category: sql`excluded.category`,
                        testCases: sql`excluded.test_cases`,
                        constraints: sql`excluded.constraints`,
                        examples: sql`excluded.examples`,
                        boilerplate: sql`excluded.boilerplate`,
                        optimalTimeComplexity: sql`excluded.optimal_time_complexity`,
                        optimalSpaceComplexity: sql`excluded.optimal_space_complexity`,
                        tags: sql`excluded.tags`
                    }
                });
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
