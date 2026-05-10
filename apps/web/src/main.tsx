import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { ScrollProvider } from './contexts/ScrollProvider'
import { ScrollProgressBar } from './components/ui/ScrollProgressBar'
import { CursorFollower } from './components/ui/CursorFollower'
import { TRPCProvider } from './components/providers/TRPCProvider'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <TRPCProvider>
            <ScrollProgressBar />
            <App />
        </TRPCProvider>
    </React.StrictMode>,
)
