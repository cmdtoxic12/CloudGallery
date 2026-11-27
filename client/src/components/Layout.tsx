import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Cloud, LogOut, Moon, Sun, Plus } from 'lucide-react'
import { useAuthStore } from '../stores/auth'
import { useThemeStore } from '../stores/theme'
import { Button } from './ui/Button'

export function Layout({ children }: { children?: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuthStore()
  const { theme, toggle } = useThemeStore()
  const navigate = useNavigate()
  const location = useLocation()
  const isSharedGallery = location.pathname.startsWith('/g/')

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 border-b bg-[hsl(var(--background))]/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl">
            <Cloud className="h-7 w-7 text-primary-600" />
            <span>
              Cloud<span className="text-primary-600">Gallery</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className="hover:text-primary-600 transition-colors">
                  Dashboard
                </Link>
                <Link to="/favorites" className="hover:text-primary-600 transition-colors">
                  Favorites
                </Link>
              </>
            ) : (
              <Link to="/#features" className="hover:text-primary-600 transition-colors">
                Features
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggle} title="Toggle theme">
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            {isAuthenticated ? (
              <>
                <Button variant="outline" size="sm" onClick={() => navigate('/create')} className="hidden sm:flex">
                  <Plus className="h-4 w-4" />
                  New Gallery
                </Button>
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-sm text-muted-foreground hidden sm:inline">
                    {user?.name}
                  </span>
                  <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <>
                {!isSharedGallery && (
                  <>
                    <Link to="/login">
                      <Button variant="ghost" size="sm">
                        Login
                      </Button>
                    </Link>
                    <Link to="/register">
                      <Button size="sm">Get Started</Button>
                    </Link>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">{children || <Outlet />}</main>

      <footer className="border-t py-8 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-[hsl(var(--muted-foreground))]">
          © {new Date().getFullYear()} CloudGallery · Built for photographers, event organizers & families
        </div>
      </footer>
    </div>
  )
}
