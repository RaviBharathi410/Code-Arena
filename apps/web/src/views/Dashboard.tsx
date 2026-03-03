import React, { useEffect, useRef, useState, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { useAuthStore } from '../store/useAuthStore';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';
import {
    Trophy, Zap, Activity, Settings, LogOut,
    Sword, Target, Menu, X, BarChart2,
    ChevronRight, Award, Clock, Shield,
    Edit2, Check, Moon, Sun, Beaker, GitPullRequest,
    Layers, Play
} from 'lucide-react';

// ── WebGL availability check ──────────────────────────────────────────────
function isWebGLAvailable(): boolean {
    try {
        const canvas = document.createElement('canvas');
        return !!(
            (window as Window & typeof globalThis & { WebGLRenderingContext?: unknown }).WebGLRenderingContext &&
            (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
        );
    } catch { return false; }
}

// ── Error boundary ────────────────────────────────────────────────────────
interface EBState { hasError: boolean }
class WebGLErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, EBState> {
    state: EBState = { hasError: false };
    static getDerivedStateFromError(): EBState { return { hasError: true }; }
    componentDidCatch(err: Error, info: ErrorInfo) { console.warn('[WebGL]', err, info); }
    render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}

// ── CSS fallback background ───────────────────────────────────────────────
const CSSBackground: React.FC<{ isLight?: boolean }> = ({ isLight }) => (
    <div className={`absolute inset-0 overflow-hidden transition-colors duration-500 ${isLight ? 'bg-gray-50' : 'bg-[#020202]'}`}>
        <div className="absolute inset-0" style={{
            background: isLight
                ? 'radial-gradient(ellipse 80% 80% at 20% 30%, rgba(0,0,0,0.03) 0%, transparent 60%), radial-gradient(ellipse 60% 60% at 80% 70%, rgba(0,0,0,0.02) 0%, transparent 60%)'
                : 'radial-gradient(ellipse 80% 80% at 20% 30%, #111 0%, transparent 60%), radial-gradient(ellipse 60% 60% at 80% 70%, #0d0d0d 0%, transparent 60%)',
            animation: 'meshPulse 8s ease-in-out infinite alternate',
        }} />
        {[
            { size: 320, x: '10%', y: '20%', delay: '0s', dur: '12s', color: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)' },
            { size: 480, x: '65%', y: '55%', delay: '3s', dur: '15s', color: isLight ? 'rgba(0,0,0,0.01)' : 'rgba(255,255,255,0.02)' },
            { size: 200, x: '80%', y: '15%', delay: '6s', dur: '10s', color: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)' },
        ].map((orb, i) => (
            <div key={i} className="absolute rounded-full pointer-events-none" style={{
                width: orb.size, height: orb.size, left: orb.x, top: orb.y,
                background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
                animation: `orbFloat ${orb.dur} ${orb.delay} ease-in-out infinite alternate`,
                filter: 'blur(40px)',
            }} />
        ))}
        <div className={`absolute inset-0 opacity-5`} style={{
            backgroundImage: isLight
                ? 'linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)'
                : 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
        }} />
        <style>{`
          @keyframes meshPulse { from { opacity: 0.3; } to { opacity: 0.55; } }
          @keyframes orbFloat { from { transform: translate(0,0) scale(1); } to { transform: translate(20px, -30px) scale(1.08); } }
        `}</style>
    </div>
);

// ── Three.js scene components ─────────────────────────────────────────────
const LiquidBackground = ({ isLight }: { isLight: boolean }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const { viewport } = useThree();
    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uColor1: { value: new THREE.Color(isLight ? '#f3f4f6' : '#000000') },
        uColor2: { value: new THREE.Color(isLight ? '#e5e7eb' : '#111111') },
        uColor3: { value: new THREE.Color(isLight ? '#ffffff' : '#0a0a0a') }
    }), [isLight]);

    useEffect(() => {
        uniforms.uColor1.value.set(isLight ? '#f3f4f6' : '#000000');
        uniforms.uColor2.value.set(isLight ? '#e5e7eb' : '#111111');
        uniforms.uColor3.value.set(isLight ? '#ffffff' : '#0a0a0a');
    }, [isLight, uniforms]);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.x = state.clock.elapsedTime * 0.05;
            meshRef.current.rotation.y = state.clock.elapsedTime * 0.03;
            uniforms.uTime.value = state.clock.elapsedTime;
        }
    });
    return (
        <mesh ref={meshRef} scale={[viewport.width * 1.5, viewport.height * 1.5, 1]}>
            <planeGeometry args={[1, 1, 128, 128]} />
            <shaderMaterial uniforms={uniforms}
                vertexShader={`varying vec2 vUv; uniform float uTime;
          vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
          vec2 mod289(vec2 x){return x-floor(x*(1./289.))*289.;}
          vec3 permute(vec3 x){return mod289(((x*34.)+1.)*x);}
          float snoise(vec2 v){
            const vec4 C=vec4(.211324865405187,.366025403784439,-.577350269189626,.024390243902439);
            vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);
            vec2 i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.);
            vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=mod289(i);
            vec3 p=permute(permute(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));
            vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);
            m=m*m;m=m*m;vec3 x=2.*fract(p*C.www)-1.;vec3 h=abs(x)-.5;
            vec3 ox=floor(x+.5);vec3 a0=x-ox;
            m*=1.79284291400159-.85373472095314*(a0*a0+h*h);
            vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;
            return 130.*dot(m,g);}
          void main(){vUv=uv;vec3 pos=position;
          float noise=snoise(vec2(pos.x*2.+uTime*.1,pos.y*2.+uTime*.1));
          pos.z+=noise*.1;gl_Position=projectionMatrix*modelViewMatrix*vec4(pos,1.);}`}
                fragmentShader={`uniform vec3 uColor1,uColor2,uColor3;uniform float uTime;varying vec2 vUv;
          void main(){vec2 p=vUv;
          vec3 color=mix(uColor1,uColor2,p.y+sin(uTime*.5)*.1);
          color=mix(color,uColor3,p.x+cos(uTime*.3)*.1);
          float grid=step(.98,fract(p.x*20.))+step(.98,fract(p.y*20.));
          color+=grid*.05;gl_FragColor=vec4(color,1.);}`}
            />
        </mesh>
    );
};

const Monolith = ({ isLight }: { isLight: boolean }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.2;
            meshRef.current.rotation.x = Math.cos(state.clock.elapsedTime * 0.2) * 0.1;
            meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
        }
    });
    return (
        <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
            <mesh ref={meshRef} position={[0, 0, 0]}>
                <octahedronGeometry args={[1.5, 0]} />
                <MeshDistortMaterial color={isLight ? "#000000" : "#ffffff"} envMapIntensity={1} clearcoat={1}
                    clearcoatRoughness={0} metalness={0.9} roughness={0.1} distort={0.2} speed={2} transparent opacity={0.8} />
            </mesh>
        </Float>
    );
};

// ── Leaderboard data ──────────────────────────────────────────────────────
const INITIAL_LEADERBOARD = [
    { rank: 1, name: 'Ghost_Runner_32', rp: 4820, wins: 312, wr: 78, badge: '⚡' },
    { rank: 2, name: 'NeonShadow_X', rp: 4611, wins: 289, wr: 74, badge: '🔥' },
    { rank: 3, name: 'CipherKnight', rp: 4430, wins: 261, wr: 71, badge: '💎' },
    { rank: 4, name: 'VoidPulse_9', rp: 4205, wins: 238, wr: 68, badge: '🚀' },
    { rank: 5, name: 'QuantumByte', rp: 3980, wins: 215, wr: 65, badge: '🌟' },
    { rank: 6, name: 'SilverAxe_404', rp: 3760, wins: 198, wr: 62, badge: '🏆' },
    { rank: 7, name: 'NullPointer_77', rp: 3540, wins: 179, wr: 59, badge: '⚔️' },
    { rank: 8, name: 'DataPhantom', rp: 3310, wins: 160, wr: 56, badge: '🎯' },
];

// ── Tab types ─────────────────────────────────────────────────────────────
type Tab = 'command' | 'battle' | 'practice' | 'tournaments' | 'history' | 'leaderboard' | 'profile' | 'settings';

// ── Radar Chart Component ─────────────────────────────────────────────────
const SkillRadar: React.FC<{ isLight: boolean }> = ({ isLight }) => {
    const skills = [
        { name: 'Logic', value: 85 },
        { name: 'Speed', value: 72 },
        { name: 'Accuracy', value: 94 },
        { name: 'Data Struct', value: 65 },
        { name: 'Complexity', value: 78 },
    ];

    const size = 300;
    const center = size / 2;
    const radius = size * 0.4;
    const angleStep = (Math.PI * 2) / skills.length;

    const points = skills.map((s, i) => {
        const x = center + radius * (s.value / 100) * Math.cos(i * angleStep - Math.PI / 2);
        const y = center + radius * (s.value / 100) * Math.sin(i * angleStep - Math.PI / 2);
        return `${x},${y}`;
    }).join(' ');

    const webPoints = [0.2, 0.4, 0.6, 0.8, 1.0].map(level => {
        return skills.map((_, i) => {
            const x = center + radius * level * Math.cos(i * angleStep - Math.PI / 2);
            const y = center + radius * level * Math.sin(i * angleStep - Math.PI / 2);
            return `${x},${y}`;
        }).join(' ');
    });

    return (
        <div className="flex flex-col items-center">
            <svg width={size} height={size} className="overflow-visible">
                {/* Background Webs */}
                {webPoints.map((p, i) => (
                    <polygon key={i} points={p} fill="none" stroke={isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)"} strokeWidth="1" />
                ))}

                {/* Axes */}
                {skills.map((_, i) => {
                    const x = center + radius * Math.cos(i * angleStep - Math.PI / 2);
                    const y = center + radius * Math.sin(i * angleStep - Math.PI / 2);
                    return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke={isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)"} />;
                })}

                {/* Skill Area */}
                <polygon
                    points={points}
                    fill={isLight ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.2)"}
                    stroke={isLight ? "black" : "white"}
                    strokeWidth="2"
                    className="animate-pulse"
                />

                {/* Labels */}
                {skills.map((s, i) => {
                    const x = center + (radius + 20) * Math.cos(i * angleStep - Math.PI / 2);
                    const y = center + (radius + 20) * Math.sin(i * angleStep - Math.PI / 2);
                    return (
                        <text
                            key={i}
                            x={x}
                            y={y}
                            textAnchor="middle"
                            fontSize="10"
                            fontWeight="bold"
                            fill={isLight ? "#666" : "#aaa"}
                            className="uppercase tracking-tighter"
                        >
                            {s.name}
                        </text>
                    );
                })}
            </svg>
        </div>
    );
};

// ── Main Dashboard ────────────────────────────────────────────────────────
export const Dashboard: React.FC = () => {
    const { user, logout, fetchProfile } = useAuthStore();
    const navigate = useNavigate();

    const containerRef = useRef<HTMLDivElement>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('command');
    const [webGLSupported] = useState(() => isWebGLAvailable());

    // Core Preferences
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');
    const [notifEnabled, setNotifEnabled] = useState(true);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [voiceEnabled, setVoiceEnabled] = useState(true);

    // Leaderboard sorting
    const [sortKey, setSortKey] = useState<'rp' | 'wins' | 'wr'>('rp');

    // Profile editing
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editName, setEditName] = useState(user?.username || '');
    const [editEmail, setEditEmail] = useState(user?.email || '');

    useEffect(() => {
        fetchProfile();
        const ctx = gsap.context(() => {
            gsap.from('.dash-element', {
                y: 30, opacity: 0, duration: 1.2,
                stagger: 0.08, ease: 'power4.out', delay: 0.15,
            });
        }, containerRef);
        return () => ctx.revert();
    }, []);

    // Re-animate panel content on tab change
    useEffect(() => {
        gsap.fromTo('.panel-content', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' });
    }, [activeTab]);

    const handleStartBattle = () => setActiveTab('battle');

    const navItems: { id: Tab; label: string; icon: React.ReactNode }[] = [
        { id: 'command', label: 'Command Center', icon: <Activity size={18} /> },
        { id: 'battle', label: 'Battle Arena', icon: <Sword size={18} /> },
        { id: 'practice', label: 'Practice Lab', icon: <Beaker size={18} /> },
        { id: 'tournaments', label: 'Tournaments', icon: <GitPullRequest size={18} /> },
        { id: 'history', label: 'Battle Log', icon: <Layers size={18} /> },
        { id: 'leaderboard', label: 'Leaderboard', icon: <BarChart2 size={18} /> },
        { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
    ];

    const sortedLeaderboard = useMemo(() => {
        return [...INITIAL_LEADERBOARD].sort((a, b) => (b[sortKey] as number) - (a[sortKey] as number));
    }, [sortKey]);

    const isLight = theme === 'light';

    // ── Panel: Command Center ─────────────────────────────────────────────
    const CommandPanel = () => (
        <div className="panel-content space-y-8">
            <div className="space-y-4">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/20 ${isLight ? 'bg-black/5' : 'bg-white/5'}`}>
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className={`text-xs tracking-wider uppercase ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>Live Pools Active</span>
                </div>
                <h1 className="text-5xl md:text-6xl font-bold tracking-tighter leading-tight">
                    COMMAND <br />
                    <span className={`text-transparent bg-clip-text bg-gradient-to-r ${isLight ? 'from-black to-gray-400' : 'from-white to-gray-500'}`}>CENTER</span>
                </h1>
                <p className={`text-lg max-w-lg font-light leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                    Welcome back, Operator <strong className={isLight ? 'text-black' : 'text-white'}>{user?.username ?? 'Operator'}</strong>.
                    Challenge global competitors in the high-stakes voice coding arena.
                </p>
            </div>

            <button onClick={handleStartBattle}
                className={`group relative px-8 py-4 rounded-full font-semibold tracking-wide overflow-hidden flex items-center gap-3 hover:scale-105 transition-transform w-fit ${isLight ? 'bg-black text-white' : 'bg-white text-black'}`}>
                <span className="relative z-10 flex items-center gap-2"><Zap size={18} /> Enter Battle Arena</span>
                <div className={`absolute inset-0 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left ${isLight ? 'bg-gray-800' : 'bg-gray-200'}`} />
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                {[
                    { icon: <Trophy size={20} className={isLight ? 'text-gray-600' : 'text-gray-400'} />, val: user?.rating ?? 2431, label: 'Rank Rating' },
                    { icon: <Target size={20} className={isLight ? 'text-gray-600' : 'text-gray-400'} />, val: '64.2%', label: 'Win Rate' },
                    { icon: <Activity size={20} className={isLight ? 'text-gray-600' : 'text-gray-400'} />, val: user?.wins ?? 128, label: 'Total Battles' },
                ].map((s, i) => (
                    <div key={i} className={`p-6 rounded-2xl border backdrop-blur-xl relative overflow-hidden group transition-colors ${isLight ? 'bg-black/5 border-black/10 hover:bg-black/10' : 'bg-white/5 border-white/10 hover:bg-white/8'}`}>
                        <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl transition-colors ${isLight ? 'bg-black/5 group-hover:bg-black/10' : 'bg-white/5 group-hover:bg-white/10'}`} />
                        {s.icon}
                        <p className="text-3xl font-bold mt-3">{s.val}</p>
                        <p className={`text-xs uppercase tracking-widest mt-1 ${isLight ? 'text-gray-600' : 'text-gray-500'}`}>{s.label}</p>
                    </div>
                ))}
            </div>
        </div>
    );

    // ── Panel: Battle Arena ───────────────────────────────────────────────
    const BattlePanel = () => (
        <div className="panel-content space-y-8">
            <div>
                <h2 className="text-4xl font-bold tracking-tighter uppercase">Battle Arena</h2>
                <p className={isLight ? 'text-gray-600' : 'text-gray-400'}>High-stakes algorithm combat. RP at risk.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                    { title: 'Quick Match', desc: 'Auto-matched against a similar operator rank.', icon: <Zap size={28} />, badge: 'RANKED', action: () => navigate('/battle') },
                    { title: 'Ranked Dual', desc: 'Climb the global leaderboard in 1v1 combat.', icon: <Sword size={28} />, badge: 'STAKES', action: () => navigate('/battle') },
                ].map((mode, i) => (
                    <button key={i} onClick={mode.action}
                        className={`group p-6 rounded-2xl border transition-all duration-300 text-left relative overflow-hidden ${isLight ? 'bg-black/5 border-black/10 hover:bg-black/10' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                        <div className={`absolute top-4 right-4 text-[10px] font-black tracking-widest border px-2 py-0.5 rounded ${isLight ? 'border-black/20 text-gray-600' : 'border-white/20 text-gray-400'}`}>{mode.badge}</div>
                        <div className={`mb-4 transition-colors ${isLight ? 'text-gray-600 group-hover:text-black' : 'text-gray-300 group-hover:text-white'}`}>{mode.icon}</div>
                        <h3 className="text-xl font-bold mb-2">{mode.title}</h3>
                        <p className={`text-sm leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-500'}`}>{mode.desc}</p>
                        <div className={`mt-4 flex items-center gap-2 text-sm transition-colors ${isLight ? 'text-gray-500 group-hover:text-black' : 'text-gray-400 group-hover:text-white'}`}>
                            <span>Deploy</span><ChevronRight size={14} />
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );

    // ── Panel: Practice Lab ───────────────────────────────────────────────
    const PracticeLabPanel = () => (
        <div className="panel-content space-y-8">
            <div>
                <h2 className="text-4xl font-bold tracking-tighter uppercase">Practice Lab</h2>
                <p className={isLight ? 'text-gray-600' : 'text-gray-400'}>Hone your skills with zero risk. Focus on adaptive training.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { title: 'Free Roam', desc: 'Unlimited time, all problems open.', icon: <Beaker size={24} />, tag: 'BASIC' },
                    { title: 'Speed Drill', desc: 'Solve Easy tasks in under 2 mins.', icon: <Clock size={24} />, tag: 'TIMED' },
                    { title: 'Logic Bomb', desc: 'Advanced recursive challenges.', icon: <Shield size={24} />, tag: 'HARD' },
                ].map((item, i) => (
                    <div key={i} className={`p-6 rounded-2xl border ${isLight ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'}`}>
                        <div className="flex justify-between items-start mb-6">
                            <div className={isLight ? 'text-black' : 'text-white'}>{item.icon}</div>
                            <span className="text-[10px] font-black px-2 py-1 bg-white/10 rounded">{item.tag}</span>
                        </div>
                        <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                        <p className="text-sm text-gray-500 mb-6">{item.desc}</p>
                        <button
                            onClick={() => navigate('/battle?mode=practice')}
                            className={`w-full py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${isLight ? 'border-black hover:bg-black hover:text-white' : 'border-white hover:bg-white hover:text-black'}`}
                        >
                            Initialize
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );

    // ── Panel: Tournaments ───────────────────────────────────────────────
    const TournamentsPanel = () => (
        <div className="panel-content space-y-8">
            <div>
                <h2 className="text-4xl font-bold tracking-tighter uppercase">Tournaments</h2>
                <p className={isLight ? 'text-gray-600' : 'text-gray-400'}>Brackets, live events, and exclusive badges.</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className={`p-8 rounded-3xl border relative overflow-hidden ${isLight ? 'bg-black text-white' : 'bg-white text-black'}`}>
                        <div className="relative z-10">
                            <h3 className="text-3xl font-black italic uppercase tracking-tighter">Grand Prix #7</h3>
                            <p className="text-sm opacity-60 mt-2">Streaming live in 2 hours. Be there.</p>
                            <div className="flex gap-4 mt-8">
                                <button className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest ${isLight ? 'bg-white text-black' : 'bg-black text-white'}`}>Join Bracket</button>
                                <button className="px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest border border-current opacity-60">Spectate</button>
                            </div>
                        </div>
                        <div className={`absolute top-0 right-0 w-64 h-64 blur-3xl rounded-full opacity-20 -mr-32 -mt-32 ${isLight ? 'bg-white' : 'bg-black'}`} />
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 px-2">Active Events</h4>
                        {[
                            { name: 'Binary Blitz', players: 128, prize: '1000 RP', status: 'In Progress' },
                            { name: 'Shadow Duel', players: 16, prize: 'Slayer Badge', status: 'Registering' },
                        ].map((ev, i) => (
                            <div key={i} className={`flex items-center justify-between p-6 rounded-2xl border ${isLight ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'}`}>
                                <div>
                                    <p className="font-bold">{ev.name}</p>
                                    <p className="text-xs text-gray-500">{ev.players} Operators • Reward: {ev.prize}</p>
                                </div>
                                <span className={`text-[10px] font-black px-2 py-1 rounded ${ev.status === 'In Progress' ? 'bg-green-500/20 text-green-500' : 'bg-blue-500/20 text-blue-500'}`}>{ev.status}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className={`p-6 rounded-3xl border flex flex-col items-center ${isLight ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'}`}>
                    <Award size={32} className="text-yellow-500 mb-4" />
                    <h3 className="font-bold text-center">Hall of Glory</h3>
                    <p className="text-xs text-gray-500 text-center mt-2">Past champions are immortalized here.</p>
                    <div className="w-full mt-6 space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 italic">
                                <span className="text-sm font-black opacity-30 text-current">{i}</span>
                                <div className="w-8 h-8 rounded-full bg-white/10" />
                                <span className="text-xs font-bold">LEGEND_{i}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    // ── Panel: Battle Log / History ──────────────────────────────────────
    const HistoryPanel = () => (
        <div className="panel-content space-y-8">
            <div>
                <h2 className="text-4xl font-bold tracking-tighter uppercase">Battle Log</h2>
                <p className={isLight ? 'text-gray-600' : 'text-gray-400'}>Analyze past performances and learn from defeat.</p>
            </div>
            <div className={`rounded-3xl overflow-hidden border ${isLight ? 'border-black/10' : 'border-white/10'}`}>
                {[
                    { vs: 'Ghost_Runner_32', result: 'WIN', mode: 'Ranked', time: '2h ago', accuracy: '94%', duration: '4:12' },
                    { vs: 'NeonShadow_X', result: 'LOSS', mode: 'Tourney', time: 'Yesterday', accuracy: '82%', duration: '6:45' },
                    { vs: 'CipherKnight', result: 'WIN', mode: 'Quick', time: 'Yesterday', accuracy: '89%', duration: '3:30' },
                    { vs: 'VoidPulse_9', result: 'WIN', mode: 'Ranked', time: '3d ago', accuracy: '91%', duration: '5:10' },
                ].map((h, i) => (
                    <div key={i} className={`group flex items-center justify-between p-6 border-b last:border-0 transition-all ${isLight ? 'bg-white border-black/5 hover:bg-black/5' : 'bg-white/0 border-white/5 hover:bg-white/5'}`}>
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${h.result === 'WIN' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                                {h.vs[0]}
                            </div>
                            <div>
                                <p className="font-bold flex items-center gap-2">
                                    vs {h.vs} <span className="text-[10px] font-black px-1.5 py-0.5 bg-white/10 rounded uppercase tracking-tighter opacity-50">{h.mode}</span>
                                </p>
                                <p className="text-xs text-gray-500">Solved in {h.duration} • Accuracy: {h.accuracy}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <span className="text-xs text-gray-500 hidden md:block">{h.time}</span>
                            <button className={`p-3 rounded-full border transition-all ${isLight ? 'border-black/20 hover:bg-black hover:text-white' : 'border-white/20 hover:bg-white hover:text-black'}`}>
                                <Play size={14} fill="currentColor" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    // ── Panel: Leaderboard ────────────────────────────────────────────────
    const LeaderboardPanel = () => (
        <div className="panel-content space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-bold tracking-tighter uppercase">Leaderboard</h2>
                    <p className={isLight ? 'text-gray-600' : 'text-gray-400'}>Global operator rankings — updated live.</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`text-xs uppercase tracking-widest font-bold ${isLight ? 'text-gray-500' : 'text-gray-500'}`}>Sort By:</span>
                    <select
                        value={sortKey}
                        onChange={(e) => setSortKey(e.target.value as any)}
                        className={`border rounded-lg px-3 py-2 text-sm focus:outline-none ${isLight ? 'bg-white border-black/10 text-black' : 'bg-white/5 border-white/10 text-white'}`}
                    >
                        <option value="rp" className={isLight ? 'bg-white' : 'bg-black'}>Rank Points</option>
                        <option value="wins" className={isLight ? 'bg-white' : 'bg-black'}>Total Wins</option>
                        <option value="wr" className={isLight ? 'bg-white' : 'bg-black'}>Win Rate</option>
                    </select>
                </div>
            </div>
            <div className={`rounded-3xl overflow-hidden border ${isLight ? 'border-black/10' : 'border-white/10'}`}>
                <div className={`grid grid-cols-12 text-[10px] font-black uppercase tracking-[0.2em] px-6 py-3 border-b ${isLight ? 'bg-black/5 border-black/10 text-gray-600' : 'bg-white/5 border-white/10 text-gray-500'}`}>
                    <span className="col-span-1">#</span>
                    <span className="col-span-5">Operator</span>
                    <span className="col-span-2 text-right">RP</span>
                    <span className="col-span-2 text-right">Wins</span>
                    <span className="col-span-2 text-right">W/R</span>
                </div>
                {sortedLeaderboard.map((p, idx) => (
                    <div key={p.name} className={`grid grid-cols-12 items-center px-6 py-4 border-b last:border-0 transition-colors ${isLight ? 'bg-white border-black/5 hover:bg-black/5' : 'bg-white/0 border-white/5 hover:bg-white/5'} ${idx <= 2 ? (isLight ? 'bg-black/2' : 'bg-white/3') : ''}`}>
                        <span className={`col-span-1 text-sm font-bold ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>{idx + 1}</span>
                        <div className="col-span-5 flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isLight ? 'bg-black/10' : 'bg-white/20'}`}>
                                {p.name[0]}
                            </div>
                            <div>
                                <p className="text-sm font-medium">{p.name}</p>
                                <p className={`text-xs ${isLight ? 'text-gray-400' : 'text-gray-600'}`}>{p.badge}</p>
                            </div>
                        </div>
                        <span className={`col-span-2 text-right font-mono font-bold ${isLight ? 'text-black' : 'text-white'}`}>{p.rp.toLocaleString()}</span>
                        <span className={`col-span-2 text-right ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>{p.wins}</span>
                        <span className="col-span-2 text-right text-green-500 font-mono">{p.wr}%</span>
                    </div>
                ))}
            </div>
        </div>
    );

    // ── Panel: Profile ────────────────────────────────────────────────────
    const ProfilePanel = () => (
        <div className="panel-content space-y-8">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-4xl font-bold tracking-tighter uppercase">Operator Profile</h2>
                    <p className={isLight ? 'text-gray-600' : 'text-gray-400'}>Combat record and Skill Radar analysis.</p>
                </div>
                {!isEditingProfile ? (
                    <button onClick={() => setIsEditingProfile(true)} className={`flex items-center gap-2 text-xs font-black uppercase text-current border px-4 py-2 rounded-xl transition-all ${isLight ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'}`}>
                        <Edit2 size={12} /> Edit
                    </button>
                ) : (
                    <button onClick={() => setIsEditingProfile(false)} className={`flex items-center gap-2 text-xs font-black uppercase px-4 py-2 rounded-xl transition-all ${isLight ? 'bg-black text-white' : 'bg-white text-black'}`}>
                        <Check size={12} /> Save
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <div className={`p-8 rounded-3xl border flex flex-col sm:flex-row gap-8 items-center ${isLight ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'}`}>
                        <div className={`w-32 h-32 rounded-3xl flex items-center justify-center text-5xl font-black flex-shrink-0 shadow-2xl skew-y-3 ${isLight ? 'bg-gradient-to-br from-black/20 to-black/5' : 'bg-gradient-to-br from-white/30 to-white/5'}`}>
                            {(editName || 'O')[0].toUpperCase()}
                        </div>
                        <div className="flex-1 space-y-4 w-full text-center sm:text-left">
                            {isEditingProfile ? (
                                <div className="space-y-3">
                                    <input value={editName} onChange={(e) => setEditName(e.target.value)} className={`w-full border rounded-lg px-3 py-2 text-xl font-bold focus:outline-none ${isLight ? 'bg-white border-black/20' : 'bg-white/10 border-white/20'}`} placeholder="Username" />
                                    <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ${isLight ? 'bg-white border-black/20' : 'bg-white/10 border-white/20 text-gray-300'}`} placeholder="Email" />
                                </div>
                            ) : (
                                <div>
                                    <h3 className="text-3xl font-black uppercase tracking-tighter">{editName || user?.username || 'Operator'}</h3>
                                    <p className={isLight ? 'text-gray-600 text-sm' : 'text-gray-400 text-sm'}>{editEmail || user?.email || 'operator@arena.gg'}</p>
                                </div>
                            )}
                            <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                                {['Voice Coder', 'Diamond Tier', 'Top 12%'].map(t => (
                                    <span key={t} className={`text-[10px] font-black uppercase px-2 py-1 rounded border ${isLight ? 'border-black/10 bg-black/5' : 'border-white/15 bg-white/5'}`}>{t}</span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { icon: <Trophy size={16} />, label: 'Rating', val: user?.rating ?? 2431 },
                            { icon: <Award size={16} />, label: 'Wins', val: user?.wins ?? 128 },
                            { icon: <Target size={16} />, label: 'Accuracy', val: '64.2%' },
                            { icon: <Zap size={16} />, label: 'Streak', val: 9 },
                        ].map((s, i) => (
                            <div key={i} className={`p-6 rounded-2xl border text-center ${isLight ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'}`}>
                                <div className={`flex justify-center mb-2 ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>{s.icon}</div>
                                <p className="text-2xl font-black tracking-tighter">{s.val}</p>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className={`p-8 rounded-3xl border flex flex-col items-center ${isLight ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'}`}>
                    <h3 className="text-xs font-black uppercase tracking-[0.25em] mb-8 text-gray-500">Skill Radar</h3>
                    <SkillRadar isLight={isLight} />
                    <div className="mt-8 w-full space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase opacity-60">
                            <span>Strongest</span>
                            <span className="text-green-500">Accuracy</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-black uppercase opacity-60">
                            <span>Growth Area</span>
                            <span className="text-yellow-500">Data Structures</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // ── Panel: Settings ───────────────────────────────────────────────────
    const SettingsPanel = () => {
        const Toggle = ({ active, onToggle }: { active: boolean, onToggle: () => void }) => (
            <button
                onClick={(e) => { e.stopPropagation(); onToggle(); }}
                className={`relative w-12 h-6 rounded-full transition-colors duration-300 flex-shrink-0 ${active ? (isLight ? 'bg-black' : 'bg-white') : (isLight ? 'bg-black/10' : 'bg-white/20')}`}
            >
                <span className={`absolute top-1 w-4 h-4 rounded-full transition-transform duration-300 ${isLight ? 'bg-white' : 'bg-black'} ${active ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
        );

        return (
            <div className="panel-content space-y-8">
                <div>
                    <h2 className="text-4xl font-bold tracking-tighter uppercase">Settings</h2>
                    <p className={isLight ? 'text-gray-600' : 'text-gray-400'}>Manage your engine and Uplink state.</p>
                </div>

                <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Appearance</h3>
                    <div className={`flex items-center justify-between p-5 rounded-2xl border ${isLight ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'}`}>
                        <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-xl ${isLight ? 'bg-white' : 'bg-white/10'}`}>{isLight ? <Sun size={18} /> : <Moon size={18} />}</div>
                            <div>
                                <p className="font-bold">Dark Mode</p>
                                <p className="text-xs text-gray-500">Toggle core visualization theme</p>
                            </div>
                        </div>
                        <Toggle active={!isLight} onToggle={() => setTheme(isLight ? 'dark' : 'light')} />
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Preferences</h3>
                    <div className="space-y-3">
                        {[
                            { label: 'Notifications', desc: 'Match invites and system alerts', state: notifEnabled, setter: setNotifEnabled },
                            { label: 'Sound FX', desc: 'Ambient effects and arena audio', state: soundEnabled, setter: setSoundEnabled },
                            { label: 'Voice Processor', desc: 'Microphone interface for Uplink', state: voiceEnabled, setter: setVoiceEnabled },
                        ].map((pref, i) => (
                            <div key={i} className={`flex items-center justify-between p-5 rounded-2xl border ${isLight ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'}`}>
                                <div>
                                    <p className="font-bold">{pref.label}</p>
                                    <p className="text-xs text-gray-500">{pref.desc}</p>
                                </div>
                                <Toggle active={pref.state} onToggle={() => pref.setter(!pref.state)} />
                            </div>
                        ))}
                    </div>
                </div>

                <div className={`p-6 rounded-3xl border space-y-6 ${isLight ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Shield size={18} className="text-red-500" />
                            <h4 className="text-sm font-black uppercase tracking-widest text-red-500">Danger Zone</h4>
                        </div>
                        <button onClick={() => { logout(); navigate('/login'); }} className="flex items-center gap-2 px-6 py-2 rounded-xl bg-red-500 text-white font-black uppercase text-[10px] hover:bg-red-600 transition-colors">
                            <LogOut size={14} /> Terminate Uplink
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const panels: Record<Tab, React.ReactNode> = {
        command: <CommandPanel />,
        battle: <BattlePanel />,
        practice: <PracticeLabPanel />,
        tournaments: <TournamentsPanel />,
        history: <HistoryPanel />,
        leaderboard: <LeaderboardPanel />,
        profile: <ProfilePanel />,
        settings: <SettingsPanel />,
    };

    return (
        <div className={`relative min-h-screen w-full transition-colors duration-500 flex ${isLight ? 'bg-gray-50 text-black' : 'bg-[#020202] text-white'}`} ref={containerRef}>
            <div className="fixed inset-0 z-0 overflow-hidden">
                {webGLSupported ? (
                    <WebGLErrorBoundary fallback={<CSSBackground isLight={isLight} />}>
                        <React.Suspense fallback={<CSSBackground isLight={isLight} />}>
                            <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
                                <ambientLight intensity={isLight ? 0.8 : 0.5} />
                                <directionalLight position={[10, 10, 5]} intensity={isLight ? 0.5 : 1} />
                                <LiquidBackground isLight={isLight} />
                                <Monolith isLight={isLight} />
                            </Canvas>
                        </React.Suspense>
                    </WebGLErrorBoundary>
                ) : (
                    <CSSBackground isLight={isLight} />
                )}
                <div className="absolute inset-0 pointer-events-none"
                    style={{
                        background: isLight
                            ? 'radial-gradient(circle at center, transparent 0%, rgba(255,255,255,0.8) 100%)'
                            : 'radial-gradient(circle at center, transparent 0%, #000000 100%)',
                        opacity: 0.75
                    }} />
                <div className={`absolute inset-0 pointer-events-none bg-gradient-to-r transition-all duration-500 ${isLight ? 'from-white via-white/40 to-transparent' : 'from-black via-black/60 to-transparent'}`} />
            </div>

            {isMenuOpen && (
                <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setIsMenuOpen(false)} />
            )}

            <aside className={`
                fixed top-0 left-0 h-full z-50 flex flex-col
                w-64 border-r backdrop-blur-xl transition-all duration-500 ease-in-out
                ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}
                md:translate-x-0 md:relative md:z-20
                ${isLight ? 'bg-white/80 border-black/5' : 'bg-[#080808]/95 border-white/8'}
            `}>
                <div className={`flex items-center justify-between px-6 py-8 border-b ${isLight ? 'border-black/5' : 'border-white/8'}`}>
                    <div className="flex items-center gap-2">
                        <Activity size={20} className={isLight ? 'text-black' : 'text-white'} />
                        <span className="text-lg font-black tracking-tighter uppercase italic">Arena<span className={isLight ? 'text-gray-400' : 'text-gray-500'}>Protocol</span></span>
                    </div>
                    <button onClick={() => setIsMenuOpen(false)} className="md:hidden text-gray-400 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <nav className="flex-1 py-10 px-3 space-y-1 overflow-y-auto">
                    <div className="text-[10px] font-black tracking-[0.3em] text-gray-500 uppercase px-4 mb-4">Operations</div>
                    {navItems.slice(0, 5).map((item) => (
                        <button key={item.id} onClick={() => { setActiveTab(item.id); setIsMenuOpen(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase transition-all duration-200
                                ${activeTab === item.id
                                    ? (isLight ? 'bg-black text-white shadow-2xl' : 'bg-white text-black shadow-xl')
                                    : (isLight ? 'text-gray-500 hover:bg-black/5 hover:text-black' : 'text-gray-400 hover:bg-white/8 hover:text-white')
                                }`}>
                            {item.icon} {item.label}
                        </button>
                    ))}

                    <div className="text-[10px] font-black tracking-[0.3em] text-gray-500 uppercase px-4 mt-10 mb-4">Network</div>
                    {navItems.slice(5).map((item) => (
                        <button key={item.id} onClick={() => { setActiveTab(item.id); setIsMenuOpen(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase transition-all duration-200
                                ${activeTab === item.id
                                    ? (isLight ? 'bg-black text-white' : 'bg-white text-black')
                                    : (isLight ? 'text-gray-500 hover:bg-black/5 hover:text-black' : 'text-gray-400 hover:bg-white/8 hover:text-white')
                                }`}>
                            {item.icon} {item.label}
                        </button>
                    ))}
                    <div className="mt-auto px-4 pb-6">
                        <button onClick={() => { logout(); navigate('/login'); }} className="w-full flex items-center gap-3 text-red-500 hover:text-red-400 transition-colors duration-200 font-black uppercase text-[10px] tracking-widest p-2">
                            <LogOut size={16} /> Terminate
                        </button>
                    </div>
                </nav>
            </aside>

            <div className="flex-1 flex flex-col min-h-screen relative z-10">
                <header className="flex items-center justify-between px-6 md:px-10 py-6 sticky top-0 z-30 transition-all duration-500">
                    <button onClick={() => setIsMenuOpen(true)} className={`p-2 border rounded-xl md:hidden ${isLight ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'}`}>
                        <Menu size={20} />
                    </button>
                    <div className="hidden md:block">
                        <span className={`text-[10px] font-black uppercase tracking-[0.4em] opacity-40`}>Current Uplink: Active</span>
                    </div>

                    <button onClick={() => setActiveTab('profile')}
                        className={`group relative flex items-center gap-3 p-1 rounded-full border transition-all hover:scale-105 ${isLight ? 'bg-white border-black/10 hover:border-black/40' : 'bg-black border-white/10 hover:border-white/40'}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black transition-colors ${activeTab === 'profile' ? (isLight ? 'bg-black text-white' : 'bg-white text-black') : (isLight ? 'bg-black/5 text-black' : 'bg-white/10 text-white')}`}>
                            {(user?.username ?? 'O')[0].toUpperCase()}
                        </div>
                        <div className="hidden lg:block pr-4 text-left">
                            <p className="text-xs font-black uppercase tracking-tight">{user?.username ?? 'Operator'}</p>
                            <p className="text-[10px] font-mono text-gray-400 group-hover:text-current">{user?.rating ?? 1200} RP</p>
                        </div>
                    </button>
                </header>

                <main className="flex-1 overflow-y-auto px-6 md:px-10 lg:px-16 py-4 dash-element scrollbar-hide">
                    {panels[activeTab]}
                </main>
            </div>
        </div>
    );
};
