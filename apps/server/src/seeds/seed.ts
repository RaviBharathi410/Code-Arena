import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';

// Load environment
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Import all models
import { User } from '../models/User';
import { Problem } from '../models/Problem';
import { Tournament } from '../models/Tournament';

// ────────────────────────────────────────────────────────────────────────────
// Seed Data
// ────────────────────────────────────────────────────────────────────────────

const PROBLEMS = [
    {
        slug: 'two-sum',
        title: 'Two Sum',
        difficulty: 'EASY',
        category: 'arrays',
        description: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.

You can return the answer in any order.`,
        constraints: `- 2 <= nums.length <= 10^4
- -10^9 <= nums[i] <= 10^9
- -10^9 <= target <= 10^9
- Only one valid answer exists.`,
        examples: [
            { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]', explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].' },
            { input: 'nums = [3,2,4], target = 6', output: '[1,2]' },
            { input: 'nums = [3,3], target = 6', output: '[0,1]' },
        ],
        testCases: [
            { input: '[2,7,11,15]\n9', output: '[0,1]' },
            { input: '[3,2,4]\n6', output: '[1,2]' },
            { input: '[3,3]\n6', output: '[0,1]' },
            { input: '[1,5,3,7]\n8', output: '[1,2]' },
        ],
        boilerplate: {
            javascript: 'function twoSum(nums, target) {\n    // Write your solution here\n}',
            python: 'def two_sum(nums, target):\n    # Write your solution here\n    pass',
            cpp: '#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Write your solution here\n    }\n};',
        },
        optimalTimeComplexity: 'O(n)',
        optimalSpaceComplexity: 'O(n)',
        tags: ['arrays', 'hash-table'],
        isSeedData: true,
    },
    {
        slug: 'palindrome-number',
        title: 'Palindrome Number',
        difficulty: 'EASY',
        category: 'math',
        description: `Given an integer \`x\`, return \`true\` if \`x\` is a palindrome, and \`false\` otherwise.

An integer is a **palindrome** when it reads the same forward and backward.

For example, \`121\` is a palindrome while \`123\` is not.`,
        constraints: `-2^31 <= x <= 2^31 - 1`,
        examples: [
            { input: 'x = 121', output: 'true', explanation: '121 reads as 121 from left to right and from right to left.' },
            { input: 'x = -121', output: 'false', explanation: 'From left to right, it reads -121. From right to left it becomes 121-.' },
            { input: 'x = 10', output: 'false', explanation: 'Reads 01 from right to left.' },
        ],
        testCases: [
            { input: '121', output: 'true' },
            { input: '-121', output: 'false' },
            { input: '10', output: 'false' },
            { input: '0', output: 'true' },
            { input: '12321', output: 'true' },
        ],
        boilerplate: {
            javascript: 'function isPalindrome(x) {\n    // Write your solution here\n}',
            python: 'def is_palindrome(x):\n    # Write your solution here\n    pass',
            cpp: 'class Solution {\npublic:\n    bool isPalindrome(int x) {\n        // Write your solution here\n    }\n};',
        },
        optimalTimeComplexity: 'O(log n)',
        optimalSpaceComplexity: 'O(1)',
        tags: ['math'],
        isSeedData: true,
    },
    {
        slug: 'valid-parentheses',
        title: 'Valid Parentheses',
        difficulty: 'EASY',
        category: 'strings',
        description: `Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.

An input string is valid if:

1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.`,
        constraints: `- 1 <= s.length <= 10^4
- s consists of parentheses only '()[]{}'.`,
        examples: [
            { input: 's = "()"', output: 'true' },
            { input: 's = "()[]{}"', output: 'true' },
            { input: 's = "(]"', output: 'false' },
        ],
        testCases: [
            { input: '"()"', output: 'true' },
            { input: '"()[]{}"', output: 'true' },
            { input: '"(]"', output: 'false' },
            { input: '"([)]"', output: 'false' },
            { input: '"{[]}"', output: 'true' },
        ],
        boilerplate: {
            javascript: 'function isValid(s) {\n    // Write your solution here\n}',
            python: 'def is_valid(s):\n    # Write your solution here\n    pass',
            cpp: '#include <string>\nusing namespace std;\n\nclass Solution {\npublic:\n    bool isValid(string s) {\n        // Write your solution here\n    }\n};',
        },
        optimalTimeComplexity: 'O(n)',
        optimalSpaceComplexity: 'O(n)',
        tags: ['strings', 'stack'],
        isSeedData: true,
    },
    {
        slug: 'reverse-linked-list',
        title: 'Reverse Linked List',
        difficulty: 'EASY',
        category: 'trees',
        description: `Given the \`head\` of a singly linked list, reverse the list, and return the reversed list.`,
        constraints: `- The number of nodes in the list is the range [0, 5000].
- -5000 <= Node.val <= 5000`,
        examples: [
            { input: 'head = [1,2,3,4,5]', output: '[5,4,3,2,1]' },
            { input: 'head = [1,2]', output: '[2,1]' },
            { input: 'head = []', output: '[]' },
        ],
        testCases: [
            { input: '[1,2,3,4,5]', output: '[5,4,3,2,1]' },
            { input: '[1,2]', output: '[2,1]' },
            { input: '[]', output: '[]' },
        ],
        boilerplate: {
            javascript: 'function reverseList(head) {\n    // Write your solution here\n}',
            python: 'def reverse_list(head):\n    # Write your solution here\n    pass',
            cpp: 'struct ListNode {\n    int val;\n    ListNode *next;\n    ListNode() : val(0), next(nullptr) {}\n    ListNode(int x) : val(x), next(nullptr) {}\n};\n\nclass Solution {\npublic:\n    ListNode* reverseList(ListNode* head) {\n        // Write your solution here\n    }\n};',
        },
        optimalTimeComplexity: 'O(n)',
        optimalSpaceComplexity: 'O(1)',
        tags: ['linked-list'],
        isSeedData: true,
    },
    {
        slug: 'maximum-subarray',
        title: 'Maximum Subarray',
        difficulty: 'MEDIUM',
        category: 'dp',
        description: `Given an integer array \`nums\`, find the subarray with the largest sum, and return its sum.

A **subarray** is a contiguous non-empty sequence of elements within an array.`,
        constraints: `- 1 <= nums.length <= 10^5
- -10^4 <= nums[i] <= 10^4`,
        examples: [
            { input: 'nums = [-2,1,-3,4,-1,2,1,-5,4]', output: '6', explanation: 'The subarray [4,-1,2,1] has the largest sum 6.' },
            { input: 'nums = [1]', output: '1' },
            { input: 'nums = [5,4,-1,7,8]', output: '23' },
        ],
        testCases: [
            { input: '[-2,1,-3,4,-1,2,1,-5,4]', output: '6' },
            { input: '[1]', output: '1' },
            { input: '[5,4,-1,7,8]', output: '23' },
            { input: '[-1]', output: '-1' },
        ],
        boilerplate: {
            javascript: 'function maxSubArray(nums) {\n    // Write your solution here\n}',
            python: 'def max_sub_array(nums):\n    # Write your solution here\n    pass',
            cpp: '#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    int maxSubArray(vector<int>& nums) {\n        // Write your solution here\n    }\n};',
        },
        optimalTimeComplexity: 'O(n)',
        optimalSpaceComplexity: 'O(1)',
        tags: ['arrays', 'dp', 'divide-and-conquer'],
        isSeedData: true,
    },
    {
        slug: 'longest-substring-without-repeating',
        title: 'Longest Substring Without Repeating Characters',
        difficulty: 'MEDIUM',
        category: 'strings',
        description: `Given a string \`s\`, find the length of the **longest substring** without repeating characters.`,
        constraints: `- 0 <= s.length <= 5 * 10^4
- s consists of English letters, digits, symbols and spaces.`,
        examples: [
            { input: 's = "abcabcbb"', output: '3', explanation: 'The answer is "abc", with the length of 3.' },
            { input: 's = "bbbbb"', output: '1', explanation: 'The answer is "b", with the length of 1.' },
            { input: 's = "pwwkew"', output: '3', explanation: 'The answer is "wke", with the length of 3.' },
        ],
        testCases: [
            { input: '"abcabcbb"', output: '3' },
            { input: '"bbbbb"', output: '1' },
            { input: '"pwwkew"', output: '3' },
            { input: '""', output: '0' },
        ],
        boilerplate: {
            javascript: 'function lengthOfLongestSubstring(s) {\n    // Write your solution here\n}',
            python: 'def length_of_longest_substring(s):\n    # Write your solution here\n    pass',
            cpp: '#include <string>\nusing namespace std;\n\nclass Solution {\npublic:\n    int lengthOfLongestSubstring(string s) {\n        // Write your solution here\n    }\n};',
        },
        optimalTimeComplexity: 'O(n)',
        optimalSpaceComplexity: 'O(min(n,m))',
        tags: ['strings', 'hash-table', 'sliding-window'],
        isSeedData: true,
    },
    {
        slug: 'merge-intervals',
        title: 'Merge Intervals',
        difficulty: 'MEDIUM',
        category: 'arrays',
        description: `Given an array of \`intervals\` where \`intervals[i] = [start_i, end_i]\`, merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.`,
        constraints: `- 1 <= intervals.length <= 10^4
- intervals[i].length == 2
- 0 <= start_i <= end_i <= 10^4`,
        examples: [
            { input: 'intervals = [[1,3],[2,6],[8,10],[15,18]]', output: '[[1,6],[8,10],[15,18]]', explanation: 'Since intervals [1,3] and [2,6] overlap, merge them into [1,6].' },
            { input: 'intervals = [[1,4],[4,5]]', output: '[[1,5]]', explanation: 'Intervals [1,4] and [4,5] are considered overlapping.' },
        ],
        testCases: [
            { input: '[[1,3],[2,6],[8,10],[15,18]]', output: '[[1,6],[8,10],[15,18]]' },
            { input: '[[1,4],[4,5]]', output: '[[1,5]]' },
            { input: '[[1,4],[0,4]]', output: '[[0,4]]' },
        ],
        boilerplate: {
            javascript: 'function merge(intervals) {\n    // Write your solution here\n}',
            python: 'def merge(intervals):\n    # Write your solution here\n    pass',
            cpp: '#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<vector<int>> merge(vector<vector<int>>& intervals) {\n        // Write your solution here\n    }\n};',
        },
        optimalTimeComplexity: 'O(n log n)',
        optimalSpaceComplexity: 'O(n)',
        tags: ['arrays', 'sorting'],
        isSeedData: true,
    },
    {
        slug: 'binary-tree-level-order-traversal',
        title: 'Binary Tree Level Order Traversal',
        difficulty: 'MEDIUM',
        category: 'trees',
        description: `Given the \`root\` of a binary tree, return the level order traversal of its nodes' values (i.e., from left to right, level by level).`,
        constraints: `- The number of nodes in the tree is in the range [0, 2000].
- -1000 <= Node.val <= 1000`,
        examples: [
            { input: 'root = [3,9,20,null,null,15,7]', output: '[[3],[9,20],[15,7]]' },
            { input: 'root = [1]', output: '[[1]]' },
            { input: 'root = []', output: '[]' },
        ],
        testCases: [
            { input: '[3,9,20,null,null,15,7]', output: '[[3],[9,20],[15,7]]' },
            { input: '[1]', output: '[[1]]' },
            { input: '[]', output: '[]' },
        ],
        boilerplate: {
            javascript: 'function levelOrder(root) {\n    // Write your solution here\n}',
            python: 'def level_order(root):\n    # Write your solution here\n    pass',
            cpp: '#include <vector>\n#include <queue>\nusing namespace std;\n\nstruct TreeNode {\n    int val;\n    TreeNode *left;\n    TreeNode *right;\n    TreeNode() : val(0), left(nullptr), right(nullptr) {}\n    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}\n};\n\nclass Solution {\npublic:\n    vector<vector<int>> levelOrder(TreeNode* root) {\n        // Write your solution here\n    }\n};',
        },
        optimalTimeComplexity: 'O(n)',
        optimalSpaceComplexity: 'O(n)',
        tags: ['trees', 'bfs'],
        isSeedData: true,
    },
    {
        slug: 'trapping-rain-water',
        title: 'Trapping Rain Water',
        difficulty: 'HARD',
        category: 'arrays',
        description: `Given \`n\` non-negative integers representing an elevation map where the width of each bar is \`1\`, compute how much water it can trap after raining.`,
        constraints: `- n == height.length
- 1 <= n <= 2 * 10^4
- 0 <= height[i] <= 10^5`,
        examples: [
            { input: 'height = [0,1,0,2,1,0,1,3,2,1,2,1]', output: '6', explanation: 'The elevation map is represented by array [0,1,0,2,1,0,1,3,2,1,2,1]. In this case, 6 units of rain water are being trapped.' },
            { input: 'height = [4,2,0,3,2,5]', output: '9' },
        ],
        testCases: [
            { input: '[0,1,0,2,1,0,1,3,2,1,2,1]', output: '6' },
            { input: '[4,2,0,3,2,5]', output: '9' },
            { input: '[1,0,1]', output: '1' },
        ],
        boilerplate: {
            javascript: 'function trap(height) {\n    // Write your solution here\n}',
            python: 'def trap(height):\n    # Write your solution here\n    pass',
            cpp: '#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    int trap(vector<int>& height) {\n        // Write your solution here\n    }\n};',
        },
        optimalTimeComplexity: 'O(n)',
        optimalSpaceComplexity: 'O(1)',
        tags: ['arrays', 'two-pointers', 'stack'],
        isSeedData: true,
    },
    {
        slug: 'word-search-ii',
        title: 'Word Search II',
        difficulty: 'HARD',
        category: 'graphs',
        description: `Given an \`m x n\` board of characters and a list of strings \`words\`, return all words on the board.

Each word must be constructed from letters of sequentially adjacent cells, where adjacent cells are horizontally or vertically neighboring. The same letter cell may not be used more than once in a word.`,
        constraints: `- m == board.length
- n == board[i].length
- 1 <= m, n <= 12
- board[i][j] is a lowercase English letter.
- 1 <= words.length <= 3 * 10^4
- 1 <= words[i].length <= 10`,
        examples: [
            { input: 'board = [["o","a","a","n"],["e","t","a","e"],["i","h","k","r"],["i","f","l","v"]], words = ["oath","pea","eat","rain"]', output: '["eat","oath"]' },
            { input: 'board = [["a","b"],["c","d"]], words = ["abcb"]', output: '[]' },
        ],
        testCases: [
            { input: '[["o","a","a","n"],["e","t","a","e"],["i","h","k","r"],["i","f","l","v"]]\n["oath","pea","eat","rain"]', output: '["eat","oath"]' },
            { input: '[["a","b"],["c","d"]]\n["abcb"]', output: '[]' },
        ],
        boilerplate: {
            javascript: 'function findWords(board, words) {\n    // Write your solution here\n}',
            python: 'def find_words(board, words):\n    # Write your solution here\n    pass',
            cpp: '#include <vector>\n#include <string>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<string> findWords(vector<vector<char>>& board, vector<string>& words) {\n        // Write your solution here\n    }\n};',
        },
        optimalTimeComplexity: 'O(m*n*4^L)',
        optimalSpaceComplexity: 'O(N*L)',
        tags: ['graphs', 'trie', 'backtracking'],
        isSeedData: true,
    },
];

const ADMIN_USER = {
    username: 'admin',
    email: 'admin@codearena.dev',
    password: 'Admin@1234',
    role: 'superadmin',
    rankRating: 2400,
    eloRating: 2400,
    tier: 'GRANDMASTER',
};

const DEMO_USERS = [
    { username: 'alice_coder', email: 'alice@codearena.dev', password: 'Test@1234', rankRating: 1850, eloRating: 1850, tier: 'DIAMOND', wins: 42, losses: 18, matchesPlayed: 60, matchesWon: 42 },
    { username: 'bob_dev', email: 'bob@codearena.dev', password: 'Test@1234', rankRating: 1620, eloRating: 1620, tier: 'PLATINUM', wins: 30, losses: 25, matchesPlayed: 55, matchesWon: 30 },
    { username: 'charlie_algo', email: 'charlie@codearena.dev', password: 'Test@1234', rankRating: 1480, eloRating: 1480, tier: 'GOLD', wins: 22, losses: 28, matchesPlayed: 50, matchesWon: 22 },
    { username: 'diana_hack', email: 'diana@codearena.dev', password: 'Test@1234', rankRating: 1350, eloRating: 1350, tier: 'SILVER', wins: 15, losses: 20, matchesPlayed: 35, matchesWon: 15 },
    { username: 'eve_scripts', email: 'eve@codearena.dev', password: 'Test@1234', rankRating: 1200, eloRating: 1200, tier: 'IRON', wins: 5, losses: 10, matchesPlayed: 15, matchesWon: 5 },
];

const SAMPLE_TOURNAMENT = {
    title: 'CodeArena Launch Cup',
    description: 'Welcome to the inaugural CodeArena tournament! Compete against other coders in a single-elimination bracket.',
    status: 'upcoming',
    format: 'single_elimination',
    maxParticipants: 16,
    entryFee: 0,
    prizePool: 0,
    startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
};

// ────────────────────────────────────────────────────────────────────────────
// Seed Runner
// ────────────────────────────────────────────────────────────────────────────

async function seedProblems() {
    console.log('\n📝 Seeding Problems...');
    let created = 0;
    let skipped = 0;

    for (const p of PROBLEMS) {
        const exists = await Problem.findOne({ slug: p.slug });
        if (exists) {
            skipped++;
            continue;
        }
        await Problem.create(p);
        created++;
    }

    console.log(`   ✅ Problems: ${created} created, ${skipped} skipped (already exist)`);
}

async function seedUsers() {
    console.log('\n👤 Seeding Users...');
    let created = 0;
    let skipped = 0;

    // Admin user
    const adminExists = await User.findOne({ email: ADMIN_USER.email });
    if (!adminExists) {
        const passwordHash = await bcrypt.hash(ADMIN_USER.password, 12);
        await User.create({
            username: ADMIN_USER.username,
            email: ADMIN_USER.email,
            passwordHash,
            role: ADMIN_USER.role,
            rankRating: ADMIN_USER.rankRating,
            eloRating: ADMIN_USER.eloRating,
            tier: ADMIN_USER.tier,
        });
        created++;
        console.log(`   🔑 Admin user created: ${ADMIN_USER.email} / ${ADMIN_USER.password}`);
    } else {
        skipped++;
    }

    // Demo users
    for (const u of DEMO_USERS) {
        const exists = await User.findOne({ email: u.email });
        if (exists) {
            skipped++;
            continue;
        }
        const passwordHash = await bcrypt.hash(u.password, 12);
        await User.create({
            username: u.username,
            email: u.email,
            passwordHash,
            rankRating: u.rankRating,
            eloRating: u.eloRating,
            tier: u.tier,
            wins: u.wins,
            losses: u.losses,
            totalBattles: u.matchesPlayed,
            winRate: u.matchesPlayed > 0 ? Math.round((u.matchesWon / u.matchesPlayed) * 100) : 0,
            matchesPlayed: u.matchesPlayed,
            matchesWon: u.matchesWon,
        });
        created++;
    }

    console.log(`   ✅ Users: ${created} created, ${skipped} skipped (already exist)`);
}

async function seedTournaments() {
    console.log('\n🏆 Seeding Tournaments...');

    const exists = await Tournament.findOne({ title: SAMPLE_TOURNAMENT.title });
    if (exists) {
        console.log('   ⏭ Tournament already exists, skipping');
        return;
    }

    // Get admin user as creator
    const admin = await User.findOne({ role: 'superadmin' });
    if (!admin) {
        console.log('   ⚠️ No admin user found, skipping tournament seed');
        return;
    }

    await Tournament.create({
        ...SAMPLE_TOURNAMENT,
        createdBy: admin._id,
    });

    console.log('   ✅ Tournament created: ' + SAMPLE_TOURNAMENT.title);
}

async function main() {
    console.log('═══════════════════════════════════════════════════');
    console.log('  🏟️  CodeArena MongoDB Seed Script');
    console.log('═══════════════════════════════════════════════════');

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error('❌ DATABASE_URL not set. Aborting.');
        process.exit(1);
    }

    console.log(`\n🔗 Connecting to MongoDB...`);
    await mongoose.connect(dbUrl, {
        serverSelectionTimeoutMS: 10000,
    });
    console.log(`✅ Connected to: ${mongoose.connection.host} / ${mongoose.connection.db?.databaseName}`);

    await seedProblems();
    await seedUsers();
    await seedTournaments();

    // Summary
    const problemCount = await Problem.countDocuments();
    const userCount = await User.countDocuments();
    const tournamentCount = await Tournament.countDocuments();

    console.log('\n═══════════════════════════════════════════════════');
    console.log('  📊 Database Summary');
    console.log('═══════════════════════════════════════════════════');
    console.log(`  Problems:    ${problemCount}`);
    console.log(`  Users:       ${userCount}`);
    console.log(`  Tournaments: ${tournamentCount}`);
    console.log('═══════════════════════════════════════════════════');
    console.log('\n✅ Seed complete!\n');

    await mongoose.disconnect();
    process.exit(0);
}

main().catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
