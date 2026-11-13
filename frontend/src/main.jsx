import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './hooks/useAuth.jsx'
import { ProfileProvider } from './hooks/useProfile.jsx'
import { I18nProvider } from './i18n/index.jsx'
import { ToastProvider } from './hooks/useToast.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <AuthProvider>
          <ProfileProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </ProfileProvider>
        </AuthProvider>
      </I18nProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
