import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { BattleArena } from './views/BattleArena';
import { Login } from './views/Login';
import { Dashboard } from './views/Dashboard';
import { useAuthStore } from './store/useAuthStore';
import MainLayout from './components/layout/MainLayout';
import { DemoOne } from './components/ui/demo';
import { OpponentSelection } from './views/OpponentSelection';
import { GameSpace } from './views/GameSpace';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated } = useAuthStore();
    return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/login" element={<Login />} />

                {/* All Protected Routes sharing MainLayout */}
                <Route
                    element={
                        <ProtectedRoute>
                            <MainLayout>
                                <Outlet />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                >
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/battle" element={<Dashboard />} />
                    <Route path="/practice" element={<Dashboard />} />
                    <Route path="/history" element={<Dashboard />} />
                    <Route path="/tournaments" element={<Dashboard />} />
                    <Route path="/leaderboard" element={<Dashboard />} />
                    <Route path="/profile" element={<Dashboard />} />
                    <Route path="/settings" element={<Dashboard />} />
                    <Route path="/opponents" element={<OpponentSelection />} />
                    <Route path="/arena/solo" element={<GameSpace />} />
                    <Route path="/arena/practice" element={<GameSpace />} />
                    <Route path="/arena/:matchId" element={<BattleArena />} />
                </Route>

                <Route path="/demo" element={<DemoOne />} />
                <Route path="/" element={<Navigate to="/dashboard" />} />
                <Route path="*" element={<Navigate to="/dashboard" />} />
            </Routes>
        </Router>
    );
}

export default App;
