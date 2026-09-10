import { useState, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { NavigationProvider } from './navigation/NavigationContext';
import { MatchProvider } from './contexts/MatchContext';
import NavigatorRoot from './navigation/NavigatorRoot';
import ModalLayer from './navigation/ModalLayer';
import { SocketProvider } from './contexts/SocketContext';
import { LogoReveal } from './components/ui/LogoReveal';
import SafeSessionStorage from './lib/storage';

import { LayoutProvider } from './contexts/LayoutContext';

function App() {
    const [showReveal, setShowReveal] = useState(() => !SafeSessionStorage.getItem('arena_logo_shown_fixed'));
    const handleRevealComplete = useCallback(() => {
        setShowReveal(false);
    }, []);

    return (
        <Router>
            {showReveal && <LogoReveal onComplete={handleRevealComplete} />}
            <Routes>
                <Route path="*" element={
                    <SocketProvider>
                        <LayoutProvider>
                            <NavigationProvider>
                                <MatchProvider>
                                    <NavigatorRoot />
                                    <ModalLayer />
                                </MatchProvider>
                            </NavigationProvider>
                        </LayoutProvider>
                    </SocketProvider>
                } />
            </Routes>
        </Router>
    );
}

export default App;
