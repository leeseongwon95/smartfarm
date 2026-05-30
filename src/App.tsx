import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Layout } from '@/components/Layout'
import { Dashboard } from '@/pages/Dashboard'
import { History } from '@/pages/History'
import { Settings } from '@/pages/Settings'
import { Login } from '@/pages/Login'
import { useAuth } from '@/hooks/useAuth'
import { Toaster } from '@/components/ui/toast'
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 4000 },
  },
})

function AuthGate() {
  const { isAuthenticated, loading } = useAuth()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (isAuthenticated) {
      queryClient.invalidateQueries()
    }
  }, [isAuthenticated, queryClient])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-2">
          <span className="text-4xl">🌿</span>
          <p className="text-sm text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return <Login />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/history" element={<History />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthGate />
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
