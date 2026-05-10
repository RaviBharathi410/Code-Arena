import { authService } from './modules/auth/auth.service';

async function testEmailAuth() {
    const email = 'ravibharathi@gmail.com';
    const password = 'password123';
    
    console.log(`--- Testing Login for ${email} ---`);
    try {
        const loginResult = await authService.login(email, password);
        console.log('Login successful:', loginResult.user.username);
        process.exit(0);
    } catch (err) {
        console.error('Login failed:', err);
        process.exit(1);
    }
}

testEmailAuth();
