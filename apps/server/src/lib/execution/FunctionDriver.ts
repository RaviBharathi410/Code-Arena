export interface FunctionParameter {
    name: string;
    type: string;
}

export interface FunctionProblemMeta {
    problemType: 'function' | 'stdin-stdout';
    functionName?: string;
    returnType?: string;
    parameters?: FunctionParameter[];
}

export interface DriverGenerationInput {
    problem: FunctionProblemMeta;
    userCode: string;
    testCaseInput: string;
    language: string;
}

export interface DriverGenerationResult {
    sourceCode: string;
}

export class FunctionDriver {
    generate(input: DriverGenerationInput): DriverGenerationResult {
        const lang = (input.language || '').toLowerCase();

        if (input.problem.problemType !== 'function') {
            return { sourceCode: input.userCode };
        }

        switch (lang) {
            case 'cpp':
            case 'cpp17':
                return { sourceCode: this.generateCpp(input) };
            case 'c':
                return { sourceCode: this.generateC(input) };
            case 'python':
            case 'python3':
            case 'py':
                return { sourceCode: this.generatePython(input) };
            case 'java':
                return { sourceCode: this.generateJava(input) };
            case 'js':
            case 'javascript':
                return { sourceCode: this.generateJavaScript(input) };
            default:
                return { sourceCode: input.userCode };
        }
    }

    // ─── C++ Driver ──────────────────────────────────────────────────────

    private generateCpp(input: DriverGenerationInput): string {
        const fnName = this.resolveFunctionName(input);
        const params = input.problem.parameters || [];
        const rawArgs = this.parseJsonInput(input.testCaseInput);
        const retType = this.normalizeCppType(input.problem.returnType) || 'int';

        let argDecls = '';
        let callArgs: string[] = [];

        params.forEach((param, idx) => {
            const argVal = rawArgs[idx];
            const argName = param.name || `arg${idx}`;
            const cppType = this.normalizeCppType(param.type);
            const cppVal = this.formatCppValue(argVal, cppType);

            argDecls += `    ${cppType} ${argName} = ${cppVal};\n`;
            callArgs.push(argName);
        });

        const printBlock = this.generateCppPrint(retType);

        return `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <numeric>
#include <unordered_map>
#include <unordered_set>
#include <map>
#include <set>
#include <queue>
#include <stack>
#include <climits>
#include <cmath>
#include <sstream>

using namespace std;

${input.userCode}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

${argDecls}
    Solution solution;
    ${retType} result = solution.${fnName}(${callArgs.join(', ')});

${printBlock}

    return 0;
}
`;
    }

    // ─── C Driver ────────────────────────────────────────────────────────
    //
    // C arrays don't carry a length, so the LeetCode C convention is:
    //   int fn(int* nums, int numsSize, ...)
    // where `numsSize` is always the element count of the preceding array.
    //
    // Strategy:
    //   - Walk params in order, tracking how many testcase values have been consumed.
    //   - For each int* param, declare the array AND a companion <name>Size int.
    //   - If the *next* declared param is a size companion (name ends in Size/Len/Count,
    //     type is int), satisfy it from the real array length (not from testcase input).
    //   - Otherwise inject a hidden _<name>Size local that is still passed in the call.
    //   - All non-array params consume testcase values normally.

    private isSizeCompanion(param: FunctionParameter): boolean {
        const name = (param.name || '').toLowerCase();
        const type = this.normalizeCType(param.type);
        return type === 'int' && (
            name.endsWith('size') ||
            name.endsWith('len') ||
            name.endsWith('length') ||
            name.endsWith('count') ||
            name.endsWith('n')
        );
    }

    private generateC(input: DriverGenerationInput): string {
        const fnName = this.resolveFunctionName(input);
        const params = input.problem.parameters || [];
        const rawArgs = this.parseJsonInput(input.testCaseInput);
        const retType = this.normalizeCType(input.problem.returnType) || 'int';

        let argDecls = '';
        const callArgs: string[] = [];

        // Track which testcase slot we're consuming (separate from param index,
        // because size-companion params don't consume a testcase slot).
        let rawIdx = 0;

        for (let i = 0; i < params.length; i++) {
            const param = params[i];
            const argName = param.name || `arg${i}`;
            const cType = this.normalizeCType(param.type);

            if (cType === 'int*') {
                // Declare the array from the current testcase slot
                const arrVal = rawArgs[rawIdx++];
                const cVal = this.formatCValue(arrVal, 'int*');
                const arrLen = Array.isArray(arrVal) ? arrVal.length : 1;

                argDecls += `    ${cType} ${argName} = ${cVal};\n`;
                callArgs.push(argName);

                // Check whether the next declared param is an explicit size companion
                const nextParam = params[i + 1];
                if (nextParam && this.isSizeCompanion(nextParam)) {
                    // Satisfy the size companion from the real array length.
                    // Do NOT consume a testcase slot for it.
                    const sizeName = nextParam.name || `${argName}Size`;
                    argDecls += `    int ${sizeName} = ${arrLen}; /* auto: length of ${argName} */\n`;
                    callArgs.push(sizeName);
                    i++; // skip the companion param in the outer loop
                } else {
                    // No explicit companion in metadata — inject a hidden local
                    const hiddenSizeName = `_${argName}Size`;
                    argDecls += `    int ${hiddenSizeName} = ${arrLen}; /* auto: length of ${argName} */\n`;
                    callArgs.push(hiddenSizeName);
                }
            } else {
                // Regular scalar or string parameter — consume a testcase slot normally
                const argVal = rawArgs[rawIdx++];
                const cVal = this.formatCValue(argVal, cType);
                argDecls += `    ${cType} ${argName} = ${cVal};\n`;
                callArgs.push(argName);
            }
        }

        const printBlock = this.generateCPrint(retType);

        return `#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include <math.h>
#include <limits.h>

${input.userCode}

int main() {
${argDecls}
    ${retType} result = ${fnName}(${callArgs.join(', ')});

${printBlock}

    return 0;
}
`;
    }

    private normalizeCType(typeStr?: string): string {
        if (!typeStr) return 'int';
        const t = typeStr.trim();
        if (t === 'List[int]' || t === 'int[]' || t === 'vector<int>') return 'int*';
        if (t === 'str' || t === 'String' || t === 'string' || t === 'char*') return 'char*';
        if (t === 'bool' || t === 'boolean') return 'bool';
        if (t === 'long' || t === 'long long') return 'long long';
        if (t === 'double' || t === 'float') return t;
        return t;
    }

    private formatCValue(val: any, typeStr: string): string {
        if (typeStr === 'int*') {
            if (!Array.isArray(val)) return '(int[]){0}';
            return `(int[]){${val.join(',')}}`;
        }
        if (typeStr === 'char*') {
            return `"${String(val).replace(/"/g, '\\"')}"`;
        }
        if (typeStr === 'bool') {
            return val ? 'true' : 'false';
        }
        return String(val);
    }

    private generateCPrint(retType: string): string {
        if (retType === 'bool') {
            return '    printf("%s\\n", result ? "true" : "false");';
        }
        if (retType === 'char*') {
            return '    printf("%s\\n", result);';
        }
        if (retType === 'double' || retType === 'float') {
            return '    printf("%f\\n", result);';
        }
        if (retType === 'long long') {
            return '    printf("%lld\\n", result);';
        }
        return '    printf("%d\\n", result);';
    }

    // ─── Python Driver ───────────────────────────────────────────────────

    private generatePython(input: DriverGenerationInput): string {
        const fnName = this.resolveFunctionName(input);
        const rawArgs = this.parseJsonInput(input.testCaseInput);
        // Escape backslashes and single quotes in JSON for safe embedding
        const jsonArgs = JSON.stringify(rawArgs).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

        return `import sys
import json
import math
from typing import List, Dict, Set, Optional, Tuple, Any

${input.userCode}

if __name__ == '__main__':
    args = json.loads('${jsonArgs}')
    res = None
    if 'Solution' in globals():
        solution = Solution()
        if hasattr(solution, '${fnName}'):
            res = getattr(solution, '${fnName}')(*args)
    if res is None and '${fnName}' in globals() and callable(globals()['${fnName}']):
        res = globals()['${fnName}'](*args)
    if isinstance(res, bool):
        print(str(res).lower())
    elif isinstance(res, list):
        print(json.dumps(res, separators=(',', ':')))
    elif res is None:
        print("null")
    elif isinstance(res, str):
        print(json.dumps(res))
    else:
        print(res)
`;
    }

    // ─── Java Driver ─────────────────────────────────────────────────────

    private generateJava(input: DriverGenerationInput): string {
        const fnName = this.resolveFunctionName(input);
        const params = input.problem.parameters || [];
        const rawArgs = this.parseJsonInput(input.testCaseInput);
        console.log('[FunctionDriver][Java] testCaseInput:', input.testCaseInput);
        console.log('[FunctionDriver][Java] rawArgs:', JSON.stringify(rawArgs));
        const retType = this.normalizeJavaType(input.problem.returnType) || 'int';

        let argDecls = '';
        let callArgs: string[] = [];

        params.forEach((param, idx) => {
            const argVal = rawArgs[idx];
            const argName = param.name || `arg${idx}`;
            const javaType = this.normalizeJavaType(param.type);
            const javaVal = this.formatJavaValue(argVal, javaType);

            argDecls += `        ${javaType} ${argName} = ${javaVal};\n`;
            callArgs.push(argName);
        });

        const printBlock = this.generateJavaPrint(retType);

        return `import java.util.*;
import java.io.*;

${input.userCode}

public class Main {
    public static void main(String[] args) {
${argDecls}
        Solution solution = new Solution();
        ${retType} result = solution.${fnName}(${callArgs.join(', ')});
${printBlock}
    }
}
`;
    }

    // ─── JavaScript Driver ───────────────────────────────────────────────

    private generateJavaScript(input: DriverGenerationInput): string {
        const fnName = this.resolveFunctionName(input);
        const rawArgs = this.parseJsonInput(input.testCaseInput);
        const jsonArgs = JSON.stringify(rawArgs);

        return `${input.userCode}

const __args = ${jsonArgs};
let __res;
if (typeof ${fnName} === 'function') {
    __res = ${fnName}(...__args);
} else if (typeof Solution !== 'undefined') {
    const __sol = new Solution();
    if (typeof __sol.${fnName} === 'function') {
        __res = __sol.${fnName}(...__args);
    }
}
if (typeof __res === 'boolean') {
    console.log(__res ? 'true' : 'false');
} else if (Array.isArray(__res)) {
    console.log(JSON.stringify(__res));
} else if (__res === null || __res === undefined) {
    console.log('null');
} else {
    console.log(__res);
}
`;
    }

    // ─── Helpers ─────────────────────────────────────────────────────────

    private resolveFunctionName(input: DriverGenerationInput): string {
        if (input.problem.functionName && input.problem.functionName.trim()) {
            return input.problem.functionName.trim();
        }
        // Extract function name from user code or boilerplate
        // JS/TS: function twoSum(...) or const twoSum = ... or twoSum: function(...)
        const jsMatch = input.userCode.match(/(?:function\s+([a-zA-Z0-9_$]+)|(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=)/);
        if (jsMatch && (jsMatch[1] || jsMatch[2])) {
            return jsMatch[1] || jsMatch[2];
        }
        // Python: def two_sum(...) or def twoSum(...)
        const pyMatch = input.userCode.match(/def\s+([a-zA-Z0-9_]+)\s*\(/);
        if (pyMatch && pyMatch[1]) {
            return pyMatch[1];
        }
        // Java/C++: type functionName(...)
        const cppMatch = input.userCode.match(/(?:int|void|string|vector<[^>]+>|bool|double|float|long)\s+([a-zA-Z0-9_]+)\s*\(/);
        if (cppMatch && cppMatch[1] && cppMatch[1] !== 'main') {
            return cppMatch[1];
        }
        return 'solve';
    }

    private parseJsonInput(inputStr: string): any[] {
        if (!inputStr || typeof inputStr !== 'string') return [];
        try {
            const parsed = JSON.parse(inputStr);
            return Array.isArray(parsed) ? parsed : [parsed];
        } catch {
            // Multi-line or newline-separated inputs: e.g. "[2,7,11,15]\n9"
            const lines = inputStr.trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean);
            if (lines.length > 1) {
                const parsedLines = lines.map(line => {
                    try {
                        return JSON.parse(line);
                    } catch {
                        return line;
                    }
                });
                return parsedLines;
            }
            return [inputStr.trim()];
        }
    }

    private normalizeCppType(typeStr?: string): string {
        if (!typeStr) return 'int';
        const t = typeStr.trim();
        // Python-style type hints
        if (t === 'List[int]') return 'vector<int>';
        if (t === 'List[str]' || t === 'List[string]') return 'vector<string>';
        if (t === 'List[List[int]]') return 'vector<vector<int>>';
        if (t === 'List[bool]') return 'vector<bool>';
        // C++ native types
        if (t === 'vector<int>' || t === 'vector<string>' || t === 'vector<vector<int>>') return t;
        if (t === 'str' || t === 'string' || t === 'String') return 'string';
        if (t === 'bool' || t === 'boolean') return 'bool';
        if (t === 'int' || t === 'long' || t === 'long long' || t === 'double' || t === 'float') return t;
        return t;
    }

    private formatCppValue(val: any, typeStr: string): string {
        if (typeStr.startsWith('vector<vector<')) {
            if (!Array.isArray(val)) return '{}';
            const inner = val.map((row: any) => `{${Array.isArray(row) ? row.join(',') : ''}}`).join(',');
            return `{${inner}}`;
        }
        if (typeStr.startsWith('vector<')) {
            if (!Array.isArray(val)) return '{}';
            if (typeStr.includes('string')) {
                return `{${val.map((v: any) => `"${String(v).replace(/"/g, '\\"')}"`).join(',')}}`;
            }
            if (typeStr.includes('bool')) {
                return `{${val.map((v: any) => v ? 'true' : 'false').join(',')}}`;
            }
            return `{${val.join(',')}}`;
        }
        if (typeStr === 'string') {
            return `"${String(val).replace(/"/g, '\\"')}"`;
        }
        if (typeStr === 'bool') {
            return val ? 'true' : 'false';
        }
        return String(val);
    }

    private generateCppPrint(retType: string): string {
        if (retType === 'bool') {
            return '    cout << (result ? "true" : "false") << "\\n";';
        }
        if (retType === 'string') {
            return '    cout << "\\\"" << result << "\\\"" << "\\n";';
        }
        if (retType.startsWith('vector<vector<')) {
            return `    cout << "[";
    for (int __i = 0; __i < (int)result.size(); __i++) {
        if (__i > 0) cout << ",";
        cout << "[";
        for (int __j = 0; __j < (int)result[__i].size(); __j++) {
            if (__j > 0) cout << ",";
            cout << result[__i][__j];
        }
        cout << "]";
    }
    cout << "]" << "\\n";`;
        }
        if (retType.startsWith('vector<')) {
            return `    cout << "[";
    for (int __i = 0; __i < (int)result.size(); __i++) {
        if (__i > 0) cout << ",";
        cout << result[__i];
    }
    cout << "]" << "\\n";`;
        }
        // int, long, double, etc.
        return '    cout << result << "\\n";';
    }

    private normalizeJavaType(typeStr?: string): string {
        if (!typeStr) return 'int';
        const t = typeStr.trim();
        if (t === 'List[int]' || t === 'int[]' || t === 'vector<int>') return 'int[]';
        if (t === 'List[List[int]]' || t === 'int[][]' || t === 'vector<vector<int>>') return 'int[][]';
        if (t === 'List[str]' || t === 'String[]' || t === 'vector<string>') return 'String[]';
        if (t === 'str' || t === 'String' || t === 'string') return 'String';
        if (t === 'bool' || t === 'boolean') return 'boolean';
        if (t === 'long' || t === 'long long') return 'long';
        if (t === 'double' || t === 'float') return t;
        return t;
    }

    private formatJavaValue(val: any, typeStr: string): string {
        if (typeStr === 'int[][]') {
            if (!Array.isArray(val)) return 'new int[][]{}';
            const rows = val.map((row: any) => `{${Array.isArray(row) ? row.join(',') : ''}}`).join(',');
            return `new int[][]{${rows}}`;
        }
        if (typeStr === 'int[]') {
            if (!Array.isArray(val)) return 'new int[]{}';
            return `new int[]{${val.join(',')}}`;
        }
        if (typeStr === 'String[]') {
            if (!Array.isArray(val)) return 'new String[]{}';
            return `new String[]{${val.map((v: any) => `"${String(v).replace(/"/g, '\\"')}"`).join(',')}}`;
        }
        if (typeStr === 'String') {
            return `"${String(val).replace(/"/g, '\\"')}"`;
        }
        if (typeStr === 'boolean') {
            return val ? 'true' : 'false';
        }
        return String(val);
    }

    private generateJavaPrint(retType: string): string {
        if (retType === 'boolean') {
            return '        System.out.println(result ? "true" : "false");';
        }
        if (retType === 'int[]') {
            return '        System.out.println(Arrays.toString(result).replace(" ", ""));';
        }
        if (retType === 'int[][]') {
            return `        StringBuilder sb = new StringBuilder("[");
        for (int __i = 0; __i < result.length; __i++) {
            if (__i > 0) sb.append(",");
            sb.append(Arrays.toString(result[__i]).replace(" ", ""));
        }
        sb.append("]");
        System.out.println(sb.toString());`;
        }
        if (retType === 'String') {
            return '        System.out.println("\\"" + result + "\\"");';
        }
        return '        System.out.println(result);';
    }
}

export const functionDriver = new FunctionDriver();

