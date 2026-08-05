import React, { useState, useEffect } from 'react';
import './SettingsView.css';
import { 
    Monitor, Volume2, Code, ShieldCheck, 
    Bell, Zap, Layout, Lock, User, 
    Save, CheckCircle2, ChevronRight,
    Search, Cpu, Play, Moon, Sun, 
    Settings, Eye, Activity, Globe,
    MousePointer2, Terminal
} from 'lucide-react';
import { useLayout } from '../contexts/LayoutContext';
import { useAuthStore } from '../store/useAuthStore';
import api from '../lib/api';

interface SettingsSection {
    id: string;
    title: string;
    icon: React.ElementType;
    description: string;
}

const SECTIONS: SettingsSection[] = [
    { id: 'visual', title: 'Visual Interface', icon: Monitor, description: 'Neural display calibration & UI protocol' },
    { id: 'audio', title: 'Neural Audio', icon: Volume2, description: 'Sonic immersion & tactical feedback' },
    { id: 'editor', title: 'Code Editor', icon: Code, description: 'IDE synchronization & syntax uplink' },
    { id: 'arena', title: 'Arena Protocol', icon: Zap, description: 'Combat parameters & match logic' },
    { id: 'notifications', title: 'Notifications', icon: Bell, description: 'Intelligence feed & priority alerts' },
    { id: 'performance', title: 'Performance', icon: Activity, description: 'Hardware allocation & render speed' },
    { id: 'keybindings', title: 'Keybindings', icon: Terminal, description: 'Manual override & tactical macros' },
    { id: 'privacy', title: 'Privacy & Security', icon: Lock, description: 'Data encryption & visibility filters' },
    { id: 'account', title: 'Account Dossier', icon: User, description: 'Operator profile & linked systems' },
];

const getStored = (key: string, defaults: any) => {
    const val = localStorage.getItem(key);
    if (!val) return defaults;
    try {
        return JSON.parse(val);
    } catch {
        return defaults;
    }
};

export const SettingsView: React.FC = () => {
    const { isLight, setTheme } = useLayout();
    const { user, updateStats } = useAuthStore();
    const [activeSection, setActiveSection] = useState('visual');
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    // States for each section
    const [visual, setVisual] = useState(() => getStored('arena_settings_visual', { scanlines: true, particles: true, compactHud: false }));
    const [audio, setAudio] = useState(() => getStored('arena_settings_audio', { masterVolume: 80, sfxVolume: 70, ambientHum: 30, profile: 'cyberpunk' }));
    const [editor, setEditor] = useState(() => getStored('arena_settings_editor', { typeface: 'jetbrains', fontSize: 14, keymap: 'vscode', tabSize: 4, lineNumbers: true }));
    const [arena, setArena] = useState(() => getStored('arena_settings_arena', { autoAccept: false, countdown: 5, showOpponentElo: true, liveSpec: true, autoSubmit: true }));
    const [notifications, setNotifications] = useState(() => getStored('arena_settings_notifications', { emailAlerts: true, soundAlerts: true, desktopPush: false, systemNews: true }));
    const [performance, setPerformance] = useState(() => getStored('arena_settings_performance', { hardwareAcceleration: true, frameLimit: 60, renderQuality: 'high' }));
    const [keybindings, setKeybindings] = useState(() => getStored('arena_settings_keybindings', { submitHotkey: 'Ctrl+Enter', runHotkey: 'Ctrl+R', clearHotkey: 'Ctrl+L', voiceHotkey: 'Ctrl+Shift+V' }));
    const [privacy, setPrivacy] = useState(() => getStored('arena_settings_privacy', { publicProfile: true, showMatchHistory: true, encryptData: false, incognitoMode: false }));

    // Account state
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');

    useEffect(() => {
        if (user) {
            setUsername(user.username || '');
            setEmail(user.email || '');
            setAvatarUrl(user.avatarUrl || '');
        }
    }, [user]);

    const handleSave = async () => {
        try {
            // Write configs to localStorage
            localStorage.setItem('arena_settings_visual', JSON.stringify(visual));
            localStorage.setItem('arena_settings_audio', JSON.stringify(audio));
            localStorage.setItem('arena_settings_editor', JSON.stringify(editor));
            localStorage.setItem('arena_settings_arena', JSON.stringify(arena));
            localStorage.setItem('arena_settings_notifications', JSON.stringify(notifications));
            localStorage.setItem('arena_settings_performance', JSON.stringify(performance));
            localStorage.setItem('arena_settings_keybindings', JSON.stringify(keybindings));
            localStorage.setItem('arena_settings_privacy', JSON.stringify(privacy));

            // Sync user profile with api if user is logged in
            if (user?.id) {
                const patchData: any = {};
                if (username !== user.username) patchData.username = username;
                if (email !== user.email) patchData.email = email;
                if (avatarUrl !== user.avatarUrl) patchData.avatarUrl = avatarUrl;

                if (Object.keys(patchData).length > 0) {
                    const res = await api.patch(`/users/${user.id}`, patchData);
                    updateStats(res.data);
                }
            }

            setIsSaved(true);
            setHasUnsavedChanges(false);
            setTimeout(() => setIsSaved(false), 2000);
        } catch (err: any) {
            console.error('Failed to save settings', err);
            alert(err?.response?.data?.message || err.message || 'Failed to save changes.');
        }
    };

    return (
        <div className={`settings-container ${isLight ? 'light' : ''}`}>
            <div className="max-w-7xl mx-auto w-full h-full relative flex flex-col">
                <div className="settings-layout">
                    {/* Sidebar Navigation */}
                    <aside className="settings-sidebar">
                        <div className="sidebar-header">
                            <span className="terminal-tag">VER 2.0 // CORE_CFG</span>
                            <h2 className="sidebar-title">SYSTEM PREFS</h2>
                        </div>
                        <nav className="sidebar-nav">
                            {SECTIONS.map((section) => (
                                <button
                                    key={section.id}
                                    className={`nav-item ${activeSection === section.id ? 'active' : ''}`}
                                    onClick={() => setActiveSection(section.id)}
                                >
                                    <section.icon size={18} />
                                    <span className="nav-label">{section.title}</span>
                                    {hasUnsavedChanges && <div className="unsaved-dot" />}
                                </button>
                            ))}
                        </nav>
                    </aside>

                    {/* Main Content Area */}
                    <main className="settings-content">
                        <header className="content-header">
                            <div className="header-icon">
                                {React.createElement(SECTIONS.find(s => s.id === activeSection)?.icon || Settings, { size: 24 })}
                            </div>
                            <div>
                                <h1 className="header-title">{SECTIONS.find(s => s.id === activeSection)?.title}</h1>
                                <p className="header-desc">{SECTIONS.find(s => s.id === activeSection)?.description}</p>
                            </div>
                        </header>

                        <div className="section-body">
                            {activeSection === 'visual' && (
                                <div className="settings-grid">
                                    <div className="setting-card">
                                        <h3 className="card-title">HUD Elements</h3>
                                        <div className="control-row">
                                            <span className="control-label">SCANLINES OVERLAY</span>
                                            <label className="hud-switch">
                                                <input 
                                                    type="checkbox" 
                                                    checked={visual.scanlines} 
                                                    onChange={(e) => {
                                                        setVisual({ ...visual, scanlines: e.target.checked });
                                                        setHasUnsavedChanges(true);
                                                    }} 
                                                />
                                                <span className="slider" />
                                            </label>
                                        </div>
                                        <div className="control-row">
                                            <span className="control-label">PARTICLE EFFECTS</span>
                                            <label className="hud-switch">
                                                <input 
                                                    type="checkbox" 
                                                    checked={visual.particles} 
                                                    onChange={(e) => {
                                                        setVisual({ ...visual, particles: e.target.checked });
                                                        setHasUnsavedChanges(true);
                                                    }} 
                                                />
                                                <span className="slider" />
                                            </label>
                                        </div>
                                        <div className="control-row">
                                            <span className="control-label">COMPACT HUD</span>
                                            <label className="hud-switch">
                                                <input 
                                                    type="checkbox" 
                                                    checked={visual.compactHud} 
                                                    onChange={(e) => {
                                                        setVisual({ ...visual, compactHud: e.target.checked });
                                                        setHasUnsavedChanges(true);
                                                    }} 
                                                />
                                                <span className="slider" />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeSection === 'audio' && (
                                <div className="settings-grid">
                                    <div className="setting-card">
                                        <h3 className="card-title">Volume Matrices</h3>
                                        <div className="control-group">
                                            <label className="control-label">MASTER OUTPUT ({audio.masterVolume}%)</label>
                                            <input 
                                                type="range" 
                                                className="hud-range" 
                                                min="0" 
                                                max="100" 
                                                value={audio.masterVolume}
                                                onChange={(e) => {
                                                    setAudio({ ...audio, masterVolume: Number(e.target.value) });
                                                    setHasUnsavedChanges(true);
                                                }}
                                            />
                                        </div>
                                        <div className="control-group">
                                            <label className="control-label">SFX FEEDBACK ({audio.sfxVolume}%)</label>
                                            <input 
                                                type="range" 
                                                className="hud-range" 
                                                min="0" 
                                                max="100" 
                                                value={audio.sfxVolume}
                                                onChange={(e) => {
                                                    setAudio({ ...audio, sfxVolume: Number(e.target.value) });
                                                    setHasUnsavedChanges(true);
                                                }}
                                            />
                                        </div>
                                        <div className="control-group">
                                            <label className="control-label">AMBIENT HUM ({audio.ambientHum}%)</label>
                                            <input 
                                                type="range" 
                                                className="hud-range" 
                                                min="0" 
                                                max="100" 
                                                value={audio.ambientHum}
                                                onChange={(e) => {
                                                    setAudio({ ...audio, ambientHum: Number(e.target.value) });
                                                    setHasUnsavedChanges(true);
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="setting-card">
                                        <h3 className="card-title">Acoustic Profiles</h3>
                                        <select 
                                            className="hud-select" 
                                            value={audio.profile}
                                            onChange={(e) => {
                                                setAudio({ ...audio, profile: e.target.value });
                                                setHasUnsavedChanges(true);
                                            }}
                                        >
                                            <option value="cyberpunk">CYBERPUNK // DEFAULT</option>
                                            <option value="minimal">MINIMAL // ANALOG</option>
                                            <option value="silent">SILENT // STEALTH</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {activeSection === 'editor' && (
                                <div className="settings-grid">
                                    <div className="setting-card full-width">
                                        <h3 className="card-title">IDE Parameters</h3>
                                        <div className="control-row-grid">
                                            <div className="control-group">
                                                <label className="control-label">TYPEFACE</label>
                                                <select 
                                                    className="hud-select" 
                                                    value={editor.typeface}
                                                    onChange={(e) => {
                                                        setEditor({ ...editor, typeface: e.target.value });
                                                        setHasUnsavedChanges(true);
                                                    }}
                                                >
                                                    <option value="inter">INTER</option>
                                                    <option value="jetbrains">JETBRAINS MONO</option>
                                                    <option value="fira">FIRA CODE</option>
                                                </select>
                                            </div>
                                            <div className="control-group">
                                                <label className="control-label">FONT SIZE ({editor.fontSize}px)</label>
                                                <input 
                                                    type="range" 
                                                    className="hud-range" 
                                                    min="12" 
                                                    max="24" 
                                                    value={editor.fontSize}
                                                    onChange={(e) => {
                                                        setEditor({ ...editor, fontSize: Number(e.target.value) });
                                                        setHasUnsavedChanges(true);
                                                    }}
                                                />
                                            </div>
                                            <div className="control-group">
                                                <label className="control-label">KEYBINDING MAP</label>
                                                <select 
                                                    className="hud-select" 
                                                    value={editor.keymap}
                                                    onChange={(e) => {
                                                        setEditor({ ...editor, keymap: e.target.value });
                                                        setHasUnsavedChanges(true);
                                                    }}
                                                >
                                                    <option value="vscode">VS CODE</option>
                                                    <option value="vim">VIM</option>
                                                    <option value="emacs">EMACS</option>
                                                </select>
                                            </div>
                                            <div className="control-group">
                                                <label className="control-label">TAB SIZE</label>
                                                <select 
                                                    className="hud-select" 
                                                    value={editor.tabSize}
                                                    onChange={(e) => {
                                                        setEditor({ ...editor, tabSize: Number(e.target.value) });
                                                        setHasUnsavedChanges(true);
                                                    }}
                                                >
                                                    <option value="2">2 SPACES</option>
                                                    <option value="4">4 SPACES</option>
                                                </select>
                                            </div>
                                            <div className="control-row">
                                                <span className="control-label">LINE NUMBERS</span>
                                                <label className="hud-switch">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={editor.lineNumbers} 
                                                        onChange={(e) => {
                                                            setEditor({ ...editor, lineNumbers: e.target.checked });
                                                            setHasUnsavedChanges(true);
                                                        }} 
                                                    />
                                                    <span className="slider" />
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeSection === 'arena' && (
                                <div className="settings-grid">
                                    <div className="setting-card">
                                        <h3 className="card-title">Combat Logic</h3>
                                        <div className="control-row">
                                            <span className="control-label">AUTO-ACCEPT MATCHMAKING</span>
                                            <label className="hud-switch">
                                                <input 
                                                    type="checkbox" 
                                                    checked={arena.autoAccept} 
                                                    onChange={(e) => {
                                                        setArena({ ...arena, autoAccept: e.target.checked });
                                                        setHasUnsavedChanges(true);
                                                    }} 
                                                />
                                                <span className="slider" />
                                            </label>
                                        </div>
                                        <div className="control-row">
                                            <span className="control-label">SHOW OPPONENT ELO RATING</span>
                                            <label className="hud-switch">
                                                <input 
                                                    type="checkbox" 
                                                    checked={arena.showOpponentElo} 
                                                    onChange={(e) => {
                                                        setArena({ ...arena, showOpponentElo: e.target.checked });
                                                        setHasUnsavedChanges(true);
                                                    }} 
                                                />
                                                <span className="slider" />
                                            </label>
                                        </div>
                                        <div className="control-row">
                                            <span className="control-label">ALLOW SPECTATORS</span>
                                            <label className="hud-switch">
                                                <input 
                                                    type="checkbox" 
                                                    checked={arena.liveSpec} 
                                                    onChange={(e) => {
                                                        setArena({ ...arena, liveSpec: e.target.checked });
                                                        setHasUnsavedChanges(true);
                                                    }} 
                                                />
                                                <span className="slider" />
                                            </label>
                                        </div>
                                        <div className="control-row">
                                            <span className="control-label">AUTO-SUBMIT CODE ON TIMEOUT</span>
                                            <label className="hud-switch">
                                                <input 
                                                    type="checkbox" 
                                                    checked={arena.autoSubmit} 
                                                    onChange={(e) => {
                                                        setArena({ ...arena, autoSubmit: e.target.checked });
                                                        setHasUnsavedChanges(true);
                                                    }} 
                                                />
                                                <span className="slider" />
                                            </label>
                                        </div>
                                    </div>
                                    <div className="setting-card">
                                        <h3 className="card-title">Match parameters</h3>
                                        <div className="control-group">
                                            <label className="control-label">COUNTDOWN DURATION</label>
                                            <select 
                                                className="hud-select" 
                                                value={arena.countdown}
                                                onChange={(e) => {
                                                    setArena({ ...arena, countdown: Number(e.target.value) });
                                                    setHasUnsavedChanges(true);
                                                }}
                                            >
                                                <option value="3">3 SECONDS</option>
                                                <option value="5">5 SECONDS</option>
                                                <option value="10">10 SECONDS</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeSection === 'notifications' && (
                                <div className="settings-grid">
                                    <div className="setting-card">
                                        <h3 className="card-title">Priority Alert Feeds</h3>
                                        <div className="control-row">
                                            <span className="control-label">EMAIL ALERTS</span>
                                            <label className="hud-switch">
                                                <input 
                                                    type="checkbox" 
                                                    checked={notifications.emailAlerts} 
                                                    onChange={(e) => {
                                                        setNotifications({ ...notifications, emailAlerts: e.target.checked });
                                                        setHasUnsavedChanges(true);
                                                    }} 
                                                />
                                                <span className="slider" />
                                            </label>
                                        </div>
                                        <div className="control-row">
                                            <span className="control-label">TACTICAL AUDIO FEEDBACK</span>
                                            <label className="hud-switch">
                                                <input 
                                                    type="checkbox" 
                                                    checked={notifications.soundAlerts} 
                                                    onChange={(e) => {
                                                        setNotifications({ ...notifications, soundAlerts: e.target.checked });
                                                        setHasUnsavedChanges(true);
                                                    }} 
                                                />
                                                <span className="slider" />
                                            </label>
                                        </div>
                                        <div className="control-row">
                                            <span className="control-label">DESKTOP PUSH ALERTS</span>
                                            <label className="hud-switch">
                                                <input 
                                                    type="checkbox" 
                                                    checked={notifications.desktopPush} 
                                                    onChange={(e) => {
                                                        setNotifications({ ...notifications, desktopPush: e.target.checked });
                                                        setHasUnsavedChanges(true);
                                                    }} 
                                                />
                                                <span className="slider" />
                                            </label>
                                        </div>
                                        <div className="control-row">
                                            <span className="control-label">SYSTEM UPLINK NEWS</span>
                                            <label className="hud-switch">
                                                <input 
                                                    type="checkbox" 
                                                    checked={notifications.systemNews} 
                                                    onChange={(e) => {
                                                        setNotifications({ ...notifications, systemNews: e.target.checked });
                                                        setHasUnsavedChanges(true);
                                                    }} 
                                                />
                                                <span className="slider" />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeSection === 'performance' && (
                                <div className="settings-grid">
                                    <div className="setting-card">
                                        <h3 className="card-title">Hardware Allocation</h3>
                                        <div className="control-row">
                                            <span className="control-label">HARDWARE ACCELERATION</span>
                                            <label className="hud-switch">
                                                <input 
                                                    type="checkbox" 
                                                    checked={performance.hardwareAcceleration} 
                                                    onChange={(e) => {
                                                        setPerformance({ ...performance, hardwareAcceleration: e.target.checked });
                                                        setHasUnsavedChanges(true);
                                                    }} 
                                                />
                                                <span className="slider" />
                                            </label>
                                        </div>
                                        <div className="control-group mt-4">
                                            <label className="control-label">FRAME RATE LIMIT ({performance.frameLimit} FPS)</label>
                                            <input 
                                                type="range" 
                                                className="hud-range" 
                                                min="30" 
                                                max="144" 
                                                step="30"
                                                value={performance.frameLimit}
                                                onChange={(e) => {
                                                    setPerformance({ ...performance, frameLimit: Number(e.target.value) });
                                                    setHasUnsavedChanges(true);
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="setting-card">
                                        <h3 className="card-title">Render Profiles</h3>
                                        <select 
                                            className="hud-select" 
                                            value={performance.renderQuality}
                                            onChange={(e) => {
                                                setPerformance({ ...performance, renderQuality: e.target.value });
                                                setHasUnsavedChanges(true);
                                            }}
                                        >
                                            <option value="high">ULTRA HIGH RESOLUTION</option>
                                            <option value="medium">STANDARD OPTIMIZED</option>
                                            <option value="low">LOW POWER DRAFT</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {activeSection === 'keybindings' && (
                                <div className="settings-grid">
                                    <div className="setting-card full-width">
                                        <h3 className="card-title">Override & Macro Mappings</h3>
                                        <div className="control-row-grid grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="control-group">
                                                <label className="control-label">SUBMIT CODE COMMAND</label>
                                                <input 
                                                    type="text" 
                                                    className="hud-input" 
                                                    value={keybindings.submitHotkey}
                                                    onChange={(e) => {
                                                        setKeybindings({ ...keybindings, submitHotkey: e.target.value });
                                                        setHasUnsavedChanges(true);
                                                    }}
                                                />
                                            </div>
                                            <div className="control-group">
                                                <label className="control-label">RUN SOLUTION COMMAND</label>
                                                <input 
                                                    type="text" 
                                                    className="hud-input" 
                                                    value={keybindings.runHotkey}
                                                    onChange={(e) => {
                                                        setKeybindings({ ...keybindings, runHotkey: e.target.value });
                                                        setHasUnsavedChanges(true);
                                                    }}
                                                />
                                            </div>
                                            <div className="control-group">
                                                <label className="control-label">CLEAR CONSOLE TERMINAL</label>
                                                <input 
                                                    type="text" 
                                                    className="hud-input" 
                                                    value={keybindings.clearHotkey}
                                                    onChange={(e) => {
                                                        setKeybindings({ ...keybindings, clearHotkey: e.target.value });
                                                        setHasUnsavedChanges(true);
                                                    }}
                                                />
                                            </div>
                                            <div className="control-group">
                                                <label className="control-label">ACTIVATE VOICE INTEGRATION</label>
                                                <input 
                                                    type="text" 
                                                    className="hud-input" 
                                                    value={keybindings.voiceHotkey}
                                                    onChange={(e) => {
                                                        setKeybindings({ ...keybindings, voiceHotkey: e.target.value });
                                                        setHasUnsavedChanges(true);
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeSection === 'privacy' && (
                                <div className="settings-grid">
                                    <div className="setting-card">
                                        <h3 className="card-title">Intelligence Protection</h3>
                                        <div className="control-row">
                                            <span className="control-label">PUBLIC PROFILE VISIBILITY</span>
                                            <label className="hud-switch">
                                                <input 
                                                    type="checkbox" 
                                                    checked={privacy.publicProfile} 
                                                    onChange={(e) => {
                                                        setPrivacy({ ...privacy, publicProfile: e.target.checked });
                                                        setHasUnsavedChanges(true);
                                                    }} 
                                                />
                                                <span className="slider" />
                                            </label>
                                        </div>
                                        <div className="control-row">
                                            <span className="control-label">SHOW MATCH RECORD HISTORY</span>
                                            <label className="hud-switch">
                                                <input 
                                                    type="checkbox" 
                                                    checked={privacy.showMatchHistory} 
                                                    onChange={(e) => {
                                                        setPrivacy({ ...privacy, showMatchHistory: e.target.checked });
                                                        setHasUnsavedChanges(true);
                                                    }} 
                                                />
                                                <span className="slider" />
                                            </label>
                                        </div>
                                        <div className="control-row">
                                            <span className="control-label">FORCE METRIC ENCRYPTION</span>
                                            <label className="hud-switch">
                                                <input 
                                                    type="checkbox" 
                                                    checked={privacy.encryptData} 
                                                    onChange={(e) => {
                                                        setPrivacy({ ...privacy, encryptData: e.target.checked });
                                                        setHasUnsavedChanges(true);
                                                    }} 
                                                />
                                                <span className="slider" />
                                            </label>
                                        </div>
                                        <div className="control-row">
                                            <span className="control-label">INCOGNITO COMBAT MODE</span>
                                            <label className="hud-switch">
                                                <input 
                                                    type="checkbox" 
                                                    checked={privacy.incognitoMode} 
                                                    onChange={(e) => {
                                                        setPrivacy({ ...privacy, incognitoMode: e.target.checked });
                                                        setHasUnsavedChanges(true);
                                                    }} 
                                                />
                                                <span className="slider" />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeSection === 'account' && (
                                <div className="settings-grid">
                                    <div className="setting-card full-width">
                                        <h3 className="card-title">Operator Dossier</h3>
                                        <div className="space-y-8">
                                            <div className="flex flex-col md:flex-row gap-8 items-center">
                                                <div className="w-32 h-32 rounded-3xl bg-accent-secondary/10 border-2 border-accent-secondary/30 flex items-center justify-center text-accent-secondary text-4xl font-black">
                                                    {username?.[0]?.toUpperCase() || 'O'}
                                                </div>
                                                <div className="flex-1 space-y-4 w-full">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="control-group">
                                                            <label className="control-label">OPERATOR ALIAS</label>
                                                            <input 
                                                                type="text" 
                                                                className="hud-input" 
                                                                value={username} 
                                                                onChange={(e) => {
                                                                    setUsername(e.target.value);
                                                                    setHasUnsavedChanges(true);
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="control-group">
                                                            <label className="control-label">UPLINK ADDRESS</label>
                                                            <input 
                                                                type="email" 
                                                                className="hud-input" 
                                                                value={email} 
                                                                onChange={(e) => {
                                                                    setEmail(e.target.value);
                                                                    setHasUnsavedChanges(true);
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="control-group">
                                                        <label className="control-label">AVATAR URL</label>
                                                        <input 
                                                            type="text" 
                                                            className="hud-input" 
                                                            placeholder="https://example.com/avatar.png"
                                                            value={avatarUrl}
                                                            onChange={(e) => {
                                                                    setAvatarUrl(e.target.value);
                                                                    setHasUnsavedChanges(true);
                                                                }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <footer className="settings-footer">
                            <button 
                                className={`save-btn ${isSaved ? 'saved' : ''}`}
                                onClick={handleSave}
                            >
                                {isSaved ? (
                                    <>
                                        <CheckCircle2 size={16} />
                                        <span>✓ CHANGES_SYNCED</span>
                                    </>
                                ) : (
                                    <>
                                        <Save size={16} />
                                        <span>SAVE_CHANGES</span>
                                    </>
                                )}
                            </button>
                        </footer>
                    </main>
                </div>
            </div>
        </div>
    );
};
