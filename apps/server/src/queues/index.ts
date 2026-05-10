/**
 * Queue barrel export — exposes all queues, workers, and job types.
 */
import { codeExecutionQueue, codeExecutionWorker, processJudge0Callback, setSocketIOInstance as setCodeQueueIO } from './code-execution.queue';
import type { CodeExecutionJobData, CodeExecutionResult } from './code-execution.queue';

import { eloQueue, eloWorker, setSocketIOInstance as setEloQueueIO } from './elo.queue';
import type { EloJobData } from './elo.queue';

import { analyticsQueue, analyticsWorker } from './analytics.queue';
import type { AnalyticsJobData } from './analytics.queue';

import { bullmqConnection } from './connection';

// Suppress unhandled connection errors from BullMQ instances when Redis is down
const bullMqInstances = [
    codeExecutionQueue, codeExecutionWorker,
    eloQueue, eloWorker,
    analyticsQueue, analyticsWorker
];

bullMqInstances.forEach((instance: any) => {
    if (instance && typeof instance.on === 'function') {
        instance.on('error', (err: any) => {
            // Silently absorb raw BullMQ unhandled connection errors to prevent terminal spam
        });
    }
});

export {
    codeExecutionQueue, codeExecutionWorker, processJudge0Callback, setCodeQueueIO,
    eloQueue, eloWorker, setEloQueueIO,
    analyticsQueue, analyticsWorker,
    bullmqConnection
};

export type { CodeExecutionJobData, CodeExecutionResult, EloJobData, AnalyticsJobData };
