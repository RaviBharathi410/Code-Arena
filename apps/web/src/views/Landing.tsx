import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { ChevronDown, Github, X, Check, Terminal, Shield, Zap, MessageSquare, BookOpen, Activity, Users, FileCode, Server, Code2 } from 'lucide-react';
import { Logo } from '../components/ui/Logo';
import { useLenis } from '../hooks/useLenis';

gsap.registerPlugin(ScrollTrigger);

type FaqItem = { q: string; a: string };

const FAQ: FaqItem[] = [
    {
        q: 'What is CodeArena?',
        a: 'A realtime coding battle arena where multiple operators compete on the same problem with live scoring, complexity insights, and voice-assisted input.',
    },
    {
        q: 'How do I get started?',
        a: 'Create an operator account, pick a battle queue, then solve the prompt. Your grade and points update live as you progress.',
    },
    {
        q: 'Can the AI detect and fix bugs automatically?',
        a: 'It can surface likely issues and propose improvements, but your final submission is always under your control.',
    },
    {
        q: 'How does the autocomplete feature work?',
        a: 'Voice commands + lightweight suggestions help accelerate edits without fighting your flow.',
    },
    {
        q: 'When is launch date?',
        a: 'We’re rolling out iteratively. Join early to shape the battle protocol.',
    },
    {
        q: 'How often is the tool updated?',
        a: 'Frequently—performance and UX improvements ship in small increments.',
    },
];

const LINKS = [
    { label: 'Pricing', href: '#pricing' },
    { label: 'Features', href: '#features' },
    { label: 'Updates', href: '#updates' },
    { label: 'Help', href: '#help' },
    { label: 'Blog', href: '#blog' },
    { label: 'Contact', href: '#contact' },
];

const Backdrop: React.FC = () => (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* soft vignette + spotlight like reference */}
        <div className="absolute inset-0 bg-[#050507]" />
        <div
            className="absolute inset-0 opacity-90"
            style={{
                background:
                    'radial-gradient(ellipse 60% 55% at 50% 45%, rgba(124,58,237,0.12) 0%, rgba(124,58,237,0.03) 40%, rgba(0,0,0,0) 70%)',
            }}
        />
        {/* subtle grain */}
        <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
                backgroundImage:
                    'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.35) 1px, transparent 0)',
                backgroundSize: '3px 3px',
                filter: 'blur(0.2px)',
                maskImage: 'radial-gradient(circle at 50% 50%, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0) 85%)',
            }}
        />
        {/* Primary purple glow */}
        <div className="absolute -top-52 left-1/2 h-[640px] w-[640px] -translate-x-1/2 rounded-full blur-[170px]" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.25) 0%, rgba(124,58,237,0.08) 50%, transparent 70%)' }} />
        {/* Secondary side glow */}
        <div className="absolute top-[20%] -left-32 h-[400px] w-[400px] rounded-full blur-[120px]" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)' }} />
        <div className="absolute top-[30%] -right-32 h-[350px] w-[350px] rounded-full blur-[100px]" style={{ background: 'radial-gradient(circle, rgba(147,51,234,0.08) 0%, transparent 70%)' }} />
    </div>
);

const Surface: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={`relative rounded-[22px] border border-white/10 bg-white/[0.03] shadow-[0_0_0_1px_rgba(255,255,255,0.03)] ${className ?? ''}`}>
        <div className="pointer-events-none absolute inset-0 rounded-[22px] bg-gradient-to-b from-white/[0.06] to-transparent" />
        {children}
    </div>
);

const Pill: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={`inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[12px] font-medium text-white/65 backdrop-blur-xl ${className ?? ''}`}>
        {children}
    </div>
);

const useReducedMotion = () => {
    const [reduced, setReduced] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
        if (!mq) return;
        const apply = () => setReduced(!!mq.matches);
        apply();
        mq.addEventListener?.('change', apply);
        return () => mq.removeEventListener?.('change', apply);
    }, []);
    return reduced;
};

/** Splits a text string into word-wrapped spans for stagger animation */
const WordSplit: React.FC<{ text: string; className?: string }> = ({ text, className }) => (
    <>
        {text.split(' ').map((word, i) => (
            <span key={i} data-word className={`inline-block ${className ?? ''}`}>
                {word}&nbsp;
            </span>
        ))}
    </>
);

const FaqRow: React.FC<{ item: FaqItem; open: boolean; onToggle: () => void }> = ({ item, open, onToggle }) => (
    <button
        type="button"
        onClick={onToggle}
        className="w-full text-left rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-5 transition-colors hover:bg-white/[0.05]"
    >
        <div className="flex items-center justify-between gap-6">
            <div>
                <div className="text-sm md:text-base font-medium tracking-tight text-white/90">{item.q}</div>
                {open && <div className="mt-2 text-xs md:text-sm leading-relaxed text-white/50">{item.a}</div>}
            </div>
            <ChevronDown className={`h-5 w-5 flex-none text-white/40 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
    </button>
);

export const Landing: React.FC = () => {
    const nav = useNavigate();
    const reducedMotion = useReducedMotion();
    const lenis = useLenis();
    const rootRef = useRef<HTMLDivElement>(null);

    // Section refs
    const navbarRef = useRef<HTMLDivElement>(null);
    const heroRef = useRef<HTMLDivElement>(null);
    const heroBadgeRef = useRef<HTMLDivElement>(null);
    const heroH1Line1Ref = useRef<HTMLSpanElement>(null);
    const heroH1Line2Ref = useRef<HTMLSpanElement>(null);
    const heroSubtitleRef = useRef<HTMLParagraphElement>(null);
    const heroCtaRef = useRef<HTMLDivElement>(null);
    const heroGlowRef = useRef<HTMLDivElement>(null);
    const featuresRef = useRef<HTMLDivElement>(null);
    const featuresCardsRef = useRef<HTMLDivElement>(null);
    const codeRef = useRef<HTMLDivElement>(null);
    const codeLeftRef = useRef<HTMLDivElement>(null);
    const codeRightRef = useRef<HTMLDivElement>(null);
    const wipe1Ref = useRef<HTMLDivElement>(null);
    const wipe2Ref = useRef<HTMLDivElement>(null);

    const [faqOpen, setFaqOpen] = useState<number>(0);
    const [codeTab, setCodeTab] = useState<'code' | 'text'>('code');

    // ---------- Lenis-based anchor navigation ----------
    const handleAnchorClick = useCallback((e: MouseEvent) => {
        const t = e.target as HTMLElement | null;
        const a = t?.closest?.('a[href^="#"]') as HTMLAnchorElement | null;
        if (!a) return;
        const id = a.getAttribute('href')?.slice(1);
        if (!id) return;
        const el = document.getElementById(id);
        if (!el) return;
        e.preventDefault();
        if (lenis) {
            lenis.scrollTo(el, { offset: -60 });
        } else {
            el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
        }
    }, [lenis, reducedMotion]);

    useEffect(() => {
        document.addEventListener('click', handleAnchorClick);
        return () => document.removeEventListener('click', handleAnchorClick);
    }, [handleAnchorClick]);

    // ---------- GSAP Animation System ----------
    useGSAP(() => {
        if (reducedMotion) return;
        const root = rootRef.current;
        if (!root) return;

        // ========== HERO ENTRANCE (plays once on load) ==========
        const heroTl = gsap.timeline({ defaults: { ease: 'power2.out' } });

        // Navbar fade in
        if (navbarRef.current) {
            gsap.set(navbarRef.current, { opacity: 0, y: -20 });
            heroTl.to(navbarRef.current, { opacity: 1, y: 0, duration: 0.6, delay: 0.1 });
        }

        // Badge
        if (heroBadgeRef.current) {
            gsap.set(heroBadgeRef.current, { opacity: 0, y: 16 });
            heroTl.to(heroBadgeRef.current, { opacity: 1, y: 0, duration: 0.5 }, 0.3);
        }

        // H1 line 1 — clip-path reveal
        if (heroH1Line1Ref.current) {
            gsap.set(heroH1Line1Ref.current, { clipPath: 'inset(0 100% 0 0)' });
            heroTl.to(heroH1Line1Ref.current, {
                clipPath: 'inset(0 0% 0 0)', duration: 0.9, ease: 'power4.out',
            }, 0.5);
        }

        // H1 line 2 — clip-path reveal
        if (heroH1Line2Ref.current) {
            gsap.set(heroH1Line2Ref.current, { clipPath: 'inset(0 100% 0 0)' });
            heroTl.to(heroH1Line2Ref.current, {
                clipPath: 'inset(0 0% 0 0)', duration: 0.9, ease: 'power4.out',
            }, 0.7);
        }

        // Subtitle
        if (heroSubtitleRef.current) {
            gsap.set(heroSubtitleRef.current, { opacity: 0, y: 12 });
            heroTl.to(heroSubtitleRef.current, { opacity: 1, y: 0, duration: 0.6 }, 0.9);
        }

        // CTA button
        if (heroCtaRef.current) {
            gsap.set(heroCtaRef.current, { opacity: 0, scale: 0.88 });
            heroTl.to(heroCtaRef.current, {
                opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.7)',
            }, 1.1);
        }

        // ========== HERO PARALLAX (scroll-scrub) ==========
        if (heroRef.current) {
            // H1 group parallax
            const h1El = heroRef.current.querySelector('h1');
            if (h1El) {
                ScrollTrigger.create({
                    trigger: heroRef.current,
                    start: 'top top',
                    end: 'bottom top',
                    scrub: 1.5,
                    animation: gsap.to(h1El, { y: -80 }),
                });
            }

            // Subtitle + CTA parallax
            const subGroup = heroRef.current.querySelector('[data-hero-sub]');
            if (subGroup) {
                ScrollTrigger.create({
                    trigger: heroRef.current,
                    start: 'top top',
                    end: 'bottom top',
                    scrub: 1.2,
                    animation: gsap.to(subGroup, { y: -40 }),
                });
            }

            // Radial glow depth
            if (heroGlowRef.current) {
                ScrollTrigger.create({
                    trigger: heroRef.current,
                    start: 'top top',
                    end: 'bottom top',
                    scrub: 2,
                    animation: gsap.to(heroGlowRef.current, { scale: 1.6, opacity: 0.03 }),
                });
            }
        }

        // ========== NAVBAR SCROLL STATE ==========
        if (navbarRef.current) {
            const navbar = navbarRef.current;
            ScrollTrigger.create({
                trigger: document.documentElement,
                start: 'top top',
                end: 'bottom bottom',
                onUpdate: (self) => {
                    const scrollY = self.scroll();
                    if (scrollY > 80) {
                        gsap.to(navbar, {
                            backgroundColor: 'rgba(10,10,10,0.85)',
                            backdropFilter: 'blur(12px)',
                            borderBottom: '1px solid rgba(124,58,237,0.3)',
                            paddingTop: '12px',
                            paddingBottom: '12px',
                            duration: 0.3,
                            overwrite: 'auto',
                        });
                    } else {
                        gsap.to(navbar, {
                            backgroundColor: 'transparent',
                            backdropFilter: 'blur(0px)',
                            borderBottom: '1px solid transparent',
                            paddingTop: '32px',
                            paddingBottom: '0px',
                            duration: 0.3,
                            overwrite: 'auto',
                        });
                    }
                },
            });
        }

        // ========== FEATURES SECTION ==========
        if (featuresRef.current) {
            // Badge
            const badge = featuresRef.current.querySelector('[data-feat-badge]');
            if (badge) {
                gsap.set(badge, { opacity: 0, y: 20, scale: 0.9 });
                ScrollTrigger.create({
                    trigger: badge as Element,
                    start: 'top 85%',
                    end: 'top 60%',
                    animation: gsap.to(badge, { opacity: 1, y: 0, scale: 1, duration: 0.5 }),
                });
            }

            // H2 word-split stagger
            const h2Words = featuresRef.current.querySelectorAll('[data-feat-h2] [data-word]');
            if (h2Words.length) {
                gsap.set(h2Words, { opacity: 0, y: 60 });
                ScrollTrigger.create({
                    trigger: featuresRef.current.querySelector('[data-feat-h2]') as Element,
                    start: 'top 80%',
                    end: 'top 55%',
                    animation: gsap.to(h2Words, {
                        opacity: 1, y: 0, stagger: 0.07, ease: 'power3.out', duration: 0.6,
                    }),
                });
            }
        }

        // Feature cards stagger
        if (featuresCardsRef.current) {
            const cards = featuresCardsRef.current.children;
            if (cards.length >= 4) {
                const fromValues = [
                    { x: -40, opacity: 0 },
                    { x: 40, opacity: 0 },
                    { y: 50, opacity: 0 },
                    { y: 50, opacity: 0 },
                ];
                Array.from(cards).forEach((card, i) => {
                    const from = fromValues[i] || { y: 50, opacity: 0 };
                    gsap.set(card, from);
                    ScrollTrigger.create({
                        trigger: featuresCardsRef.current as Element,
                        start: 'top 75%',
                        end: 'top 50%',
                        animation: gsap.to(card, {
                            x: 0, y: 0, opacity: 1, duration: 0.7, ease: 'power2.out',
                            delay: i * 0.12,
                        }),
                    });

                    // Inner parallax: mock terminal/chart moves slower
                    const inner = (card as HTMLElement).querySelector('[data-card-inner]');
                    if (inner) {
                        ScrollTrigger.create({
                            trigger: card as Element,
                            start: 'top bottom',
                            end: 'bottom top',
                            scrub: true,
                            animation: gsap.to(inner, { y: -18 }),
                        });
                    }

                    // Card hover GSAP micro-interactions
                    const iconBadge = (card as HTMLElement).querySelector('[data-card-icon]');
                    (card as HTMLElement).addEventListener('mouseenter', () => {
                        gsap.to(card, { scale: 1.025, borderColor: 'rgba(124,58,237,0.6)', duration: 0.3, ease: 'power2.out' });
                        if (iconBadge) gsap.to(iconBadge, { rotation: -8, scale: 1.1, duration: 0.3, ease: 'power2.out' });
                    });
                    (card as HTMLElement).addEventListener('mouseleave', () => {
                        gsap.to(card, { scale: 1, borderColor: 'rgba(255,255,255,0.1)', duration: 0.25, ease: 'power2.out' });
                        if (iconBadge) gsap.to(iconBadge, { rotation: 0, scale: 1, duration: 0.25, ease: 'power2.out' });
                    });
                });
            }
        }

        // ========== CODE EXPERIENCE SECTION ==========
        if (codeRef.current) {
            // Badge + H2 word-split
            const codeBadge = codeRef.current.querySelector('[data-code-badge]');
            if (codeBadge) {
                gsap.set(codeBadge, { opacity: 0, y: 20, scale: 0.9 });
                ScrollTrigger.create({
                    trigger: codeBadge as Element,
                    start: 'top 85%',
                    end: 'top 60%',
                    animation: gsap.to(codeBadge, { opacity: 1, y: 0, scale: 1, duration: 0.5 }),
                });
            }
            const codeH2Words = codeRef.current.querySelectorAll('[data-code-h2] [data-word]');
            if (codeH2Words.length) {
                gsap.set(codeH2Words, { opacity: 0, y: 60 });
                ScrollTrigger.create({
                    trigger: codeRef.current.querySelector('[data-code-h2]') as Element,
                    start: 'top 80%',
                    end: 'top 55%',
                    animation: gsap.to(codeH2Words, {
                        opacity: 1, y: 0, stagger: 0.07, ease: 'power3.out', duration: 0.6,
                    }),
                });
            }
        }

        // Left panel entrance
        if (codeLeftRef.current) {
            gsap.set(codeLeftRef.current, { opacity: 0, x: -60 });
            ScrollTrigger.create({
                trigger: codeLeftRef.current,
                start: 'top 80%',
                end: 'top 55%',
                animation: gsap.to(codeLeftRef.current, { opacity: 1, x: 0, duration: 0.8, ease: 'power3.out' }),
            });
        }

        // Right panel entrance + bar animations
        if (codeRightRef.current) {
            gsap.set(codeRightRef.current, { opacity: 0, x: 60 });
            ScrollTrigger.create({
                trigger: codeRightRef.current,
                start: 'top 80%',
                end: 'top 55%',
                animation: gsap.to(codeRightRef.current, {
                    opacity: 1, x: 0, duration: 0.8, delay: 0.15, ease: 'power3.out',
                    onComplete: () => {
                        // Animate progress bars after panel enters
                        const bars = codeRightRef.current?.querySelectorAll('[data-bar]');
                        const labels = codeRightRef.current?.querySelectorAll('[data-bar-label]');
                        if (bars && bars[0]) {
                            gsap.fromTo(bars[0], { scaleX: 0 }, {
                                scaleX: 1, duration: 1.2, ease: 'power2.out',
                                transformOrigin: 'left',
                            });
                        }
                        if (bars && bars[1]) {
                            gsap.fromTo(bars[1], { scaleX: 0 }, {
                                scaleX: 1, duration: 1.6, ease: 'power2.out',
                                delay: 0.3, transformOrigin: 'left',
                            });
                        }
                        // Count-up percentage labels
                        if (labels && labels[0]) {
                            gsap.fromTo(labels[0], { innerText: '0' }, {
                                innerText: '20', duration: 1.2, ease: 'power2.out',
                                snap: { innerText: 1 },
                                onUpdate: function() {
                                    (labels[0] as HTMLElement).textContent = Math.round(Number(gsap.getProperty(labels[0], 'innerText'))) + '%';
                                },
                            });
                        }
                        if (labels && labels[1]) {
                            gsap.fromTo(labels[1], { innerText: '0' }, {
                                innerText: '70', duration: 1.6, ease: 'power2.out', delay: 0.3,
                                snap: { innerText: 1 },
                                onUpdate: function() {
                                    (labels[1] as HTMLElement).textContent = Math.round(Number(gsap.getProperty(labels[1], 'innerText'))) + '%';
                                },
                            });
                        }
                    },
                }),
            });
        }

        // Floating idle animation for code panels
        if (codeLeftRef.current) {
            gsap.to(codeLeftRef.current, {
                y: -6, duration: 4, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 0,
            });
        }
        if (codeRightRef.current) {
            gsap.to(codeRightRef.current, {
                y: -6, duration: 4, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 2,
            });
        }

        // ========== SECTION TRANSITION WIPES ==========
        [wipe1Ref, wipe2Ref].forEach((ref) => {
            if (ref.current) {
                gsap.set(ref.current, { scaleX: 0, transformOrigin: 'left center' });
                ScrollTrigger.create({
                    trigger: ref.current,
                    start: 'top 90%',
                    end: 'top 60%',
                    scrub: 0.5,
                    animation: gsap.to(ref.current, { scaleX: 1 }),
                });
            }
        });

        // ========== REMAINING data-reveal ELEMENTS (generic fade) ==========
        gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
            // Skip elements already handled by specific animations
            if (el.closest('[data-feat-badge]') || el.closest('[data-feat-h2]') ||
                el.closest('[data-code-badge]') || el.closest('[data-code-h2]')) return;
            gsap.set(el, { opacity: 0, y: 12 });
            ScrollTrigger.create({
                trigger: el,
                start: 'top 84%',
                end: 'top 60%',
                animation: gsap.to(el, { opacity: 1, y: 0, duration: 0.65, ease: 'power2.out' }),
            });
        });

        // Batch refresh after all triggers registered
        ScrollTrigger.refresh();

    }, { scope: rootRef, dependencies: [reducedMotion] });

    return (
        <div ref={rootRef} id="top" className="relative min-h-screen w-full bg-[#050507] text-white">
            <Backdrop />

            {/* Top nav (matches reference: links + login/signup) */}
            <div ref={navbarRef} className="fixed top-0 left-0 right-0 z-50 mx-auto w-full max-w-6xl px-6 pt-8" style={{ borderBottom: '1px solid transparent' }}>
                <div className="flex items-center justify-between">
                    <Logo isLight={false} />

                    <div className="hidden lg:flex items-center gap-8 text-xs font-medium text-white/55">
                        {LINKS.map((l) => (
                            <a key={l.href} href={l.href} className="hover:text-white/80 transition-colors">
                                {l.label}
                            </a>
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => nav('/login')}
                            className="h-10 rounded-xl border border-white/10 bg-white/[0.02] px-5 text-xs font-medium text-white/70 hover:bg-white/[0.05] hover:text-white transition-colors"
                        >
                            Log in
                        </button>
                        <button
                            type="button"
                            onClick={() => nav('/login?mode=register')}
                            className="h-10 rounded-xl bg-white px-5 text-xs font-semibold text-black hover:bg-gray-100 transition-colors"
                        >
                            Signup
                        </button>
                    </div>
                </div>
            </div>            {/* Hero (LogoDiffusion-like) */}
            <div ref={heroRef} className="relative z-10 mx-auto w-full max-w-6xl px-6 pt-28 pb-10">
                {/* Radial glow for parallax depth */}
                <div
                    ref={heroGlowRef}
                    className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{ width: 600, height: 600, background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)', opacity: 0.08 }}
                />

                <div className="mx-auto max-w-4xl text-center">
                    <div ref={heroBadgeRef} className="flex justify-center">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/60">
                            <span className="inline-flex items-center gap-2 rounded-full bg-accent-secondary/25 px-3 py-1 text-[11px] font-medium text-white">
                                <span className="h-2 w-2 rounded-full bg-accent-secondary" />
                                What's New?
                            </span>
                            <span className="hidden sm:inline">CodeArena v1.0 released!</span>
                            <span className="text-white/30">›</span>
                        </div>
                    </div>

                    <h1 className="mt-10 text-5xl md:text-7xl font-semibold tracking-tight leading-[1.04] text-white">
                        <span ref={heroH1Line1Ref} className="inline-block">Turn Any <span className="text-accent-secondary">Idea</span> Into</span>
                        <span ref={heroH1Line2Ref} className="block">a Professional <span className="text-accent-secondary">Battle</span></span>
                    </h1>

                    <div data-hero-sub>
                        <p ref={heroSubtitleRef} className="mt-6 text-sm md:text-base text-white/50 max-w-2xl mx-auto leading-relaxed">
                            Competitive coding duels with voice + realtime notes. Live complexity signals. Score, points, and grades based on your battle logs.
                        </p>

                        <div ref={heroCtaRef} className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-6">
                            <button
                                type="button"
                                data-cursor-hover
                                onClick={() => nav('/login?mode=register')}
                                className="h-12 rounded-xl bg-accent-secondary px-8 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(124,58,237,0.22)] hover:bg-accent-secondary/90 transition-colors"
                            >
                                Generate My Rank
                            </button>
                        </div>
                    </div>
                </div>

                {/* Feature cards grid (2-up, matching reference composition) */}
            </div>

            {/* Section wipe: Hero → Features */}
            <div ref={wipe1Ref} className="relative z-10 mx-auto w-full max-w-6xl h-px" style={{ background: 'rgba(124,58,237,0.3)' }} />

            <div ref={featuresRef} id="features" className="relative z-10 mx-auto w-full max-w-6xl px-6 pt-20 pb-20">
                <div className="text-center mb-12">
                    <div data-feat-badge className="flex justify-center">
                        <Pill>Platform Features</Pill>
                    </div>
                    <h2 data-feat-h2 className="mt-6 text-3xl md:text-5xl font-semibold tracking-tight text-white/90">
                        <WordSplit text="Battle-Tested Capabilities" />
                    </h2>
                </div>

                <div ref={featuresCardsRef} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Surface>
                        <div className="relative p-7 h-full flex flex-col">
                            <div data-reveal className="flex items-center gap-4">
                                <div data-card-icon className="h-12 w-12 rounded-xl border border-white/10 bg-white/[0.04] flex items-center justify-center text-accent-secondary shadow-[0_0_15px_rgba(124,58,237,0.15)]">
                                    <Zap size={20} />
                                </div>
                                <div>
                                    <div className="text-base font-medium text-white/90">Real-Time Execution</div>
                                    <div className="mt-1 text-xs text-white/45 max-w-[200px]">
                                        Sub-millisecond code execution directly in the browser via WebContainers.
                                    </div>
                                </div>
                            </div>
                            <div data-card-inner className="mt-6 rounded-2xl border border-white/10 bg-[#070709] p-5 flex-grow relative overflow-hidden flex flex-col justify-center">
                                {/* Visual code trace */}
                                <div className="space-y-3 relative z-10 font-mono text-[11px] text-emerald-400/80">
                                    <div className="flex justify-between items-center"><span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Compiling worker...</span> <span>[0.08ms]</span></div>
                                    <div className="flex justify-between items-center opacity-70"><span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Linking AST nodes...</span> <span>[0.12ms]</span></div>
                                    <div className="h-px w-full bg-white/10 my-2" />
                                    <div className="flex justify-between text-white/90"><span>Execution complete.</span> <span className="text-accent-secondary font-semibold">Success</span></div>
                                </div>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[50px] pointer-events-none" />
                            </div>
                        </div>
                    </Surface>
                    
                    <Surface>
                        <div className="relative p-7 h-full flex flex-col">
                            <div data-reveal className="flex items-center gap-4">
                                <div data-card-icon className="h-12 w-12 rounded-xl border border-white/10 bg-white/[0.04] flex items-center justify-center text-accent-secondary shadow-[0_0_15px_rgba(124,58,237,0.15)]">
                                    <MessageSquare size={20} />
                                </div>
                                <div>
                                    <div className="text-base font-medium text-white/90">Voice-to-AST Linking</div>
                                    <div className="mt-1 text-xs text-white/45 max-w-[200px]">
                                        Dictate complex architectural changes and watch the engine parse your intent.
                                    </div>
                                </div>
                            </div>
                            <div data-card-inner className="mt-6 rounded-2xl border border-white/10 bg-[#070709] p-5 flex-grow relative overflow-hidden flex flex-col justify-center gap-3">
                                <div className="inline-flex rounded-full bg-white/5 border border-white/10 px-3 py-1.5 text-[11px] text-white/80 items-center w-max shadow-sm backdrop-blur-md relative z-10">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-2 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" /> "Extract this into a React hook"
                                </div>
                                <div className="h-6 w-px bg-gradient-to-b from-white/20 to-transparent ml-6 relative z-10" />
                                <pre className="text-[10px] text-white/50 bg-[#0a0a0c] p-3 rounded-xl border border-white/5 relative z-10 font-mono shadow-inner"><span className="text-accent-secondary">function</span> <span className="text-emerald-300">useExtracted</span>() {'{\n'}  <span className="text-white/20">// fully typed</span>\n{'}'}</pre>
                                <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent-secondary/10 blur-[40px] pointer-events-none" />
                            </div>
                        </div>
                    </Surface>

                    <Surface>
                        <div className="relative p-7 h-full flex flex-col">
                            <div data-reveal className="flex items-center gap-4">
                                <div data-card-icon className="h-12 w-12 rounded-xl border border-white/10 bg-white/[0.04] flex items-center justify-center text-accent-secondary shadow-[0_0_15px_rgba(124,58,237,0.15)]">
                                    <Shield size={20} />
                                </div>
                                <div>
                                    <div className="text-base font-medium text-white/90">Zero-Trust Defense</div>
                                    <div className="mt-1 text-xs text-white/45 max-w-[200px]">
                                        All match code is scrubbed through multi-layered heuristics.
                                    </div>
                                </div>
                            </div>
                            <div data-card-inner className="mt-6 rounded-2xl border border-white/10 bg-[#070709] p-5 flex-grow relative overflow-hidden flex items-center justify-center">
                                <div className="w-28 h-28 rounded-full border border-white/5 flex items-center justify-center relative shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]">
                                    <div className="absolute inset-[-1px] rounded-full border-t border-r border-emerald-400/60 animate-spin" style={{ animationDuration: '4s' }} />
                                    <div className="absolute inset-[10px] rounded-full border-b border-l border-accent-secondary/40 animate-spin" style={{ animationDuration: '3s', animationDirection: 'reverse' }} />
                                    <Shield size={28} className="text-emerald-400" />
                                </div>
                                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(52,211,153,0.05),transparent_60%)] pointer-events-none" />
                            </div>
                        </div>
                    </Surface>

                     <Surface>
                        <div className="relative p-7 h-full flex flex-col">
                            <div data-reveal className="flex items-center gap-4">
                                <div data-card-icon className="h-12 w-12 rounded-xl border border-white/10 bg-white/[0.04] flex items-center justify-center text-accent-secondary shadow-[0_0_15px_rgba(124,58,237,0.15)]">
                                    <Activity size={20} />
                                </div>
                                <div>
                                    <div className="text-base font-medium text-white/90">Deep Match Analytics</div>
                                    <div className="mt-1 text-xs text-white/45 max-w-[200px]">
                                        Analyze your Big-O complexity, variable scoping, and speed metrics.
                                    </div>
                                </div>
                            </div>
                            <div data-card-inner className="mt-6 rounded-2xl border border-white/10 bg-[#070709] p-5 flex-grow relative overflow-hidden flex items-end justify-between gap-1.5">
                                {[20, 45, 30, 80, 60, 100, 50, 75, 40].map((h, i) => (
                                    <div key={i} className="w-full bg-gradient-to-t from-accent-secondary/80 to-accent-secondary rounded-t-sm hover:from-emerald-400 hover:to-emerald-300 transition-colors shadow-[0_0_10px_rgba(124,58,237,0.2)]" style={{ height: `${h}%` }} />
                                ))}
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#070709]/80 pointer-events-none" />
                            </div>
                        </div>
                    </Surface>
                </div>
            </div>

            {/* Section wipe: Features → Code */}
            <div ref={wipe2Ref} className="relative z-10 mx-auto w-full max-w-6xl h-px" style={{ background: 'rgba(124,58,237,0.3)' }} />

            {/* Transform section */}
            <div ref={codeRef} id="code" className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-20 pt-10">
                <div className="text-center">
                    <div data-code-badge className="flex justify-center">
                        <Pill>
                            <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent-secondary/25 text-accent-secondary">•</span>
                            Try your code now
                        </Pill>
                    </div>
                    <h2 data-code-h2 className="mt-6 text-3xl md:text-5xl font-semibold tracking-tight text-white/90">
                        <WordSplit text="Transform Your Coding Experience" />
                    </h2>
                </div>

                <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div ref={codeLeftRef}>
                        <Surface>
                            <div className="p-5 md:p-6">
                                <div className="flex items-center gap-2 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => setCodeTab('code')}
                                        className={`rounded-full px-3 py-1.5 border ${codeTab === 'code' ? 'border-accent-secondary/40 bg-accent-secondary/15 text-white' : 'border-white/10 bg-white/[0.02] text-white/55 hover:text-white/75'}`}
                                    >
                                        + Code
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCodeTab('text')}
                                        className={`rounded-full px-3 py-1.5 border ${codeTab === 'text' ? 'border-accent-secondary/40 bg-accent-secondary/15 text-white' : 'border-white/10 bg-white/[0.02] text-white/55 hover:text-white/75'}`}
                                    >
                                        + Text
                                    </button>
                                </div>

                                <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
                                    {codeTab === 'code' ? (
                                        <pre className="text-[11px] leading-relaxed font-mono text-white/70 overflow-hidden">
{`<template>
  <div id="app">
    <div class="loader-wrapper" v-if="loaderHide: show">
      <div class="loader-index">
        <span>...</span>
      </div>
    </div>
  </div>
</template>`}
                                        </pre>
                                    ) : (
                                        <div className="text-xs leading-relaxed text-white/55">
                                            Dictate your approach, jot down edge cases, then ship the solution. CodeArena keeps everything in one fast loop.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Surface>
                    </div>

                    <div ref={codeRightRef}>
                        <Surface>
                            <div className="p-5 md:p-6">
                                <div className="space-y-6">
                                    {[
                                        { label: 'Error Detection', value: 0.2 },
                                        { label: 'Code Optimization', value: 0.7 },
                                    ].map((s) => (
                                        <div key={s.label}>
                                            <div className="flex items-center justify-between text-xs text-white/60">
                                                <span>{s.label}</span>
                                                <span data-bar-label>{Math.round(s.value * 100)}%</span>
                                            </div>
                                            <div className="mt-2 h-2 rounded-full bg-white/5 overflow-hidden">
                                                <div data-bar className="h-full rounded-full bg-accent-secondary" style={{ width: `${s.value * 100}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Surface>
                    </div>
                </div>
            </div>
            
            {/* Pricing Section */}
            <div id="pricing" className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-20 pt-10">
                <div className="text-center">
                    <div data-reveal className="flex justify-center">
                        <Pill>Pricing & Plans</Pill>
                    </div>
                    <h2 data-reveal className="mt-6 text-3xl md:text-5xl font-semibold tracking-tight text-white/90">
                        Choose Your <span className="text-emerald-400">Battle</span> Tier
                    </h2>
                </div>

                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Surface className="p-8 flex flex-col justify-between group hover:bg-white/[0.04] transition-colors" data-reveal>
                        <div>
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-white/5 border border-white/10"><Users size={16} className="text-white/60"/></div>
                                <div className="text-sm font-medium text-white/80">Rookie Queue</div>
                            </div>
                            <div className="mt-6 flex items-baseline text-4xl font-semibold text-white">
                                Free
                            </div>
                            <p className="mt-2 text-xs text-white/50 leading-relaxed">Perfect for discovering the arena and testing the voice input protocol.</p>
                            <div className="h-px w-full bg-white/10 my-6" />
                            <ul className="space-y-4 text-sm text-white/70">
                                <li className="flex items-center gap-3"><Check size={16} className="text-emerald-400" /> Basic match access</li>
                                <li className="flex items-center gap-3"><Check size={16} className="text-emerald-400" /> 10 Practice sessions</li>
                                <li className="flex items-center gap-3"><Check size={16} className="text-emerald-400" /> Standard voice input</li>
                            </ul>
                        </div>
                        <button type="button" onClick={() => nav('/login?mode=register')} className="mt-10 w-full rounded-xl border border-white/10 bg-white/[0.03] py-3 text-sm font-medium text-white group-hover:bg-white/[0.08] transition-colors">Start Playing</button>
                    </Surface>

                    <Surface className="p-8 flex flex-col justify-between relative overflow-hidden ring-1 ring-accent-secondary/50 shadow-[0_0_30px_rgba(124,58,237,0.15)] group" data-reveal>
                        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-accent-secondary to-transparent" />
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-accent-secondary/20 blur-[50px] rounded-full pointer-events-none" />
                        <div className="relative z-10">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-accent-secondary/20 border border-accent-secondary/30"><Code2 size={16} className="text-accent-secondary"/></div>
                                    <div className="text-sm font-medium text-accent-secondary">Pro Operator</div>
                                </div>
                                <Pill className="text-[10px] py-1 bg-accent-secondary/15 border-accent-secondary/30 text-accent-secondary shadow-[0_0_10px_rgba(124,58,237,0.3)]">Most Popular</Pill>
                            </div>
                            <div className="mt-6 flex items-baseline text-4xl font-semibold text-white">
                                $15<span className="ml-1 text-sm font-medium text-white/40">/ mo</span>
                            </div>
                            <p className="mt-2 text-xs text-white/60 leading-relaxed">For serious engineers who want deep analytics and priority queues.</p>
                            <div className="h-px w-full bg-white/10 my-6" />
                            <ul className="space-y-4 text-sm text-white/90">
                                <li className="flex items-center gap-3"><Check size={16} className="text-accent-secondary" /> Ranked & Unranked Battles</li>
                                <li className="flex items-center gap-3"><Check size={16} className="text-accent-secondary" /> Deep Match Analytics</li>
                                <li className="flex items-center gap-3"><Check size={16} className="text-accent-secondary" /> Prioritized Voice AI Context</li>
                                <li className="flex items-center gap-3"><Check size={16} className="text-accent-secondary" /> Custom Operator Emblems</li>
                            </ul>
                        </div>
                        <button type="button" onClick={() => nav('/login?mode=register')} className="mt-10 w-full rounded-xl bg-accent-secondary py-3 text-sm font-medium text-shadow-sm text-white hover:bg-accent-secondary/90 shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-all hover:scale-[1.02] relative z-10">Unlock Pro</button>
                    </Surface>

                    <Surface className="p-8 flex flex-col justify-between group hover:bg-white/[0.04] transition-colors" data-reveal>
                        <div>
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-white/5 border border-white/10"><Server size={16} className="text-white/60"/></div>
                                <div className="text-sm font-medium text-white/80">Enterprise Sandbox</div>
                            </div>
                            <div className="mt-6 flex items-baseline text-4xl font-semibold text-white">
                                $99<span className="ml-1 text-sm font-medium text-white/40">/ mo</span>
                            </div>
                            <p className="mt-2 text-xs text-white/50 leading-relaxed">Dedicated arenas and custom knowledge integration for large teams.</p>
                            <div className="h-px w-full bg-white/10 my-6" />
                            <ul className="space-y-4 text-sm text-white/70">
                                <li className="flex items-center gap-3"><Check size={16} className="text-white/60" /> Private Enterprise Arenas</li>
                                <li className="flex items-center gap-3"><Check size={16} className="text-white/60" /> Custom Knowledge Base</li>
                                <li className="flex items-center gap-3"><Check size={16} className="text-white/60" /> Dedicated Support Slack</li>
                                <li className="flex items-center gap-3"><Check size={16} className="text-white/60" /> SSO Integrations</li>
                            </ul>
                        </div>
                        <button type="button" onClick={(e) => { e.preventDefault(); document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }); }} className="mt-10 w-full rounded-xl border border-white/10 bg-white/[0.03] py-3 text-sm font-medium text-white group-hover:bg-white/[0.08] transition-colors">Contact Sales</button>
                    </Surface>
                </div>
            </div>


            {/* Updates Section */}
            <div id="updates" className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-20 pt-10">
                <div className="text-center mb-12">
                    <div data-reveal className="flex justify-center">
                        <Pill>Platform Changelog</Pill>
                    </div>
                    <h2 data-reveal className="mt-6 text-3xl md:text-5xl font-semibold tracking-tight text-white/90">
                        Protocol Updates
                    </h2>
                </div>
                <div className="mt-8 space-y-8 max-w-3xl mx-auto" data-reveal>
                            {[
                                { date: 'Oct 24', tag: 'Feature', title: 'CodeArena v2.1 Live', desc: 'Introduced PostgreSQL backing for realtime scoreboard analytics. Enjoy lag-free leaderboard computations.' },
                                { date: 'Oct 12', tag: 'Improvement', title: 'Voice Input Accuracy Boost', desc: 'New NLP tokenizer handles Python indentations and React TSX fragments perfectly out of the box.' },
                                { date: 'Sep 29', tag: 'Event', title: 'Season 1 Tournament Wrap-Up', desc: 'Check out the top 10 operator loadouts and coding strategies that dominated the finals.' }
                            ].map(post => (
                                <div key={post.title} className="group relative flex gap-6 border-l border-white/10 pl-6 hover:border-accent-secondary/70 transition-colors">
                                    <div className="absolute -left-[5px] top-2 h-2.5 w-2.5 rounded-full border border-white/20 bg-black group-hover:border-accent-secondary group-hover:bg-accent-secondary shadow-[0_0_10px_rgba(124,58,237,0)] group-hover:shadow-[0_0_15px_rgba(124,58,237,0.8)] transition-all" />
                                    <div className="w-24 shrink-0 mt-0.5 space-y-1.5">
                                        <div className="text-xs font-medium text-white/50">{post.date}</div>
                                        <div className="text-[9px] py-0.5 px-1.5 inline-block uppercase tracking-wider text-accent-secondary font-semibold bg-accent-secondary/10 rounded-sm">{post.tag}</div>
                                    </div>
                                    <div>
                                        <div className="text-base font-medium text-white/90 cursor-pointer group-hover:text-emerald-400 transition-colors">{post.title}</div>
                                        <div className="mt-2 text-sm leading-relaxed text-white/50">{post.desc}</div>
                                    </div>
                                </div>
                            ))}
                </div>
            </div>

            {/* Blog Section */}
            <div id="blog" className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-20 pt-10">
                <div className="text-center mb-12">
                    <div data-reveal className="flex justify-center">
                        <Pill>Transmission Logs</Pill>
                    </div>
                    <h2 data-reveal className="mt-6 text-3xl md:text-5xl font-semibold tracking-tight text-white/90">
                        Developer Blog
                    </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { tag: 'Engineering', title: 'How we scaled WebSockets to 10k concurrent connections', date: 'Oct 20', color: 'from-accent-secondary/30 to-emerald-500/10' },
                        { tag: 'Community', title: 'Operator Spotlight: Top 5 combat coding strategies', date: 'Oct 15', color: 'from-emerald-500/20 to-sky-500/10' },
                        { tag: 'Tutorial', title: 'Mastering the AST Node Voice Parsing Challenge', date: 'Oct 02', color: 'from-sky-500/20 to-accent-secondary/10' }
                    ].map((post, idx) => (
                        <Surface key={idx} className="p-0 overflow-hidden cursor-pointer group flex flex-col" data-reveal>
                            <div className={`h-40 w-full bg-gradient-to-br ${post.color} group-hover:scale-105 transition-transform duration-700 relative`}>
                                <div className="absolute inset-0 bg-black/20" />
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />
                            </div>
                            <div className="p-6 flex-1 flex flex-col justify-between relative z-10 bg-[#060608]">
                                <div>
                                    <Pill className="!px-2 !py-1 text-[10px] mb-4 border-white/10 bg-white/5 text-white/70">{post.tag}</Pill>
                                    <h3 className="text-lg font-medium text-white/90 mb-3 leading-snug group-hover:text-emerald-400 transition-colors">{post.title}</h3>
                                </div>
                                <div className="flex items-center gap-3 mt-6">
                                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                                        <div className="w-full h-full bg-gradient-to-tr from-accent-secondary to-emerald-400" />
                                    </div>
                                    <div className="text-xs font-medium text-white/40">{post.date} • 5 min read</div>
                                </div>
                            </div>
                        </Surface>
                    ))}
                </div>
            </div>

            {/* Help Section */}
            <div id="help" className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-20 pt-10">
                <div className="text-center mb-12">
                    <div data-reveal className="flex justify-center">
                        <Pill>Documentation & Guides</Pill>
                    </div>
                    <h2 data-reveal className="mt-6 text-3xl md:text-5xl font-semibold tracking-tight text-white/90">
                        Help Center
                    </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                    {[
                        { title: 'Getting Started\nGuide', icon: <Terminal size={24} className="text-emerald-400" /> },
                        { title: 'Protocol API\nDocs', icon: <FileCode size={24} className="text-emerald-400" /> },
                        { title: 'Ranking\nSystem', icon: <Activity size={24} className="text-emerald-400" /> },
                        { title: 'Voice\nCommands', icon: <MessageSquare size={24} className="text-emerald-400" /> }
                    ].map((h, i) => (
                        <Surface key={i} className="p-8 text-center cursor-pointer hover:bg-white/[0.04] transition-colors group" data-reveal>
                            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(52,211,153,0.15)] relative">
                                <div className="absolute inset-0 rounded-full bg-emerald-400/20 blur group-hover:blur-md transition-all" />
                                {h.icon}
                            </div>
                            <div className="text-sm font-medium text-white/80 whitespace-pre-line group-hover:text-emerald-300 transition-colors uppercase tracking-wide">{h.title}</div>
                        </Surface>
                    ))}
                </div>
            </div>

            {/* Contact Section */}
            <div id="contact" className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-20 pt-10">
                <div className="text-center mb-12">
                    <div data-reveal className="flex justify-center">
                        <Pill>Communication Array</Pill>
                    </div>
                    <h2 data-reveal className="mt-6 text-3xl md:text-5xl font-semibold tracking-tight text-white/90">
                        Initialize Contact
                    </h2>
                    <p data-reveal className="mt-4 text-sm text-white/50 max-w-xl mx-auto leading-relaxed">
                        Need technical help, billing support, or want to discuss enterprise arena deployments? Open a direct channel to our engineering team.
                    </p>
                </div>
                <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-6">
                    <Surface className="flex-grow p-8 relative overflow-hidden" data-reveal>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-secondary/10 blur-[80px] pointer-events-none" />
                        <form className="relative z-10 space-y-5" onSubmit={(e) => { e.preventDefault(); (e.target as HTMLFormElement).reset(); alert('Transmission Sent. We will contact you shortly.'); }}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold tracking-wide text-white/60">Operator ID (Email)</label>
                                    <input required type="email" className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white placeholder-white/20 focus:border-white/30 focus:bg-white/[0.04] focus:outline-none transition-colors" placeholder="user@nexus.io" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold tracking-wide text-white/60">Subject</label>
                                    <select className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white/80 focus:border-white/30 focus:bg-white/[0.04] focus:outline-none transition-colors appearance-none outline-none cursor-pointer">
                                        <option className="bg-[#050507]" value="support">Technical Support</option>
                                        <option className="bg-[#050507]" value="billing">Billing Inquiry</option>
                                        <option className="bg-[#050507]" value="enterprise">Enterprise VIP Trial</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold tracking-wide text-white/60">Transmission Log</label>
                                <textarea required rows={4} className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white placeholder-white/20 focus:border-white/30 focus:bg-white/[0.04] focus:outline-none transition-colors resize-none" placeholder="Describe your issue or request securely..."></textarea>
                            </div>
                            <button type="submit" className="w-full rounded-xl bg-gradient-to-r from-accent-secondary to-purple-600 px-4 py-3.5 text-sm font-bold text-white shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] transition-all hover:-translate-y-0.5 mt-2">Route Secure Message</button>
                        </form>
                    </Surface>
                    
                    {/* Support Sidebar */}
                    <div className="w-full md:w-64 shrink-0 flex flex-col gap-6" data-reveal>
                        <Surface className="p-6 flex-1 flex flex-col justify-center items-center text-center group hover:bg-[#5865F2]/5 transition-colors cursor-pointer border-transparent hover:border-[#5865F2]/30">
                            <div className="w-12 h-12 rounded-full bg-[#5865F2]/20 flex items-center justify-center mb-4 text-[#5865F2] group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(88,101,242,0.4)] transition-all">
                                <MessageSquare size={20} />
                            </div>
                            <div className="text-sm font-semibold text-white/90">Community Discord</div>
                            <div className="text-[11px] leading-relaxed text-white/50 mt-2">Join 5,000+ engineers discussing CodeArena & queuing daily.</div>
                        </Surface>
                        
                        <Surface className="p-6 flex-1 flex flex-col justify-center items-center text-center group hover:bg-emerald-500/5 transition-colors cursor-pointer border-transparent hover:border-emerald-500/30">
                            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4 text-emerald-400 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(52,211,153,0.4)] transition-all">
                                <BookOpen size={20} />
                            </div>
                            <div className="text-sm font-semibold text-white/90">Knowledge Base</div>
                            <div className="text-[11px] leading-relaxed text-white/50 mt-2">Browse the self-serve protocol logs and API architecture docs.</div>
                        </Surface>
                    </div>
                </div>
            </div>

            {/* FAQ */}
            <div id="faq" className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-8">
                <div className="mx-auto max-w-3xl text-center">
                    <div className="flex justify-center" data-reveal>
                        <Pill>Frequently Asked Questions</Pill>
                    </div>
                    <h2 data-reveal className="mt-6 text-3xl md:text-5xl font-semibold tracking-tight text-white/90">
                        Frequently Asked Questions
                    </h2>
                </div>

                <div className="mx-auto mt-10 max-w-3xl space-y-3">
                    {FAQ.map((item, idx) => (
                        <div key={item.q} data-reveal>
                            <FaqRow
                                item={item}
                                open={faqOpen === idx}
                                onToggle={() => setFaqOpen((v) => (v === idx ? -1 : idx))}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <footer className="relative z-10 border-t border-white/10 bg-black/20">
                <div className="mx-auto w-full max-w-6xl px-6 py-10">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-10">
                        <div className="max-w-sm">
                            <div className="flex items-center gap-3">
                                <Logo isLight={false} />
                                <div>
                                    <div className="text-sm font-medium tracking-tight">CodeArena</div>
                                    <div className="text-xs text-white/45 leading-relaxed mt-1">
                                        Dive into the future of competitive coding battles with voice, realtime notes, and live scoring.
                                    </div>
                                </div>
                            </div>
                            <div className="mt-5 flex items-center gap-3 text-white/55">
                                <button className="h-10 w-10 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-colors flex items-center justify-center" type="button" aria-label="GitHub">
                                    <Github className="h-5 w-5" />
                                </button>
                                <button className="h-10 w-10 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-colors flex items-center justify-center" type="button" aria-label="X">
                                    <X className="h-5 w-5" />
                                </button>
                                <button
                                    type="button"
                                    className="ml-2 h-10 rounded-xl border border-white/10 bg-accent-secondary/20 px-4 text-xs font-medium text-white hover:bg-accent-secondary/30 transition-colors"
                                >
                                    Github
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-10 text-xs">
                            <div className="space-y-3">
                                <div className="text-[11px] font-medium text-white/70">Home</div>
                                <a href="#top" className="block text-white/45 hover:text-white/75 transition-colors">Code</a>
                                <a href="#features" className="block text-white/45 hover:text-white/75 transition-colors">Features</a>
                                <a href="#benefits" className="block text-white/45 hover:text-white/75 transition-colors">Benefits</a>
                                <a href="#pricing" className="block text-white/45 hover:text-white/75 transition-colors">Pricing</a>
                            </div>
                            <div className="space-y-3">
                                <div className="text-[11px] font-medium text-white/70">Company</div>
                                <a href="#faq" className="block text-white/45 hover:text-white/75 transition-colors">FAQ</a>
                                <a href="#top" className="block text-white/45 hover:text-white/75 transition-colors">About us</a>
                                <a href="#top" className="block text-white/45 hover:text-white/75 transition-colors">Careers</a>
                                <a href="#top" className="block text-white/45 hover:text-white/75 transition-colors">Blog</a>
                            </div>
                            <div className="space-y-3">
                                <div className="text-[11px] font-medium text-white/70">Products</div>
                                <button type="button" onClick={() => nav('/login?mode=register')} className="block text-left text-white/45 hover:text-white/75 transition-colors">API</button>
                                <button type="button" onClick={() => nav('/login?mode=register')} className="block text-left text-white/45 hover:text-white/75 transition-colors">Training</button>
                                <button type="button" onClick={() => nav('/battle')} className="block text-left text-white/45 hover:text-white/75 transition-colors">Arena</button>
                                <button type="button" onClick={() => nav('/battle')} className="block text-left text-white/45 hover:text-white/75 transition-colors">Codespace</button>
                            </div>
                            <div className="space-y-3">
                                <div className="text-[11px] font-medium text-white/70">Resources</div>
                                <a href="#top" className="block text-white/45 hover:text-white/75 transition-colors">Issues</a>
                                <a href="#top" className="block text-white/45 hover:text-white/75 transition-colors">Discussions</a>
                                <a href="#top" className="block text-white/45 hover:text-white/75 transition-colors">Privacy</a>
                                <a href="#top" className="block text-white/45 hover:text-white/75 transition-colors">Security</a>
                            </div>
                        </div>
                    </div>

                    <div className="mt-10 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-[11px] text-white/35">
                        <div>© {new Date().getFullYear()} All rights reserved — CodeArena</div>
                        <div className="text-white/25">Built for battles.</div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

