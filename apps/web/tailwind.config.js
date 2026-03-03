/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // existing custom tokens
                bg: {
                    primary: '#050507',
                    secondary: '#0d0d12',
                    surface: '#12121a',
                },
                border: {
                    subtle: 'rgba(255, 255, 255, 0.05)',
                    bright: 'rgba(0, 240, 255, 0.3)',
                },
                text: {
                    primary: '#ffffff',
                    secondary: '#a1a1aa',
                    muted: '#71717a',
                },
                // shadcn/ui CSS variable tokens
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))',
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))',
                },
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))',
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))',
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))',
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))',
                    primary: '#00f0ff',
                    secondary: '#7c3aed',
                    glow: 'rgba(0, 240, 255, 0.15)',
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))',
                },
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            backgroundImage: {
                'gradient-main': 'radial-gradient(circle at 20% 20%, rgba(0,240,255,0.08), transparent 40%), radial-gradient(circle at 80% 80%, rgba(124,58,237,0.08), transparent 40%)',
            }
        },
    },
    plugins: [],
}

