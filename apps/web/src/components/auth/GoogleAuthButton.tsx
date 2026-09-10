import React, { useEffect, useRef, useState } from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (config: any) => void;
                    renderButton: (parent: HTMLElement, options: any) => void;
                    prompt: (notification?: any) => void;
                };
            };
        };
    }
}

interface GoogleAuthButtonProps {
    onSuccess: (credential: string) => void;
    onError?: (error: string) => void;
    disabled?: boolean;
}

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
    onSuccess,
    onError,
    disabled = false,
}) => {
    const buttonRef = useRef<HTMLDivElement>(null);
    const [scriptLoaded, setScriptLoaded] = useState(false);
    const [configWarning, setConfigWarning] = useState<string | null>(null);

    const rawClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
    const clientId = rawClientId.trim().replace(/^["']|["']$/g, '').trim();

    useEffect(() => {
        if (!clientId) {
            setConfigWarning('VITE_GOOGLE_CLIENT_ID is not configured in apps/web/.env');
            return;
        }

        // Check if script is already present
        const existingScript = document.getElementById('google-gsi-client');
        if (existingScript) {
            setScriptLoaded(true);
            return;
        }

        const script = document.createElement('script');
        script.id = 'google-gsi-client';
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => setScriptLoaded(true);
        script.onerror = () => {
            onError?.('Failed to load Google Identity Services SDK. Check your internet connection or ad-blocker.');
        };

        document.body.appendChild(script);

        return () => {
            // Keep script cached in DOM
        };
    }, [clientId, onError]);

    useEffect(() => {
        if (!scriptLoaded || !clientId || !buttonRef.current || !window.google?.accounts?.id) {
            return;
        }

        try {
            window.google.accounts.id.initialize({
                client_id: clientId,
                callback: (response: { credential?: string }) => {
                    if (response.credential) {
                        onSuccess(response.credential);
                    } else {
                        onError?.('No credential token received from Google authentication');
                    }
                },
                error_callback: (err: any) => {
                    console.error('[Google Identity Services Error]:', err);
                    if (err?.type === 'popup_closed_by_user') {
                        return;
                    }
                    const currentOrigin = window.location.origin;
                    let msg = `Google Auth Error: ${err?.type || 'Bad Request'}`;
                    if (err?.type === 'origin_mismatch' || err?.type === 'invalid_request') {
                        msg = `Google 400 Bad Request: Authorized JavaScript Origin mismatch. In Google Cloud Console, add "${currentOrigin}" and "http://localhost" to Authorized JavaScript origins.`;
                    } else if (err?.message) {
                        msg = `Google Auth: ${err.message}`;
                    }
                    onError?.(msg);
                },
                auto_select: false,
                cancel_on_tap_outside: true,
                ux_mode: 'popup',
            });

            const parentWidth = buttonRef.current?.clientWidth || 384;
            const targetWidth = Math.min(400, Math.max(280, Math.floor(parentWidth)));

            window.google.accounts.id.renderButton(buttonRef.current, {
                type: 'standard',
                theme: 'filled_black',
                size: 'large',
                text: 'continue_with',
                shape: 'rectangular',
                logo_alignment: 'left',
                width: targetWidth,
            });
        } catch (err: any) {
            console.error('Error initializing Google Sign-In:', err);
            onError?.(err?.message || 'Failed to initialize Google Sign-In');
        }
    }, [scriptLoaded, clientId, onSuccess, onError]);

    const handleMissingConfigClick = () => {
        const msg = 'Google Sign-In requires VITE_GOOGLE_CLIENT_ID to be set in apps/web/.env. Please configure your Google OAuth Client ID.';
        if (onError) {
            onError(msg);
        } else {
            alert(msg);
        }
    };

    return (
        <div className="w-full flex flex-col items-center">
            {/* If Client ID is configured and script is ready, show the official GIS button without clumsy outer border */}
            {clientId && clientId.trim() !== '' ? (
                <div className={`w-full flex items-center justify-center transition-all duration-200 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div ref={buttonRef} className="w-full flex justify-center [&>div]:!w-full [&_iframe]:!w-full [&_iframe]:!rounded-xl overflow-hidden" />
                    {!scriptLoaded && (
                        <div className="h-10 flex items-center justify-center gap-2 text-xs text-white/40">
                            <RefreshCw size={13} className="animate-spin text-accent-secondary" />
                            <span>Connecting to Google...</span>
                        </div>
                    )}
                </div>
            ) : (
                /* Fallback stylized cyber button when Client ID is not yet provided */
                <button
                    type="button"
                    onClick={handleMissingConfigClick}
                    disabled={disabled}
                    className="w-full h-11 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/90 text-sm font-medium flex items-center justify-center gap-3 hover:-translate-y-0.5 active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed group"
                >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span>Continue with Google</span>
                </button>
            )}

            {configWarning && !clientId && (
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-400/70">
                    <ShieldAlert size={12} className="shrink-0 text-amber-400" />
                    <span>Setup required: Set VITE_GOOGLE_CLIENT_ID in apps/web/.env</span>
                </div>
            )}
        </div>
    );
};
