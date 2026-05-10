/**
 * Queue barrel export — exposes all queues, workers, and job types.
 */
export { codeExecutionQueue, codeExecutionWorker, processJudge0Callback, setSocketIOInstance as setCodeQueueIO } from './code-execution.queue';
export type { CodeExecutionJobData, CodeExecutionResult } from './code-execution.queue';

export { eloQueue, eloWorker, setSocketIOInstance as setEloQueueIO } from './elo.queue';
export type { EloJobData } from './elo.queue';

export { analyticsQueue, analyticsWorker } from './analytics.queue';
export type { AnalyticsJobData } from './analytics.queue';

export { bullmqConnection } from './connection';
