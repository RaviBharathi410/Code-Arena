import '../src/config/env';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db';
import { User } from '../src/models/User';
import { HostedRoom } from '../src/models/HostedRoom';
import { RoomsService } from '../src/modules/rooms/rooms.service';

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

async function runPhase15Verification() {
    console.log('\n======================================================');
    console.log('   CODEARENA PHASE 15 HOSTED ROOMS VERIFICATION');
    console.log('======================================================\n');

    await connectDB();
    const roomsService = new RoomsService();
    const timestamp = Date.now();
    const prefix = `p15_${timestamp}`;

    // Setup dummy host and guest users
    const hostUser = await User.create({
        username: `${prefix}_host`,
        email: `${prefix}_host@test.com`,
        passwordHash: 'dummy',
        rankRating: 1400,
        tier: 'GOLD',
        isCalibrated: true
    });

    const guestUser1 = await User.create({
        username: `${prefix}_guest1`,
        email: `${prefix}_guest1@test.com`,
        passwordHash: 'dummy',
        rankRating: 1350,
        tier: 'SILVER',
        isCalibrated: true
    });

    const guestUser2 = await User.create({
        username: `${prefix}_guest2`,
        email: `${prefix}_guest2@test.com`,
        passwordHash: 'dummy',
        rankRating: 1300,
        tier: 'SILVER',
        isCalibrated: true
    });

    try {
        console.log('[15A] Testing Custom Problem Authoring & Validation...');
        // 1. Valid custom problem
        const validCustom = roomsService.validateAndBuildCustomProblem({
            title: 'Custom Inversion Counter',
            description: 'Count inversions in an array using merge sort or Fenwick tree.',
            functionName: 'countInversions',
            parameters: [{ name: 'arr', type: 'number[]' }],
            returnType: 'number',
            testCases: [
                { input: '[2, 4, 1, 3, 5]', expectedOutput: '3' },
                { input: '[1, 2, 3]', expectedOutput: '0' }
            ]
        });
        assert(validCustom.title === 'Custom Inversion Counter', 'Valid custom problem parsed title');
        assert(validCustom.functionName === 'countInversions', 'Valid custom problem preserved functionName');
        assert(Boolean(validCustom.boilerplate.js && validCustom.boilerplate.python && validCustom.boilerplate.cpp), 'Boilerplates generated for JS, Python, C++');
        assert(validCustom.testCases.length === 2, 'Test cases count preserved');
        assert(validCustom.isCustom === true, 'Flagged as isCustom');

        // 2. Invalid custom problems rejection
        let invalidTitleCaught = false;
        try {
            roomsService.validateAndBuildCustomProblem({
                title: 'No',
                description: 'Short title test case',
                functionName: 'solve',
                testCases: [{ input: '1', expectedOutput: '1' }, { input: '2', expectedOutput: '2' }]
            });
        } catch (e: any) {
            invalidTitleCaught = e.message.includes('at least 3 characters');
        }
        assert(invalidTitleCaught, 'Rejects custom problem with title < 3 chars');

        let invalidFuncCaught = false;
        try {
            roomsService.validateAndBuildCustomProblem({
                title: 'Invalid Identifier',
                description: 'Testing illegal function name identifier',
                functionName: '123_invalid!',
                testCases: [{ input: '1', expectedOutput: '1' }, { input: '2', expectedOutput: '2' }]
            });
        } catch (e: any) {
            invalidFuncCaught = e.message.includes('valid programming identifier');
        }
        assert(invalidFuncCaught, 'Rejects invalid functionName identifier');

        let invalidTestCasesCaught = false;
        try {
            roomsService.validateAndBuildCustomProblem({
                title: 'Few Testcases',
                description: 'Testing insufficient test cases (< 2)',
                functionName: 'solve',
                testCases: [{ input: '1', expectedOutput: '1' }]
            });
        } catch (e: any) {
            invalidTestCasesCaught = e.message.includes('at least 2 test cases');
        }
        assert(invalidTestCasesCaught, 'Rejects custom problem with fewer than 2 test cases');

        console.log('\n[15B] Testing Room Creation & Code Generation...');
        const createdRoom = await roomsService.createRoom(hostUser._id.toString(), {
            title: `${hostUser.username}'s Arena`,
            capacity: 2, // Strict capacity 2 for testing overflow
            durationMinutes: 45,
            customProblems: [validCustom]
        });

        assert(typeof createdRoom.roomCode === 'string' && createdRoom.roomCode.length === 6, 'Room code is exactly 6 characters', { roomCode: createdRoom.roomCode });
        assert(/^[A-Z2-9]{6}$/.test(createdRoom.roomCode), 'Room code uses disambiguated uppercase characters');
        assert(createdRoom.status === 'lobby', 'Initial room status is "lobby"');
        assert(createdRoom.participants.length === 1, 'Room initializes with 1 participant (host)');
        assert(createdRoom.participants[0].userId.toString() === hostUser._id.toString(), 'Participant 0 is host');
        assert(createdRoom.participants[0].isReady === true, 'Host is ready by default');
        assert(createdRoom.problemSet.length === 1 && createdRoom.problemSet[0].isCustom === true, 'Custom problem successfully attached to room');

        console.log('\n[15C] Testing Guest Join & Capacity Constraints...');
        // Guest 1 joins
        const roomAfterGuest1 = await roomsService.joinRoom(createdRoom.roomCode, guestUser1._id.toString());
        assert(roomAfterGuest1.participants.length === 2, 'Guest 1 successfully joined (2/2 participants)');
        const guest1Entry = roomAfterGuest1.participants.find(p => p.userId.toString() === guestUser1._id.toString());
        assert(Boolean(guest1Entry && guest1Entry.isReady === false), 'Guest 1 isReady defaults to false');

        // Guest 2 attempts to join full room (capacity = 2)
        let roomFullCaught = false;
        try {
            await roomsService.joinRoom(createdRoom.roomCode, guestUser2._id.toString());
        } catch (e: any) {
            roomFullCaught = e.message.includes('Room is full');
        }
        assert(roomFullCaught, 'Joining room exceeding capacity is rejected with "Room is full"');

        console.log('\n[15D] Testing Host Authority & Security Guards...');
        // Non-host attempts to kick guest 1
        let nonHostKickCaught = false;
        try {
            await roomsService.kickParticipant(createdRoom.roomCode, guestUser1._id.toString(), guestUser1._id.toString());
        } catch (e: any) {
            nonHostKickCaught = e.message.includes('Only the room host can remove operators');
        }
        assert(nonHostKickCaught, 'Non-host kick attempt is strictly rejected with 403 authorization guard');

        // Host attempts to kick self
        let hostKickSelfCaught = false;
        try {
            await roomsService.kickParticipant(createdRoom.roomCode, hostUser._id.toString(), hostUser._id.toString());
        } catch (e: any) {
            hostKickSelfCaught = e.message.includes('Host cannot kick themselves');
        }
        assert(hostKickSelfCaught, 'Host kicking self is rejected');

        // Non-host attempts to start session
        let nonHostStartCaught = false;
        try {
            await roomsService.startSession(createdRoom.roomCode, guestUser1._id.toString());
        } catch (e: any) {
            nonHostStartCaught = e.message.includes('Only the room host can initiate combat');
        }
        assert(nonHostStartCaught, 'Non-host session start attempt is strictly rejected');

        console.log('\n[15E] Testing Ready State & Session Progression...');
        // Guest 1 marks ready
        const roomReady = await roomsService.setReady(createdRoom.roomCode, guestUser1._id.toString(), true);
        const guestReadyEntry = roomReady.participants.find(p => p.userId.toString() === guestUser1._id.toString());
        assert(guestReadyEntry?.isReady === true, 'Guest 1 can toggle ready state to true');

        // Host starts the session
        const startedRoom = await roomsService.startSession(createdRoom.roomCode, hostUser._id.toString());
        assert(startedRoom.status === 'in-progress', 'Room status transitioned to "in-progress"');
        assert(Boolean(startedRoom.startedAt), 'startedAt timestamp is recorded');

        // New guest attempts to join in-progress match
        let lateJoinCaught = false;
        try {
            await roomsService.joinRoom(createdRoom.roomCode, guestUser2._id.toString());
        } catch (e: any) {
            lateJoinCaught = e.message.includes('already started');
        }
        assert(lateJoinCaught, 'Late joining an in-progress match is strictly rejected');

        console.log('\n[15F] Testing Host Migration & Room Cancellation...');
        // Create a separate lobby room to test host departure
        const lobbyRoom = await roomsService.createRoom(hostUser._id.toString(), {
            title: 'Migration Test Room',
            capacity: 4
        });
        await roomsService.joinRoom(lobbyRoom.roomCode, guestUser1._id.toString());
        await roomsService.joinRoom(lobbyRoom.roomCode, guestUser2._id.toString());

        // Host leaves explicitly
        const leaveRes = await roomsService.leaveRoom(lobbyRoom.roomCode, hostUser._id.toString(), true);
        assert(leaveRes.hostChanged === true, 'Host leave triggers host migration');
        assert(leaveRes.newHostId === guestUser1._id.toString(), 'Next oldest participant (guest 1) becomes new host');

        // Remaining users leave until empty
        await roomsService.leaveRoom(lobbyRoom.roomCode, guestUser1._id.toString(), true);
        const finalLeave = await roomsService.leaveRoom(lobbyRoom.roomCode, guestUser2._id.toString(), true);
        assert(finalLeave.roomCancelled === true, 'Room transitions to cancelled when last participant leaves');
        assert(finalLeave.room.status === 'cancelled', 'Final room status is "cancelled"');

    } finally {
        // Cleanup test users and test rooms
        await User.deleteMany({ _id: { $in: [hostUser._id, guestUser1._id, guestUser2._id] } });
        await HostedRoom.deleteMany({ title: { $regex: prefix } });
        await mongoose.disconnect();
    }

    console.log('\n======================================================');
    console.log(`Phase 15 Verification Complete: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================\n');

    if (failed > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runPhase15Verification().catch((err) => {
    console.error('Fatal error running Phase 15 verification:', err);
    process.exit(1);
});
