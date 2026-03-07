import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { NavigationProvider } from './navigation/NavigationContext';
import { MatchProvider } from './contexts/MatchContext';
import NavigatorRoot from './navigation/NavigatorRoot';
import ModalLayer from './navigation/ModalLayer';

import { SocketProvider } from './contexts/SocketContext';

function App() {
    return (
        <Router>
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
