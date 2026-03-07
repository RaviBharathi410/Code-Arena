import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Enums aren't natively supported in SQLite, so we use text with check constraints if needed
// but for Drizzle simplicity we just use text.

export const users = sqliteTable('users', {
    id: text('id').primaryKey(),
    username: text('username').unique().notNull(),
    email: text('email').unique().notNull(),
    passwordHash: text('password_hash').notNull(),
    elo: integer('elo').notNull().default(1200),
    level: integer('level').notNull().default(1),
    xp: integer('xp').notNull().default(0),
    wins: integer('wins').default(0),
    losses: integer('losses').default(0),
    badges: text('badges', { mode: 'json' }).default(sql`'[]'`),
    avatarUrl: text('avatar_url'),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const problems = sqliteTable('problems', {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    slug: text('slug').unique().notNull(),
    description: text('description').notNull(),
    difficulty: text('difficulty').notNull(), // 'easy' | 'medium' | 'hard'
    testCases: text('test_cases', { mode: 'json' }).notNull(),
    constraints: text('constraints'),
    examples: text('examples', { mode: 'json' }).notNull(),
    baseCode: text('base_code'),
    solution: text('solution'),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const tournaments = sqliteTable('tournaments', {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    status: text('status').default('open'),
    startTime: text('start_time'),
    bracketData: text('bracket_data', { mode: 'json' }),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const matches = sqliteTable('matches', {
    id: text('id').primaryKey(),
    problemId: text('problem_id').notNull().references(() => problems.id),
    player1Id: text('player1_id').notNull().references(() => users.id),
    player2Id: text('player2_id').references(() => users.id),
    winnerId: text('winner_id').references(() => users.id),
    tournamentId: text('tournament_id').references(() => tournaments.id),
    status: text('status').notNull().default('waiting'), // 'waiting' | 'active' | 'completed' | 'abandoned'
    startedAt: text('started_at'),
    endedAt: text('ended_at'),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const submissions = sqliteTable('submissions', {
    id: text('id').primaryKey(),
    matchId: text('match_id').notNull().references(() => matches.id),
    userId: text('user_id').notNull().references(() => users.id),
    code: text('code').notNull(),
    languageId: integer('language_id').notNull(),
    status: text('status').notNull().default('pending'), // 'pending' | 'running' | 'accepted' | 'rejected' | 'error'
    executionTime: integer('execution_time'),
    memoryUsed: integer('memory_used'),
    testResults: text('test_results', { mode: 'json' }),
    submittedAt: text('submitted_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const refreshTokens = sqliteTable('refresh_tokens', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').unique().notNull(),
    expiresAt: text('expires_at').notNull(),
    revokedAt: text('revoked_at'),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const leaderboard = sqliteTable('leaderboard', {
    userId: text('user_id').primaryKey().references(() => users.id),
    rating: integer('rating').notNull(),
    rank: integer('rank'),
});
