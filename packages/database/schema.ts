import { pgTable, text, integer, uuid, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
    id: uuid('id').defaultRandom().primaryKey().notNull(),
    username: text('username').unique().notNull(),
    email: text('email').unique().notNull(),
    passwordHash: text('password_hash').notNull(),
    role: text('role').notNull().default('player'), // 'player', 'admin', 'moderator'
    provider: text('provider').default('local'), // 'local', 'google', 'github'
    providerId: text('provider_id'),
    eloRating: integer('elo_rating').notNull().default(1200),
    level: integer('level').notNull().default(1),
    xp: integer('xp').notNull().default(0),
    wins: integer('wins').default(0),
    losses: integer('losses').default(0),
    skillVector: jsonb('skill_vector'),
    badges: jsonb('badges').default('[]'),
    avatarUrl: text('avatar_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
    return {
        eloRatingIdx: index('users_elo_rating_idx').on(table.eloRating)
    };
});

export const problems = pgTable('problems', {
    id: uuid('id').defaultRandom().primaryKey().notNull(),
    title: text('title').notNull(),
    slug: text('slug').unique().notNull(),
    description: text('description').notNull(),
    difficulty: text('difficulty').notNull(),
    testCases: jsonb('test_cases').notNull(),
    constraints: text('constraints'),
    examples: jsonb('examples').notNull(),
    baseCode: text('base_code'),
    solution: text('solution'),
    complexityBenchmarks: jsonb('complexity_benchmarks'),
    validationScript: text('validation_script'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const tournaments = pgTable('tournaments', {
    id: uuid('id').defaultRandom().primaryKey().notNull(),
    title: text('title').notNull(),
    status: text('status').default('open'),
    startTime: timestamp('start_time', { withTimezone: true }),
    bracketData: jsonb('bracket_data'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const matches = pgTable('matches', {
    id: uuid('id').defaultRandom().primaryKey().notNull(),
    problemId: uuid('problem_id').notNull().references(() => problems.id),
    player1Id: uuid('player1_id').notNull().references(() => users.id),
    player2Id: uuid('player2_id').references(() => users.id),
    winnerId: uuid('winner_id').references(() => users.id),
    tournamentId: uuid('tournament_id').references(() => tournaments.id),
    status: text('status').notNull().default('waiting'),
    timeLimit: integer('time_limit').notNull().default(300), // Default 5 minutes
    startedAt: timestamp('started_at', { withTimezone: true }),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
    return {
        statusIdx: index('matches_status_idx').on(table.status)
    };
});

export const submissions = pgTable('submissions', {
    id: uuid('id').defaultRandom().primaryKey().notNull(),
    matchId: uuid('match_id').notNull().references(() => matches.id),
    userId: uuid('user_id').notNull().references(() => users.id),
    code: text('code').notNull(),
    languageId: integer('language_id').notNull(),
    status: text('status').notNull().default('pending'),
    executionTime: integer('execution_time'),
    memoryUsed: integer('memory_used'),
    testResults: jsonb('test_results'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
    return {
        matchIdIdx: index('submissions_match_id_idx').on(table.matchId),
        userIdIdx: index('submissions_user_id_idx').on(table.userId),
        statusIdx: index('submissions_status_idx').on(table.status)
    };
});

export const refreshTokens = pgTable('refresh_tokens', {
    id: uuid('id').defaultRandom().primaryKey().notNull(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').unique().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const leaderboard = pgTable('leaderboard', {
    userId: uuid('user_id').primaryKey().references(() => users.id),
    rating: integer('rating').notNull(),
    rank: integer('rank'),
});
