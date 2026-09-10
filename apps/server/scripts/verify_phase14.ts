import '../src/config/env';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db';
import { redis } from '../src/lib/redis';
import { User } from '../src/models/User';
import { Problem } from '../src/models/Problem';
import { MatchRoom } from '../src/models/MatchRoom';
import { Submission } from '../src/models/Submission';
import { skillDataService } from '../src/modules/skills/skill-data.service';
import { practiceService } from '../src/modules/practice/practice.service';
import { matchesService } from '../src/modules/matches/matches.service';
import { leaderboardService } from '../src/modules/leaderboard/leaderboard.service';
import { aiService } from '../src/lib/ai/AIService';
import { blockActiveRankedMatches } from '../src/modules/ai/ai.router';

interface TestResult {
    name: string;
    passed: boolean;
    details?: any;
    error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, testName: string, details?: any) {
    if (condition) {
        results.push({ name: testName, passed: true, details });
        console.log(`  ✅ PASS: ${testName}`);
    } else {
        results.push({ name: testName, passed: false, details });
        console.error(`  ❌ FAIL: ${testName}`, details || '');
    }
}

async function runPhase14Verification() {
    console.log('\n======================================================');
    console.log('   CODEARENA PHASE 14 AUTOMATED VERIFICATION SUITE');
    console.log('======================================================\n');

    await connectDB();

    const timestamp = Date.now();
    const testPrefix = `p14_${timestamp}`;

    try {
        // -------------------------------------------------------------
        // Test 1: Cold-Start Defaults & Progressive Calibration (14G)
        // -------------------------------------------------------------
        console.log('\n[14G] Testing Cold-Start Defaults & Progressive Calibration...');
        const newUser = await User.create({
            username: `${testPrefix}_coldstart`,
            email: `${testPrefix}_coldstart@test.com`,
            passwordHash: 'dummyhash',
            rankRating: 1200,
            tier: 'PLACEMENT',
            placementMatchesRemaining: 5,
            isCalibrated: false,
        });

        const coldVector = await skillDataService.getSkillVector((newUser._id as any).toString());
        assert(coldVector.hasData === false, 'Cold start user hasData is false', { hasData: coldVector.hasData });
        assert(coldVector.isCalibrated === false, 'Cold start user isCalibrated is false', { isCalibrated: coldVector.isCalibrated });
        assert(coldVector.radarPoints.every(p => p.value === 0), 'Cold start user radarPoints are all 0', { points: coldVector.radarPoints });

        const coldWeakness = await skillDataService.getWeakness((newUser._id as any).toString());
        assert(coldWeakness.isDiagnostic === true, 'Cold start weakness is marked as diagnostic', { isDiagnostic: coldWeakness.isDiagnostic });
        assert(coldWeakness.reason === 'MAPPING_UNTRACKED_CATEGORY', 'Cold start weakness reason is MAPPING_UNTRACKED_CATEGORY', { reason: coldWeakness.reason });

        const calibSet = await practiceService.getCalibrationSet();
        assert(calibSet.length >= 1 && calibSet.length <= 3, 'Calibration set returns 1-3 foundational problems', { count: calibSet.length });

        // -------------------------------------------------------------
        // Test 2: Cross-Source Skill Aggregation (14D)
        // -------------------------------------------------------------
        console.log('\n[14D] Testing Cross-Source Skill Aggregation (Practice + Ranked)...');
        // Seed or find problems in 'arrays' and 'strings'
        let arrayProb = await Problem.findOne({ category: 'arrays' });
        if (!arrayProb) {
            arrayProb = await Problem.create({
                slug: `${testPrefix}_arrays_prob`,
                title: 'Array Master',
                difficulty: 'EASY',
                category: 'arrays',
                description: 'Array challenge',
                constraints: 'None',
                problemType: 'function',
                boilerplate: { javascript: 'function solve() {}' }
            });
        }

        let stringProb = await Problem.findOne({ category: 'strings' });
        if (!stringProb) {
            stringProb = await Problem.create({
                slug: `${testPrefix}_strings_prob`,
                title: 'String Master',
                difficulty: 'MEDIUM',
                category: 'strings',
                description: 'String challenge',
                constraints: 'None',
                problemType: 'function',
                boilerplate: { javascript: 'function solve() {}' }
            });
        }

        // Create practice and ranked rooms to anchor submissions
        const practiceRoom = await MatchRoom.create({
            roomCode: `PRAC_${timestamp}`,
            mode: 'practice',
            player1Id: newUser._id,
            problemId: arrayProb._id,
            status: 'finished',
        });
        const rankedRoom = await MatchRoom.create({
            roomCode: `RNK_SKILL_${timestamp}`,
            mode: 'ranked',
            player1Id: newUser._id,
            problemId: stringProb._id,
            status: 'finished',
        });

        // Create 1 practice submission (arrays: ACCEPTED)
        await Submission.create({
            matchId: practiceRoom._id,
            problemId: arrayProb._id,
            userId: newUser._id,
            code: 'console.log("practice solve");',
            language: 'javascript',
            status: 'ACCEPTED',
            testCasesPass: 5,
            testCasesTotal: 5,
            timeMs: 120,
        });

        // Create 1 ranked submission (strings: WRONG_ANSWER)
        await Submission.create({
            matchId: rankedRoom._id,
            problemId: stringProb._id,
            userId: newUser._id,
            code: 'console.log("ranked solve");',
            language: 'javascript',
            status: 'WRONG_ANSWER',
            testCasesPass: 2,
            testCasesTotal: 5,
            timeMs: 250,
        });

        const aggregatedVector = await skillDataService.getSkillVector((newUser._id as any).toString());
        assert(aggregatedVector.hasData === true, 'Skill vector hasData is true after submissions', { hasData: aggregatedVector.hasData });

        const arrayCategory = aggregatedVector.categories['arrays'];
        assert(arrayCategory !== undefined && arrayCategory.attempts === 1, 'Arrays category captured 1 practice attempt', arrayCategory);
        assert(arrayCategory?.status === 'CALIBRATING', 'Arrays category has status CALIBRATING (1 attempt)', { status: arrayCategory?.status });
        assert(arrayCategory?.passRate === 100, 'Arrays category passRate is 100%', { passRate: arrayCategory?.passRate });

        const stringCategory = aggregatedVector.categories['strings'];
        assert(stringCategory !== undefined && stringCategory.attempts === 1, 'Strings category captured 1 ranked attempt', stringCategory);
        assert(stringCategory?.passRate === 0, 'Strings category passRate is 0%', { passRate: stringCategory?.passRate });

        // Deep Cross-Source Aggregation: blend practice and ranked submissions in the SAME category (arrays)
        // User now has: 1 practice pass in arrays.
        // Add 1 ranked FAIL in arrays + 1 practice PASS in arrays.
        const rankedArrayRoom = await MatchRoom.create({
            roomCode: `RNK_ARRAY_${timestamp}`,
            mode: 'ranked',
            player1Id: newUser._id,
            problemId: arrayProb._id,
            status: 'finished',
        });

        await Submission.create({
            matchId: rankedArrayRoom._id,
            problemId: arrayProb._id,
            userId: newUser._id,
            code: 'solve2_ranked_fail',
            language: 'javascript',
            status: 'WRONG_ANSWER',
            testCasesPass: 2,
            testCasesTotal: 5,
            timeMs: 110,
        });

        await Submission.create({
            matchId: practiceRoom._id,
            problemId: arrayProb._id,
            userId: newUser._id,
            code: 'solve3_practice_pass',
            language: 'javascript',
            status: 'ACCEPTED',
            testCasesPass: 5,
            testCasesTotal: 5,
            timeMs: 90,
        });

        const calibratedVector = await skillDataService.getSkillVector((newUser._id as any).toString());
        const updatedArrayCat = calibratedVector.categories['arrays'];
        assert(updatedArrayCat?.attempts === 3, 'Arrays category aggregates exactly 3 attempts across both practice and ranked streams', {
            attempts: updatedArrayCat?.attempts
        });
        assert(updatedArrayCat?.passed === 2, 'Arrays category aggregates exactly 2 passes across practice and ranked streams', {
            passed: updatedArrayCat?.passed
        });
        assert(updatedArrayCat?.passRate === 67, 'Arrays category computes unified pass rate blending practice and ranked (67%)', {
            passRate: updatedArrayCat?.passRate
        });
        assert(updatedArrayCat?.status === 'CALIBRATED', 'Arrays category reaches CALIBRATED with >= 3 combined cross-source attempts', {
            status: updatedArrayCat?.status
        });

        // -------------------------------------------------------------
        // Test 3: Practice Lab Modes Configuration (14A)
        // -------------------------------------------------------------
        console.log('\n[14A] Testing Practice Lab Modes (Speed, Focus, Adaptive, Coach)...');
        const speedSession = await practiceService.getPracticeSession('speed', (newUser._id as any).toString());
        assert(speedSession.mode === 'speed', 'Speed run returns mode speed', { mode: speedSession.mode });
        assert(speedSession.timeLimitSeconds === 600, 'Speed run sets 600s time limit', { timeLimit: speedSession.timeLimitSeconds });
        assert(speedSession.problems.length > 0, 'Speed run problems list is populated', { count: speedSession.problems.length });

        const focusSession = await practiceService.getPracticeSession('focus', (newUser._id as any).toString());
        assert(focusSession.mode === 'focus', 'Deep focus returns mode focus', { mode: focusSession.mode });
        assert(focusSession.timeLimitSeconds === undefined, 'Deep focus has no cumulative timer', { timeLimit: focusSession.timeLimitSeconds });

        const adaptiveSession = await practiceService.getPracticeSession('adaptive', (newUser._id as any).toString());
        assert(adaptiveSession.mode === 'adaptive', 'Weakness fix returns mode adaptive', { mode: adaptiveSession.mode });
        assert(adaptiveSession.targetCategory !== undefined, 'Weakness fix assigns targetCategory', { category: adaptiveSession.targetCategory });

        const coachSession = await practiceService.getPracticeSession('coach', (newUser._id as any).toString());
        assert(coachSession.mode === 'coach', 'AI coach mode returns mode coach', { mode: coachSession.mode });

        // -------------------------------------------------------------
        // Test 4: Private Room 0 RP Delta (14F / 14E)
        // -------------------------------------------------------------
        console.log('\n[14F] Testing Private / Practice Room 0 RP Guarantee...');
        const userA = await User.create({
            username: `${testPrefix}_p1`,
            email: `${testPrefix}_p1@test.com`,
            passwordHash: 'dummyhash',
            rankRating: 1200,
            tier: 'PLACEMENT',
            placementMatchesRemaining: 5,
        });
        const userB = await User.create({
            username: `${testPrefix}_p2`,
            email: `${testPrefix}_p2@test.com`,
            passwordHash: 'dummyhash',
            rankRating: 1200,
            tier: 'PLACEMENT',
            placementMatchesRemaining: 5,
        });

        // Custom room
        const customRoom = await MatchRoom.create({
            roomCode: `CR_${timestamp}`,
            mode: 'custom',
            player1Id: userA._id,
            player2Id: userB._id,
            problemId: arrayProb._id,
            status: 'finished',
            winnerId: userA._id,
        });

        const customDeltas = await matchesService.updateRankings(customRoom as any);
        assert(customDeltas.deltaA === 0 && customDeltas.deltaB === 0, 'Custom / Casual room gives strictly 0 RP delta', customDeltas);

        const freshUserA = await User.findById(userA._id);
        assert(freshUserA?.rankRating === 1200, 'User A rankRating unchanged after custom match', { rating: freshUserA?.rankRating });

        // -------------------------------------------------------------
        // Test 5: Scoring & Elo Math (Placement vs Post-Placement) (14F)
        // -------------------------------------------------------------
        console.log('\n[14F] Testing Elo Rating Updates with K=64 (Placement) vs K=32 (Post-Placement)...');
        // Match 1: Ranked match between two placement users (1200 vs 1200)
        const rankedRoomPlacement = await MatchRoom.create({
            roomCode: `RNK1_${timestamp}`,
            mode: 'ranked',
            player1Id: userA._id,
            player2Id: userB._id,
            problemId: arrayProb._id,
            status: 'finished',
            winnerId: userA._id,
        });

        const placementDeltas = await matchesService.updateRankings(rankedRoomPlacement as any);
        // At 1200 vs 1200, expected score is 0.5. With K=64, delta = 64 * (1 - 0.5) = +32 for winner, -32 for loser
        assert(placementDeltas.deltaA === 32, 'Placement winner delta is +32 with K=64', { deltaA: placementDeltas.deltaA });
        assert(placementDeltas.deltaB === -32, 'Placement loser delta is -32 with K=64', { deltaB: placementDeltas.deltaB });

        const afterP1UserA = await User.findById(userA._id);
        assert(afterP1UserA?.placementMatchesRemaining === 4, 'Placement matches remaining decremented to 4', { remaining: afterP1UserA?.placementMatchesRemaining });

        // Test Post-Placement with K=32
        const postPlacementUserA = await User.create({
            username: `${testPrefix}_postA`,
            email: `${testPrefix}_postA@test.com`,
            passwordHash: 'dummyhash',
            rankRating: 1400,
            tier: 'GOLD',
            placementMatchesRemaining: 0,
        });
        const postPlacementUserB = await User.create({
            username: `${testPrefix}_postB`,
            email: `${testPrefix}_postB@test.com`,
            passwordHash: 'dummyhash',
            rankRating: 1400,
            tier: 'GOLD',
            placementMatchesRemaining: 0,
        });

        const rankedRoomPost = await MatchRoom.create({
            roomCode: `RNK2_${timestamp}`,
            mode: 'ranked',
            player1Id: postPlacementUserA._id,
            player2Id: postPlacementUserB._id,
            problemId: arrayProb._id,
            status: 'finished',
            winnerId: postPlacementUserA._id,
        });

        const postDeltas = await matchesService.updateRankings(rankedRoomPost as any);
        // At 1400 vs 1400, expected score is 0.5. With K=32, delta = 32 * (1 - 0.5) = +16 for winner, -16 for loser
        assert(postDeltas.deltaA === 16, 'Post-placement winner delta is +16 with K=32', { deltaA: postDeltas.deltaA });
        assert(postDeltas.deltaB === -16, 'Post-placement loser delta is -16 with K=32', { deltaB: postDeltas.deltaB });

        // Test Draw Handling (S = 0.5)
        const drawUserA = await User.create({
            username: `${testPrefix}_drawA`,
            email: `${testPrefix}_drawA@test.com`,
            passwordHash: 'dummyhash',
            rankRating: 1400,
            tier: 'GOLD',
            placementMatchesRemaining: 0,
        });
        const drawUserB = await User.create({
            username: `${testPrefix}_drawB`,
            email: `${testPrefix}_drawB@test.com`,
            passwordHash: 'dummyhash',
            rankRating: 1500,
            tier: 'GOLD',
            placementMatchesRemaining: 0,
        });

        const drawRoom = await MatchRoom.create({
            roomCode: `RNK_DRAW_${timestamp}`,
            mode: 'ranked',
            player1Id: drawUserA._id,
            player2Id: drawUserB._id,
            problemId: arrayProb._id,
            status: 'finished',
            winnerId: null, // Tied / No winner
        });

        const drawDeltas = await matchesService.updateRankings(drawRoom as any);
        // P1 expected score = 0.36, actual = 0.5. Delta = 32 * (0.5 - 0.36) = +4
        // P2 expected score = 0.64, actual = 0.5. Delta = 32 * (0.5 - 0.64) = -4
        assert(drawDeltas.deltaA === 4, 'Draw awards underdog +4 RP with S=0.5 (1400 vs 1500)', { deltaA: drawDeltas.deltaA });
        assert(drawDeltas.deltaB === -4, 'Draw penalizes favorite -4 RP with S=0.5 (1400 vs 1500)', { deltaB: drawDeltas.deltaB });

        // Equal-rating draw (1400 vs 1400): expected score is 0.5, actual is 0.5 => delta is 0
        const drawEqUserA = await User.create({
            username: `${testPrefix}_drawEqA`,
            email: `${testPrefix}_drawEqA@test.com`,
            passwordHash: 'dummyhash',
            rankRating: 1400,
            tier: 'GOLD',
            placementMatchesRemaining: 0,
        });
        const drawEqUserB = await User.create({
            username: `${testPrefix}_drawEqB`,
            email: `${testPrefix}_drawEqB@test.com`,
            passwordHash: 'dummyhash',
            rankRating: 1400,
            tier: 'GOLD',
            placementMatchesRemaining: 0,
        });

        const drawEqualRoom = await MatchRoom.create({
            roomCode: `RNK_DRAWEQ_${timestamp}`,
            mode: 'ranked',
            player1Id: drawEqUserA._id,
            player2Id: drawEqUserB._id,
            problemId: arrayProb._id,
            status: 'finished',
            winnerId: null,
        });
        const drawEqualDeltas = await matchesService.updateRankings(drawEqualRoom as any);
        assert(drawEqualDeltas.deltaA === 0 && drawEqualDeltas.deltaB === 0, 'Equal rating draw awards 0 RP delta for both players', {
            deltaA: drawEqualDeltas.deltaA,
            deltaB: drawEqualDeltas.deltaB
        });

        // Test Floor >= 0
        const lowRankUser = await User.create({
            username: `${testPrefix}_low`,
            email: `${testPrefix}_low@test.com`,
            passwordHash: 'dummyhash',
            rankRating: 10,
            tier: 'IRON',
            placementMatchesRemaining: 0,
        });

        const floorRoom = await MatchRoom.create({
            roomCode: `RNK_FL_${timestamp}`,
            mode: 'ranked',
            player1Id: postPlacementUserA._id,
            player2Id: lowRankUser._id,
            problemId: arrayProb._id,
            status: 'finished',
            winnerId: postPlacementUserA._id,
        });

        await matchesService.updateRankings(floorRoom as any);
        const lowRankAfter = await User.findById(lowRankUser._id);
        assert((lowRankAfter?.rankRating ?? 0) >= 0, 'Rank Rating strictly enforces RP >= 0 floor', { rating: lowRankAfter?.rankRating });

        // -------------------------------------------------------------
        // Test 6: Anti-Abuse Pair Clamping (14E / 14F)
        // -------------------------------------------------------------
        console.log('\n[14E] Testing Anti-Abuse Repeated Pair Match RP Clamping...');
        const pairUser1 = await User.create({
            username: `${testPrefix}_pair1`,
            email: `${testPrefix}_pair1@test.com`,
            passwordHash: 'dummyhash',
            rankRating: 1300,
            tier: 'SILVER',
            placementMatchesRemaining: 0,
        });
        const pairUser2 = await User.create({
            username: `${testPrefix}_pair2`,
            email: `${testPrefix}_pair2@test.com`,
            passwordHash: 'dummyhash',
            rankRating: 1300,
            tier: 'SILVER',
            placementMatchesRemaining: 0,
        });

        // Match 1: normal delta
        const m1 = await MatchRoom.create({
            roomCode: `PAIR1_${timestamp}`,
            mode: 'ranked',
            player1Id: pairUser1._id,
            player2Id: pairUser2._id,
            problemId: arrayProb._id,
            status: 'finished',
            winnerId: pairUser1._id,
        });
        const delta1 = await matchesService.updateRankings(m1 as any);
        assert(delta1.deltaA > 0, 'Pair Match 1 awards normal RP delta', { deltaA: delta1.deltaA });

        // Match 2: normal delta
        const m2 = await MatchRoom.create({
            roomCode: `PAIR2_${timestamp}`,
            mode: 'ranked',
            player1Id: pairUser1._id,
            player2Id: pairUser2._id,
            problemId: arrayProb._id,
            status: 'finished',
            winnerId: pairUser1._id,
        });
        const delta2 = await matchesService.updateRankings(m2 as any);
        assert(delta2.deltaA > 0, 'Pair Match 2 awards normal RP delta', { deltaA: delta2.deltaA });

        // Match 3: clamped to 0 RP (anti-farming safeguard)
        const m3 = await MatchRoom.create({
            roomCode: `PAIR3_${timestamp}`,
            mode: 'ranked',
            player1Id: pairUser1._id,
            player2Id: pairUser2._id,
            problemId: arrayProb._id,
            status: 'finished',
            winnerId: pairUser1._id,
        });
        const delta3 = await matchesService.updateRankings(m3 as any);
        assert(delta3.deltaA === 0 && delta3.deltaB === 0, 'Pair Match 3 is clamped to 0 RP delta (INTEGRITY_FARMING_BLOCKED)', {
            deltaA: delta3.deltaA,
            deltaB: delta3.deltaB,
            abuseClamped: (delta3 as any).abuseClamped
        });

        // -------------------------------------------------------------
        // Test 6B: Server-Enforced Ranked Integrity Guardrail (14E)
        // -------------------------------------------------------------
        console.log('\n[14E] Testing Server-Enforced Ranked Integrity Guardrail (Adversarial AI Assist Block)...');
        const activeRankedUser = await User.create({
            username: `${testPrefix}_activeRankedUser`,
            email: `${testPrefix}_activeRankedUser@test.com`,
            passwordHash: 'dummyhash',
            rankRating: 1400,
            tier: 'GOLD',
            placementMatchesRemaining: 0,
        });
        const activeOpponent = await User.create({
            username: `${testPrefix}_activeOpponent`,
            email: `${testPrefix}_activeOpponent@test.com`,
            passwordHash: 'dummyhash',
            rankRating: 1400,
            tier: 'GOLD',
            placementMatchesRemaining: 0,
        });

        const liveRankedMatch = await MatchRoom.create({
            roomCode: `RNK_ACTIVE_${timestamp}`,
            mode: 'ranked',
            status: 'active',
            player1Id: activeRankedUser._id,
            player2Id: activeOpponent._id,
            problemId: arrayProb._id,
            startedAt: new Date(),
        });

        let interceptedStatusCode = 200;
        let interceptedPayload: any = null;
        const guardrailState = { called: false };

        const reqMock: any = {
            user: { id: (activeRankedUser._id as any).toString() },
            originalUrl: '/api/ai/hint',
            body: { code: 'function solve() {}' },
        };
        const resMock: any = {
            status: (code: number) => {
                interceptedStatusCode = code;
                return resMock;
            },
            json: (payload: any) => {
                interceptedPayload = payload;
                return resMock;
            }
        };
        const nextMock = () => {
            guardrailState.called = true;
        };

        await blockActiveRankedMatches(reqMock, resMock, nextMock);

        assert(interceptedStatusCode === 403, 'Active ranked match strictly blocks AI assist with HTTP 403', { statusCode: interceptedStatusCode });
        assert(interceptedPayload?.integrityViolation === true, 'Response payload contains integrityViolation: true', interceptedPayload);
        assert(interceptedPayload?.code === 'AI_ASSIST_BLOCKED_IN_RANKED', 'Response payload contains code AI_ASSIST_BLOCKED_IN_RANKED', { code: interceptedPayload?.code });
        assert(guardrailState.called === false, 'next() is not called when active ranked match is detected', { guardrailNextCalled: guardrailState.called });

        // Non-adversarial check: once the match is completed, guardrail allows requests through
        await MatchRoom.updateOne({ _id: liveRankedMatch._id }, { $set: { status: 'completed' } });

        const unblockedState = { called: false };
        let unblockedStatusCode = 200;
        const unblockedResMock: any = {
            status: (code: number) => {
                unblockedStatusCode = code;
                return unblockedResMock;
            },
            json: (payload: any) => payload
        };
        const unblockedNextMock = () => {
            unblockedState.called = true;
        };

        await blockActiveRankedMatches(reqMock, unblockedResMock, unblockedNextMock);
        assert(unblockedState.called === true, 'AI assist allowed through when match is not active ranked', { unblockedNextCalled: unblockedState.called, unblockedStatusCode });

        // -------------------------------------------------------------
        // Test 7: Leaderboard Placement Exclusion (14F)
        // -------------------------------------------------------------
        console.log('\n[14F] Testing Leaderboard Placement Exclusion...');
        const topLeaderboard = await leaderboardService.getLeaderboard(100);
        const placementFound = topLeaderboard.find((u: any) => u.tier === 'PLACEMENT' || u.placementMatchesRemaining > 0);
        assert(placementFound === undefined, 'Leaderboard excludes accounts in placement tier', { found: placementFound });

        // -------------------------------------------------------------
        // Test 8: Socratic AI Hint Service (14B)
        // -------------------------------------------------------------
        console.log('\n[14B] Testing Socratic AI Hint Generation...');
        const hintResponse = await aiService.generateHint({
            code: 'function twoSum(nums, target) { for(let i=0; i<nums.length; i++) {} }',
            problemTitle: 'Two Sum',
            description: 'Find two numbers that add up to target',
            language: 'javascript',
        });
        assert(typeof hintResponse.hint === 'string' && hintResponse.hint.length > 10, 'AI Hint generated non-empty Socratic guidance', {
            hint: hintResponse.hint.substring(0, 80) + '...',
            focusArea: hintResponse.focusArea,
            level: hintResponse.level
        });

        // Clean up test data
        await User.deleteMany({ username: new RegExp(`^${testPrefix}`) });
        await MatchRoom.deleteMany({ roomCode: new RegExp(`^(CR_|RNK|PAIR|PRAC).*${timestamp}`) });
        await Submission.deleteMany({ userId: newUser._id });

        console.log('\n======================================================');
        const passedCount = results.filter(r => r.passed).length;
        const failedCount = results.filter(r => !r.passed).length;
        console.log(`Phase 14 Verification Complete: ${passedCount} PASSED, ${failedCount} FAILED`);
        console.log('======================================================\n');

        if (failedCount > 0) {
            process.exit(1);
        } else {
            process.exit(0);
        }
    } catch (err: any) {
        console.error('Unhandled error during Phase 14 verification:', err);
        process.exit(1);
    }
}

runPhase14Verification();
