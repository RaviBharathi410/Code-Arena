import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { codeExecutionQueue, eloQueue, analyticsQueue } from '../queues';

/**
 * Bull Board dashboard — mounted at /admin/queues.
 * Provides real-time visibility into all BullMQ queues.
 */
export function createQueueDashboard() {
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath('/admin/queues');

    createBullBoard({
        queues: [
            new BullMQAdapter(codeExecutionQueue),
            new BullMQAdapter(eloQueue),
            new BullMQAdapter(analyticsQueue),
        ],
        serverAdapter,
    });

    return serverAdapter.getRouter();
}
