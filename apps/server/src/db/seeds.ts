import { db } from './index';
import { problems } from '@arena/database';

const initialProblems = [
    {
        title: "Hello World",
        description: "Create a function called 'hello' that returns 'Hello, World!'.",
        difficulty: "Easy",
        baseCode: "function hello() {\n  // your code\n}",
        testCases: JSON.stringify([
            { input: [], expected: "Hello, World!" }
        ]),
        solution: "function hello() {\n  return 'Hello, World!';\n}"
    },
    {
        title: "Sum of Two",
        description: "Create a function called 'sum' that takes two numbers and returns their sum.",
        difficulty: "Easy",
        baseCode: "function sum(a, b) {\n  // your code\n}",
        testCases: JSON.stringify([
            { input: [1, 2], expected: 3 },
            { input: [-1, 5], expected: 4 }
        ]),
        solution: "function sum(a, b) {\n  return a + b;\n}"
    }
];

async function seed() {
    console.log('Seeding initial problems...');
    try {
        for (const problem of initialProblems) {
            await db.insert(problems).values(problem).run();
            console.log(`Inserted problem: ${problem.title}`);
        }
        console.log('Seeding completed successfully!');
    } catch (err) {
        console.error('Seeding failed:', err);
    }
}

seed();
