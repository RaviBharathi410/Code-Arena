import React, { useEffect, useRef, useState, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { useAuthStore } from '../store/useAuthStore';
import { useArenaStore } from '../store/useArenaStore';
import { TournamentHub } from './TournamentHub';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';
import {
    Trophy, Zap, Activity, LogOut,
    Sword, Target, BarChart2,
    ChevronRight, Award, Shield,
    Edit2, Check, Moon, Sun, Beaker,
    Play, Sparkles, Cpu, Menu, X, Search,
    Bell, Mail
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
    { rank: 1, userId: 'm1', username: 'Ghost_Runner_32', rating: 4820, wins: 312, losses: 80, badge: '⚡' },
    { rank: 2, userId: 'm2', username: 'NeonShadow_X', rating: 4611, wins: 289, losses: 95, badge: '🔥' },
    { rank: 3, userId: 'm3', username: 'CipherKnight', rating: 4430, wins: 261, losses: 105, badge: '💎' },
    { rank: 4, userId: 'm4', username: 'VoidPulse_9', rating: 4205, wins: 238, losses: 112, badge: '🚀' },
    { rank: 5, userId: 'm5', username: 'QuantumByte', rating: 3980, wins: 215, losses: 115, badge: '🌟' },
    { rank: 6, userId: 'm6', username: 'SilverAxe_404', rating: 3760, wins: 198, losses: 120, badge: '🏆' },
    { rank: 7, userId: 'm7', username: 'NullPointer_77', rating: 3540, wins: 179, losses: 125, badge: '⚔️' },
    { rank: 8, userId: 'm8', username: 'DataPhantom', rating: 3310, wins: 160, losses: 130, badge: '🎯' },
];

// ── Tab types ─────────────────────────────────────────────────────────────
type Tab = 'command' | 'battle' | 'practice' | 'tournaments' | 'history' | 'leaderboard' | 'profile' | 'settings';

// ── Radar Chart Component ─────────────────────────────────────────────────
const SkillRadar: React.FC<{ isLight: boolean; skills?: { name: string; value: number }[] }> = ({ isLight, skills }) => {
    const data = useMemo(() => skills || [
        { name: 'Logic', value: 85 },
        { name: 'Speed', value: 72 },
        { name: 'Accuracy', value: 94 },
        { name: 'Data Struct', value: 65 },
        { name: 'Complexity', value: 78 },
    ], [skills]);

    const size = 300;
    const center = size / 2;
    const radius = size * 0.35;
    const angleStep = (Math.PI * 2) / data.length;

    const points = data.map((s, i) => {
        const x = center + radius * (s.value / 100) * Math.cos(i * angleStep - Math.PI / 2);
        const y = center + radius * (s.value / 100) * Math.sin(i * angleStep - Math.PI / 2);
        return `${x},${y}`;
    }).join(' ');

    const webPoints = [0.2, 0.4, 0.6, 0.8, 1.0].map(level => {
        return data.map((_, i) => {
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
                    <polygon key={i} points={p} fill="none" stroke={isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.06)"} strokeWidth="1" />
                ))}

                {/* Axes */}
                {data.map((_, i) => {
                    const x = center + radius * Math.cos(i * angleStep - Math.PI / 2);
                    const y = center + radius * Math.sin(i * angleStep - Math.PI / 2);
                    return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke={isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)"} />;
                })}

                {/* Skill Area */}
                <polygon
                    points={points}
                    fill={isLight ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.15)"}
                    stroke={isLight ? "black" : "white"}
                    strokeWidth="2"
                    className="transition-all duration-1000"
                />

                {/* Labels */}
                {data.map((s, i) => {
                    const x = center + (radius + 25) * Math.cos(i * angleStep - Math.PI / 2);
                    const y = center + (radius + 25) * Math.sin(i * angleStep - Math.PI / 2);
                    return (
                        <text
                            key={i}
                            x={x}
                            y={y}
                            textAnchor="middle"
                            fontSize="8"
                            fontWeight="900"
                            fill={isLight ? "#000" : "#fff"}
                            className="uppercase tracking-[0.15em] opacity-40 italic"
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
    const { fetchProblems, fetchTournaments, fetchLeaderboard, leaderboard } = useArenaStore();
    const navigate = useNavigate();
    const location = useLocation();

    const containerRef = useRef<HTMLDivElement>(null);

    // Map path to tab
    const getTabFromPath = (path: string): Tab => {
        const p = path.replace('/', '');
        if (['command', 'battle', 'practice', 'tournaments', 'history', 'leaderboard', 'profile', 'settings'].includes(p)) {
            return p as Tab;
        }
        if (p === 'dashboard') return 'command';
        return 'command';
    };

    const [activeTab, setActiveTab] = useState<Tab>(getTabFromPath(location.pathname));
    const [webGLSupported] = useState(() => isWebGLAvailable());

    // Sync state if navigation happens externally
    useEffect(() => {
        setActiveTab(getTabFromPath(location.pathname));
    }, [location.pathname]);

    const [isMenuOpen, setIsMenuOpen] = useState(() => {
        const saved = localStorage.getItem('arena_menu_open');
        return saved === null ? true : saved === 'true';
    });

    useEffect(() => {
        localStorage.setItem('arena_menu_open', isMenuOpen.toString());
    }, [isMenuOpen]);
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');
    const [notifEnabled, setNotifEnabled] = useState(true);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [notifications] = useState([
        { id: 1, text: 'New Tournament starting soon!', time: '5m ago' },
        { id: 2, text: 'Rank up! You are now Silver IV', time: '1h ago' }
    ]);
    const [showNots, setShowNots] = useState(false);
    const [showMail, setShowMail] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    const [messages] = useState([
        { id: 1, from: 'System', text: 'Welcome to Arena Protocol v2.4. Uplink established.', time: 'Just Now', unread: true },
        { id: 2, from: 'Ghost_Runner_32', text: 'GG! Your algorithm was lethal. Rematch?', time: '2h ago', unread: true },
        { id: 3, from: 'Arena_Bot', text: 'Tournament: "Binary Blitz" invitation received.', time: '5h ago', unread: false },
        { id: 4, from: 'CipherKnight', text: 'Shared a new optimization strategy with you.', time: '1d ago', unread: false }
    ]);

    const navSections = [
        {
            label: "Operations",
            items: [
                { id: 'command', label: 'Command Hub', icon: Activity },
                { id: 'battle', label: 'Battle Arena', icon: Sword },
                { id: 'history', label: 'Battle Log', icon: Play },
                { id: 'practice', label: 'Practice Lab', icon: Beaker },
                { id: 'tournaments', label: 'Tournaments', icon: Trophy },
            ]
        },
        {
            label: "Intel",
            items: [
                { id: 'leaderboard', label: 'Leaderboard', icon: BarChart2 },
                { id: 'profile', label: 'Profile', icon: Target },
                { id: 'settings', label: 'Settings', icon: Cpu },
            ]
        }
    ];

    // Leaderboard sorting
    const [sortKey, setSortKey] = useState<'rp' | 'wins' | 'wr'>('rp');

    // Profile editing
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editName, setEditName] = useState(user?.username || '');
    const [editEmail, setEditEmail] = useState(user?.email || '');

    useEffect(() => {
        fetchProfile();
        fetchProblems();
        fetchTournaments();
        fetchLeaderboard();

        // If we just arrived from a battle, ensure we are on the command hub
        if (location.pathname === '/dashboard') {
            setActiveTab('command');
        }

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
        const ctx = gsap.context(() => {
            gsap.fromTo('.panel-content', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' });
        });
        return () => ctx.revert();
    }, [activeTab]);

    const handleStartBattle = () => setActiveTab('battle');

    const sortedLeaderboard = useMemo(() => {
        const data = leaderboard.length > 0 ? (leaderboard as any[]) : (INITIAL_LEADERBOARD as any[]);
        let results = [...data].sort((a: any, b: any) => {
            const valA = a[sortKey] || (sortKey === 'rp' ? a.rating : 0);
            const valB = b[sortKey] || (sortKey === 'rp' ? b.rating : 0);
            return (valB as number) - (valA as number);
        });
        if (searchQuery) {
            results = results.filter(entry => entry.username.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        return results;
    }, [sortKey, leaderboard, searchQuery]);

    const isLight = theme === 'light';

    // ── Panel Components ──────────────────────────────────────────────────
    const CommandPanel = () => {
        const stats = useMemo(() => [
            { icon: <Trophy size={20} className={isLight ? 'text-gray-600' : 'text-gray-400'} />, val: user?.rating ?? 2431, label: 'Rank Rating' },
            { icon: <Target size={20} className={isLight ? 'text-gray-600' : 'text-gray-400'} />, val: '64.2%', label: 'Win Rate' },
            { icon: <Activity size={20} className={isLight ? 'text-gray-600' : 'text-gray-400'} />, val: user?.wins ?? 128, label: 'Total Battles' },
        ], [user]);

        const feedItems = useMemo(() => [
            { color: 'bg-cyan-500', title: 'Operational Uplink Active', desc: 'Secure connection to Arena Protocol established.', time: 'Just Now' },
            { color: 'bg-green-500', title: 'Tournament Registration Open', desc: 'Arena Masters Spring Championship starts in 48h.', time: '2h ago' },
            { color: 'bg-purple-500', title: 'New Badge Earned', desc: 'You achieved "Voice Prodigy" for 50 hands-free matches.', time: 'Yesterday' }
        ], []);

        return (
            <div className="panel-content space-y-8">
                <div className="space-y-4">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/20 ${isLight ? 'bg-black/5' : 'bg-white/5'}`}>
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <span className={`text-xs tracking-wider uppercase ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>System Status: Optimal</span>
                    </div>
                    <h1 className="text-5xl md:text-6xl font-black tracking-tighter leading-tight italic uppercase">
                        Command <br />
                        <span className={`text-transparent bg-clip-text bg-gradient-to-r ${isLight ? 'from-black to-gray-400' : 'from-cyan-400 to-blue-600'}`}>Center</span>
                    </h1>
                    <p className={`text-lg max-w-lg font-light leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                        Welcome back, Operator <strong className={isLight ? 'text-black' : 'text-white'}>{user?.username ?? 'Operator'}</strong>.
                        Uplink is stable. Monitoring global algorithm combat vectors.
                    </p>
                </div>

                <div className="flex flex-wrap gap-4">
                    <button onClick={handleStartBattle}
                        className={`group relative px-8 py-4 rounded-full font-black uppercase text-xs tracking-[0.2em] overflow-hidden flex items-center gap-3 hover:scale-105 transition-transform ${isLight ? 'bg-black text-white' : 'bg-white text-black'}`}>
                        <Zap size={18} fill="currentColor" /> Enter Arena
                        <div className={`absolute inset-0 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left ${isLight ? 'bg-gray-800' : 'bg-gray-200'}`} />
                    </button>
                    <button onClick={() => navigate('/arena/solo')}
                        className={`px-8 py-4 rounded-full font-black uppercase text-xs tracking-[0.2em] border flex items-center gap-3 hover:bg-white/5 transition-all ${isLight ? 'border-black/10 text-black' : 'border-white/10 text-white'}`}>
                        <Sword size={18} /> Quick Match
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    {stats.map((s, i) => (
                        <div key={i} className={`p-6 rounded-3xl border backdrop-blur-xl relative overflow-hidden group transition-all hover:-translate-y-1 ${isLight ? 'bg-white border-black/5 shadow-xl hover:shadow-2xl' : 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20'}`}>
                            <div className={`absolute -top-12 -right-12 w-24 h-24 rounded-full blur-3xl opacity-20 ${isLight ? 'bg-black' : 'bg-cyan-500'}`} />
                            <div className={`p-3 rounded-2xl w-fit mb-4 ${isLight ? 'bg-black/5' : 'bg-white/10'}`}>{s.icon}</div>
                            <p className="text-3xl font-black italic tracking-tighter">{s.val}</p>
                            <p className={`text-[10px] font-black uppercase tracking-widest mt-1 opacity-50`}>{s.label}</p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
                    <div className={`p-8 rounded-[3rem] border backdrop-blur-xl ${isLight ? 'bg-white border-black/5 shadow-xl' : 'bg-white/2 border-white/5'}`}>
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 italic">Live Operations Feed</h3>
                            <div className="flex gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping" />
                                <span className="text-[8px] font-mono text-cyan-400">DATA_STREAM://OK</span>
                            </div>
                        </div>
                        <div className="space-y-6">
                            {feedItems.map((item, i) => (
                                <div key={i} className="flex gap-5 group cursor-pointer items-start">
                                    <div className={`w-1 h-10 rounded-full ${item.color} opacity-20 group-hover:opacity-100 transition-all group-hover:h-12`} />
                                    <div className="flex-1">
                                        <p className="text-sm font-black uppercase tracking-tight group-hover:text-cyan-400 transition-colors">{item.title}</p>
                                        <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{item.desc}</p>
                                        <p className="text-[9px] font-mono opacity-30 mt-1 uppercase italic tracking-widest">{item.time}</p>
                                    </div>
                                    <ChevronRight size={14} className="opacity-0 group-hover:opacity-30 -translate-x-2 group-hover:translate-x-0 transition-all self-center" />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={`p-8 rounded-[3rem] border backdrop-blur-xl flex flex-col justify-between overflow-hidden relative group ${isLight ? 'bg-black text-white shadow-2xl' : 'bg-gradient-to-br from-indigo-900/40 to-black border-white/8'}`}>
                        <div className="relative z-10 w-full">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-2">
                                    <Zap size={16} className="text-yellow-400" />
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em]">Battle Intelligence</h3>
                                </div>
                                <span className="text-[10px] font-mono opacity-40">ACCURACY: 84%</span>
                            </div>
                            <div className="space-y-6">
                                <div className="flex items-end gap-1.5 h-24">
                                    {[30, 45, 25, 60, 80, 55, 90, 40, 70, 50, 85, 65, 75].map((h, i) => (
                                        <div key={i} className={`flex-1 rounded-t-sm transition-all duration-700 delay-[${i * 50}ms] ${isLight ? 'bg-white/20 group-hover:bg-white/40' : 'bg-cyan-500/20 group-hover:bg-cyan-400/40'}`} style={{ height: `${h}%` }} />
                                    ))}
                                </div>
                                <div className="flex justify-between items-center border-t border-white/10 pt-6">
                                    <div>
                                        <p className="text-3xl font-black italic tracking-tighter text-cyan-400">+142 RP</p>
                                        <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Last 24 Hours Delta</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center gap-2 justify-end mb-1">
                                            <span className="w-2 h-2 rounded-full bg-green-500" />
                                            <p className="text-2xl font-black italic tracking-tighter">Gold II</p>
                                        </div>
                                        <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Current Ranking</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {isLight && <Activity className="absolute -bottom-10 -right-10 w-48 h-48 opacity-[0.03] text-white rotate-12" />}
                    </div>
                </div>
            </div>
        );
    };

    const BattlePanel = () => (
        <div className="panel-content space-y-8">
            <div>
                <h2 className="text-4xl font-bold tracking-tighter uppercase">Battle Arena</h2>
                <p className={isLight ? 'text-gray-600' : 'text-gray-400'}>High-stakes algorithm combat. RP at risk.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                    { title: 'Quick Match', desc: 'Auto-matched against a similar operator rank.', icon: <Zap size={28} />, badge: 'RANKED', action: () => navigate('/arena/solo') },
                    { title: 'Ranked Dual', desc: 'Climb the global leaderboard in 1v1 combat.', icon: <Sword size={28} />, badge: 'STAKES', action: () => navigate('/arena/solo') },
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

    const PracticeLabPanel = () => {
        const practiceSkills = useMemo(() => [
            { name: 'Arrays', value: 75 },
            { name: 'Graphs', value: 45 },
            { name: 'DP', value: 60 },
            { name: 'Trees', value: 82 },
            { name: 'Strings', value: 90 },
        ], []);

        return (
            <div className="panel-content space-y-12">
                <div className="flex flex-col xl:flex-row gap-12">
                    <div className="flex-1 space-y-10">
                        <div className="space-y-2">
                            <h2 className="text-4xl font-black tracking-tighter uppercase italic">Practice Lab</h2>
                            <p className={`text-lg font-light ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>Adaptive training engine — optimized for skill vector evolution.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[
                                { title: 'Speed Run Mode', desc: 'Crush high-volume Easy/Medium tasks against a lethal clock.', icon: <Zap size={24} />, mode: 'SPEED' },
                                { title: 'Deep Focus Mode', desc: 'Complex system architecture problems. Maximum logic precision.', icon: <Target size={24} />, mode: 'FOCUS' },
                                { title: 'Weakness Fix', desc: 'AI-curated drills targeting your historical failure points.', icon: <Shield size={24} />, mode: 'ADAPTIVE' },
                                { title: 'AI Coach Mode', desc: 'Real-time complexity analysis and logic optimization hints.', icon: <Sparkles size={24} />, mode: 'COACH' },
                            ].map((mode, i) => (
                                <button key={i} onClick={() => navigate('/arena/practice?type=' + mode.mode.toLowerCase())}
                                    className={`group p-8 rounded-[2.5rem] border text-left transition-all relative overflow-hidden ${isLight ? 'bg-black/5 border-black/10 hover:bg-black/10' : 'bg-white/5 border-white/8 hover:bg-white/10'}`}>
                                    <div className="flex justify-between items-start mb-8 relative z-10">
                                        <div className={`p-4 rounded-3xl ${isLight ? 'bg-white shadow-lg' : 'bg-white/10 backdrop-blur-md'}`}>{mode.icon}</div>
                                        <div className={`text-[10px] font-black uppercase tracking-[0.3em] opacity-30`}>{mode.mode}</div>
                                    </div>
                                    <h3 className="text-2xl font-black mb-3 relative z-10 uppercase tracking-tight">{mode.title}</h3>
                                    <p className={`text-sm font-light leading-relaxed mb-8 relative z-10 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>{mode.desc}</p>
                                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest relative z-10 group-hover:gap-5 transition-all">
                                        Initialize <ChevronRight size={14} />
                                    </div>
                                    <div className={`absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-10 transition-opacity ${isLight ? 'bg-black' : 'bg-white'}`} />
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="w-full xl:w-96 space-y-8">
                        <div className={`p-10 rounded-[3rem] border flex flex-col items-center relative overflow-hidden ${isLight ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/8'}`}>
                            <div className="absolute top-6 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 whitespace-nowrap">Skill Vector Tracking</div>
                            <div className="mt-8 scale-110">
                                <SkillRadar isLight={isLight} skills={practiceSkills} />
                            </div>
                        </div>
                        <div className={`p-8 rounded-[3rem] border relative overflow-hidden flex flex-col justify-between h-[320px] ${isLight ? 'bg-black text-white' : 'bg-white text-black'}`}>
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-8">
                                    <Cpu size={16} />
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em]">Engine Intelligence</h3>
                                </div>
                                <div className="space-y-6">
                                    <div className="space-y-1">
                                        <div className="text-3xl font-black italic uppercase tracking-tighter">Recommended</div>
                                        <p className="text-[10px] uppercase font-black opacity-60 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> Graphs (Weak Area)
                                        </p>
                                    </div>
                                    <div className="flex gap-4 items-center">
                                        <div className="px-3 py-1 rounded-full border border-current text-[10px] font-black uppercase tracking-widest opacity-60">Medium</div>
                                        <div className="text-[10px] font-black uppercase tracking-widest opacity-40">15 MIN CHALLENGE</div>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => navigate('/arena/practice?type=graphs')} className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.25em] transition-all relative z-10 ${isLight ? 'bg-white text-black hover:scale-[0.98]' : 'bg-black text-white hover:scale-[0.98]'}`}>
                                Launch Drill
                            </button>
                            <div className="absolute top-0 right-0 -mr-20 -mt-20 opacity-10">
                                <Activity size={300} strokeWidth={4} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const TournamentsPanel = () => (
        <div className="panel-content">
            <TournamentHub isLight={isLight} isStandalone={false} />
        </div>
    );

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
                {sortedLeaderboard.map((p: any, idx) => (
                    <div key={p.userId || p.name || idx} className={`grid grid-cols-12 items-center px-6 py-4 border-b last:border-0 transition-colors ${isLight ? 'bg-white border-black/5 hover:bg-black/5' : 'bg-white/0 border-white/5 hover:bg-white/5'} ${idx <= 2 ? (isLight ? 'bg-black/2' : 'bg-white/3') : ''}`}>
                        <span className={`col-span-1 text-sm font-bold ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>{idx + 1}</span>
                        <div className="col-span-5 flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isLight ? 'bg-black/10' : 'bg-white/20'}`}>
                                {(p.username || p.name || 'O')[0]}
                            </div>
                            <div>
                                <p className="text-sm font-medium">{p.username || p.name}</p>
                                <p className={`text-xs ${isLight ? 'text-gray-400' : 'text-gray-600'}`}>{p.badge || 'PRO'}</p>
                            </div>
                        </div>
                        <span className={`col-span-2 text-right font-mono font-bold ${isLight ? 'text-black' : 'text-white'}`}>{((p.rating || p.rp || 0) as number).toLocaleString()}</span>
                        <span className={`col-span-2 text-right ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>{p.wins}</span>
                        <span className="col-span-2 text-right text-green-500 font-mono">
                            {p.wr || (p.wins > 0 ? Math.floor((p.wins / (p.wins + (p.losses || 20))) * 100) : 0)}%
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );

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

    const SettingsPanel = () => {
        const Toggle = ({ active, onToggle }: { active: boolean, onToggle: () => void }) => (
            <button onClick={(e) => { e.stopPropagation(); onToggle(); }}
                className={`relative w-12 h-6 rounded-full transition-colors duration-300 flex-shrink-0 ${active ? (isLight ? 'bg-black' : 'bg-white') : (isLight ? 'bg-black/10' : 'bg-white/20')}`}>
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
                            <div><p className="font-bold">Dark Mode</p><p className="text-xs text-gray-500">Toggle core visualization theme</p></div>
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
                                <div><p className="font-bold">{pref.label}</p><p className="text-xs text-gray-500">{pref.desc}</p></div>
                                <Toggle active={pref.state} onToggle={() => pref.setter(!pref.state)} />
                            </div>
                        ))}
                    </div>
                </div>
                <div className={`p-6 rounded-3xl border flex items-center justify-between ${isLight ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'}`}>
                    <div className="flex items-center gap-3">
                        <Shield size={18} className="text-red-500" />
                        <h4 className="text-sm font-black uppercase tracking-widest text-red-500">Danger Zone</h4>
                    </div>
                    <button onClick={() => { logout(); navigate('/login'); }} className="flex items-center gap-2 px-6 py-2 rounded-xl bg-red-500 text-white font-black uppercase text-[10px] hover:bg-red-600 transition-colors">
                        <LogOut size={14} /> Terminate Uplink
                    </button>
                </div>
            </div>
        );
    };

    const panels: Record<Tab, ReactNode> = {
        command: <CommandPanel />,
        battle: <BattlePanel />,
        practice: <PracticeLabPanel />,
        tournaments: <TournamentsPanel />,
        history: <HistoryPanel />,
        leaderboard: <LeaderboardPanel />,
        profile: <ProfilePanel />,
        settings: <SettingsPanel />,
    };

    // ── Main Render ───────────────────────────────────────────────────────
    return (
        <div className={`relative h-full w-full transition-colors duration-500 flex flex-col ${isLight ? 'bg-gray-50 text-black' : 'bg-transparent text-white'}`} ref={containerRef}>
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
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

            <div className={`flex-1 overflow-y-auto px-6 md:px-12 py-8 relative z-10 custom-scrollbar transition-all duration-300 ${isMenuOpen ? 'md:pl-[300px]' : ''}`}>
                <div className="w-full">
                    <header className="mb-12 flex justify-between items-center">
                        <div className="flex items-center gap-6">
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className={`p-3.5 rounded-2xl border transition-all dash-element group ${isLight ? 'bg-white border-black/10 hover:bg-black/5 hover:border-black/20' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/30 text-white'}`}
                                title="Toggle Navigation Control"
                            >
                                {isMenuOpen ? <X size={22} className="group-hover:rotate-90 transition-transform duration-300" /> : <Menu size={22} className="group-hover:scale-110 transition-transform duration-300" />}
                            </button>

                            <div className="dash-element hidden sm:block">
                                <span className={`text-[10px] font-black uppercase tracking-[0.4em] block mb-1.5 transition-colors ${isLight ? 'text-gray-400' : 'text-cyan-500/60'}`}>Uplink // Status: Nominal</span>
                                <h1 className="text-4xl font-black uppercase tracking-tighter italic leading-none">{activeTab} <span className="text-gray-500 tracking-normal opacity-40 italic">Sector</span></h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 dash-element">
                            <div className="relative group hidden lg:block">
                                <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all duration-500 ${isLight ? 'bg-white border-black/10 focus-within:border-black focus-within:shadow-xl' : 'bg-white/5 border-white/10 focus-within:border-cyan-500/40 focus-within:bg-white/10 focus-within:shadow-lg focus-within:shadow-cyan-500/10 text-white'}`}>
                                    <Search size={16} className={`transition-opacity ${searchQuery ? 'opacity-100 text-cyan-500' : 'opacity-30'}`} />
                                    <input
                                        type="text"
                                        placeholder="Search protocol data..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-[0.2em] placeholder:opacity-20 w-56 transition-all"
                                    />
                                    <div className={`px-1.5 py-0.5 rounded border border-white/10 text-[8px] font-black opacity-20 group-focus-within:opacity-40 transition-opacity ${isLight ? 'border-black/20' : ''}`}>CMD+K</div>
                                    {searchQuery && (
                                        <button onClick={() => setSearchQuery('')} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                                            <X size={12} className="opacity-40" />
                                        </button>
                                    )}
                                </div>
                                {searchQuery && (
                                    <div className={`absolute top-16 left-0 w-full rounded-[2rem] p-6 shadow-2xl z-50 border backdrop-blur-3xl animate-in fade-in slide-in-from-top-4 duration-500 ease-expo ${isLight ? 'bg-white/95 border-black/10 text-black' : 'bg-[#0a0a0a]/95 border-white/10 text-white'}`}>
                                        <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-30 mb-4 flex items-center gap-2">
                                            <Activity size={10} className="text-cyan-500" /> Operational Signals Found
                                        </p>
                                        <div className="space-y-1.5">
                                            {sortedLeaderboard.slice(0, 4).map((item: any) => (
                                                <div key={item.userId} className={`p-4 rounded-2xl flex items-center justify-between group cursor-pointer transition-all hover:pl-6 ${isLight ? 'hover:bg-black/5' : 'hover:bg-white/5'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-2 h-2 rounded-full ${item.rating > 4000 ? 'bg-purple-500' : 'bg-cyan-500'}`} />
                                                        <span className="text-xs font-black uppercase tracking-tight">{item.username || item.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                        <span className="text-[10px] font-mono opacity-40">{item.rating} RP</span>
                                                        <ChevronRight size={14} className="text-cyan-500" />
                                                    </div>
                                                </div>
                                            ))}
                                            {sortedLeaderboard.slice(0, 4).length === 0 && (
                                                <div className="py-8 text-center">
                                                    <Search size={24} className="mx-auto opacity-10 mb-2" />
                                                    <p className="text-xs italic opacity-30">No active signals found in the sector.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-3 relative">
                                <div className="relative">
                                    <button
                                        onClick={() => { setShowNots(!showNots); setShowMail(false); setShowProfileMenu(false); }}
                                        className={`p-3.5 rounded-2xl border transition-all relative group ${isLight ? 'bg-white border-black/10 hover:bg-black/5' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'} ${showNots ? (isLight ? 'bg-black text-white' : 'bg-white text-black') : ''}`}
                                        title="System Alerts"
                                    >
                                        <Bell size={20} className={`transition-all duration-300 ${showNots ? 'scale-110' : 'opacity-60 group-hover:opacity-100'}`} />
                                        {notifications.length > 0 && (
                                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full border-2 border-black flex items-center justify-center text-[9px] font-black text-white shadow-lg ring-2 ring-red-600/20">
                                                {notifications.length}
                                            </div>
                                        )}
                                    </button>

                                    {showNots && (
                                        <div className={`absolute top-16 right-0 w-85 rounded-[2.5rem] p-8 shadow-3xl z-50 border backdrop-blur-3xl animate-in fade-in zoom-in-95 duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${isLight ? 'bg-white/95 border-black/10 text-black shadow-black/20' : 'bg-[#0a0a0a]/95 border-white/10 text-white shadow-cyan-500/10'}`}>
                                            <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                                                <div className="flex items-center gap-3">
                                                    <Activity size={14} className="text-red-500" />
                                                    <h4 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-50">Signal Intelligence</h4>
                                                </div>
                                                <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg bg-red-500/20 text-red-400 animate-pulse border border-red-500/30">Action Required</span>
                                            </div>
                                            <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                                                {notifications.map(n => (
                                                    <div key={n.id} className={`p-5 rounded-3xl border transition-all cursor-pointer group flex gap-4 items-start ${isLight ? 'hover:bg-black/5 border-black/5 bg-black/2' : 'hover:bg-white/5 border-white/5 bg-white/2'}`}>
                                                        <div className={`w-2 h-2 mt-1.5 rounded-full bg-red-500 shrink-0 shadow-lg shadow-red-500/50`} />
                                                        <div className="flex-1">
                                                            <p className="text-[11px] font-bold leading-relaxed group-hover:text-red-400 transition-colors uppercase tracking-tight">{n.text}</p>
                                                            <p className="text-[9px] text-gray-500 font-mono uppercase italic mt-1.5 tracking-widest flex items-center gap-2">
                                                                <span className="w-1 h-1 rounded-full bg-white/10" /> {n.time}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <button className="w-full mt-8 py-4 rounded-2xl border border-dashed border-white/10 text-[9px] font-black uppercase tracking-[0.4em] opacity-30 hover:opacity-100 hover:bg-white/5 transition-all">Flush Logs // Clear Buffer</button>
                                        </div>
                                    )}
                                </div>

                                <div className="relative">
                                    <button
                                        onClick={() => { setShowMail(!showMail); setShowNots(false); setShowProfileMenu(false); }}
                                        className={`p-3.5 rounded-2xl border transition-all relative group ${isLight ? 'bg-white border-black/10 hover:bg-black/5' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'} ${showMail ? (isLight ? 'bg-black text-white' : 'bg-white text-black') : ''}`}
                                        title="Encrypted Comms">
                                        <Mail size={20} className={`transition-all duration-300 ${showMail ? 'scale-110' : 'opacity-60 group-hover:opacity-100'}`} />
                                        <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-lg shadow-cyan-400/50" />
                                    </button>
                                    {showMail && (
                                        <div className={`absolute top-16 right-0 w-90 rounded-[2.5rem] p-8 shadow-3xl z-50 border backdrop-blur-3xl animate-in fade-in zoom-in-95 duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${isLight ? 'bg-white/95 border-black/10 text-black shadow-black/20' : 'bg-[#0a0a0a]/95 border-white/10 text-white shadow-cyan-500/10'}`}>
                                            <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                                                <div className="flex items-center gap-3">
                                                    <Cpu size={14} className="text-cyan-400" />
                                                    <h4 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-50">Secure Uplink</h4>
                                                </div>
                                                <span className="text-[9px] font-black opacity-30 italic">ENC: RSA-4096</span>
                                            </div>
                                            <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                                                {messages.map(m => (
                                                    <div key={m.id} className={`p-5 rounded-3xl border transition-all cursor-pointer group border-transparent ${isLight ? 'hover:bg-black/5 bg-black/2' : 'hover:bg-white/5 bg-white/2'}`}>
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-1.5 h-1.5 rounded-full ${m.unread ? 'bg-cyan-500 shadow-lg shadow-cyan-500/50' : 'bg-white/10'}`} />
                                                                <p className="text-[10px] font-black uppercase tracking-widest text-cyan-400">{m.from}</p>
                                                            </div>
                                                            <p className="text-[9px] text-gray-500 font-mono italic">{m.time}</p>
                                                        </div>
                                                        <p className="text-xs font-bold leading-tight opacity-70 group-hover:opacity-100 transition-opacity tracking-tight italic uppercase">{m.text}</p>
                                                    </div>
                                                ))}
                                            </div>
                                            <button className="w-full mt-8 py-4 rounded-2xl bg-cyan-500 text-black text-[10px] font-black uppercase tracking-[0.3em] shadow-xl shadow-cyan-500/30 hover:scale-[1.02] active:scale-[0.98] transition-transform">Initialize Uplink Connection</button>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => setTheme(isLight ? 'dark' : 'light')}
                                    className={`p-3.5 rounded-2xl border transition-all group ${isLight ? 'bg-white border-black/10 hover:bg-black/5' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'}`}
                                    title="Toggle Neural Interface Theme"
                                >
                                    {isLight ? <Moon size={20} className="group-hover:-rotate-12 transition-transform" /> : <Sun size={20} className="group-hover:rotate-45 transition-transform" />}
                                </button>
                            </div>

                            <div className="relative">
                                <button
                                    onClick={() => { setShowProfileMenu(!showProfileMenu); setShowNots(false); setShowMail(false); }}
                                    className={`flex items-center gap-4 border-l border-white/10 pl-6 ml-4 group cursor-pointer outline-none transition-all ${showProfileMenu ? 'opacity-100 scale-105' : 'opacity-70 hover:opacity-100 hover:scale-[1.02]'}`}
                                >
                                    <div className="text-right hidden xl:block">
                                        <div className="flex items-center justify-end gap-2 mb-1">
                                            <span className="px-1.5 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-[8px] font-black text-violet-400 uppercase tracking-widest ring-1 ring-violet-500/10">Master Tier III</span>
                                            <p className="text-[11px] font-black uppercase tracking-[0.1em]">{user?.username || 'Operator'}</p>
                                        </div>
                                        <div className="flex items-center justify-end gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/50" />
                                            <p className="text-[8px] font-black text-gray-500 uppercase italic tracking-widest">Protocol Active</p>
                                        </div>
                                    </div>
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-2xl transition-all duration-500 transform relative overflow-hidden ring-2 ${showProfileMenu ? 'ring-violet-500 rotate-3' : 'ring-white/10 group-hover:ring-white/30'} ${isLight ? 'bg-black text-white' : 'bg-white text-black'}`}>
                                        <div className={`absolute inset-0 bg-gradient-to-br from-violet-600/40 to-indigo-700/40 opacity-50`} />
                                        <span className="relative z-10">{user?.username?.[0]?.toUpperCase() || 'A'}</span>
                                    </div>
                                </button>

                                {showProfileMenu && (
                                    <div className={`absolute top-18 right-0 w-72 rounded-[2.5rem] p-6 shadow-3xl z-50 border backdrop-blur-3xl animate-in fade-in zoom-in-95 duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${isLight ? 'bg-white/95 border-black/10 text-black shadow-black/20' : 'bg-[#0a0a0a]/95 border-white/10 text-white shadow-violet-500/10'}`}>
                                        <div className="p-5 bg-white/5 rounded-3xl mb-6 border border-white/5">
                                            <p className="text-[9px] font-black uppercase tracking-[0.4em] opacity-30 mb-2">Auth Level: Advanced</p>
                                            <p className="text-sm font-black uppercase tracking-tighter truncate leading-tight">{user?.email || 'operator@arena.gg'}</p>
                                            <div className="mt-4 flex items-center justify-between">
                                                <div className="text-center px-4 py-2 bg-black/5 dark:bg-white/5 rounded-2xl border border-white/5 flex-1">
                                                    <p className="text-[8px] font-black opacity-40 uppercase">RP Delta</p>
                                                    <p className="text-xs font-black text-cyan-400">+142</p>
                                                </div>
                                                <div className="w-2" />
                                                <div className="text-center px-4 py-2 bg-black/5 dark:bg-white/5 rounded-2xl border border-white/5 flex-1">
                                                    <p className="text-[8px] font-black opacity-40 uppercase">Rank</p>
                                                    <p className="text-xs font-black text-violet-400">#128</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            {[
                                                { label: 'View Profile', icon: Target, tab: 'profile', color: 'text-cyan-400' },
                                                { label: 'Core Settings', icon: Cpu, tab: 'settings', color: 'text-violet-400' },
                                                { label: 'System Hub', icon: Activity, tab: 'command', color: 'text-green-500' },
                                            ].map((item) => (
                                                <button
                                                    key={item.tab}
                                                    onClick={() => { setActiveTab(item.tab as Tab); setShowProfileMenu(false); }}
                                                    className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isLight ? 'hover:bg-black/5 hover:pl-7' : 'hover:bg-white/5 hover:pl-7'}`}
                                                >
                                                    <item.icon size={16} className={item.color} />
                                                    {item.label}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-white/5">
                                            <button
                                                onClick={() => { logout(); navigate('/login'); }}
                                                className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 hover:pl-7 transition-all group"
                                            >
                                                <LogOut size={16} className="group-hover:translate-x-1 transition-transform" />
                                                Terminate Protocol
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </header>

                    {/* Side Menu Drawer */}
                    <div className={`fixed top-0 left-0 h-screen w-[280px] z-50 transition-all duration-500 ease-expo transform 
                    ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
                    ${isLight ? 'bg-white border-r border-black/10' : 'bg-[#020202]/95 backdrop-blur-2xl border-r border-white/10'}`}
                    >
                        <div className="p-8 h-full flex flex-col">
                            <div className="flex items-center gap-3 mb-12">
                                <Activity className="text-cyan-500" />
                                <span className="text-xl font-black italic tracking-tighter uppercase">Arena<span className="opacity-40">Protocol</span></span>
                            </div>

                            <nav className="flex-1 space-y-8">
                                {navSections.map((section) => (
                                    <div key={section.label} className="space-y-3">
                                        <p className="text-[10px] font-black tracking-[0.3em] text-gray-500 uppercase px-5">
                                            {section.label}
                                        </p>
                                        <div className="space-y-1">
                                            {section.items.map((item) => (
                                                <button
                                                    key={item.id}
                                                    onClick={() => {
                                                        const route = item.id === 'command' ? '/dashboard' : '/' + item.id;
                                                        navigate(route);
                                                    }}
                                                    className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all font-bold uppercase text-xs tracking-widest border
                                                    ${activeTab === item.id
                                                            ? (isLight ? 'bg-black text-white border-black shadow-lg shadow-black/10' : 'bg-white text-black border-white shadow-lg shadow-white/10')
                                                            : (isLight ? 'text-gray-500 hover:bg-black/5 border-transparent' : 'text-gray-400 hover:bg-white/5 border-transparent')
                                                        }`}
                                                >
                                                    <item.icon size={18} />
                                                    {item.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </nav>

                            <div className="mt-auto pt-6 border-t border-white/10">
                                <button
                                    onClick={() => { logout(); navigate('/login'); }}
                                    className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-red-500 font-bold uppercase text-xs tracking-widest hover:bg-red-500/10 transition-all"
                                >
                                    <LogOut size={18} />
                                    Terminate
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Backdrop */}
                    {isMenuOpen && (
                        <div
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
                            onClick={() => setIsMenuOpen(false)}
                        />
                    )}

                    <div className="dash-element">
                        {panels[activeTab]}
                    </div>
                </div>
            </div>
        </div>
    );
};
