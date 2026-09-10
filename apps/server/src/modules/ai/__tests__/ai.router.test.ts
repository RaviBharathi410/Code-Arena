import request from 'supertest';
import { createApp } from '../../../src/app';

describe('AI Subsystem & Provider Architecture', () => {
    const app = createApp();

    test('GET /health includes AI status', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('status', 'ok');
        expect(res.body).toHaveProperty('ai');
    });

    test('GET /api/ai/status blocks unauthorized access', async () => {
        const res = await request(app).get('/api/ai/status');
        expect(res.status).toBe(401);
    });
});
