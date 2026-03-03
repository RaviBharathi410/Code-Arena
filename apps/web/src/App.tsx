import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

                {/* Protected Routes wrapped in MainLayout */}
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <MainLayout>
                                <Dashboard />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/opponents"
                    element={
                        <ProtectedRoute>
                            <MainLayout>
                                <OpponentSelection />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/battle"
                    element={
                        <ProtectedRoute>
                            <MainLayout>
                                <GameSpace />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/arena/:matchId"
                    element={
                        <ProtectedRoute>
                            <MainLayout>
                                <BattleArena />
                            </MainLayout>
                        </ProtectedRoute>
                    }
                />

                <Route path="/demo" element={<DemoOne />} />
                <Route path="/" element={<Navigate to="/dashboard" />} />
                <Route path="*" element={<Navigate to="/dashboard" />} />
            </Routes>
        </Router>
    );
}

export default App;
