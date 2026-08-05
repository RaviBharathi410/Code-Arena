import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { NavigationProvider } from './navigation/NavigationContext';
import { MatchProvider } from './contexts/MatchContext';
import NavigatorRoot from './navigation/NavigatorRoot';
import ModalLayer from './navigation/ModalLayer';
import { SocketProvider } from './contexts/SocketContext';
import { LogoReveal } from './components/ui/LogoReveal';
import SafeSessionStorage from './lib/storage';

function App() {
    const [showReveal, setShowReveal] = useState(() => !SafeSessionStorage.getItem('arena_logo_shown_fixed'));

    return (
        <Router>
            {showReveal && <LogoReveal onComplete={() => setShowReveal(false)} />}
            <Routes>
                <Route path="*" element={
                    <SocketProvider>
                        <NavigationProvider>
                            <MatchProvider>
                                <NavigatorRoot />
                                <ModalLayer />
                            </MatchProvider>
                        </NavigationProvider>
                    </SocketProvider>
                } />
            </Routes>
        </Router>
    );
}

export default App;
