/**
 * Queue barrel export — exposes all queues, workers, and job types.
 */
import { codeExecutionQueue, codeExecutionWorker, setCodeQueueIO } from './code-execution.queue';
import type { CodeExecutionJobData } from './code-execution.queue';

import { eloQueue, eloWorker, setSocketIOInstance as setEloQueueIO } from './elo.queue';
import type { EloJobData } from './elo.queue';

import { analyticsQueue, analyticsWorker } from './analytics.queue';
import type { AnalyticsJobData } from './analytics.queue';

// Suppress unhandled connection errors from BullMQ instances when Redis is down
const bullMqInstances = [
    codeExecutionQueue, codeExecutionWorker,
    eloQueue, eloWorker,
    analyticsQueue, analyticsWorker
];

bullMqInstances.forEach((instance: any) => {
    if (instance && typeof instance.on === 'function') {
        instance.on('error', () => { /* absorb BullMQ connection errors */ });
    }
});

export {
    codeExecutionQueue, codeExecutionWorker, setCodeQueueIO,
    eloQueue, eloWorker, setEloQueueIO,
    analyticsQueue, analyticsWorker,
    processJudge0Callback
};

export type { CodeExecutionJobData, EloJobData, AnalyticsJobData };
