import React, { createContext, useContext, useState, useEffect, useRef, useMemo, Component, ErrorInfo, ReactNode } from "react";
import { useNav, PAGES } from "../../navigation/NavigationContext";
import type { PageId } from "../../navigation/navigationState";
import {
    Activity, Sword, Beaker, Trophy,
    BarChart2, Cpu, Play, LogOut, X
} from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface LayoutContextType {
    isMenuOpen: boolean;
    setIsMenuOpen: (open: boolean) => void;
    isLight: boolean;
    setTheme: (theme: 'dark' | 'light') => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export const useLayout = () => {
    const context = useContext(LayoutContext);
    if (!context) throw new Error("useLayout must be used within MainLayout");
    return context;
};

interface MainLayoutProps {
    children: React.ReactNode;
}

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
                : 'radial-gradient(ellipse 80% 80% at 20% 30%, rgba(124,58,237,0.18) 0%, transparent 60%), radial-gradient(ellipse 60% 60% at 80% 70%, rgba(159,123,255,0.12) 0%, transparent 60%)',
            animation: 'meshPulse 8s ease-in-out infinite alternate',
        }} />
        {[
            { size: 360, x: '10%', y: '18%', delay: '0s', dur: '12s', color: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(124,58,237,0.14)' },
            { size: 520, x: '64%', y: '56%', delay: '3s', dur: '15s', color: isLight ? 'rgba(0,0,0,0.01)' : 'rgba(159,123,255,0.10)' },
            { size: 240, x: '78%', y: '14%', delay: '6s', dur: '10s', color: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(124,58,237,0.12)' },
        ].map((orb, i) => (
            <div key={i} className="absolute rounded-full pointer-events-none" style={{
                width: orb.size, height: orb.size, left: orb.x, top: orb.y,
                background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
                animation: `orbFloat ${orb.dur} ${orb.delay} ease-in-out infinite alternate`,
                filter: 'blur(40px)',
            }} />
        ))}
        {/* Hex pattern overlay (matches landing) */}
        <div className="absolute inset-0 opacity-[0.22] pointer-events-none" style={{
            maskImage: 'radial-gradient(circle at 50% 30%, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.20) 58%, rgba(0,0,0,0) 86%)',
        }}>
            <svg className="h-full w-full" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern id="hexPatternLayout" width="56" height="48.5" patternUnits="userSpaceOnUse">
                        <path
                            d="M14 0 L42 0 L56 24.25 L42 48.5 L14 48.5 L0 24.25 Z"
                            fill="none"
                            stroke={isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'}
                            strokeWidth="1"
                        />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#hexPatternLayout)" />
            </svg>
        </div>
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
        uColor1: { value: new THREE.Color(isLight ? '#f3f4f6' : '#050507') },
        uColor2: { value: new THREE.Color(isLight ? '#e5e7eb' : '#0b0b12') },
        uColor3: { value: new THREE.Color(isLight ? '#ffffff' : '#140b1f') },
        uAccent: { value: new THREE.Color(isLight ? '#7c3aed' : '#7c3aed') },
    }), [isLight]);

    useEffect(() => {
        uniforms.uColor1.value.set(isLight ? '#f3f4f6' : '#050507');
        uniforms.uColor2.value.set(isLight ? '#e5e7eb' : '#0b0b12');
        uniforms.uColor3.value.set(isLight ? '#ffffff' : '#140b1f');
        uniforms.uAccent.value.set('#7c3aed');
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
                fragmentShader={`uniform vec3 uColor1,uColor2,uColor3,uAccent;uniform float uTime;varying vec2 vUv;
            float hash21(vec2 p){p=fract(p*vec2(123.34,345.45));p+=dot(p,p+34.345);return fract(p.x*p.y);}
            void main(){vec2 p=vUv;
            vec3 color=mix(uColor1,uColor2,p.y+sin(uTime*.35)*.08);
            color=mix(color,uColor3,p.x+cos(uTime*.25)*.08);
            // subtle violet lift near center/top, like landing glow
            float vign=1.0-smoothstep(0.15,0.95,length(p-vec2(0.5,0.30))*1.25);
            color=mix(color,uAccent, vign*0.12);
            // faint micro-noise
            float n=hash21(p*vec2(900.0,600.0));
            color += (n-0.5)*0.015;
            gl_FragColor=vec4(color,1.);}`}
            />
        </mesh>
    );
};

const navSections = [
    {
        label: "Operations",
        items: [
            { id: 'command', label: 'Command Hub', icon: Activity, path: '/dashboard' },
            { id: 'battle', label: 'Battle Arena', icon: Sword, path: '/battle' },
            { id: 'history', label: 'Battle Log', icon: Play, path: '/history' },
            { id: 'practice', label: 'Practice Lab', icon: Beaker, path: '/practice' },
            { id: 'tournaments', label: 'Tournaments', icon: Trophy, path: '/tournaments' },
        ]
    },
    {
        label: "Intel",
        items: [
            { id: 'leaderboard', label: 'Leaderboard', icon: BarChart2, path: '/leaderboard' },
            { id: 'settings', label: 'Settings', icon: Cpu, path: '/settings' },
        ]
    }
];

export default function MainLayout({ children }: MainLayoutProps) {
    const { currentPage, goToDashboard, goToBattle, goToHistory, goToPractice, goToTournaments, goToLeaderboard, goToSettings, goToLogin } = useNav();
    const { logout } = useAuthStore();

    // Map nav item IDs to pages for active detection
    const NAV_ID_TO_PAGE: Record<string, PageId> = {
        command: PAGES.DASHBOARD,
        battle: PAGES.BATTLE,
        history: PAGES.HISTORY,
        practice: PAGES.PRACTICE,
        tournaments: PAGES.TOURNAMENTS,
        leaderboard: PAGES.LEADERBOARD,
        settings: PAGES.SETTINGS,
    };

    // Map nav item IDs to navigation actions
    const NAV_ACTIONS: Record<string, () => void> = {
        command: goToDashboard,
        battle: goToBattle,
        history: goToHistory,
        practice: goToPractice,
        tournaments: goToTournaments,
        leaderboard: goToLeaderboard,
        settings: goToSettings,
    };

    const [isMenuOpen, setIsMenuOpen] = useState(() => {
        const saved = localStorage.getItem('arena_menu_open');
        return saved === null ? false : saved === 'true';
    });

    const [theme, setTheme] = useState<'dark' | 'light'>(() => {
        return (localStorage.getItem('arena_theme') as 'dark' | 'light') || 'dark';
    });

    const isLight = theme === 'light';

    useEffect(() => {
        localStorage.setItem('arena_menu_open', isMenuOpen.toString());
    }, [isMenuOpen]);

    useEffect(() => {
        localStorage.setItem('arena_theme', theme);
        if (isLight) {
            document.documentElement.classList.add('light');
        } else {
            document.documentElement.classList.remove('light');
        }
    }, [theme, isLight]);

    return (
        <LayoutContext.Provider value={{ isMenuOpen, setIsMenuOpen, isLight, setTheme }}>
            <div className={`h-screen w-full relative overflow-hidden transition-colors duration-500 ${isLight ? 'bg-gray-50' : 'bg-[#020202]'}`}>

                {/* Global Persistent WebGL Background */}
                <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                    <WebGLErrorBoundary fallback={<CSSBackground isLight={isLight} />}>
                        {isWebGLAvailable() ? (
                            <div className="h-full w-full opacity-60">
                                <Canvas camera={{ position: [0, 0, 5], fov: 45 }} dpr={[1, 2]}>
                                    <ambientLight intensity={0.5} />
                                    <pointLight position={[10, 10, 10]} intensity={1} />
                                    <LiquidBackground isLight={isLight} />
                                </Canvas>
                            </div>
                        ) : <CSSBackground isLight={isLight} />}
                    </WebGLErrorBoundary>
                    <div className={`absolute inset-0 pointer-events-none bg-gradient-to-r transition-all duration-500 ${isLight ? 'from-white via-white/40 to-transparent' : 'from-black via-black/60 to-transparent'}`} />
                </div>

                {/* Global Side Menu Drawer */}
                <div className={`fixed top-0 left-0 h-screen w-[280px] z-[60] transition-all duration-500 ease-expo transform 
                        ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
                        ${isLight ? 'bg-white border-r border-black/10' : 'bg-[#020202]/95 backdrop-blur-2xl border-r border-white/10'}`}
                >
                    <div className="p-8 h-full flex flex-col">
                        <div className="flex justify-between items-center mb-12">
                            <div className="flex items-center gap-3">
                                <Activity className="text-accent-secondary" size={24} />
                                <span className={`text-xl font-black tracking-tighter uppercase ${isLight ? 'text-black' : 'text-white'}`}>Arena<span className={`${isLight ? 'text-gray-400' : 'text-gray-600'}`}>Protocol</span></span>
                            </div>
                            <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-white/5 rounded-xl lg:hidden">
                                <X size={20} />
                            </button>
                        </div>

                        <nav className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-8">
                            {navSections.map((section) => (
                                <div key={section.label} className="space-y-3">
                                    <p className="text-[10px] font-black tracking-[0.3em] text-gray-500 uppercase px-5">
                                        {section.label}
                                    </p>
                                    <div className="space-y-1">
                                        {section.items.map((item) => {
                                            const Icon = item.icon;
                                            const isActive = currentPage === NAV_ID_TO_PAGE[item.id];
                                            return (
                                                <button
                                                    key={item.id}
                                                    onClick={() => {
                                                        NAV_ACTIONS[item.id]?.();
                                                        setIsMenuOpen(false);
                                                    }}
                                                    className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all font-bold uppercase text-xs tracking-widest border
                                                            ${isActive
                                                            ? (isLight ? 'bg-black text-white border-black shadow-lg shadow-black/10' : 'bg-white text-black border-white shadow-lg shadow-white/10')
                                                            : (isLight ? 'text-gray-500 hover:bg-black/5 border-transparent' : 'text-gray-400 hover:bg-white/5 border-transparent')
                                                        }`}
                                                >
                                                    <Icon size={18} className={isActive ? (isLight ? 'text-white' : 'text-black') : 'opacity-60'} />
                                                    {item.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </nav>

                        <div className="mt-auto pt-6 border-t border-white/10">
                            <button
                                onClick={() => { logout(); goToLogin(); setIsMenuOpen(false); }}
                                className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-red-500 font-bold uppercase text-xs tracking-widest hover:bg-red-500/10 transition-all"
                            >
                                <LogOut size={18} />
                                Terminate Session
                            </button>
                        </div>
                    </div>
                </div>

                {/* Global Backdrop */}
                {isMenuOpen && (
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55]"
                        onClick={() => setIsMenuOpen(false)}
                    />
                )}

                {/* Main Content Area */}
                <main className={`h-full w-full transition-all duration-500 ${isMenuOpen ? 'md:pl-[280px]' : ''}`}>
                    {children}
                </main>

                <style>{`
                    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { 
                        background: ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'};
                        border-radius: 10px;
                    }
                    .ease-expo { transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1); }
                `}</style>
            </div>
        </LayoutContext.Provider>
    );
}
