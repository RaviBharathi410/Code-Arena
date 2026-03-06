import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import {
    Activity, Mail, Lock, User, ArrowRight,
    Zap, Shield, Sword, Eye, EyeOff,
} from 'lucide-react';

export const Login: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ username: '', email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const navigate = useNavigate();
    const setAuth = useAuthStore((state) => state.setAuth);

    const containerRef = useRef<HTMLDivElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.fromTo(cardRef.current,
                { y: 40, opacity: 0, scale: 0.97 },
                { y: 0, opacity: 1, scale: 1, duration: 0.9, ease: 'expo.out', delay: 0.1 }
            );
            gsap.from('.auth-field',
                { x: -20, opacity: 0, duration: 0.55, stagger: 0.07, ease: 'power3.out', delay: 0.35 }
            );
        }, containerRef);
        return () => ctx.revert();
    }, [isLogin]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
            const payload = isLogin
                ? { email: formData.email, password: formData.password }
                : formData;

            const response = await axios.post(`http://localhost:3001${endpoint}`, payload);
            setAuth(response.data.user, response.data.token);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Authentication failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const switchMode = () => {
        setIsLogin(!isLogin);
        setError('');
        setFormData({ username: '', email: '', password: '' });
    };

    return (
        <div ref={containerRef} className="relative min-h-screen w-full bg-[#020202] text-white overflow-hidden flex items-center justify-center selection:bg-white selection:text-black">
            {/* Subtle grid overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-5" style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)',
                backgroundSize: '60px 60px',
            }} />

            {/* Floating orbs */}
            <div className="absolute top-[15%] left-[10%] w-72 h-72 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)', filter: 'blur(40px)', animation: 'loginOrb1 12s ease-in-out infinite alternate' }} />
            <div className="absolute bottom-[20%] right-[8%] w-96 h-96 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.02) 0%, transparent 70%)', filter: 'blur(60px)', animation: 'loginOrb2 16s ease-in-out infinite alternate' }} />

            {/* Side brand strip */}
            <div className="hidden lg:flex flex-col justify-between absolute left-10 top-0 bottom-0 py-10">
                <div className="flex items-center gap-2">
                    <Activity size={18} className="text-white" />
                    <span className="font-bold tracking-tight text-sm">Arena<span className="text-gray-500">Protocol</span></span>
                </div>
                <div className="space-y-6">
                    {[
                        { icon: <Zap size={16} />, label: 'Voice Coding Combat' },
                        { icon: <Shield size={16} />, label: 'Real-time Ranked Matches' },
                        { icon: <Sword size={16} />, label: 'Global Leaderboards' },
                    ].map((feat, i) => (
                        <div key={i} className="flex items-center gap-3 text-gray-600">
                            {feat.icon}
                            <span className="text-xs tracking-wide">{feat.label}</span>
                        </div>
                    ))}
                </div>
                <p className="text-[10px] text-gray-700 font-mono">ARENA PROTOCOL v2.0</p>
            </div>

            {/* Auth card */}
            <div ref={cardRef} className="relative w-full max-w-sm mx-4">
                {/* Glow border */}
                <div className="absolute -inset-px rounded-2xl"
                    style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.08), transparent 50%, rgba(255,255,255,0.04))', borderRadius: '1rem' }} />

                <div className="relative rounded-2xl border border-white/10 bg-[#080808] p-8 shadow-2xl">
                    {/* Header */}
                    <div className="mb-8 text-center">
                        <div className="mx-auto mb-5 w-12 h-12 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center">
                            <Activity size={22} className="text-white" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">Arena Protocol</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {isLogin ? 'Authenticate to enter the battlefield' : 'Register as a new operator'}
                        </p>
                    </div>

                    {/* Mode switcher */}
                    <div className="flex rounded-xl border border-white/10 bg-black/50 p-1 mb-7">
                        <button type="button" onClick={() => setIsLogin(true)}
                            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all duration-200 ${isLogin ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-white'}`}>
                            Sign In
                        </button>
                        <button type="button" onClick={() => setIsLogin(false)}
                            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all duration-200 ${!isLogin ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-white'}`}>
                            Register
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLogin && (
                            <div className="auth-field space-y-1.5">
                                <label className="flex items-center gap-1.5 text-xs text-gray-500 uppercase tracking-wider">
                                    <User size={11} /> Username
                                </label>
                                <input
                                    type="text" placeholder="operator_alias"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-700 focus:outline-none focus:border-white/30 focus:bg-white/8 transition-all"
                                />
                            </div>
                        )}

                        <div className="auth-field space-y-1.5">
                            <label className="flex items-center gap-1.5 text-xs text-gray-500 uppercase tracking-wider">
                                <Mail size={11} /> {isLogin ? 'Email or Username' : 'Email'}
                            </label>
                            <input
                                type="text"
                                placeholder={isLogin ? 'operator@nexus.io or alias' : 'operator@nexus.io'}
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-700 focus:outline-none focus:border-white/30 focus:bg-white/8 transition-all"
                            />
                        </div>

                        <div className="auth-field space-y-1.5">
                            <label className="flex items-center gap-1.5 text-xs text-gray-500 uppercase tracking-wider">
                                <Lock size={11} /> Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder:text-gray-700 focus:outline-none focus:border-white/30 focus:bg-white/8 transition-all"
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors">
                                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="auth-field flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/8 px-3 py-2.5 text-xs text-red-400">
                                <Shield size={12} /> {error}
                            </div>
                        )}

                        <button type="submit" disabled={loading}
                            className="auth-field w-full h-12 mt-2 rounded-xl bg-white text-black font-semibold text-sm flex items-center justify-center gap-2 hover:bg-gray-100 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                            {loading ? (
                                <><span className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" /> Synchronizing...</>
                            ) : isLogin ? (
                                <><Zap size={15} /> Authenticate Protocol <ArrowRight size={14} /></>
                            ) : (
                                <><Sword size={15} /> Register Operator <ArrowRight size={14} /></>
                            )}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-xs text-gray-600">
                        {isLogin ? "New here?" : "Already registered?"}{' '}
                        <button type="button" onClick={switchMode}
                            className="text-gray-300 hover:text-white underline underline-offset-2 transition-colors">
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
