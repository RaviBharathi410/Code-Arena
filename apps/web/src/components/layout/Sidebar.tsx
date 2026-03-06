import { NavLink, useNavigate } from "react-router-dom";
import {
    Activity, Sword, GitPullRequest, BarChart2,
    Settings, LogOut, User, Beaker
} from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";

const navSections = [
    {
        label: "Operations",
        items: [
            {
                to: "/dashboard",
                label: "Command Center",
                icon: Activity,
                glowColor: "cyan",
            },
            {
                to: "/battle",
                label: "Battle Arena",
                icon: Sword,
                glowColor: "purple",
            },
            {
                to: "/practice",
                label: "Practice Lab",
                icon: Beaker,
                glowColor: "green",
            },
            {
                to: "/tournaments",
                label: "Tournaments",
                icon: GitPullRequest,
                glowColor: "amber",
            },
        ],
    },
    {
        label: "Intel",
        items: [
            {
                to: "/leaderboard",
                label: "Leaderboard",
                icon: BarChart2,
                glowColor: "blue",
            },
            {
                to: "/profile",
                label: "Profile",
                icon: User,
                glowColor: "indigo",
            },
            {
                to: "/settings",
                label: "Settings",
                icon: Settings,
                glowColor: "gray",
            },
        ],
    },
];

const glowMap: Record<string, string> = {
    cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.1)]",
    green: "bg-green-500/10 text-green-400 border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]",
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]",
    indigo: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]",
    gray: "bg-white/5 text-gray-300 border-white/10",
};

export default function Sidebar() {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    return (
        <div className="w-64 h-screen bg-[#0F0F17] border-r border-white/10 flex flex-col flex-shrink-0">
            {/* Brand */}
            <div className="px-6 py-7 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                    <Activity size={20} className="text-cyan-400" />
                    <span className="text-lg font-black tracking-tighter uppercase italic">
                        Arena<span className="text-gray-500">Protocol</span>
                    </span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 flex flex-col gap-1 px-3 py-6 overflow-y-auto">
                {navSections.map((section) => (
                    <div key={section.label} className="mb-4">
                        <p className="text-[10px] font-black tracking-[0.3em] text-gray-600 uppercase px-4 mb-3">
                            {section.label}
                        </p>
                        <div className="space-y-1">
                            {section.items.map((item) => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    className={({ isActive }) =>
                                        `px-4 py-3 rounded-xl transition-all duration-200 flex items-center gap-3 text-xs font-bold uppercase tracking-wider border
                                        ${isActive
                                            ? `${glowMap[item.glowColor]} border`
                                            : "text-gray-400 hover:bg-white/5 hover:text-white border-transparent"
                                        }`
                                    }
                                >
                                    <item.icon size={16} />
                                    {item.label}
                                </NavLink>
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            {/* User Profile & Logout */}
            <div className="p-4 border-t border-white/5 space-y-3">
                <div className="bg-white/5 rounded-xl p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center text-sm font-black text-black flex-shrink-0">
                        {(user?.username ?? "O")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">
                            {user?.username ?? "Operator"}
                        </p>
                        <p className="text-[10px] text-gray-500 font-mono truncate">
                            {user?.rating ?? 1200} RP
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 text-red-500/70 hover:text-red-400 hover:bg-red-500/10 transition-all text-[10px] font-black uppercase tracking-widest py-2.5 rounded-xl"
                >
                    <LogOut size={14} />
                    Terminate Uplink
                </button>
            </div>
        </div>
    );
}
