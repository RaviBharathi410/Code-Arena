import { db } from '../index';
import { problems } from '@arena/database';
import crypto from 'crypto';

const sampleProblems = [
    {
        title: 'Two Sum',
        slug: 'two-sum',
        description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
        difficulty: 'easy' as const,
        testCases: [
            { input: '[2,7,11,15], 9', output: '[0,1]' },
            { input: '[3,2,4], 6', output: '[1,2]' }
        ],
        constraints: '2 <= nums.length <= 10^4',
        examples: [
            { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]' }
        ],
        baseCode: 'function twoSum(nums, target) {\n\n};',
    },
    {
        title: 'Add Two Numbers',
        slug: 'add-two-numbers',
        description: 'You are given two non-empty linked lists representing two non-negative integers. The digits are stored in reverse order, and each of their nodes contains a single digit.',
        difficulty: 'medium' as const,
        testCases: [
            { input: '[2,4,3], [5,6,4]', output: '[7,0,8]' }
        ],
        constraints: 'The number of nodes in each linked list is in the range [1, 100].',
        examples: [
            { input: 'l1 = [2,4,3], l2 = [5,6,4]', output: '[7,0,8]' }
        ],
        baseCode: '/**\n * @param {ListNode} l1\n * @param {ListNode} l2\n * @return {ListNode}\n */\nvar addTwoNumbers = function(l1, l2) {\n\n};',
    }
];

export async function seedProblems() {
    console.log('Seeding problems...');
    for (const problem of sampleProblems) {
        await db.insert(problems)
            .values({ ...problem, id: crypto.randomUUID() })
            .onConflictDoNothing();
    }
    console.log('Problems seeded.');
}
