import { db } from '../client';
import { problems } from '@arena/database';
import crypto from 'crypto';

const BATTLE_PROBLEMS = [
    {
        title: 'Neural Link Reversal',
        slug: 'neural-link-reversal',
        difficulty: 'EASY',
        category: 'Algorithms',
        description: 'Given a linked list representing a neural data stream, reverse it in-place to restore system synchronization.',
        constraints: 'The number of nodes in the list is in the range [0, 5000].\n-5000 <= Node.val <= 5000',
        examples: [
            { input: 'head = [1,2,3,4,5]', output: '[5,4,3,2,1]', explanation: 'The neural stream is reversed.' }
        ],
        testCases: [
            { input: '[1,2,3,4,5]', expected_output: '[5,4,3,2,1]', is_hidden: false },
            { input: '[1,2]', expected_output: '[2,1]', is_hidden: false },
            { input: '[]', expected_output: '[]', is_hidden: true }
        ],
        boilerplate: {
            js: '/**\n * @param {ListNode} head\n * @return {ListNode}\n */\nvar reverseList = function(head) {\n    \n};',
            py: 'class Solution:\n    def reverseList(self, head: Optional[ListNode]) -> Optional[ListNode]:\n        pass',
            java: 'class Solution {\n    public ListNode reverseList(ListNode head) {\n        \n    }\n}',
            cpp: 'class Solution {\npublic:\n    ListNode* reverseList(ListNode* head) {\n        \n    }\n};',
            go: 'func reverseList(head *ListNode) *ListNode {\n    \n}',
            rust: 'impl Solution {\n    pub fn reverse_list(head: Option<Box<ListNode>>) -> Option<Box<ListNode>> {\n        \n    }\n}'
        },
        optimalTimeComplexity: 'O(n)',
        optimalSpaceComplexity: 'O(1)',
        tags: ['linked-list', 'recursion']
    },
    {
        title: 'Cyber-Vault Access',
        slug: 'cyber-vault-access',
        difficulty: 'EASY',
        category: 'Security',
        description: 'Verify if a given string of vault access codes (parentheses) is valid. A code is valid if all open brackets are closed in the correct order.',
        constraints: '1 <= s.length <= 10^4\ns consists of parentheses only \'()[]{}\'.',
        examples: [
            { input: 's = "()[]{}"', output: 'true', explanation: 'All security protocols are correctly closed.' }
        ],
        testCases: [
            { input: '"()"', expected_output: 'true', is_hidden: false },
            { input: '"()[]{}"', expected_output: 'true', is_hidden: false },
            { input: '"(]"', expected_output: 'false', is_hidden: false },
            { input: '"([)]"', expected_output: 'false', is_hidden: true }
        ],
        boilerplate: {
            js: '/**\n * @param {string} s\n * @return {boolean}\n */\nvar isValid = function(s) {\n    \n};',
            py: 'class Solution:\n    def isValid(self, s: str) -> bool:\n        pass',
            java: 'class Solution {\n    public boolean isValid(String s) {\n        \n    }\n}',
            cpp: 'class Solution {\npublic:\n    bool isValid(string s) {\n        \n    }\n};',
            go: 'func isValid(s string) bool {\n    \n}',
            rust: 'impl Solution {\n    pub fn is_valid(s: String) -> bool {\n        \n    }\n}'
        },
        optimalTimeComplexity: 'O(n)',
        optimalSpaceComplexity: 'O(n)',
        tags: ['stack', 'string']
    },
    {
        title: 'Grid Runner Optimization',
        slug: 'grid-runner-optimization',
        difficulty: 'MEDIUM',
        category: 'Dynamic Programming',
        description: 'A grid runner must reach the bottom-right of an m x n grid. Find the number of unique paths from the top-left.',
        constraints: '1 <= m, n <= 100',
        examples: [
            { input: 'm = 3, n = 7', output: '28', explanation: 'Total unique paths calculated through the grid.' }
        ],
        testCases: [
            { input: '3, 7', expected_output: '28', is_hidden: false },
            { input: '3, 2', expected_output: '3', is_hidden: false },
            { input: '10, 10', expected_output: '48620', is_hidden: true }
        ],
        boilerplate: {
            js: '/**\n * @param {number} m\n * @param {number} n\n * @return {number}\n */\nvar uniquePaths = function(m, n) {\n    \n};',
            py: 'class Solution:\n    def uniquePaths(self, m: int, n: int) -> int:\n        pass',
            java: 'class Solution {\n    public int uniquePaths(int m, int n) {\n        \n    }\n}',
            cpp: 'class Solution {\npublic:\n    int uniquePaths(int m, int n) {\n        \n    }\n};',
            go: 'func uniquePaths(m int, n int) int {\n    \n}',
            rust: 'impl Solution {\n    pub fn unique_paths(m: i32, n: i32) -> i32 {\n        \n    }\n}'
        },
        optimalTimeComplexity: 'O(m*n)',
        optimalSpaceComplexity: 'O(m*n)',
        tags: ['math', 'dp']
    },
    {
        title: 'Binary Protocol Audit',
        slug: 'binary-protocol-audit',
        difficulty: 'MEDIUM',
        category: 'Data Structures',
        description: 'Validate if a binary tree represents a secure audit log (is it a Valid BST?).',
        constraints: 'The number of nodes in the tree is in the range [1, 10^4].\n-2^31 <= Node.val <= 2^31 - 1',
        examples: [
            { input: 'root = [2,1,3]', output: 'true', explanation: 'The audit log follows BST protocol.' }
        ],
        testCases: [
            { input: '[2,1,3]', expected_output: 'true', is_hidden: false },
            { input: '[5,1,4,null,null,3,6]', expected_output: 'false', is_hidden: false },
            { input: '[10,5,15,null,null,6,20]', expected_output: 'false', is_hidden: true }
        ],
        boilerplate: {
            js: '/**\n * @param {TreeNode} root\n * @return {boolean}\n */\nvar isValidBST = function(root) {\n    \n};',
            py: 'class Solution:\n    def isValidBST(self, root: Optional[TreeNode]) -> bool:\n        pass',
            java: 'class Solution {\n    public boolean isValidBST(TreeNode root) {\n        \n    }\n}',
            cpp: 'class Solution {\npublic:\n    bool isValidBST(TreeNode* root) {\n        \n    }\n};',
            go: 'func isValidBST(root *TreeNode) bool {\n    \n}',
            rust: 'impl Solution {\n    pub fn is_valid_bst(root: Option<Rc<RefCell<TreeNode>>>) -> bool {\n        \n    }\n}'
        },
        optimalTimeComplexity: 'O(n)',
        optimalSpaceComplexity: 'O(h)',
        tags: ['tree', 'dfs']
    },
    {
        title: 'Matrix Frame Rotation',
        slug: 'matrix-frame-rotation',
        difficulty: 'MEDIUM',
        category: 'Algorithms',
        description: 'Rotate a neural processing matrix (n x n) 90 degrees clockwise in-place.',
        constraints: 'n == matrix.length == matrix[i].length\n1 <= n <= 20\n-1000 <= matrix[i][j] <= 1000',
        examples: [
            { input: 'matrix = [[1,2],[3,4]]', output: '[[3,1],[4,2]]', explanation: 'The matrix is rotated 90 degrees clockwise.' }
        ],
        testCases: [
            { input: '[[1,2],[3,4]]', expected_output: '[[3,1],[4,2]]', is_hidden: false },
            { input: '[[1,2,3],[4,5,6],[7,8,9]]', expected_output: '[[7,4,1],[8,5,2],[9,6,3]]', is_hidden: false },
            { input: '[[5,1,9,11],[2,4,8,10],[13,3,6,7],[15,14,12,16]]', expected_output: '[[15,13,2,5],[14,3,4,1],[12,6,8,9],[16,7,10,11]]', is_hidden: true }
        ],
        boilerplate: {
            js: '/**\n * @param {number[][]} matrix\n * @return {void} Do not return anything, modify matrix in-place instead.\n */\nvar rotate = function(matrix) {\n    \n};',
            py: 'class Solution:\n    def rotate(self, matrix: List[List[int]]) -> None:\n        pass',
            java: 'class Solution {\n    public void rotate(int[][] matrix) {\n        \n    }\n}',
            cpp: 'class Solution {\npublic:\n    void rotate(vector<vector<int>>& matrix) {\n        \n    }\n};',
            go: 'func rotate(matrix [][]int)  {\n    \n}',
            rust: 'impl Solution {\n    pub fn rotate(matrix: &mut Vec<Vec<i32>>) {\n        \n    }\n}'
        },
        optimalTimeComplexity: 'O(n^2)',
        optimalSpaceComplexity: 'O(1)',
        tags: ['matrix', 'math']
    },
    {
        title: 'Core Memory Trap',
        slug: 'core-memory-trap',
        difficulty: 'HARD',
        category: 'Algorithms',
        description: 'Given an array representing elevation of core memory segments, calculate how much data (water) can be trapped after rain.',
        constraints: 'n == height.length\n1 <= n <= 2 * 10^4\n0 <= height[i] <= 10^5',
        examples: [
            { input: 'height = [0,1,0,2,1,0,1,3,2,1,2,1]', output: '6', explanation: 'Total units of data trapped between elevations.' }
        ],
        testCases: [
            { input: '[0,1,0,2,1,0,1,3,2,1,2,1]', expected_output: '6', is_hidden: false },
            { input: '[4,2,0,3,2,5]', expected_output: '9', is_hidden: false },
            { input: '[5,4,1,2]', expected_output: '1', is_hidden: true }
        ],
        boilerplate: {
            js: '/**\n * @param {number[]} height\n * @return {number}\n */\nvar trap = function(height) {\n    \n};',
            py: 'class Solution:\n    def trap(self, height: List[int]) -> int:\n        pass',
            java: 'class Solution {\n    public int trap(int[] height) {\n        \n    }\n}',
            cpp: 'class Solution {\npublic:\n    int trap(vector<int>& height) {\n        \n    }\n};',
            go: 'func trap(height []int) int {\n    \n}',
            rust: 'impl Solution {\n    pub fn trap(height: Vec<i32>) -> i32 {\n        \n    }\n}'
        },
        optimalTimeComplexity: 'O(n)',
        optimalSpaceComplexity: 'O(1)',
        tags: ['two-pointers', 'stack']
    },
    {
        title: 'Quantum Entanglement Check',
        slug: 'quantum-entanglement-check',
        difficulty: 'HARD',
        category: 'Strings',
        description: 'Find the minimum window in string S which contains all characters in string T (Quantum Entanglement).',
        constraints: 'm == s.length, n == t.length\n1 <= m, n <= 10^5\ns and t consist of uppercase and lowercase English letters.',
        examples: [
            { input: 's = "ADOBECODEBANC", t = "ABC"', output: '"BANC"', explanation: 'Smallest window containing all entanglement markers.' }
        ],
        testCases: [
            { input: '"ADOBECODEBANC", "ABC"', expected_output: '"BANC"', is_hidden: false },
            { input: '"a", "a"', expected_output: '"a"', is_hidden: false },
            { input: '"a", "aa"', expected_output: '""', is_hidden: true }
        ],
        boilerplate: {
            js: '/**\n * @param {string} s\n * @param {string} t\n * @return {string}\n */\nvar minWindow = function(s, t) {\n    \n};',
            py: 'class Solution:\n    def minWindow(self, s: str, t: str) -> str:\n        pass',
            java: 'class Solution {\n    public String minWindow(String s, String t) {\n        \n    }\n}',
            cpp: 'class Solution {\npublic:\n    string minWindow(string s, string t) {\n        \n    }\n};',
            go: 'func minWindow(s string, t string) string {\n    \n}',
            rust: 'impl Solution {\n    pub fn min_window(s: String, t: String) -> String {\n        \n    }\n}'
        },
        optimalTimeComplexity: 'O(m+n)',
        optimalSpaceComplexity: 'O(k)',
        tags: ['sliding-window', 'hash-table']
    },
    {
        title: 'Neural Pathfinding EXTREME',
        slug: 'neural-pathfinding-extreme',
        difficulty: 'EXTREME',
        category: 'Graphs',
        description: 'Implement a highly optimized pathfinding algorithm for a multi-layered neural network with weighted nodes.',
        constraints: 'Nodes <= 10^5, Edges <= 5 * 10^5',
        examples: [
            { input: 'graph = [[1,2],[3],[3],[]], start = 0, target = 3', output: '2', explanation: 'Shortest path through neural layers.' }
        ],
        testCases: [
            { input: '[[1,2],[3],[3],[]], 0, 3', expected_output: '2', is_hidden: false }
        ],
        boilerplate: {
            js: '/**\n * @param {number[][]} graph\n * @param {number} start\n * @param {number} target\n * @return {number}\n */\nvar findShortestPath = function(graph, start, target) {\n    \n};',
            py: 'class Solution:\n    def findShortestPath(self, graph: List[List[int]], start: int, target: int) -> int:\n        pass',
            java: 'class Solution {\n    public int findShortestPath(int[][] graph, int start, int target) {\n        \n    }\n}',
            cpp: 'class Solution {\npublic:\n    int findShortestPath(vector<vector<int>>& graph, int start, int target) {\n        \n    }\n};',
            go: 'func findShortestPath(graph [][]int, start int, target int) int {\n    \n}',
            rust: 'impl Solution {\n    pub fn find_shortest_path(graph: Vec<Vec<i32>>, start: i32, target: i32) -> i32 {\n        \n    }\n}'
        },
        optimalTimeComplexity: 'O(V+E)',
        optimalSpaceComplexity: 'O(V)',
        tags: ['graph', 'dijkstra']
    },
    {
        title: 'Void Singularity Compression',
        slug: 'void-singularity-compression',
        difficulty: 'EXTREME',
        category: 'Compression',
        description: 'Compress a void singularity data stream using a custom LZW-inspired algorithm with extreme efficiency.',
        constraints: 'Stream length up to 10^7 characters.',
        examples: [
            { input: '"ABABABA"', output: '"3AB1A"', explanation: 'Singularity stream compressed to minimal representation.' }
        ],
        testCases: [
            { input: '"ABABABA"', expected_output: '"3AB1A"', is_hidden: false }
        ],
        boilerplate: {
            js: '/**\n * @param {string} stream\n * @return {string}\n */\nvar compressStream = function(stream) {\n    \n};',
            py: 'class Solution:\n    def compressStream(self, stream: str) -> str:\n        pass',
            java: 'class Solution {\n    public String compressStream(String stream) {\n        \n    }\n}',
            cpp: 'class Solution {\npublic:\n    string compressStream(string stream) {\n        \n    }\n};',
            go: 'func compressStream(stream string) string {\n    \n}',
            rust: 'impl Solution {\n    pub fn compress_stream(stream: String) -> String {\n        \n    }\n}'
        },
        optimalTimeComplexity: 'O(n)',
        optimalSpaceComplexity: 'O(n)',
        tags: ['string', 'compression']
    },
    {
        title: 'Parallel Stream Processor',
        slug: 'parallel-stream-processor',
        difficulty: 'HARD',
        category: 'Concurrency',
        description: 'Merge k sorted neural streams into one sorted stream efficiently.',
        constraints: 'k == lists.length\n0 <= k <= 10^4\n0 <= lists[i].length <= 500\n-10^4 <= lists[i][j] <= 10^4',
        examples: [
            { input: 'lists = [[1,4,5],[1,3,4],[2,6]]', output: '[1,1,2,3,4,4,5,6]', explanation: 'Streams merged while maintaining sync.' }
        ],
        testCases: [
            { input: '[[1,4,5],[1,3,4],[2,6]]', expected_output: '[1,1,2,3,4,4,5,6]', is_hidden: false },
            { input: '[]', expected_output: '[]', is_hidden: false },
            { input: '[[]]', expected_output: '[]', is_hidden: true }
        ],
        boilerplate: {
            js: '/**\n * @param {ListNode[]} lists\n * @return {ListNode}\n */\nvar mergeKLists = function(lists) {\n    \n};',
            py: 'class Solution:\n    def mergeKLists(self, lists: List[Optional[ListNode]]) -> Optional[ListNode]:\n        pass',
            java: 'class Solution {\n    public ListNode mergeKLists(ListNode[] lists) {\n        \n    }\n}',
            cpp: 'class Solution {\npublic:\n    ListNode* mergeKLists(vector<ListNode*>& lists) {\n        \n    }\n};',
            go: 'func mergeKLists(lists []*ListNode) *ListNode {\n    \n}',
            rust: 'impl Solution {\n    pub fn merge_k_lists(lists: Vec<Option<Box<ListNode>>>) -> Option<Box<ListNode>> {\n        \n    }\n}'
        },
        optimalTimeComplexity: 'O(N log k)',
        optimalSpaceComplexity: 'O(k)',
        tags: ['heap', 'merge-sort']
    }
];

export async function seedProblems() {
    console.log('Seeding 10 arena problems...');
    for (const problem of BATTLE_PROBLEMS) {
        await db.insert(problems)
            .values({ 
                ...problem, 
                id: crypto.randomUUID() 
            })
            .onConflictDoUpdate({
                target: problems.slug,
                set: {
                    title: problem.title,
                    difficulty: problem.difficulty,
                    category: problem.category,
                    description: problem.description,
                    constraints: problem.constraints,
                    examples: problem.examples,
                    testCases: problem.testCases,
                    boilerplate: problem.boilerplate,
                    optimalTimeComplexity: problem.optimalTimeComplexity,
                    optimalSpaceComplexity: problem.optimalSpaceComplexity,
                    tags: problem.tags
                }
            });
    }
    console.log('Arena problems seeded successfully.');
}
