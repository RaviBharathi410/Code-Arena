import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    username: text('username').unique().notNull(),
    email: text('email').unique().notNull(),
    passwordHash: text('password_hash').notNull(),
    rating: integer('rating').default(1200),
    level: integer('level').default(1),
    experience: integer('experience').default(0),
    wins: integer('wins').default(0),
    losses: integer('losses').default(0),
    badges: text('badges', { mode: 'json' }).default('[]'),
    avatarUrl: text('avatar_url'),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const tournaments = sqliteTable('tournaments', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    title: text('title').notNull(),
    status: text('status').default('open'),
    startTime: text('start_time'),
    bracketData: text('bracket_data', { mode: 'json' }),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const problems = sqliteTable('problems', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    title: text('title').notNull(),
    description: text('description').notNull(),
    difficulty: text('difficulty').notNull(),
    testCases: text('test_cases', { mode: 'json' }).notNull(),
    baseCode: text('base_code'),
    solution: text('solution'),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const matches = sqliteTable('matches', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    player1Id: text('player1_id').references(() => users.id),
    player2Id: text('player2_id').references(() => users.id),
    tournamentId: text('tournament_id').references(() => tournaments.id),
    problemId: text('problem_id').references(() => problems.id),
    winnerId: text('winner_id').references(() => users.id),
    status: text('status').default('pending'),
    durationSeconds: integer('duration_seconds'),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const submissions = sqliteTable('submissions', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id').references(() => users.id),
    matchId: text('match_id').references(() => matches.id),
    code: text('code').notNull(),
    language: text('language').notNull(),
    status: text('status').notNull(),
    executionTimeMs: integer('execution_time_ms'),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const leaderboard = sqliteTable('leaderboard', {
    userId: text('user_id').references(() => users.id).primaryKey(),
    rating: integer('rating').notNull(),
    rank: integer('rank'),
});
