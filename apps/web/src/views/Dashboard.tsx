import React, { useEffect, useRef, useState, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { useAuthStore } from '../store/useAuthStore';
import { useArenaStore } from '../store/useArenaStore';
import { TournamentHub } from './TournamentHub';
import { useLayout } from '../components/layout/MainLayout';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
    Trophy, Zap, Activity, LogOut,
    Sword, Target,
    ChevronRight,
    Edit2, Moon, Sun,
    Play, Menu, X, Search,
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

// ── Main Dashboard ────────────────────────────────────────────────────────
export const Dashboard: React.FC = () => {
    const { user, logout, fetchProfile } = useAuthStore();
    const { fetchProblems, fetchTournaments, fetchLeaderboard, leaderboard } = useArenaStore();
    const navigate = useNavigate();
    const location = useLocation();
    const { isMenuOpen, setIsMenuOpen, isLight, setTheme } = useLayout();

    const containerRef = useRef<HTMLDivElement>(null);

    const getTabFromPath = (path: string): Tab => {
        const p = path.replace('/', '');
        if (['command', 'battle', 'practice', 'tournaments', 'history', 'leaderboard', 'profile', 'settings'].includes(p)) return p as Tab;
        if (p === 'dashboard') return 'command';
        return 'command';
    };

    const [activeTab, setActiveTab] = useState<Tab>(getTabFromPath(location.pathname));
    const [searchQuery, setSearchQuery] = useState('');
    const [showNots, setShowNots] = useState(false);
    const [showMail, setShowMail] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    const [notifications] = useState([
        { id: 1, text: 'New Tournament starting soon!', time: '5m ago' },
        { id: 2, text: 'Rank up! You are now Silver IV', time: '1h ago' }
    ]);

    const [messages] = useState([
        { id: 1, from: 'System', text: 'Welcome to Arena Protocol v2.4. Uplink established.', time: 'Just Now', unread: true },
        { id: 2, from: 'Ghost_Runner_32', text: 'GG! Your algorithm was lethal. Rematch?', time: '2h ago', unread: true },
    ]);

    useEffect(() => {
        setActiveTab(getTabFromPath(location.pathname));
    }, [location.pathname]);

    useEffect(() => {
        fetchProfile();
        fetchProblems();
        fetchTournaments();
        fetchLeaderboard();

        const ctx = gsap.context(() => {
            const elements = document.querySelectorAll('.dash-element');
            if (elements.length > 0) {
                gsap.from('.dash-element', {
                    y: 30, opacity: 0, duration: 1.2,
                    stagger: 0.08, ease: 'power4.out', delay: 0.15,
                });
            }
        }, containerRef);
        return () => ctx.revert();
    }, []);

    useEffect(() => {
        const ctx = gsap.context(() => {
            const panels = document.querySelectorAll('.panel-content');
            if (panels.length > 0) {
                gsap.fromTo('.panel-content',
                    { opacity: 0, y: 16 },
                    { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' }
                );
            }
        }, containerRef);
        return () => ctx.revert();
    }, [activeTab]);

    const sortedLeaderboard = useMemo(() => {
        const data = leaderboard.length > 0 ? (leaderboard as any[]) : (INITIAL_LEADERBOARD as any[]);
        let results = [...data].sort((a, b) => (b.rating || 0) - (a.rating || 0));
        if (searchQuery) results = results.filter(e => (e.username || e.name || '').toLowerCase().includes(searchQuery.toLowerCase()));
        return results;
    }, [leaderboard, searchQuery]);

    // ── Panel Components ──────────────────────────────────────────────────
    const CommandPanel = () => (
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
                    Welcome back, Operator <strong className={isLight ? 'text-black' : 'text-white'}>{user?.username}</strong>. Monitoring live combat vectors.
                </p>
            </div>
            <div className="flex flex-wrap gap-4">
                <button onClick={() => setActiveTab('battle')} className={`group relative px-8 py-4 rounded-full font-black uppercase text-xs tracking-[0.2em] overflow-hidden flex items-center gap-3 hover:scale-105 transition-transform ${isLight ? 'bg-black text-white' : 'bg-white text-black'}`}>
                    <Zap size={18} fill="currentColor" /> Enter Arena
                </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                {[
                    { icon: <Trophy size={20} />, val: user?.rating ?? 2431, label: 'Rank Rating' },
                    { icon: <Target size={20} />, val: '64.2%', label: 'Win Rate' },
                    { icon: <Activity size={20} />, val: user?.wins ?? 128, label: 'Total Battles' },
                ].map((s, i) => (
                    <div key={i} className={`p-6 rounded-3xl border backdrop-blur-xl relative overflow-hidden group transition-all hover:-translate-y-1 ${isLight ? 'bg-white border-black/5 shadow-xl' : 'bg-white/5 border-white/10 hover:bg-white/8'}`}>
                        <div className={`p-3 rounded-2xl w-fit mb-4 ${isLight ? 'bg-black/5' : 'bg-white/10'}`}>{s.icon}</div>
                        <p className="text-3xl font-black italic tracking-tighter">{s.val}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest mt-1 opacity-50">{s.label}</p>
                    </div>
                ))}
            </div>
        </div>
    );

    const BattlePanel = () => (
        <div className="panel-content space-y-8">
            <div>
                <h2 className="text-4xl font-bold tracking-tighter uppercase">Battle Arena</h2>
                <p className={isLight ? 'text-gray-600' : 'text-gray-400'}>High-stakes algorithm combat. RP at risk.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                    { title: 'Ranked Dual', desc: 'Climb the global leaderboard in 1v1 combat.', icon: <Sword size={28} />, badge: 'STAKES', action: () => navigate('/opponents') },
                    { title: 'Quick Match', desc: 'Jump into a casual speed-coding session instantly.', icon: <Zap size={28} />, badge: 'FAST', action: () => navigate('/arena/solo') },
                ].map((mode, i) => (
                    <button key={i} onClick={mode.action}
                        className={`group p-8 rounded-3xl border transition-all duration-300 text-left relative overflow-hidden ${isLight ? 'bg-black/5 border-black/10 hover:bg-black/10' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                        <div className={`absolute top-6 right-6 text-[10px] font-black tracking-widest border px-2 py-0.5 rounded ${isLight ? 'border-black/20 text-gray-600' : 'border-white/20 text-gray-400'}`}>{mode.badge}</div>
                        <div className={`mb-6 transition-colors ${isLight ? 'text-gray-600 group-hover:text-black' : 'text-gray-300 group-hover:text-white'}`}>{mode.icon}</div>
                        <h3 className="text-2xl font-black mb-3 italic uppercase tracking-tighter">{mode.title}</h3>
                        <p className={`text-sm leading-relaxed mb-6 font-light ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>{mode.desc}</p>
                        <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all group-hover:gap-4 ${isLight ? 'text-gray-500 group-hover:text-black' : 'text-gray-400 group-hover:text-white'}`}>
                            Deploy <ChevronRight size={14} />
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );

    const panels: Record<Tab, ReactNode> = {
        command: <CommandPanel />,
        battle: <BattlePanel />,
        practice: (
            <div className="panel-content">
                <h2 className="text-4xl font-bold tracking-tighter uppercase">Practice Lab</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                    <button onClick={() => navigate('/arena/practice')} className={`p-8 rounded-3xl border ${isLight ? 'bg-black/5' : 'bg-white/5'}`}>
                        <h3 className="text-2xl font-black italic uppercase">Speed Drills</h3>
                    </button>
                </div>
            </div>
        ),
        tournaments: <TournamentHub isLight={isLight} isStandalone={false} />,
        history: (
            <div className="panel-content">
                <h2 className="text-4xl font-bold tracking-tighter uppercase">Battle Log</h2>
                <div className={`mt-8 p-8 rounded-3xl border ${isLight ? 'bg-white border-black/10' : 'bg-white/5 border-white/10'}`}>
                    <p className="opacity-50 font-mono italic">Protocol Data: 0 matches found in local cache.</p>
                </div>
            </div>
        ),
        leaderboard: (
            <div className="panel-content">
                <h2 className="text-4xl font-bold tracking-tighter uppercase">Global Intel</h2>
                <div className="mt-8 space-y-4">
                    {sortedLeaderboard.map((u, i) => (
                        <div key={i} className={`p-6 rounded-2xl border flex items-center justify-between ${isLight ? 'bg-white border-black/5 shadow-md' : 'bg-white/5 border-white/10'}`}>
                            <div className="flex items-center gap-4">
                                <span className="font-black opacity-20 text-2xl w-8">#{i + 1}</span>
                                <span className="font-bold">{u.username || u.name}</span>
                            </div>
                            <span className="font-black text-cyan-500">{u.rating || u.rp} RP</span>
                        </div>
                    ))}
                </div>
            </div>
        ),
        profile: (
            <div className="panel-content">
                <h2 className="text-4xl font-bold tracking-tighter uppercase">Operator DNS</h2>
                <div className={`mt-8 p-12 rounded-[3rem] border ${isLight ? 'bg-black text-white' : 'bg-white text-black'}`}>
                    <div className="flex flex-col md:flex-row gap-12 items-center">
                        <div className="w-32 h-32 rounded-[2rem] bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center text-black font-black text-5xl">
                            {user?.username?.[0]}
                        </div>
                        <div className="space-y-4 flex-1">
                            <h3 className="text-5xl font-black italic tracking-tighter uppercase">{user?.username}</h3>
                            <div className="flex gap-4">
                                <p className="px-4 py-1.5 rounded-full border border-current text-[10px] font-black uppercase tracking-widest opacity-60">Master Tier III</p>
                                <p className="px-4 py-1.5 rounded-full border border-current text-[10px] font-black uppercase tracking-widest opacity-60">{user?.rating} RP</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        ),
        settings: (
            <div className="panel-content">
                <h2 className="text-4xl font-bold tracking-tighter uppercase">Core Settings</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                    {[
                        { label: 'Neural Audio', val: 'ENABLED', icon: <Play size={20} /> },
                        { label: 'Visual Interface', val: 'LIGHT_MODE', icon: <Sun size={20} /> },
                    ].map((s, i) => (
                        <div key={i} className={`p-8 rounded-3xl border ${isLight ? 'bg-white border-black/5' : 'bg-white/5 border-white/10'}`}>
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">{s.label}</p>
                                    <p className="text-2xl font-black italic">{s.val}</p>
                                </div>
                                {s.icon}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    };

    return (
        <div className={`relative h-screen w-full transition-colors duration-500 flex flex-col ${isLight ? 'bg-gray-50 text-black' : 'bg-transparent text-white'}`} ref={containerRef}>
            <div className="absolute inset-0 z-0 pointer-events-none">
                <WebGLErrorBoundary fallback={<CSSBackground isLight={isLight} />}>
                    {isWebGLAvailable() ? (
                        <div className="h-full w-full">
                            <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
                                <ambientLight intensity={0.5} />
                                <pointLight position={[10, 10, 10]} intensity={1} />
                                <LiquidBackground isLight={isLight} />
                            </Canvas>
                        </div>
                    ) : <CSSBackground isLight={isLight} />}
                </WebGLErrorBoundary>
                <div className={`absolute inset-0 pointer-events-none bg-gradient-to-r transition-all duration-500 ${isLight ? 'from-white via-white/40 to-transparent' : 'from-black via-black/60 to-transparent'}`} />
            </div>

            <div className={`flex-1 overflow-y-auto px-6 md:px-12 py-8 relative z-10 custom-scrollbar`}>
                <div className="w-full">
                    <header className="mb-12 flex justify-between items-center">
                        <div className="flex items-center gap-6 flex-shrink-0">
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className={`p-3.5 rounded-2xl border transition-all dash-element group ${isLight ? 'bg-white border-black/10 hover:bg-black/5' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'}`}
                                title="Toggle Navigation Control"
                            >
                                {isMenuOpen ? <X size={22} className="group-hover:rotate-90 transition-transform" /> : <Menu size={22} className="group-hover:scale-110 transition-transform" />}
                            </button>
                            <div className="dash-element hidden sm:block min-w-0 flex-shrink">
                                <span className={`text-[10px] font-black uppercase tracking-[0.4em] block mb-1.5 transition-colors opacity-40 ${isLight ? 'text-gray-400' : 'text-cyan-500'}`}>Uplink // Status: Nominal</span>
                                <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter italic leading-none truncate">
                                    {activeTab} <span className="text-gray-500 tracking-normal opacity-40 italic">Sector</span>
                                </h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 dash-element flex-shrink-0">
                            <div className="relative group hidden lg:block">
                                <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all duration-500 ${isLight ? 'bg-white border-black/10 focus-within:border-black' : 'bg-white/5 border-white/10 focus-within:border-cyan-500/40 text-white'}`}>
                                    <Search size={16} className={`transition-opacity ${searchQuery ? 'opacity-100 text-cyan-500' : 'opacity-30'}`} />
                                    <input
                                        type="text" placeholder="Search protocol data..." value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-[0.2em] placeholder:opacity-20 w-56"
                                    />
                                    <div className="px-1.5 py-0.5 rounded border border-white/10 text-[8px] font-black opacity-20">CMD+K</div>
                                </div>
                                {searchQuery && (
                                    <div className={`absolute top-16 right-0 w-80 rounded-3xl p-6 shadow-3xl z-50 border backdrop-blur-3xl animate-in zoom-in-95 ${isLight ? 'bg-white/98 border-black/10' : 'bg-[#0a0a0a]/98 border-white/10'}`}>
                                        <div className="space-y-1.5">
                                            {sortedLeaderboard.slice(0, 4).map((item, i) => (
                                                <div key={i} className={`p-4 rounded-2xl flex items-center justify-between group transition-all cursor-pointer ${isLight ? 'hover:bg-black/5' : 'hover:bg-white/5'}`}>
                                                    <span className="text-xs font-black uppercase tracking-tight">{item.username || item.name}</span>
                                                    <ChevronRight size={14} className="opacity-0 group-hover:opacity-100" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button onClick={() => setTheme(isLight ? 'dark' : 'light')} className={`p-3.5 rounded-2xl border transition-all ${isLight ? 'bg-white border-black/10 hover:bg-black/5' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'}`}>
                                {isLight ? <Moon size={20} /> : <Sun size={20} />}
                            </button>

                            <div className="relative">
                                <button onClick={() => setShowNots(!showNots)} className={`p-3.5 rounded-2xl border transition-all relative ${isLight ? 'bg-white border-black/10 hover:bg-black/5' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'}`}>
                                    <Bell size={20} />
                                    <span className="absolute top-3 right-3 w-4 h-4 bg-red-500 border-2 border-black rounded-full text-[8px] font-black flex items-center justify-center">2</span>
                                </button>
                                {showNots && (
                                    <div className={`absolute top-16 right-0 w-80 rounded-3xl p-6 shadow-3xl z-50 border backdrop-blur-3xl animate-in zoom-in-95 duration-200 ${isLight ? 'bg-white/98 border-black/10' : 'bg-[#0a0a0a]/98 border-white/10'}`}>
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-gray-400' : 'text-cyan-500'}`}>Intelligence Feed</h3>
                                        </div>
                                        <div className="space-y-3">
                                            {notifications.map(n => (
                                                <div key={n.id} className={`p-4 rounded-2xl border ${isLight ? 'bg-black/5 border-black/5' : 'bg-white/5 border-white/5'}`}>
                                                    <p className="text-xs font-bold mb-1">{n.text}</p>
                                                    <span className="text-[9px] opacity-40 font-black uppercase tracking-widest">{n.time}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="relative">
                                <button onClick={() => setShowMail(!showMail)} className={`p-3.5 rounded-2xl border transition-all relative ${isLight ? 'bg-white border-black/10 hover:bg-black/5' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'}`}>
                                    <Mail size={20} />
                                    <div className="absolute top-3 right-3 w-2.5 h-2.5 bg-cyan-500 border-2 border-black rounded-full animate-pulse" />
                                </button>
                                {showMail && (
                                    <div className={`absolute top-16 right-0 w-80 rounded-3xl p-6 shadow-3xl z-50 border backdrop-blur-3xl animate-in zoom-in-95 duration-200 ${isLight ? 'bg-white/98 border-black/10' : 'bg-[#0a0a0a]/98 border-white/10'}`}>
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-gray-400' : 'text-cyan-500'}`}>Secure Uplink</h3>
                                        </div>
                                        <div className="space-y-1.5">
                                            {messages.map(m => (
                                                <div key={m.id} className={`p-4 rounded-2xl ${m.unread ? (isLight ? 'bg-black/5' : 'bg-white/10') : 'hover:bg-white/5'}`}>
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-cyan-500">{m.from}</span>
                                                        <span className="text-[8px] opacity-30">{m.time}</span>
                                                    </div>
                                                    <p className="text-xs font-medium opacity-80 line-clamp-1">{m.text}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="relative ml-2">
                                <button
                                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                                    className={`flex items-center gap-3 pl-3 pr-2 py-2 rounded-2xl border transition-all ${isLight ? 'bg-white border-black/10 hover:bg-black/5' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                                >
                                    <div className="flex flex-col items-end hidden sm:block">
                                        <span className="text-[10px] font-black uppercase tracking-tighter">{user?.username || 'OPERATOR'}</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                            <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Active</span>
                                        </div>
                                    </div>
                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center text-black font-black text-sm`}>
                                        {(user?.username || 'G')[0].toUpperCase()}
                                    </div>
                                </button>
                                {showProfileMenu && (
                                    <div className={`absolute top-16 right-0 w-72 rounded-[2.5rem] p-6 shadow-3xl z-50 border backdrop-blur-3xl animate-in zoom-in-95 duration-300 ${isLight ? 'bg-white/98 border-black/10' : 'bg-[#0a0a0a]/98 border-white/10'}`}>
                                        <div className="flex items-center gap-4 mb-8">
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center text-black font-black text-xl">
                                                {(user?.username || 'G')[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-lg font-black italic uppercase tracking-tighter leading-none">{user?.username}</p>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-cyan-500 mt-1">{user?.rating} RP</p>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <button onClick={() => { setActiveTab('profile'); setShowProfileMenu(false); }} className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${isLight ? 'bg-black/5 hover:bg-black/10' : 'bg-white/5 hover:bg-white/10'}`}>
                                                <span className="text-[10px] font-black uppercase tracking-widest">Edit DNA</span>
                                                <Edit2 size={14} className="opacity-40" />
                                            </button>
                                            <button onClick={() => { logout(); navigate('/login'); }} className="w-full flex items-center justify-between p-4 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all">
                                                <span className="text-[10px] font-black uppercase tracking-widest">Terminate</span>
                                                <LogOut size={14} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </header>

                    <div className="dash-element flex-1 min-h-0 relative mt-4">
                        {panels[activeTab]}
                    </div>
                </div>
            </div>

            <style>{`
                .panel-content {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                    animation: panelFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @keyframes panelFadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}; border-radius: 10px; }
            `}</style>
        </div>
    );
};
