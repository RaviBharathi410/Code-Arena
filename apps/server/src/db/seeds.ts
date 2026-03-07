import { db } from './index';
import { problems } from '@arena/database';
import crypto from 'crypto';

const initialProblems = [
    {
        id: crypto.randomUUID(),
        title: "Hello World",
        slug: "hello-world",
        description: "Create a function called 'hello' that returns 'Hello, World!'.",
        difficulty: "easy",
        baseCode: "function hello() {\n  // your code\n}",
        testCases: [
            { id: 1, input: [], expected: "Hello, World!" }
        ],
        examples: [
            { input: "()", output: "Hello, World!" }
        ],
        solution: "function hello() {\n  return 'Hello, World!';\n}"
    },
    {
        id: crypto.randomUUID(),
        title: "Sum of Two",
        slug: "sum-of-two",
        description: "Create a function called 'sum' that takes two numbers and returns their sum.",
        difficulty: "easy",
        baseCode: "function sum(a, b) {\n  // your code\n}",
        testCases: [
            { id: 1, input: [1, 2], expected: 3 },
            { id: 2, input: [-1, 5], expected: 4 }
        ],
        examples: [
            { input: "(1, 2)", output: "3" }
        ],
        solution: "function sum(a, b) {\n  return a + b;\n}"
    }
];

async function seed() {
    console.log('Seeding initial problems...');
    try {
        for (const problem of initialProblems) {
            await db.insert(problems).values(problem as any).run();
            console.log(`Inserted problem: ${problem.title}`);
        }
        console.log('Seeding completed successfully!');
    } catch (err) {
        console.error('Seeding failed:', err);
    }
}

seed();
