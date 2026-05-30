import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

const NAV_ITEMS = [
  { to: '/', label: '대시보드', icon: '📊' },
  { to: '/history', label: '히스토리', icon: '📈' },
  { to: '/settings', label: '설정', icon: '⚙️' },
]

export function Layout() {
  const { signOut, session } = useAuth()

  return (
    <div className="flex min-h-screen bg-background">
      {/* 사이드바 */}
      <aside className="hidden md:flex flex-col w-56 border-r bg-card">
        <div className="px-5 py-6 border-b">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🌿</span>
            <div>
              <p className="text-base font-extrabold text-foreground leading-tight tracking-tight">스마트팜</p>
              <p className="text-xs font-medium text-primary">모니터링 시스템</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-5 space-y-1">
          {NAV_ITEMS.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-semibold transition-all',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-foreground/60 hover:bg-accent hover:text-foreground'
                )
              }
            >
              <span className="w-5 text-center text-base leading-none">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 border-t space-y-2">
          <p className="text-xs text-muted-foreground truncate">{session?.user.email}</p>
          <button
            onClick={() => signOut()}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            로그아웃
          </button>
        </div>
      </aside>

      {/* 모바일 하단 탭 */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex border-t bg-card">
        {NAV_ITEMS.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )
            }
          >
            <span className="text-lg">{icon}</span>
            {label}
          </NavLink>
        ))}
      </div>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-6 pb-20 md:pb-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
