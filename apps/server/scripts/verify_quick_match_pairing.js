require('dotenv').config();
const { io: ioClient } = require('socket.io-client');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

async function main() {
    console.log('--- STARTING QUICK MATCH PAIRING INTEGRATION TEST ---');
    await mongoose.connect(process.env.DATABASE_URL);
    const db = mongoose.connection.db;

    // Pick 2 real test users from DB
    const users = await db.collection('users').find({}).limit(2).toArray();
    if (users.length < 2) {
        throw new Error('Need at least 2 users in DB');
    }

    const user1 = users[0];
    const user2 = users[1];

    console.log(`User 1: ${user1.username} (${user1._id})`);
    console.log(`User 2: ${user2.username} (${user2._id})`);

    const secret = process.env.JWT_SECRET;
    const token1 = jwt.sign({ sub: user1._id.toString(), username: user1.username }, secret, { expiresIn: '1h' });
    const token2 = jwt.sign({ sub: user2._id.toString(), username: user2.username }, secret, { expiresIn: '1h' });

    const serverUrl = 'http://localhost:3001';

    const socket1 = ioClient(serverUrl, {
        auth: { token: token1 },
        transports: ['websocket']
    });

    const socket2 = ioClient(serverUrl, {
        auth: { token: token2 },
        transports: ['websocket']
    });

    await Promise.all([
        new Promise((resolve, reject) => {
            socket1.on('connect', () => { console.log('Socket 1 connected'); resolve(); });
            socket1.on('connect_error', reject);
        }),
        new Promise((resolve, reject) => {
            socket2.on('connect', () => { console.log('Socket 2 connected'); resolve(); });
            socket2.on('connect_error', reject);
        })
    ]);

    let match1 = null;
    let match2 = null;

    const matchPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Timed out waiting for MATCH_FOUND'));
        }, 15000);

        socket1.on('MATCH_FOUND', (data) => {
            console.log('✅ Socket 1 received MATCH_FOUND:', data.roomId, data.players.map(p => p.username));
            match1 = data;
            if (match1 && match2) {
                clearTimeout(timeout);
                resolve();
            }
        });

        socket2.on('MATCH_FOUND', (data) => {
            console.log('✅ Socket 2 received MATCH_FOUND:', data.roomId, data.players.map(p => p.username));
            match2 = data;
            if (match1 && match2) {
                clearTimeout(timeout);
                resolve();
            }
        });

        socket1.on('match:error', (err) => console.error('Socket 1 match:error:', err));
        socket2.on('match:error', (err) => console.error('Socket 2 match:error:', err));
        socket1.on('socket:error', (err) => console.error('Socket 1 socket:error:', err));
        socket2.on('socket:error', (err) => console.error('Socket 2 socket:error:', err));
        socket1.on('error', (err) => console.error('Socket 1 generic error:', err));
        socket2.on('error', (err) => console.error('Socket 2 generic error:', err));
    });

    console.log('Socket 1 emitting find_match...');
    socket1.emit('find_match');

    // Slight delay of 300ms to simulate another human clicking quick match
    await new Promise(r => setTimeout(r, 300));
    console.log('Socket 2 emitting find_match...');
    socket2.emit('find_match');

    await matchPromise;

    console.log('Comparing matches:');
    if (match1.roomId !== match2.roomId) {
        throw new Error(`Room ID mismatch: ${match1.roomId} !== ${match2.roomId}`);
    }
    console.log(`✅ MATCH SUCCESS! Both users paired into identical room: ${match1.roomId}`);
    console.log(`Players in match: ${match1.players.map(p => p.username).join(' vs ')}`);

    // Now test room join by ID (as done after match found)
    const readyPromise = new Promise((resolve, reject) => {
        let r1 = false, r2 = false;
        const timeout = setTimeout(() => reject(new Error('Timed out waiting for room:both_ready')), 10000);
        socket1.on('room:both_ready', () => {
            console.log('✅ Socket 1 received room:both_ready');
            r1 = true;
            if (r1 && r2) { clearTimeout(timeout); resolve(); }
        });
        socket2.on('room:both_ready', () => {
            console.log('✅ Socket 2 received room:both_ready');
            r2 = true;
            if (r1 && r2) { clearTimeout(timeout); resolve(); }
        });
    });

    socket1.emit('room:join_by_id', { matchId: match1.roomId });
    socket2.emit('room:join_by_id', { matchId: match2.roomId });

    await readyPromise;
    console.log('✅ BOTH PLAYERS JOINED AND READY! Battle started successfully.');

    socket1.disconnect();
    socket2.disconnect();
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
