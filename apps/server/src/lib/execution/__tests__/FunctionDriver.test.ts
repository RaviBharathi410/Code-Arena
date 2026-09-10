import { FunctionDriver } from '../FunctionDriver';

describe('FunctionDriver - Multi-Language Validation', () => {
    const driver = new FunctionDriver();

    const problem = {
        problemType: 'function',
        functionName: 'maxSumTwoNoOverlap',
        returnType: 'int',
        parameters: [
            { name: 'nums', type: 'vector<int>' },
            { name: 'firstLen', type: 'int' },
            { name: 'secondLen', type: 'int' },
        ],
    };

    const testCaseInput = '[[0,6,5,2,2,5,1,9,4], 1, 2]';

    describe('C++ driver', () => {
        const userCode = 'class Solution { public: int maxSumTwoNoOverlap(vector<int>& nums, int firstLen, int secondLen) { return 0; } };';
        test('generates compilable C++ with correct includes and main()', () => {
            const res = driver.generate({ problem, userCode, testCaseInput, language: 'cpp17' });
            expect(res.sourceCode).toContain('#include <iostream>');
            expect(res.sourceCode).toContain('#include <vector>');
            expect(res.sourceCode).toContain('int main()');
        });
        test('generates correct parameter declarations', () => {
            const res = driver.generate({ problem, userCode, testCaseInput, language: 'cpp17' });
            expect(res.sourceCode).toContain('vector<int> nums = {0,6,5,2,2,5,1,9,4};');
            expect(res.sourceCode).toContain('int firstLen = 1;');
            expect(res.sourceCode).toContain('int secondLen = 2;');
        });
        test('generates correct function call', () => {
            const res = driver.generate({ problem, userCode, testCaseInput, language: 'cpp17' });
            expect(res.sourceCode).toContain('solution.maxSumTwoNoOverlap(nums, firstLen, secondLen)');
        });
        test('prints int result directly', () => {
            const res = driver.generate({ problem, userCode, testCaseInput, language: 'cpp17' });
            expect(res.sourceCode).toContain('cout << result << "\\n"');
        });
    });

    describe('Python driver', () => {
        const userCode = 'class Solution:\n    def maxSumTwoNoOverlap(self, nums, firstLen, secondLen):\n        return 0';
        test('generates valid Python with imports', () => {
            const res = driver.generate({ problem, userCode, testCaseInput, language: 'python3' });
            expect(res.sourceCode).toContain('import json');
            expect(res.sourceCode).toContain('from typing import List');
            expect(res.sourceCode).toContain('solution = Solution()');
        });
        test('calls function via getattr', () => {
            const res = driver.generate({ problem, userCode, testCaseInput, language: 'python3' });
            expect(res.sourceCode).toContain("getattr(solution, 'maxSumTwoNoOverlap')(*args)");
        });
    });

    describe('Java driver', () => {
        const userCode = 'class Solution {\n    public int maxSumTwoNoOverlap(int[] nums, int firstLen, int secondLen) { return 0; }\n}';
        test('generates valid Java with Main class', () => {
            const res = driver.generate({ problem, userCode, testCaseInput, language: 'java' });
            expect(res.sourceCode).toContain('public class Main');
            expect(res.sourceCode).toContain('public static void main(String[] args)');
        });
        test('generates correct Java parameter declarations', () => {
            const res = driver.generate({ problem, userCode, testCaseInput, language: 'java' });
            expect(res.sourceCode).toContain('int[] nums = new int[]{0,6,5,2,2,5,1,9,4};');
            expect(res.sourceCode).toContain('int firstLen = 1;');
        });
        test('calls Solution method and prints result', () => {
            const res = driver.generate({ problem, userCode, testCaseInput, language: 'java' });
            expect(res.sourceCode).toContain('solution.maxSumTwoNoOverlap(nums, firstLen, secondLen)');
            expect(res.sourceCode).toContain('System.out.println(result)');
        });
    });

    describe('JavaScript driver', () => {
        const userCode = 'var maxSumTwoNoOverlap = function(nums, firstLen, secondLen) { return 0; };';
        test('generates JS driver that calls standalone function', () => {
            const res = driver.generate({ problem, userCode, testCaseInput, language: 'javascript' });
            expect(res.sourceCode).toContain('const __args =');
            expect(res.sourceCode).toContain("typeof maxSumTwoNoOverlap === 'function'");
            expect(res.sourceCode).toContain('maxSumTwoNoOverlap(...__args)');
        });
    });

    describe('C driver', () => {
        const cProblemExplicitSize = {
            problemType: 'function',
            functionName: 'maxSumTwoNoOverlap',
            returnType: 'int',
            parameters: [
                { name: 'A', type: 'int*' },
                { name: 'ASize', type: 'int' },
                { name: 'L', type: 'int' },
                { name: 'M', type: 'int' },
            ],
        };
        const cUserCode = 'int maxSumTwoNoOverlap(int* A, int ASize, int L, int M) { return 0; }';

        test('generates correct C includes', () => {
            const res = driver.generate({
                problem: cProblemExplicitSize, userCode: cUserCode,
                testCaseInput: '[[0,6,5,2,2,5,1,9,4], 1, 2]', language: 'c',
            });
            expect(res.sourceCode).toContain('#include <stdio.h>');
            expect(res.sourceCode).toContain('#include <stdlib.h>');
            expect(res.sourceCode).toContain('int main()');
        });

        test('derives ASize from actual array length - 9 elements', () => {
            const res = driver.generate({
                problem: cProblemExplicitSize, userCode: cUserCode,
                testCaseInput: '[[0,6,5,2,2,5,1,9,4], 1, 2]', language: 'c',
            });
            expect(res.sourceCode).toContain('int* A = (int[]){0,6,5,2,2,5,1,9,4};');
            expect(res.sourceCode).toContain('int ASize = 9;');
            expect(res.sourceCode).toContain('int L = 1;');
            expect(res.sourceCode).toContain('int M = 2;');
        });

        test('derives ASize from actual array length - 3 elements', () => {
            const res = driver.generate({
                problem: cProblemExplicitSize, userCode: cUserCode,
                testCaseInput: '[[1,2,3], 1, 1]', language: 'c',
            });
            expect(res.sourceCode).toContain('int* A = (int[]){1,2,3};');
            expect(res.sourceCode).toContain('int ASize = 3;');
            expect(res.sourceCode).toContain('int L = 1;');
            expect(res.sourceCode).toContain('int M = 1;');
        });

        test('generates correct function call with all four args', () => {
            const res = driver.generate({
                problem: cProblemExplicitSize, userCode: cUserCode,
                testCaseInput: '[[0,6,5,2,2,5,1,9,4], 1, 2]', language: 'c',
            });
            expect(res.sourceCode).toContain('maxSumTwoNoOverlap(A, ASize, L, M)');
        });

        test('injects hidden _numsSize when no size companion declared', () => {
            const cProblemHiddenSize = {
                problemType: 'function',
                functionName: 'sumArray',
                returnType: 'int',
                parameters: [
                    { name: 'nums', type: 'int*' },
                    { name: 'target', type: 'int' },
                ],
            };
            const res = driver.generate({
                problem: cProblemHiddenSize,
                userCode: 'int sumArray(int* nums, int _numsSize, int target) { return 0; }',
                testCaseInput: '[[1,2,3,4], 6]', language: 'c',
            });
            expect(res.sourceCode).toContain('int* nums = (int[]){1,2,3,4};');
            expect(res.sourceCode).toContain('int _numsSize = 4;');
            expect(res.sourceCode).toContain('int target = 6;');
            expect(res.sourceCode).toContain('sumArray(nums, _numsSize, target)');
        });

        test('handles two int* params with their own size companions', () => {
            const twoPtrProblem = {
                problemType: 'function',
                functionName: 'mergeTwoArrays',
                returnType: 'int',
                parameters: [
                    { name: 'a', type: 'int*' },
                    { name: 'aSize', type: 'int' },
                    { name: 'b', type: 'int*' },
                    { name: 'bSize', type: 'int' },
                ],
            };
            const res = driver.generate({
                problem: twoPtrProblem,
                userCode: 'int mergeTwoArrays(int* a, int aSize, int* b, int bSize) { return 0; }',
                testCaseInput: '[[1,2,3], [4,5]]', language: 'c',
            });
            expect(res.sourceCode).toContain('int* a = (int[]){1,2,3};');
            expect(res.sourceCode).toContain('int aSize = 3;');
            expect(res.sourceCode).toContain('int* b = (int[]){4,5};');
            expect(res.sourceCode).toContain('int bSize = 2;');
            expect(res.sourceCode).toContain('mergeTwoArrays(a, aSize, b, bSize)');
        });

        test('handles scalar-only C function with no Size vars', () => {
            const scalarProblem = {
                problemType: 'function',
                functionName: 'add',
                returnType: 'int',
                parameters: [
                    { name: 'x', type: 'int' },
                    { name: 'y', type: 'int' },
                ],
            };
            const res = driver.generate({
                problem: scalarProblem,
                userCode: 'int add(int x, int y) { return x + y; }',
                testCaseInput: '[3, 4]', language: 'c',
            });
            expect(res.sourceCode).toContain('int x = 3;');
            expect(res.sourceCode).toContain('int y = 4;');
            expect(res.sourceCode).toContain('add(x, y)');
            expect(res.sourceCode).not.toContain('Size');
        });

        test('prints int result with printf', () => {
            const res = driver.generate({
                problem: cProblemExplicitSize, userCode: cUserCode,
                testCaseInput: '[[0,6,5,2,2,5,1,9,4], 1, 2]', language: 'c',
            });
            expect(res.sourceCode).toContain('printf("%d\\n", result)');
        });
    });

    describe('stdin-stdout passthrough', () => {
        test('returns userCode unchanged', () => {
            const stdinProblem = { problemType: 'stdin-stdout' };
            const code = '#include <iostream>\nint main() { return 0; }';
            const res = driver.generate({ problem: stdinProblem, userCode: code, testCaseInput: '10 20', language: 'cpp17' });
            expect(res.sourceCode).toBe(code);
        });
    });

    describe('Edge cases', () => {
        test('handles missing parameters gracefully', () => {
            const minimalProblem = { problemType: 'function', functionName: 'twoSum' };
            const res = driver.generate({
                problem: minimalProblem,
                userCode: 'class Solution { public: int twoSum() { return 0; } };',
                testCaseInput: '[]', language: 'cpp17',
            });
            expect(res.sourceCode).toContain('int main()');
            expect(res.sourceCode).toContain('solution.twoSum()');
        });

        test('handles bool return type in C++', () => {
            const boolProblem = {
                problemType: 'function', functionName: 'isPalindrome',
                returnType: 'bool', parameters: [{ name: 'x', type: 'int' }],
            };
            const res = driver.generate({
                problem: boolProblem,
                userCode: 'class Solution { public: bool isPalindrome(int x) { return true; } };',
                testCaseInput: '[121]', language: 'cpp17',
            });
            expect(res.sourceCode).toContain('bool result =');
            expect(res.sourceCode).toContain('result ? "true" : "false"');
        });

        test('handles vector<int> return type in C++', () => {
            const vecProblem = {
                problemType: 'function', functionName: 'twoSum',
                returnType: 'vector<int>',
                parameters: [{ name: 'nums', type: 'vector<int>' }, { name: 'target', type: 'int' }],
            };
            const res = driver.generate({
                problem: vecProblem,
                userCode: 'class Solution { public: vector<int> twoSum(vector<int>& nums, int target) { return {0,1}; } };',
                testCaseInput: '[[2,7,11,15], 9]', language: 'cpp17',
            });
            expect(res.sourceCode).toContain('vector<int> result =');
            expect(res.sourceCode).toContain('cout << "["');
        });
    });
});
