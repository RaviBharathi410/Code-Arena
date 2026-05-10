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
import { useLayout } from '../components/layout/MainLayout';

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

export const SettingsView: React.FC = () => {
    const { isLight, setTheme } = useLayout();
    const [activeSection, setActiveSection] = useState('visual');
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [currentUser] = useState({ username: 'Operator', email: 'user@nexus.io', bio: 'Standard operative.' });

    const handleSave = () => {
        setIsSaved(true);
        setHasUnsavedChanges(false);
        setTimeout(() => setIsSaved(false), 2000);
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
                                    {hasUnsavedChanges && activeSection === section.id && <div className="unsaved-dot" />}
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
                                                <input type="checkbox" defaultChecked />
                                                <span className="slider" />
                                            </label>
                                        </div>
                                        <div className="control-row">
                                            <span className="control-label">PARTICLE EFFECTS</span>
                                            <label className="hud-switch">
                                                <input type="checkbox" defaultChecked />
                                                <span className="slider" />
                                            </label>
                                        </div>
                                        <div className="control-row">
                                            <span className="control-label">COMPACT HUD</span>
                                            <label className="hud-switch">
                                                <input type="checkbox" />
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
                                            <label className="control-label">MASTER OUTPUT</label>
                                            <input type="range" className="hud-range" />
                                        </div>
                                        <div className="control-group">
                                            <label className="control-label">SFX FEEDBACK</label>
                                            <input type="range" className="hud-range" />
                                        </div>
                                        <div className="control-group">
                                            <label className="control-label">AMBIENT HUM</label>
                                            <input type="range" className="hud-range" />
                                        </div>
                                    </div>
                                    <div className="setting-card">
                                        <h3 className="card-title">Acoustic Profiles</h3>
                                        <select className="hud-select">
                                            <option>CYBERPUNK // DEFAULT</option>
                                            <option>MINIMAL // ANALOG</option>
                                            <option>SILENT // STEALTH</option>
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
                                                <select className="hud-select">
                                                    <option>INTER</option>
                                                    <option>JETBRAINS MONO</option>
                                                    <option>FIRA CODE</option>
                                                </select>
                                            </div>
                                            <div className="control-group">
                                                <label className="control-label">FONT SIZE</label>
                                                <input type="range" className="hud-range" min="12" max="24" />
                                            </div>
                                            <div className="control-group">
                                                <label className="control-label">KEYBINDING MAP</label>
                                                <select className="hud-select">
                                                    <option>VS CODE</option>
                                                    <option>VIM</option>
                                                    <option>EMACS</option>
                                                </select>
                                            </div>
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
                                                    {currentUser?.username?.[0].toUpperCase() || 'O'}
                                                </div>
                                                <div className="flex-1 space-y-4 w-full">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="control-group">
                                                            <label className="control-label">OPERATOR ALIAS</label>
                                                            <input 
                                                                type="text" 
                                                                className="hud-input" 
                                                                defaultValue={currentUser?.username} 
                                                                onChange={() => setHasUnsavedChanges(true)}
                                                            />
                                                        </div>
                                                        <div className="control-group">
                                                            <label className="control-label">UPLINK ADDRESS</label>
                                                            <input 
                                                                type="email" 
                                                                className="hud-input" 
                                                                defaultValue={currentUser?.email} 
                                                                onChange={() => setHasUnsavedChanges(true)}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="control-group">
                                                        <label className="control-label">MISSION OBJECTIVE / BIO</label>
                                                        <textarea 
                                                            className="hud-textarea" 
                                                            placeholder="Define your operational signature..."
                                                            defaultValue={currentUser?.bio}
                                                            onChange={() => setHasUnsavedChanges(true)}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeSection !== 'visual' && activeSection !== 'audio' && activeSection !== 'editor' && activeSection !== 'account' && (
                                <div className="placeholder-section">
                                    <Terminal size={48} className="placeholder-icon" />
                                    <h2>{SECTIONS.find(s => s.id === activeSection)?.title}</h2>
                                    <p>ENCRYPTED MODULE // CONFIGURATION ACCESS PENDING</p>
                                    <div className="shimmer-bar" />
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
