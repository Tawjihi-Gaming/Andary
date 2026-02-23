import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './i18n'
import { SignalRProvider } from './context/SignalRContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SignalRProvider>
      <App/>
    </SignalRProvider>
  </StrictMode>,
)
