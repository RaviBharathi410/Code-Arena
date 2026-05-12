import { env } from './env';

export const config = {
    port: env.PORT,
    jwtSecret: env.JWT_SECRET,
    dbUrl: env.DATABASE_URL,
    isProduction: env.NODE_ENV === 'production',
    bcryptRounds: env.BCRYPT_ROUNDS,
    jwtExpiresIn: env.JWT_EXPIRES_IN,
    jwtRefreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
    judge0: {
        apiUrl: env.JUDGE0_API_URL,
        apiKey: env.JUDGE0_API_KEY,
    }
};
