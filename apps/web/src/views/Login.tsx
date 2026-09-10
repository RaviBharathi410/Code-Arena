import React, { useState, useRef, useEffect } from 'react';
import { useNav } from '../navigation/NavigationContext';
import { gsap } from 'gsap';
import { useAuthStore } from '../store/useAuthStore';
import { useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import {
    Activity, Mail, Lock, User, ArrowRight,
    Zap, Shield, Sword, Eye, EyeOff, Sparkles
} from 'lucide-react';
import { Logo } from '../components/ui/Logo';
import { GoogleAuthButton } from '../components/auth/GoogleAuthButton';

export const Login: React.FC = () => {
    const [searchParams] = useSearchParams();
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');

    const { goToDashboard } = useNav();
    const setAuth = useAuthStore((state) => state.setAuth);
    const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);
    const loginAsDemo = useAuthStore((state) => state.loginAsDemo);
    const [demoLoading, setDemoLoading] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const mode = searchParams.get('mode');
        if (mode === 'register') setIsLogin(false);
    }, [searchParams]);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.fromTo(cardRef.current,
                { y: 40, opacity: 0, scale: 0.97 },
                { y: 0, opacity: 1, scale: 1, duration: 0.9, ease: 'expo.out', delay: 0.1 }
            );
            gsap.fromTo('.auth-field',
                { x: -20, opacity: 0 },
                { x: 0, opacity: 1, duration: 0.55, stagger: 0.07, ease: 'power3.out', delay: 0.35 }
            );
        }, containerRef);
        return () => ctx.revert();
    }, [isLogin]);

    const validate = () => {
        if (isLogin) {
            if (!identifier) return 'Email or username is required';
            if (!password) return 'Password is required';
        } else {
            if (!email.includes('@')) return 'Please enter a valid email address';
            if (!password) return 'Password is required';
            if (password.length < 8) return 'Password must be at least 8 characters';
            if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter';
            if (!/[0-9]/.test(password)) return 'Password must contain a number';
            if (!username) return 'Username is required';
            if (!/^[a-zA-Z0-9_-]+$/.test(username)) return 'Username must contain only letters, numbers, underscores, or hyphens';
        }
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // 1. Client-side validation
        const valError = validate();
        if (valError) {
            setError(valError);
            return;
        }

        // 2. Set loading, clear error
        setLoading(true);
        setError(null);

        try {
            let sessionObj: any;
            let userObj: any;

            if (isLogin) {
                // Login API call
                const response = await api.post('/auth/login', {
                    identifier,
                    password
                });

                sessionObj = { access_token: response.data.accessToken };
                userObj = response.data.user;
            } else {
                // Register API call
                const response = await api.post('/auth/register', {
                    email,
                    password,
                    username
                });

                sessionObj = { access_token: response.data.accessToken };
                userObj = response.data.user;
            }

            if (sessionObj) {
                setAuth(userObj, sessionObj.access_token);
                goToDashboard();
            }
        } catch (err: any) {
            let msg = err.response?.data?.error || err.message || 'Authentication failed. Please check your uplink.';
            setError(msg);
            setPassword('');
        } finally {
            setLoading(false);
        }
    };

    const switchMode = () => {
        setIsLogin(!isLogin);
        setError(null);
        setEmail('');
        setIdentifier('');
        setPassword('');
        setUsername('');
    };

    const handleGoogleSuccess = async (credential: string) => {
        setLoading(true);
        setError(null);
        try {
            await loginWithGoogle(credential);
            goToDashboard();
        } catch (err: any) {
            setError(err.message || 'Google authentication failed');
        } finally {
            setLoading(false);
        }
    };

    const handleDemoLogin = async () => {
        setDemoLoading(true);
        setError(null);
        try {
            await loginAsDemo();
            goToDashboard();
        } catch (err: any) {
            setError(err.message || 'Failed to initialize demo session');
        } finally {
            setDemoLoading(false);
        }
    };

    const isSubmitDisabled = loading || (isLogin ? (!identifier || !password) : (!email || !password || !username));

    return (
        <div ref={containerRef} className="relative min-h-screen w-full bg-[#050507] text-white overflow-y-auto flex items-center justify-center selection:bg-accent-secondary selection:text-white py-10">
            {/* Subtle grid overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{
                backgroundImage: 'linear-gradient(rgba(124,58,237,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.3) 1px, transparent 1px)',
                backgroundSize: '60px 60px',
            }} />

            {/* Floating orbs — purple themed */}
            <div className="absolute top-[15%] left-[10%] w-72 h-72 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)', filter: 'blur(40px)', animation: 'loginOrb1 12s ease-in-out infinite alternate' }} />
            <div className="absolute bottom-[20%] right-[8%] w-96 h-96 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.05) 0%, transparent 70%)', filter: 'blur(60px)', animation: 'loginOrb2 16s ease-in-out infinite alternate' }} />

            {/* Side brand strip */}
            <div className="hidden lg:flex flex-col justify-between absolute left-10 top-0 bottom-0 py-10">
                <Logo />
                <div className="space-y-6">
                    {[
                        { icon: <Zap size={16} />, label: 'Voice Coding Combat' },
                        { icon: <Shield size={16} />, label: 'Real-time Ranked Matches' },
                        { icon: <Sword size={16} />, label: 'Global Leaderboards' },
                    ].map((feat, i) => (
                        <div key={i} className="flex items-center gap-3 text-white/30">
                            <span className="text-accent-secondary/60">{feat.icon}</span>
                            <span className="text-xs tracking-wide">{feat.label}</span>
                        </div>
                    ))}
                </div>
                <p className="text-[10px] text-white/20 font-bold uppercase tracking-wider">CODEARENA v2.0</p>
            </div>

            {/* Main auth card */}
            <div ref={cardRef} className="relative z-10 w-full max-w-md mx-4">
                <div className="relative rounded-2xl border border-white/10 bg-[#0c0c14]/90 backdrop-blur-xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden">
                    {/* Top ambient accent line */}
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-secondary/50 to-transparent" />

                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-4">
                            <Logo size={40} showText={false} className="justify-center" />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight text-white/90">
                            {isLogin ? 'Access Battle' : 'Create Operator Account'}
                        </h1>
                        <p className="mt-1.5 text-xs text-white/40">
                            {isLogin ? 'Establish uplink to your competitive profile' : 'Initialize your rank rating and begin calibration'}
                        </p>
                    </div>

                    {/* Mode toggle tabs */}
                    <div className="flex rounded-xl bg-white/[0.03] border border-white/[0.06] p-1 mb-6">
                        <button type="button" onClick={() => { if (!isLogin) switchMode(); }}
                            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all duration-200 ${isLogin ? 'bg-accent-secondary text-white shadow-[0_0_15px_rgba(124,58,237,0.3)]' : 'text-white/40 hover:text-white/70'}`}>
                            Sign In
                        </button>
                        <button type="button" onClick={() => { if (isLogin) switchMode(); }}
                            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all duration-200 ${!isLogin ? 'bg-accent-secondary text-white shadow-[0_0_15px_rgba(124,58,237,0.3)]' : 'text-white/40 hover:text-white/70'}`}>
                            Register
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLogin && (
                            <div className="auth-field space-y-1.5">
                                <label className="flex items-center gap-1.5 text-xs text-white/40 uppercase tracking-wider">
                                    <User size={11} /> Username
                                </label>
                                <input
                                    type="text" placeholder="operator_alias"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    disabled={loading}
                                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-accent-secondary/50 focus:bg-white/[0.06] focus:shadow-[0_0_15px_rgba(124,58,237,0.1)] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                />
                            </div>
                        )}

                        <div className="auth-field space-y-1.5">
                            <label className="flex items-center gap-1.5 text-xs text-white/40 uppercase tracking-wider">
                                <Mail size={11} /> {isLogin ? 'Email or Username' : 'Email'}
                            </label>
                            <input
                                type="text"
                                placeholder={isLogin ? 'operator@nexus.io or alias' : 'operator@nexus.io'}
                                value={isLogin ? identifier : email}
                                onChange={(e) => isLogin ? setIdentifier(e.target.value) : setEmail(e.target.value)}
                                disabled={loading}
                                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-accent-secondary/50 focus:bg-white/[0.06] focus:shadow-[0_0_15px_rgba(124,58,237,0.1)] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            />
                        </div>

                        <div className="auth-field space-y-1.5">
                            <label className="flex items-center gap-1.5 text-xs text-white/40 uppercase tracking-wider">
                                <Lock size={11} /> Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-accent-secondary/50 focus:bg-white/[0.06] focus:shadow-[0_0_15px_rgba(124,58,237,0.1)] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} disabled={loading}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-accent-secondary transition-colors disabled:opacity-30">
                                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="auth-field flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-xs text-red-400">
                                <Shield size={12} /> {error}
                            </div>
                        )}

                        <div className="auth-field pt-4">
                            <button type="submit" disabled={isSubmitDisabled}
                                className="w-full h-12 rounded-xl bg-gradient-to-r from-accent-secondary to-purple-600 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(124,58,237,0.3)] hover:shadow-[0_0_35px_rgba(124,58,237,0.5)] hover:-translate-y-0.5 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none">
                                {loading ? (
                                    <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Authenticating...</>
                                ) : isLogin ? (
                                    <><Zap size={15} /> Enter the Arena <ArrowRight size={14} /></>
                                ) : (
                                    <><Sword size={15} /> Deploy Operator <ArrowRight size={14} /></>
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Divider */}
                    <div className="auth-field my-5 flex items-center gap-3">
                        <div className="h-px flex-1 bg-white/10" />
                        <span className="text-[10px] font-bold tracking-widest text-white/30 uppercase">OR SECURE UPLINK WITH</span>
                        <div className="h-px flex-1 bg-white/10" />
                    </div>

                    {/* Google Auth Button */}
                    <div className="auth-field">
                        <GoogleAuthButton
                            onSuccess={handleGoogleSuccess}
                            onError={(err) => setError(err)}
                            disabled={loading || demoLoading}
                        />
                    </div>

                    {/* Recruiter / Instant Demo Mode Button */}
                    <div className="auth-field mt-3">
                        <button
                            type="button"
                            onClick={handleDemoLogin}
                            disabled={loading || demoLoading}
                            className="w-full h-11 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed group"
                        >
                            {demoLoading ? (
                                <>
                                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-purple-300/30 border-t-purple-300" />
                                    <span>Calibrating Demo Operator...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles size={14} className="text-purple-300 group-hover:scale-110 transition-transform" />
                                    <span>Explore Demo (No Account Required)</span>
                                </>
                            )}
                        </button>
                    </div>

                    <p className="mt-6 text-center text-xs text-white/30">
                        {isLogin ? "New here?" : "Already registered?"}{' '}
                        <button type="button" onClick={switchMode}
                            className="text-accent-primary hover:text-white underline underline-offset-2 transition-colors">
                            {isLogin ? 'Create an account' : 'Sign in instead'}
                        </button>
                    </p>
                </div>
            </div>

            <style>{`
              @keyframes loginOrb1 { from { transform: translate(0,0); } to { transform: translate(30px,-40px); } }
              @keyframes loginOrb2 { from { transform: translate(0,0); } to { transform: translate(-25px,35px); } }
            `}</style>
        </div>
    );
};
