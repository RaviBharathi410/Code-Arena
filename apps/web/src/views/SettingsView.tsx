import React, { useState, useEffect } from 'react';
import './SettingsView.css';
import { 
    Monitor, Code, 
    Bell, Zap, Terminal, User, 
    Save, CheckCircle2, ChevronRight,
    Moon, Sun, Settings, Sparkles, Check
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
    { id: 'visual', title: 'Visual Interface', icon: Monitor, description: 'Display calibration, theme mode & UI protocol' },
    { id: 'editor', title: 'Code Editor', icon: Code, description: 'IDE synchronization, font metrics & syntax uplink' },
    { id: 'arena', title: 'Arena Protocol', icon: Zap, description: 'Combat parameters & match preferences' },
    { id: 'notifications', title: 'Notifications & Audio', icon: Bell, description: 'Tactical feed alerts & acoustic feedback' },
    { id: 'keybindings', title: 'Keybindings', icon: Terminal, description: 'Hotkeys, shortcuts & rapid inputs' },
    { id: 'account', title: 'Account Dossier', icon: User, description: 'Operator profile & linked identity' },
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

    // States for supported sections
    const [visual, setVisual] = useState(() => getStored('arena_settings_visual', { compactHud: false }));
    const [editor, setEditor] = useState(() => getStored('arena_settings_editor', { 
        typeface: 'jetbrains', 
        fontSize: 14, 
        tabSize: 4, 
        lineNumbers: true,
        minimap: false 
    }));
    const [arena, setArena] = useState(() => getStored('arena_settings_arena', { 
        autoAccept: false, 
        showOpponentElo: true, 
        autoCopyRoomCode: true,
        autoSubmit: true 
    }));
    const [notifications, setNotifications] = useState(() => getStored('arena_settings_notifications', { 
        inAppAlerts: true, 
        soundAlerts: true 
    }));
    const [keybindings, setKeybindings] = useState(() => getStored('arena_settings_keybindings', { 
        submitHotkey: 'Ctrl+Enter', 
        runHotkey: 'Ctrl+R', 
        voiceHotkey: 'Ctrl+Shift+V' 
    }));

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
            localStorage.setItem('arena_settings_visual', JSON.stringify(visual));
            localStorage.setItem('arena_settings_editor', JSON.stringify(editor));
            localStorage.setItem('arena_settings_arena', JSON.stringify(arena));
            localStorage.setItem('arena_settings_notifications', JSON.stringify(notifications));
            localStorage.setItem('arena_settings_keybindings', JSON.stringify(keybindings));

            // Notify open editors and views
            window.dispatchEvent(new Event('arena-settings-updated'));

            // Sync user profile if changed
            if (user?.id) {
                const patchData: any = {};
                if (username && username !== user.username) patchData.username = username;
                if (avatarUrl !== user.avatarUrl) patchData.avatarUrl = avatarUrl;

                if (Object.keys(patchData).length > 0) {
                    if (user.isDemo) {
                        alert('Account modifications are restricted in Demo mode. Visual and editor settings have been saved locally.');
                    } else {
                        const res = await api.patch(`/users/${user.id}`, patchData);
                        updateStats(res.data);
                    }
                }
            }

            setIsSaved(true);
            setHasUnsavedChanges(false);
            setTimeout(() => setIsSaved(false), 2500);
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
                            <span className="terminal-tag">VER 2.0 // PROTOCOL_CFG</span>
                            <h2 className="sidebar-title">SYSTEM PREFS</h2>
                        </div>
                        <nav className="sidebar-nav">
                            {SECTIONS.map((section) => {
                                const Icon = section.icon;
                                const isActive = activeSection === section.id;
                                return (
                                    <button
                                        key={section.id}
                                        className={`nav-item ${isActive ? 'active' : ''}`}
                                        onClick={() => setActiveSection(section.id)}
                                    >
                                        <Icon size={18} className="nav-icon" />
                                        <span className="nav-label">{section.title}</span>
                                        {isActive && <ChevronRight size={14} className="nav-arrow" />}
                                    </button>
                                );
                            })}
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
                            {/* Visual Interface */}
                            {activeSection === 'visual' && (
                                <div className="settings-grid">
                                    <div className="setting-card">
                                        <h3 className="card-title">Theme Calibration</h3>
                                        <div className="control-row">
                                            <div className="flex items-center gap-3">
                                                {isLight ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} className="text-purple-400" />}
                                                <div>
                                                    <span className="control-label block">LIGHT MODE THEME</span>
                                                    <span className="text-[9px] text-gray-500">Switch between sleek dark matrix and high-contrast light mode</span>
                                                </div>
                                            </div>
                                            <label className="hud-switch">
                                                <input 
                                                    type="checkbox" 
                                                    checked={isLight} 
                                                    onChange={(e) => {
                                                        setTheme(e.target.checked ? 'light' : 'dark');
                                                        setHasUnsavedChanges(true);
                                                    }} 
                                                />
                                                <span className="slider" />
                                            </label>
                                        </div>
                                    </div>

                                    <div className="setting-card">
                                        <h3 className="card-title">Display Protocol</h3>
                                        <div className="control-row">
                                            <div>
                                                <span className="control-label block">COMPACT HUD MODE</span>
                                                <span className="text-[9px] text-gray-500">Reduce spacing and HUD padding for maximum code real estate</span>
                                            </div>
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

                            {/* Code Editor */}
                            {activeSection === 'editor' && (
                                <div className="settings-grid">
                                    <div className="setting-card full-width">
                                        <h3 className="card-title">Editor Typography & Metrics</h3>
                                        <div className="control-row-grid grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="control-group">
                                                <label className="control-label">TYPEFACE FONT</label>
                                                <select 
                                                    className="hud-select" 
                                                    value={editor.typeface}
                                                    onChange={(e) => {
                                                        setEditor({ ...editor, typeface: e.target.value });
                                                        setHasUnsavedChanges(true);
                                                    }}
                                                >
                                                    <option value="jetbrains">JETBRAINS MONO (RECOMMENDED)</option>
                                                    <option value="fira">FIRA CODE</option>
                                                    <option value="inter">INTER / SYSTEM</option>
                                                </select>
                                            </div>
                                            <div className="control-group">
                                                <label className="control-label">FONT SIZE ({editor.fontSize}px)</label>
                                                <input 
                                                    type="range" 
                                                    className="hud-range" 
                                                    min="12" 
                                                    max="20" 
                                                    value={editor.fontSize}
                                                    onChange={(e) => {
                                                        setEditor({ ...editor, fontSize: Number(e.target.value) });
                                                        setHasUnsavedChanges(true);
                                                    }}
                                                />
                                            </div>
                                            <div className="control-group">
                                                <label className="control-label">TAB INDENTATION</label>
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
                                        </div>
                                    </div>

                                    <div className="setting-card">
                                        <h3 className="card-title">Editor Features</h3>
                                        <div className="space-y-4">
                                            <div className="control-row">
                                                <span className="control-label">DISPLAY LINE NUMBERS</span>
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
                                            <div className="control-row">
                                                <span className="control-label">DISPLAY CODE MINIMAP</span>
                                                <label className="hud-switch">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={editor.minimap} 
                                                        onChange={(e) => {
                                                            setEditor({ ...editor, minimap: e.target.checked });
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

                            {/* Arena Protocol */}
                            {activeSection === 'arena' && (
                                <div className="settings-grid">
                                    <div className="setting-card full-width">
                                        <h3 className="card-title">Combat Protocol</h3>
                                        <div className="space-y-4">
                                            <div className="control-row">
                                                <div>
                                                    <span className="control-label block">SHOW OPPONENT RATING</span>
                                                    <span className="text-[9px] text-gray-500">Reveal rival Elo and Tier in match HUD</span>
                                                </div>
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
                                                <div>
                                                    <span className="control-label block">AUTO-COPY ROOM TOKEN</span>
                                                    <span className="text-[9px] text-gray-500">Automatically copy 6-digit access code upon room generation</span>
                                                </div>
                                                <label className="hud-switch">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={arena.autoCopyRoomCode} 
                                                        onChange={(e) => {
                                                            setArena({ ...arena, autoCopyRoomCode: e.target.checked });
                                                            setHasUnsavedChanges(true);
                                                        }} 
                                                    />
                                                    <span className="slider" />
                                                </label>
                                            </div>
                                            <div className="control-row">
                                                <div>
                                                    <span className="control-label block">AUTO-SUBMIT ON EXPIRATION</span>
                                                    <span className="text-[9px] text-gray-500">Automatically test and submit code buffer when clock reaches 0:00</span>
                                                </div>
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
                                            <div className="control-row">
                                                <div>
                                                    <span className="control-label block">AUTO-ACCEPT MATCHMAKING</span>
                                                    <span className="text-[9px] text-gray-500">Instantly lock in when a quick match opponent is found</span>
                                                </div>
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
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Notifications & Audio */}
                            {activeSection === 'notifications' && (
                                <div className="settings-grid">
                                    <div className="setting-card">
                                        <h3 className="card-title">Intelligence Alerts</h3>
                                        <div className="control-row">
                                            <div>
                                                <span className="control-label block">IN-APP TELEMETRY FEED</span>
                                                <span className="text-[9px] text-gray-500">Live notifications for duel challenges, match results & ranks</span>
                                            </div>
                                            <label className="hud-switch">
                                                <input 
                                                    type="checkbox" 
                                                    checked={notifications.inAppAlerts} 
                                                    onChange={(e) => {
                                                        setNotifications({ ...notifications, inAppAlerts: e.target.checked });
                                                        setHasUnsavedChanges(true);
                                                    }} 
                                                />
                                                <span className="slider" />
                                            </label>
                                        </div>
                                    </div>

                                    <div className="setting-card">
                                        <h3 className="card-title">Tactical Acoustics</h3>
                                        <div className="control-row">
                                            <div>
                                                <span className="control-label block">COMBAT SFX & BELL AUDIO</span>
                                                <span className="text-[9px] text-gray-500">Play audio cues for test run pass/fail and countdown</span>
                                            </div>
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
                                    </div>
                                </div>
                            )}

                            {/* Keybindings */}
                            {activeSection === 'keybindings' && (
                                <div className="settings-grid">
                                    <div className="setting-card full-width">
                                        <h3 className="card-title">Tactical Shortcuts</h3>
                                        <div className="control-row-grid grid grid-cols-1 md:grid-cols-3 gap-6">
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
                                                <label className="control-label">VOICE CODER TRIGGER</label>
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

                            {/* Account Dossier */}
                            {activeSection === 'account' && (
                                <div className="settings-grid">
                                    {user?.isDemo && (
                                        <div className="setting-card full-width bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl flex items-center gap-3">
                                            <Sparkles size={20} className="text-amber-400 shrink-0" />
                                            <div>
                                                <p className="text-xs font-bold text-amber-300 uppercase tracking-wider">Demo Mode Session Active</p>
                                                <p className="text-[11px] text-zinc-400 mt-0.5">
                                                    You are exploring CodeArena in Demo mode. All combat, problems, code execution, and AI coach features are fully enabled. Account credential changes are restricted.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="setting-card full-width">
                                        <h3 className="card-title">Operator Dossier</h3>
                                        <div className="control-row-grid grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="control-group">
                                                <label className="control-label">OPERATOR CALLSIGN</label>
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
                                                <label className="control-label">AVATAR IMAGE</label>
                                                {/* Hidden file input */}
                                                <input
                                                    id="avatar-file-input"
                                                    type="file"
                                                    accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                                                    style={{ display: 'none' }}
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;
                                                        const reader = new FileReader();
                                                        reader.onload = (ev) => {
                                                            const result = ev.target?.result as string;
                                                            setAvatarUrl(result);
                                                            setHasUnsavedChanges(true);
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }}
                                                />
                                                {/* Avatar Preview + Upload Button */}
                                                <div className="flex items-center gap-4 mt-2">
                                                    {/* Preview circle */}
                                                    <div
                                                        className="w-16 h-16 rounded-2xl border-2 border-dashed border-purple-500/40 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:border-purple-500/80 transition-all group"
                                                        onClick={() => document.getElementById('avatar-file-input')?.click()}
                                                        title="Click to change avatar"
                                                    >
                                                        {avatarUrl ? (
                                                            <img
                                                                src={avatarUrl}
                                                                alt="Avatar preview"
                                                                className="w-full h-full object-cover"
                                                                onError={() => setAvatarUrl('')}
                                                            />
                                                        ) : (
                                                            <span className="text-2xl font-black text-purple-400 uppercase group-hover:scale-110 transition-transform">
                                                                {username?.[0] || '?'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {/* Upload controls */}
                                                    <div className="flex flex-col gap-2 flex-1">
                                                        <button
                                                            type="button"
                                                            className="hud-input text-left text-xs cursor-pointer hover:border-purple-500/60 transition-colors flex items-center gap-2"
                                                            onClick={() => document.getElementById('avatar-file-input')?.click()}
                                                        >
                                                            <Sparkles size={12} className="text-purple-400 shrink-0" />
                                                            <span className={avatarUrl ? 'text-green-400 font-medium' : 'opacity-50'}>
                                                                {avatarUrl ? 'Image loaded — click to change' : 'Click to upload local image…'}
                                                            </span>
                                                        </button>
                                                        {avatarUrl && (
                                                            <button
                                                                type="button"
                                                                className="text-[10px] font-medium text-red-400 hover:text-red-300 text-left transition-colors"
                                                                onClick={() => { setAvatarUrl(''); setHasUnsavedChanges(true); }}
                                                            >
                                                                ✕ Remove avatar
                                                            </button>
                                                        )}
                                                        <span className="text-[9px] text-gray-500 font-medium">PNG, JPG, GIF, WEBP or SVG · max ~2 MB</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Save Action Footer */}
                        <div className="settings-footer">
                            <div className="status-indicator">
                                {isSaved ? (
                                    <span className="status-text saved flex items-center gap-1.5 text-emerald-400">
                                        <CheckCircle2 size={16} /> CONFIGURATION SYNCHRONIZED
                                    </span>
                                ) : hasUnsavedChanges ? (
                                    <span className="status-text warning text-amber-400">
                                        PENDING MODIFICATIONS // LOCAL BUFFER
                                    </span>
                                ) : (
                                    <span className="status-text text-gray-500">
                                        PARAMETERS SYNCHRONIZED
                                    </span>
                                )}
                            </div>

                            <button 
                                className={`save-button flex items-center gap-2 ${hasUnsavedChanges ? 'primary' : 'disabled'}`}
                                onClick={handleSave}
                                disabled={!hasUnsavedChanges}
                            >
                                <Save size={16} />
                                <span>APPLY MODIFICATIONS</span>
                            </button>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
};
