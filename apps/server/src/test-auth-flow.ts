import { authService } from './modules/auth/auth.service';

async function testAuth() {
    const testUser = {
        username: 'test_user_' + Date.now(),
        email: 'test' + Date.now() + '@example.com',
        password: 'password123'
    };

    console.log('--- Testing Registration ---');
    try {
        const regResult = await authService.register(testUser);
        console.log('Registration successful:', regResult.user.username);
        
        console.log('--- Testing Login ---');
        const loginResult = await authService.login(testUser.username, testUser.password);
        console.log('Login successful:', loginResult.user.username);
        
        process.exit(0);
    } catch (err) {
        console.error('Auth test failed:', err);
        process.exit(1);
    }
}

testAuth();
