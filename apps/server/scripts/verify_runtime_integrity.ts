import '../src/config/env';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db';
import { redis } from '../src/lib/redis';
import { User } from '../src/models/User';
import { Problem } from '../src/models/Problem';
import { MatchRoom } from '../src/models/MatchRoom';
import { Submission } from '../src/models/Submission';
import { RankHistory } from '../src/models/RankHistory';
import { matchesService } from '../src/modules/matches/matches.service';
import { MatchmakingService } from '../src/modules/matchmaking/matchmaking.service';
import { MatchmakingQueue } from '../src/lib/matchmaking-queue';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, extraInfo: any = '') {
    if (condition) {
        passed++;
        console.log(`  ✅ PASS: ${testName} ${extraInfo ? JSON.stringify(extraInfo) : ''}`);
    } else {
        failed++;
        console.error(`  ❌ FAIL: ${testName} ${extraInfo ? JSON.stringify(extraInfo) : ''}`);
    }
}

async function runIntegritySuite() {
    console.log('\n======================================================');
    console.log('   CODEARENA RUNTIME MATCH & RP INTEGRITY SUITE');
    console.log('======================================================\n');

    await connectDB();

    const timestamp = Date.now();
    const prefix = `test_${timestamp}`;

    // Clean up / find dummy problem
    let problem: any = await Problem.findOne().lean();
    if (!problem) {
        problem = (await Problem.create({
            title: 'Two Sum Test',
            slug: `${prefix}_two_sum`,
            difficulty: 'EASY',
            category: 'ARRAYS',
            description: 'Test problem description',
            testCases: [{ input: '1,2', output: '3' }],
            boilerplate: { js: 'function solve() {}' },
            problemType: 'function'
        })).toObject();
    }

    // Create 4 test users with controlled Elo ratings
    const userA = await User.create({
        username: `${prefix}_alice`,
        email: `${prefix}_alice@test.com`,
        passwordHash: 'dummy',
        rankRating: 1200,
        tier: 'BRONZE I',
        placementMatchesRemaining: 0,
        isCalibrated: true
    });

    const userB = await User.create({
        username: `${prefix}_bob`,
        email: `${prefix}_bob@test.com`,
        passwordHash: 'dummy',
        rankRating: 1220,
        tier: 'BRONZE I',
        placementMatchesRemaining: 0,
        isCalibrated: true
    });

    const userC = await User.create({
        username: `${prefix}_charlie`,
        email: `${prefix}_charlie@test.com`,
        passwordHash: 'dummy',
        rankRating: 1700,
        tier: 'GOLD I',
        placementMatchesRemaining: 0,
        isCalibrated: true
    });

    const userD = await User.create({
        username: `${prefix}_david`,
        email: `${prefix}_david@test.com`,
        passwordHash: 'dummy',
        rankRating: 1730,
        tier: 'GOLD I',
        placementMatchesRemaining: 0,
        isCalibrated: true
    });

    const idA = userA._id.toString();
    const idB = userB._id.toString();
    const idC = userC._id.toString();
    const idD = userD._id.toString();

    // -------------------------------------------------------------
    // ASSERTION 1: Concurrent Matchmaking (No Cross-Pairing, Atomic Extraction)
    // -------------------------------------------------------------
    console.log('\n[TEST 1] Testing Concurrent Matchmaking (4 players queued simultaneously)...');
    const queue = new MatchmakingQueue();
    await queue.addToQueue(idA, 1200);
    await queue.addToQueue(idB, 1220);
    await queue.addToQueue(idC, 1700);
    await queue.addToQueue(idD, 1730);

    const pair1 = await queue.tryPairPlayers();
    const pair2 = await queue.tryPairPlayers();
    const pair3 = await queue.tryPairPlayers();

    const isPair1AB = pair1 && (
        (pair1.player1Id === idA && pair1.player2Id === idB) ||
        (pair1.player1Id === idB && pair1.player2Id === idA)
    );
    const isPair2CD = pair2 && (
        (pair2.player1Id === idC && pair2.player2Id === idD) ||
        (pair2.player1Id === idD && pair2.player2Id === idC)
    );

    assert(Boolean(pair1 && pair2), 'Two distinct pairs formed from 4 concurrent players', { pair1, pair2 });
    assert(Boolean(isPair1AB), 'Pair 1 correctly matched Elo 1200 & 1220 (Alice & Bob)', pair1);
    assert(Boolean(isPair2CD), 'Pair 2 correctly matched Elo 1700 & 1730 (Charlie & David)', pair2);
    assert(pair3 === null, 'Queue is empty after paired players are atomically removed (no cross-pairing or duplicates)');

    // -------------------------------------------------------------
    // ASSERTION 2: Practice Room produces 0 RP Delta
    // -------------------------------------------------------------
    console.log('\n[TEST 2] Testing Practice Room 0 RP Delta...');
    const practiceRoom = await matchesService.createMatchRoom({
        mode: 'practice',
        player1Id: idA,
        problemId: (problem as any)._id.toString()
    });

    await Submission.create({
        userId: idA,
        problemId: (problem as any)._id,
        matchId: practiceRoom._id.toString(),
        language: 'javascript',
        code: 'function solve() { return 3; }',
        status: 'ACCEPTED',
        finalScore: 100,
        testCasesPassed: 1,
        totalTestCases: 1
    });

    const practiceResult = await matchesService.calculateMatchResult(practiceRoom._id.toString());
    // In practice, single player doesn't have player2Id so calculateMatchResult safely returns undefined
    const practiceRoomAfter = await MatchRoom.findById(practiceRoom._id).lean();
    const userAAfterPractice = await User.findById(idA).lean();

    assert(
        (practiceResult === undefined || (practiceResult.deltaP1 === 0 && practiceResult.deltaP2 === 0)) &&
        userAAfterPractice?.rankRating === 1200 &&
        practiceRoomAfter?.deltaP1 === 0,
        'Practice room completed with strictly 0 RP delta and rating unchanged (1200 -> 1200)',
        { rankRating: userAAfterPractice?.rankRating, deltaP1: practiceRoomAfter?.deltaP1 }
    );

    // -------------------------------------------------------------
    // ASSERTION 3: Custom 1v1 Room produces strictly 0 RP Delta
    // -------------------------------------------------------------
    console.log('\n[TEST 3] Testing Custom 1v1 Room (Room Match) strictly 0 RP Delta...');
    const customRoom = await matchesService.createMatchRoom({
        mode: '1v1',
        player1Id: idA,
        problemId: (problem as any)._id.toString()
    });
    await matchesService.joinMatchRoom(customRoom.roomCode, idB);

    // Both submit solutions
    await Submission.create({
        userId: idA,
        problemId: (problem as any)._id,
        matchId: customRoom._id.toString(),
        language: 'javascript',
        code: 'function solve() { return 3; }',
        status: 'ACCEPTED',
        finalScore: 100,
        testCasesPassed: 1,
        totalTestCases: 1
    });

    await Submission.create({
        userId: idB,
        problemId: (problem as any)._id,
        matchId: customRoom._id.toString(),
        language: 'javascript',
        code: 'function solve() { return 3; }',
        status: 'ACCEPTED',
        finalScore: 80,
        testCasesPassed: 1,
        totalTestCases: 1
    });

    const customResult = await matchesService.calculateMatchResult(customRoom._id.toString());
    const customRoomAfter = await MatchRoom.findById(customRoom._id).lean();
    const userAAfterCustom = await User.findById(idA).lean();
    const userBAfterCustom = await User.findById(idB).lean();

    assert(
        customResult?.deltaP1 === 0 &&
        customResult?.deltaP2 === 0 &&
        customRoomAfter?.deltaP1 === 0 &&
        customRoomAfter?.deltaP2 === 0 &&
        userAAfterCustom?.rankRating === 1200 &&
        userBAfterCustom?.rankRating === 1220,
        'Custom 1v1 room results in 0 RP delta (P1: 0 RP, P2: 0 RP) and ratings intact',
        { deltaP1: customResult?.deltaP1, deltaP2: customResult?.deltaP2, p1Rating: userAAfterCustom?.rankRating, p2Rating: userBAfterCustom?.rankRating }
    );

    // -------------------------------------------------------------
    // ASSERTION 4: Ranked Matchmaking Room Produces Real Elo Deltas
    // -------------------------------------------------------------
    console.log('\n[TEST 4] Testing Ranked Matchmaking Room Elo/RP Delta Calculation...');
    const rankedRoom = await matchesService.createMatchRoom({
        mode: 'ranked',
        player1Id: idA,
        problemId: (problem as any)._id.toString()
    });
    await matchesService.joinMatchRoom(rankedRoom.roomCode, idB);

    // Alice wins with 100 score, Bob submits with 80 score
    await Submission.create({
        userId: idA,
        problemId: (problem as any)._id,
        matchId: rankedRoom._id.toString(),
        language: 'javascript',
        code: 'function solve() { return 3; }',
        status: 'ACCEPTED',
        finalScore: 100,
        testCasesPassed: 1,
        totalTestCases: 1
    });

    await Submission.create({
        userId: idB,
        problemId: (problem as any)._id,
        matchId: rankedRoom._id.toString(),
        language: 'javascript',
        code: 'function solve() { return 3; }',
        status: 'ACCEPTED',
        finalScore: 80,
        testCasesPassed: 1,
        totalTestCases: 1
    });

    const rankedResult = await matchesService.calculateMatchResult(rankedRoom._id.toString());
    const rankedRoomAfter = await MatchRoom.findById(rankedRoom._id).lean();
    const userAAfterRanked = await User.findById(idA).lean();
    const userBAfterRanked = await User.findById(idB).lean();

    assert(
        rankedResult?.deltaP1 !== undefined &&
        rankedResult.deltaP1 > 0 &&
        rankedResult.deltaP2 !== undefined &&
        rankedResult.deltaP2 < 0,
        'Ranked match produced real Elo deltas (P1 > 0, P2 < 0)',
        { deltaP1: rankedResult?.deltaP1, deltaP2: rankedResult?.deltaP2 }
    );

    assert(
        userAAfterRanked?.rankRating === (1200 + rankedResult!.deltaP1) &&
        userBAfterRanked?.rankRating === (1220 + rankedResult!.deltaP2),
        'User Elo ratings persisted accurately in database',
        {
            userAExpected: 1200 + rankedResult!.deltaP1,
            userAActual: userAAfterRanked?.rankRating,
            userBExpected: 1220 + rankedResult!.deltaP2,
            userBActual: userBAfterRanked?.rankRating
        }
    );

    const rankHistoryA = await RankHistory.findOne({ userId: idA, matchId: rankedRoom._id }).lean();
    assert(
        rankHistoryA !== null,
        'RankHistory entry recorded for ranked match',
        { rankHistoryEntry: rankHistoryA?._id }
    );

    // -------------------------------------------------------------
    // ASSERTION 5: Matchmaking in_match Guard (Cannot queue while in active match)
    // -------------------------------------------------------------
    console.log('\n[TEST 5] Testing in_match Guard against concurrent queueing...');
    // Create an active room for User C
    const activeRoom = await matchesService.createMatchRoom({
        mode: 'ranked',
        player1Id: idC,
        problemId: (problem as any)._id.toString()
    });
    await MatchRoom.updateOne({ _id: activeRoom._id }, { $set: { status: 'active' } });

    let emittedError: any = null;
    const mockIo: any = {
        to: (roomName: string) => ({
            emit: (event: string, payload: any) => {
                if (event === 'match:error') emittedError = payload;
            }
        })
    };

    const matchmakingService = new MatchmakingService(mockIo);
    await matchmakingService.findMatch(idC, 1700);

    assert(
        emittedError !== null && emittedError.message.includes('active battle'),
        'in_match guard successfully rejected queue entry for user in an active match',
        emittedError
    );

    // Teardown test data
    console.log('\nCleaning up test artifacts...');
    await User.deleteMany({ _id: { $in: [userA._id, userB._id, userC._id, userD._id] } });
    await MatchRoom.deleteMany({ _id: { $in: [practiceRoom._id, customRoom._id, rankedRoom._id, activeRoom._id] } });
    await Submission.deleteMany({ matchId: { $in: [practiceRoom._id.toString(), customRoom._id.toString(), rankedRoom._id.toString()] } });
    await RankHistory.deleteMany({ matchId: rankedRoom._id });

    console.log('\n======================================================');
    console.log(`  VERIFICATION RESULTS: ${passed} PASSED / ${failed} FAILED`);
    console.log('======================================================\n');

    await mongoose.disconnect();
    if (redis && redis.quit) {
        await redis.quit();
    }
    process.exit(failed > 0 ? 1 : 0);
}

runIntegritySuite().catch((err) => {
    console.error('Fatal error during verification:', err);
    process.exit(1);
});
