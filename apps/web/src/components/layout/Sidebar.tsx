import { NavLink } from "react-router-dom";

export default function Sidebar() {
    return (
        <div className="w-64 h-screen bg-[#0F0F17] border-r border-white/10 flex flex-col">
            <div className="p-6 text-2xl font-bold tracking-tighter">
                <span className="text-white">Code</span>
                <span className="text-cyan-400">Arena</span>
            </div>

            <nav className="flex-1 flex flex-col gap-2 p-4">
                <NavLink
                    to="/dashboard"
                    className={({ isActive }) =>
                        `px-4 py-3 rounded-lg transition-all duration-200 flex items-center gap-3 group
            ${isActive
                            ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                            : "text-gray-400 hover:bg-white/5 hover:text-white"
                        }`
                    }
                >
                    <div className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                    Dashboard
                </NavLink>

                <NavLink
                    to="/battle"
                    className={({ isActive }) =>
                        `px-4 py-3 rounded-lg transition-all duration-200 flex items-center gap-3 group
            ${isActive
                            ? "bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.1)]"
                            : "text-gray-400 hover:bg-white/5 hover:text-white"
                        }`
                    }
                >
                    <div className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                    Battle Arena
                </NavLink>
            </nav>

            <div className="p-4 border-t border-white/5">
                <div className="bg-white/5 rounded-lg p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">Player One</p>
                        <p className="text-xs text-gray-500 truncate">Rank: Platinum</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
