import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { useStore } from './store'
import Login from './pages/Login'
import Layout from './pages/Layout'

export default function App() {
  const { authed, theme } = useStore()

  // Apply theme class to <html>
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    root.classList.toggle('light', theme === 'light')
  }, [theme])

  return (
    <>
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: theme === 'dark' ? '#111827' : '#fff',
            color: theme === 'dark' ? '#E8F0FE' : '#0a0f1e',
            border: `1px solid ${theme === 'dark' ? '#1E2D3D' : '#e5e7eb'}`,
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 600,
          },
        }}
      />
      {!authed ? <Login /> : <Layout />}
    </>
  )
}
