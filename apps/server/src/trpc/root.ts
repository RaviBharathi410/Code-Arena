import { router } from './index';
import { authRouter } from './routers/auth';
import { problemsRouter } from './routers/problems';
import { leaderboardRouter } from './routers/leaderboard';
import { adminRouter } from './routers/admin';
import { matchesRouter } from './routers/matches';
import { submissionsRouter } from './routers/submissions';

/**
 * Root tRPC Router
 */
export const appRouter = router({
    auth: authRouter,
    problems: problemsRouter,
    leaderboard: leaderboardRouter,
    admin: adminRouter,
    matches: matchesRouter,
    submissions: submissionsRouter,
});

export type AppRouter = typeof appRouter;
