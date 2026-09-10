import mongoose from 'mongoose';
import { HostedRoom, IHostedRoom, IRoomProblem } from '../../models/HostedRoom';
import { Problem } from '../../models/Problem';
import { User } from '../../models/User';
import { logger } from '../../lib/logger';
import crypto from 'crypto';

export class RoomsService {
    /**
     * Generate a unique 6-character uppercase alphanumeric room code
     */
    private async generateRoomCode(): Promise<string> {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Disambiguated (no 0/O, 1/I)
        for (let attempt = 0; attempt < 10; attempt++) {
            let code = '';
            const bytes = crypto.randomBytes(6);
            for (let i = 0; i < 6; i++) {
                code += chars[bytes[i] % chars.length];
            }
            const existing = await HostedRoom.findOne({ roomCode: code }).lean();
            if (!existing) return code;
        }
        // Fallback
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    /**
     * Validate and sanitize a host-authored custom problem (Phase 15E)
     */
    validateAndBuildCustomProblem(custom: any): IRoomProblem {
        if (!custom || typeof custom !== 'object') {
            throw new Error('Invalid custom problem configuration');
        }

        const title = (custom.title || '').trim();
        if (title.length < 3) {
            throw new Error('Custom problem title must be at least 3 characters');
        }

        const description = (custom.description || '').trim();
        if (description.length < 10) {
            throw new Error('Custom problem description must be at least 10 characters');
        }

        const functionName = (custom.functionName || 'solve').trim();
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(functionName)) {
            throw new Error('Function name must be a valid programming identifier (e.g. solve, findMax)');
        }

        const parameters = Array.isArray(custom.parameters) ? custom.parameters : [{ name: 'input', type: 'string' }];
        const returnType = (custom.returnType || 'string').trim();

        // Validate test cases
        if (!Array.isArray(custom.testCases) || custom.testCases.length < 2) {
            throw new Error('Custom problem must include at least 2 test cases');
        }

        const validatedTestCases = custom.testCases.map((tc: any, idx: number) => {
            if (!tc || typeof tc !== 'object') {
                throw new Error(`Test case #${idx + 1} is invalid`);
            }
            if (tc.input === undefined || tc.input === null || tc.input === '') {
                throw new Error(`Test case #${idx + 1} input cannot be empty`);
            }
            if (tc.expectedOutput === undefined && tc.expected === undefined && tc.output === undefined) {
                throw new Error(`Test case #${idx + 1} must specify an expected output`);
            }

            const expected = tc.expectedOutput !== undefined ? tc.expectedOutput : (tc.expected !== undefined ? tc.expected : tc.output);

            return {
                input: tc.input,
                expectedOutput: expected,
                expected: expected,
                output: expected,
                is_hidden: Boolean(tc.isHidden || tc.is_hidden),
                explanation: tc.explanation || ''
            };
        });

        // Generate boilerplates for all 5 supported languages
        const paramsListJs = parameters.map((p: any) => p.name).join(', ');
        const paramsListPy = parameters.map((p: any) => `${p.name}: any`).join(', ');
        const paramsListCpp = parameters.map((p: any) => `auto ${p.name}`).join(', ');
        const paramsListJava = parameters.map((p: any) => `Object ${p.name}`).join(', ');

        const boilerplate = custom.boilerplate || {
            js: `function ${functionName}(${paramsListJs}) {\n    // Write your solution here\n    \n}\n`,
            javascript: `function ${functionName}(${paramsListJs}) {\n    // Write your solution here\n    \n}\n`,
            py: `def ${functionName}(${paramsListPy}):\n    # Write your solution here\n    pass\n`,
            python: `def ${functionName}(${paramsListPy}):\n    # Write your solution here\n    pass\n`,
            cpp: `#include <iostream>\n#include <vector>\n#include <string>\nusing namespace std;\n\nauto ${functionName}(${paramsListCpp}) {\n    // Write your solution here\n    \n}\n`,
            java: `public class Solution {\n    public static Object ${functionName}(${paramsListJava}) {\n        // Write your solution here\n        return null;\n    }\n}\n`,
            c: `#include <stdio.h>\n\nvoid* ${functionName}() {\n    // Write your solution here\n    return NULL;\n}\n`
        };

        const slug = `custom-${functionName.toLowerCase()}-${Date.now().toString(36)}`;

        return {
            slug,
            title,
            difficulty: (custom.difficulty || 'MEDIUM').toUpperCase() as any,
            category: custom.category || 'Custom Authoring',
            description,
            constraints: custom.constraints || 'Standard time limit (2000ms), 256MB memory.',
            examples: Array.isArray(custom.examples) ? custom.examples : [
                {
                    input: String(validatedTestCases[0].input),
                    output: String(validatedTestCases[0].expectedOutput),
                    explanation: 'Sample test case 1'
                }
            ],
            testCases: validatedTestCases,
            boilerplate,
            problemType: 'function',
            functionName,
            returnType,
            parameters,
            isCustom: true
        };
    }

    /**
     * Create a new host-managed multi-user room (Phase 15D)
     */
    async createRoom(hostId: string, data: {
        title?: string;
        capacity?: number;
        durationMinutes?: number;
        problemIds?: string[];
        customProblems?: any[];
    }): Promise<IHostedRoom> {
        let host: any = null;
        if (mongoose.Types.ObjectId.isValid(hostId)) {
            host = await User.findById(hostId).lean();
        }
        if (!host) {
            host = await User.findOne({ $or: [{ username: hostId }, { email: hostId }] }).lean();
        }
        if (!host) {
            const fallbackId = mongoose.Types.ObjectId.isValid(hostId)
                ? new mongoose.Types.ObjectId(hostId)
                : new mongoose.Types.ObjectId();
            try {
                host = await User.create({
                    _id: fallbackId,
                    username: hostId && hostId.length <= 20 ? hostId : 'HostOperator',
                    email: `${fallbackId}@codearena.local`,
                    passwordHash: 'dev-fallback',
                    tier: 'BRONZE',
                    rankRating: 1200
                });
            } catch {
                host = (await User.findOne().lean()) || {
                    _id: fallbackId,
                    username: 'HostOperator',
                    tier: 'BRONZE',
                    rankRating: 1200
                };
            }
        }

        const hostObjectId = host._id instanceof mongoose.Types.ObjectId
            ? host._id
            : (mongoose.Types.ObjectId.isValid(host._id) ? new mongoose.Types.ObjectId(host._id) : new mongoose.Types.ObjectId());

        const capacity = Math.min(Math.max(Number(data.capacity) || 8, 2), 8); // 2 to 8 per 15B.1
        const durationMinutes = Math.min(Math.max(Number(data.durationMinutes) || 30, 5), 120);
        const title = (data.title || `${host.username}'s Arena`).trim().slice(0, 50);

        const problemSet: IRoomProblem[] = [];

        const normalizeDifficulty = (diff: any): 'EASY' | 'MEDIUM' | 'HARD' => {
            const d = String(diff || '').toUpperCase();
            if (d === 'EASY' || d === 'HARD') return d;
            return 'MEDIUM';
        };

        // 1. Resolve catalog problems
        if (Array.isArray(data.problemIds) && data.problemIds.length > 0) {
            const validIds = data.problemIds.filter(id => mongoose.Types.ObjectId.isValid(id));
            const catalogProblems = await Problem.find({
                $or: [
                    { _id: { $in: validIds } },
                    { slug: { $in: data.problemIds } }
                ]
            }).lean();

            // Maintain host's chosen ordering
            for (const pid of data.problemIds) {
                const found = catalogProblems.find(p => p._id.toString() === pid || p.slug === pid);
                if (found) {
                    problemSet.push({
                        problemId: found._id,
                        slug: found.slug,
                        title: found.title,
                        difficulty: normalizeDifficulty(found.difficulty),
                        category: found.category || 'Algorithms',
                        description: found.description || found.title,
                        constraints: found.constraints || '',
                        examples: Array.isArray(found.examples) ? found.examples : [],
                        testCases: Array.isArray(found.testCases) ? found.testCases : [],
                        boilerplate: found.boilerplate || { js: 'function solve() {\n    // Write your solution here\n}\n' },
                        problemType: found.problemType === 'stdin-stdout' ? 'stdin-stdout' : 'function',
                        functionName: found.functionName || 'solve',
                        returnType: found.returnType || 'any',
                        parameters: found.parameters || [],
                        driverTemplates: found.driverTemplates,
                        isCustom: false
                    });
                }
            }
        }

        // 2. Validate and append custom host-authored problems (Phase 15E)
        if (Array.isArray(data.customProblems)) {
            for (const custom of data.customProblems) {
                const validated = this.validateAndBuildCustomProblem(custom);
                problemSet.push(validated);
            }
        }

        // Must have at least 1 problem
        if (problemSet.length === 0) {
            // Pick a default problem from catalog if none provided
            const fallbackProb = await Problem.findOne().lean();
            if (fallbackProb) {
                problemSet.push({
                    problemId: fallbackProb._id,
                    slug: fallbackProb.slug,
                    title: fallbackProb.title,
                    difficulty: normalizeDifficulty(fallbackProb.difficulty),
                    category: fallbackProb.category || 'Algorithms',
                    description: fallbackProb.description || fallbackProb.title,
                    constraints: fallbackProb.constraints || '',
                    examples: Array.isArray(fallbackProb.examples) ? fallbackProb.examples : [],
                    testCases: Array.isArray(fallbackProb.testCases) ? fallbackProb.testCases : [],
                    boilerplate: fallbackProb.boilerplate || { js: 'function solve() {\n    // Write your solution here\n}\n' },
                    problemType: fallbackProb.problemType === 'stdin-stdout' ? 'stdin-stdout' : 'function',
                    functionName: fallbackProb.functionName || 'solve',
                    returnType: fallbackProb.returnType || 'any',
                    parameters: fallbackProb.parameters || [],
                    driverTemplates: fallbackProb.driverTemplates,
                    isCustom: false
                });
            } else {
                problemSet.push({
                    slug: 'two-sum',
                    title: 'Two Sum',
                    difficulty: 'EASY',
                    category: 'Arrays',
                    description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
                    constraints: '2 <= nums.length <= 10^4',
                    examples: [{ input: 'nums = [2,7,11,15], target = 9', output: '[0,1]' }],
                    testCases: [
                        { input: '[2,7,11,15]\n9', expectedOutput: '[0,1]', is_hidden: false },
                        { input: '[3,2,4]\n6', expectedOutput: '[1,2]', is_hidden: true }
                    ],
                    boilerplate: {
                        js: 'function twoSum(nums, target) {\n    // Write your solution here\n}\n',
                        javascript: 'function twoSum(nums, target) {\n    // Write your solution here\n}\n',
                        py: 'def two_sum(nums, target):\n    # Write your solution here\n    pass\n',
                        python: 'def two_sum(nums, target):\n    # Write your solution here\n    pass\n'
                    },
                    problemType: 'function',
                    functionName: 'twoSum',
                    returnType: 'number[]',
                    parameters: [{ name: 'nums', type: 'number[]' }, { name: 'target', type: 'number' }],
                    isCustom: false
                });
            }
        }

        const roomCode = await this.generateRoomCode();

        const room = await HostedRoom.create({
            roomCode,
            title,
            hostId: hostObjectId,
            status: 'lobby',
            capacity,
            config: {
                sessionFormat: 'race',
                durationMinutes
            },
            problemSet,
            participants: [{
                userId: hostObjectId,
                username: host.username,
                avatar: host.avatarUrl || host.avatar || '',
                tier: host.tier || 'BRONZE',
                rankRating: host.rankRating || 1200,
                joinedAt: new Date(),
                connectionStatus: 'connected',
                isReady: true, // Host is ready by default
                currentProblemIndex: 0,
                solvedProblems: [],
                testCasesPassed: 0,
                totalTestCases: problemSet[0]?.testCases?.length || 0,
                currentCode: '',
                language: 'js',
                totalScore: 0
            }]
        });

        logger.info({ roomId: room._id, roomCode, hostId, capacity, problemCount: problemSet.length }, '[ROOMS] Multi-user room created');
        return room;
    }

    /**
     * Join an existing hosted room by 6-character code (Phase 15F)
     */
    async joinRoom(roomCode: string, userId: string): Promise<IHostedRoom> {
        const normalizedCode = (roomCode || '').trim().toUpperCase();
        if (!normalizedCode || normalizedCode.length !== 6) {
            throw new Error('Please enter a valid 6-character room token');
        }

        const room = await HostedRoom.findOne({ roomCode: normalizedCode });
        if (!room) {
            const err: any = new Error('Room not found. Check the token and try again.');
            err.status = 404;
            throw err;
        }

        if (room.status === 'in-progress') {
            // Check if user is an existing participant reconnecting
            const existing = room.participants.find(p => p.userId.toString() === userId);
            if (existing) {
                existing.connectionStatus = 'connected';
                await room.save();
                return room;
            }
            throw new Error('This combat session has already started.');
        }

        if (room.status === 'completed' || room.status === 'cancelled') {
            throw new Error('This room session has ended.');
        }

        // Room is in lobby
        const existingIndex = room.participants.findIndex(p => p.userId.toString() === userId);
        if (existingIndex !== -1) {
            room.participants[existingIndex].connectionStatus = 'connected';
            await room.save();
            return room;
        }

        // Check capacity
        if (room.participants.length >= room.capacity) {
            throw new Error(`Room is full (${room.participants.length}/${room.capacity} operators).`);
        }

        let user: any = null;
        if (mongoose.Types.ObjectId.isValid(userId)) {
            user = await User.findById(userId).lean();
        }
        if (!user) {
            user = await User.findOne({ $or: [{ username: userId }, { email: userId }] }).lean();
        }
        if (!user) {
            const fallbackId = mongoose.Types.ObjectId.isValid(userId)
                ? new mongoose.Types.ObjectId(userId)
                : new mongoose.Types.ObjectId();
            try {
                user = await User.create({
                    _id: fallbackId,
                    username: userId && userId.length <= 20 ? userId : 'Operator',
                    email: `${fallbackId}@codearena.local`,
                    passwordHash: 'dev-fallback',
                    tier: 'BRONZE',
                    rankRating: 1200
                });
            } catch {
                user = (await User.findOne().lean()) || {
                    _id: fallbackId,
                    username: 'Operator',
                    tier: 'BRONZE',
                    rankRating: 1200
                };
            }
        }

        const userObjectId = user._id instanceof mongoose.Types.ObjectId
            ? user._id
            : (mongoose.Types.ObjectId.isValid(user._id) ? new mongoose.Types.ObjectId(user._id) : new mongoose.Types.ObjectId());

        room.participants.push({
            userId: userObjectId,
            username: user.username || 'Operator',
            avatar: user.avatarUrl || user.avatar || '',
            tier: user.tier || 'BRONZE',
            rankRating: user.rankRating || 1200,
            joinedAt: new Date(),
            connectionStatus: 'connected',
            isReady: false,
            currentProblemIndex: 0,
            solvedProblems: [],
            testCasesPassed: 0,
            totalTestCases: room.problemSet[0]?.testCases?.length || 0,
            currentCode: '',
            language: 'js',
            totalScore: 0
        });

        await room.save();
        logger.info({ roomId: room._id, roomCode: normalizedCode, userId }, '[ROOMS] Participant joined room');
        return room;
    }

    /**
     * Retrieve room details by roomCode
     */
    async getRoomByCode(roomCode: string): Promise<IHostedRoom | null> {
        const normalizedCode = (roomCode || '').trim().toUpperCase();
        return HostedRoom.findOne({ roomCode: normalizedCode }).lean() as any;
    }

    /**
     * Retrieve room details by ObjectId
     */
    async getRoomById(roomId: string): Promise<IHostedRoom | null> {
        return HostedRoom.findById(roomId).lean() as any;
    }

    /**
     * Handle participant leaving / disconnecting (Phase 15C.2)
     */
    async leaveRoom(roomCode: string, userId: string, isExplicitLeave = false): Promise<{ room: IHostedRoom; hostChanged: boolean; newHostId?: string; roomCancelled: boolean }> {
        const normalizedCode = (roomCode || '').trim().toUpperCase();
        const room = await HostedRoom.findOne({ roomCode: normalizedCode });
        if (!room) throw new Error('Room not found');

        let hostChanged = false;
        let newHostId: string | undefined;
        let roomCancelled = false;

        const isHost = room.hostId.toString() === userId;

        if (room.status === 'lobby') {
            if (isExplicitLeave) {
                // Remove participant completely if they deliberately chose to leave
                room.participants = room.participants.filter(p => p.userId.toString() !== userId);

                if (isHost) {
                    if (room.participants.length > 0) {
                        // Reassign host to next oldest participant
                        room.hostId = room.participants[0].userId;
                        room.participants[0].isReady = true;
                        hostChanged = true;
                        newHostId = room.hostId.toString();
                    } else {
                        // No participants left -> cancel room
                        room.status = 'cancelled';
                        roomCancelled = true;
                    }
                }
            } else {
                // Connection dropped / refreshed in lobby: mark disconnected without destroying room
                const participant = room.participants.find(p => p.userId.toString() === userId);
                if (participant) {
                    participant.connectionStatus = 'disconnected';
                }
            }
        } else if (room.status === 'in-progress') {
            // In-progress: mark connectionStatus disconnected to preserve race state
            const participant = room.participants.find(p => p.userId.toString() === userId);
            if (participant) {
                participant.connectionStatus = 'disconnected';
            }

            // If all participants disconnected, complete room
            const anyConnected = room.participants.some(p => p.connectionStatus === 'connected');
            if (!anyConnected) {
                await this.completeSession(room.roomCode);
            }
        }

        await room.save();
        return { room, hostChanged, newHostId, roomCancelled };
    }

    /**
     * Kick a participant from lobby (Host Only - Phase 15G)
     */
    async kickParticipant(roomCode: string, hostId: string, targetUserId: string): Promise<IHostedRoom> {
        const normalizedCode = (roomCode || '').trim().toUpperCase();
        const room = await HostedRoom.findOne({ roomCode: normalizedCode });
        if (!room) throw new Error('Room not found');

        // Server-authoritative host check
        if (room.hostId.toString() !== hostId) {
            throw new Error('Unauthorized: Only the room host can remove operators.');
        }

        if (room.status !== 'lobby') {
            throw new Error('Cannot remove participants once combat session is in progress.');
        }

        if (targetUserId === hostId) {
            throw new Error('Host cannot kick themselves from the room.');
        }

        room.participants = room.participants.filter(p => p.userId.toString() !== targetUserId);
        await room.save();
        logger.info({ roomCode: normalizedCode, hostId, targetUserId }, '[ROOMS] Participant kicked by host');
        return room;
    }

    /**
     * Toggle participant ready status
     */
    async setReady(roomCode: string, userId: string, isReady: boolean): Promise<IHostedRoom> {
        const normalizedCode = (roomCode || '').trim().toUpperCase();
        const room = await HostedRoom.findOne({ roomCode: normalizedCode });
        if (!room) throw new Error('Room not found');

        const participant = room.participants.find(p => p.userId.toString() === userId);
        if (!participant) throw new Error('Participant not in room');

        participant.isReady = isReady;
        await room.save();
        return room;
    }

    /**
     * Host starts the session (Phase 15G)
     */
    async startSession(roomCode: string, hostId: string): Promise<IHostedRoom> {
        const normalizedCode = (roomCode || '').trim().toUpperCase();
        const room = await HostedRoom.findOne({ roomCode: normalizedCode });
        if (!room) throw new Error('Room not found');

        // Server-authoritative host check
        if (room.hostId.toString() !== hostId) {
            throw new Error('Unauthorized: Only the room host can initiate combat.');
        }

        if (room.status !== 'lobby') {
            throw new Error('Room is not in lobby status.');
        }

        if (room.participants.length < 1) {
            throw new Error('At least 1 operator is required to start.');
        }

        room.status = 'in-progress';
        room.startedAt = new Date();

        // Initialize participant progress
        const firstProbTotalTests = room.problemSet[0]?.testCases?.length || 0;
        room.participants.forEach(p => {
            p.currentProblemIndex = 0;
            p.solvedProblems = [];
            p.testCasesPassed = 0;
            p.totalTestCases = firstProbTotalTests;
            p.totalScore = 0;
        });

        await room.save();
        logger.info({ roomCode: normalizedCode, hostId, participantCount: room.participants.length }, '[ROOMS] Session started by host');
        return room;
    }

    /**
     * Update participant's live progress during race (Phase 15G/15H)
     */
    async recordSubmissionResult(roomCode: string, userId: string, data: {
        problemIndex: number;
        testCasesPassed: number;
        totalTestCases: number;
        allPassed: boolean;
        code: string;
        language: string;
        timeMs?: number;
    }): Promise<{ room: IHostedRoom; solvedNext: boolean; finished: boolean; allFinished: boolean }> {
        const normalizedCode = (roomCode || '').trim().toUpperCase();
        const room = await HostedRoom.findOne({ roomCode: normalizedCode });
        if (!room) throw new Error('Room not found');

        const participant = room.participants.find(p => p.userId.toString() === userId);
        if (!participant) throw new Error('Participant not found in room');

        participant.currentCode = data.code;
        participant.language = data.language;
        participant.testCasesPassed = data.testCasesPassed;
        participant.totalTestCases = data.totalTestCases;
        participant.lastSubmittedAt = new Date();

        let solvedNext = false;
        let finished = false;

        if (data.allPassed) {
            const currentProb = room.problemSet[participant.currentProblemIndex];
            if (currentProb && !participant.solvedProblems.includes(currentProb.slug)) {
                participant.solvedProblems.push(currentProb.slug);

                // Scoring: 1000 base pts per problem + bonus
                const diffMultiplier = currentProb.difficulty === 'HARD' ? 2.0 : currentProb.difficulty === 'MEDIUM' ? 1.5 : 1.0;
                participant.totalScore += Math.floor(1000 * diffMultiplier);

                if (participant.currentProblemIndex + 1 < room.problemSet.length) {
                    participant.currentProblemIndex += 1;
                    participant.totalTestCases = room.problemSet[participant.currentProblemIndex].testCases?.length || 0;
                    participant.testCasesPassed = 0;
                    solvedNext = true;
                } else {
                    // Solved all problems in sequence!
                    participant.finishedAt = new Date();
                    finished = true;
                }
            }
        }

        // Check if all connected participants have finished
        const connectedParticipants = room.participants.filter(p => p.connectionStatus === 'connected');
        const allFinished = connectedParticipants.length > 0 && connectedParticipants.every(p => p.finishedAt !== undefined);

        if (allFinished) {
            await this.completeSession(room.roomCode);
        } else {
            await room.save();
        }

        return { room, solvedNext, finished, allFinished };
    }

    /**
     * Complete the session and compute unranked results (Phase 15H)
     * Strictly UNRANKED (0 RP delta)
     */
    async completeSession(roomCode: string): Promise<IHostedRoom> {
        const normalizedCode = (roomCode || '').trim().toUpperCase();
        const room = await HostedRoom.findOne({ roomCode: normalizedCode });
        if (!room) throw new Error('Room not found');

        room.status = 'completed';
        room.endedAt = new Date();

        const startTime = room.startedAt ? room.startedAt.getTime() : room.createdAt.getTime();

        // Rank participants:
        // 1. Most problems solved
        // 2. Earliest finish time / lowest total duration
        // 3. Highest score
        const sorted = [...room.participants].sort((a, b) => {
            if (b.solvedProblems.length !== a.solvedProblems.length) {
                return b.solvedProblems.length - a.solvedProblems.length;
            }
            const aTime = a.finishedAt ? a.finishedAt.getTime() - startTime : (room.endedAt!.getTime() - startTime);
            const bTime = b.finishedAt ? b.finishedAt.getTime() - startTime : (room.endedAt!.getTime() - startTime);
            if (aTime !== bTime) {
                return aTime - bTime;
            }
            return b.totalScore - a.totalScore;
        });

        room.results = sorted.map((p, index) => {
            const timeTakenSec = p.finishedAt 
                ? Math.max(1, Math.round((p.finishedAt.getTime() - startTime) / 1000))
                : Math.max(1, Math.round((room.endedAt!.getTime() - startTime) / 1000));

            return {
                userId: p.userId,
                username: p.username,
                rank: index + 1,
                solvedCount: p.solvedProblems.length,
                totalTimeSec: timeTakenSec,
                score: p.totalScore,
                finishedAt: p.finishedAt
            };
        });

        await room.save();
        logger.info({ roomCode: normalizedCode, participantCount: room.participants.length }, '[ROOMS] Session completed (Unranked 0 RP)');
        return room;
    }
}

export const roomsService = new RoomsService();
