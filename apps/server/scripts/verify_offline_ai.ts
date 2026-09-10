import { aiService } from '../src/lib/ai/AIService';

async function verifyOfflineCapabilities() {
    console.log('======================================================');
    console.log('   VERIFYING AI CAPABILITIES (ZERO API KEYS)');
    console.log('======================================================\n');

    let passed = 0;
    let failed = 0;

    // Test 1: AI Coach Hint (Practice mode)
    try {
        const hintRes = await aiService.hint({
            code: 'function twoSum(nums, target) { for (let i = 0; i < nums.length; i++) { for (let j = i+1; j < nums.length; j++) { if (nums[i] + nums[j] === target) return [i,j]; } } }',
            language: 'javascript',
            problemTitle: 'Two Sum',
            problemDescription: 'Find two numbers that add up to target'
        });
        console.log('[PASS] 1. AI Coach Hint:');
        console.log('       Provider:', hintRes.providerName);
        console.log('       Focus Area:', hintRes.data.algorithmicFocus);
        console.log('       Hint:', hintRes.data.hint);
        if (hintRes.data?.hint && hintRes.providerName) passed++;
        else { failed++; console.error('Hint data missing'); }
    } catch (err: any) {
        console.error('[FAIL] 1. AI Coach Hint threw:', err.message);
        failed++;
    }

    // Test 2: AI Code Explain
    try {
        const explainRes = await aiService.explain(
            'def is_valid(s):\n    stack = []\n    for c in s:\n        if c == "(": stack.append(c)\n    return len(stack) == 0',
            'python'
        );
        console.log('\n[PASS] 2. AI Code Explanation:');
        console.log('       Provider:', explainRes.providerName);
        console.log('       Explanation Preview:', explainRes.data.slice(0, 100).replace(/\n/g, ' '));
        if (explainRes.data && explainRes.providerName) passed++;
        else { failed++; console.error('Explain data missing'); }
    } catch (err: any) {
        console.error('[FAIL] 2. AI Code Explanation threw:', err.message);
        failed++;
    }

    // Test 3: AI Code Optimizer
    try {
        const optRes = await aiService.optimize({
            code: 'for (let i = 0; i < n; i++) { for (let j = 0; j < n; j++) { console.log(i, j); } }',
            language: 'javascript'
        });
        console.log('\n[PASS] 3. AI Complexity Optimization:');
        console.log('       Provider:', optRes.providerName);
        console.log('       Time Complexity:', optRes.data.timeComplexity);
        console.log('       Explanation:', optRes.data.explanation);
        if (optRes.data?.timeComplexity && optRes.providerName) passed++;
        else { failed++; console.error('Optimize data missing'); }
    } catch (err: any) {
        console.error('[FAIL] 3. AI Complexity Optimization threw:', err.message);
        failed++;
    }

    // Test 4: Voice-to-Code Transformation
    try {
        const voiceRes = await aiService.voiceToCode(
            'create for loop from 0 to 10',
            '',
            'javascript'
        );
        console.log('\n[PASS] 4. Voice Coder Transformation:');
        console.log('       Provider:', voiceRes.providerName);
        console.log('       Confidence:', voiceRes.data.confidence);
        console.log('       Generated Code:\n' + voiceRes.data.code.split('\n').map(l => '         ' + l).join('\n'));
        if (voiceRes.data?.code && voiceRes.providerName) passed++;
        else { failed++; console.error('Voice code missing'); }
    } catch (err: any) {
        console.error('[FAIL] 4. Voice Coder threw:', err.message);
        failed++;
    }

    // Test 5: Voice Coder (Python)
    try {
        const voicePyRes = await aiService.voiceToCode(
            'create a function solve',
            '',
            'python'
        );
        console.log('\n[PASS] 5. Voice Coder (Python Function):');
        console.log('       Generated Code:\n' + voicePyRes.data.code.split('\n').map(l => '         ' + l).join('\n'));
        if (voicePyRes.data?.code) passed++;
        else { failed++; console.error('Voice python code missing'); }
    } catch (err: any) {
        console.error('[FAIL] 5. Voice Coder (Python) threw:', err.message);
        failed++;
    }

    console.log('\n------------------------------------------------------');
    console.log(`TOTAL: ${passed} PASSED, ${failed} FAILED`);
    console.log('------------------------------------------------------\n');
}

verifyOfflineCapabilities();
