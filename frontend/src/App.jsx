import { useState, useEffect, lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarDays,
  LayoutDashboard,
  Archive as ArchiveIcon,
  ClipboardCheck,
  Users,
  Settings as SettingsIcon,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'
import './App.css'

// Import components
// Admin screens load on demand. The kiosk is the page that runs on phones over
// mobile data, so it should not have to download Recharts or the QR library.
const Dashboard = lazy(() => import('./components/Dashboard'))
const Events = lazy(() => import('./components/Events'))
const Archive = lazy(() => import('./components/Archive'))
const Attendance = lazy(() => import('./components/Attendance'))
const Employees = lazy(() => import('./components/Employees'))
const Settings = lazy(() => import('./components/Settings'))
const AttendanceKiosk = lazy(() => import('./components/AttendanceKiosk'))

import LoginPage from './components/LoginPage'
import { logout, isAuthenticated, getUser } from './utils/auth'

// Navigation items with role-based access
const navigationItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard', color: 'text-white', roles: ['admin', 'designer'] },
  { path: '/events', icon: CalendarDays, label: 'Events', color: 'text-white', roles: ['admin', 'designer'] },
  { path: '/archive', icon: ArchiveIcon, label: 'Archive', color: 'text-white', roles: ['admin', 'designer'] },
  { path: '/attendance-records', icon: ClipboardCheck, label: 'Attendance', color: 'text-white', roles: ['admin', 'designer'] },
  { path: '/employees', icon: Users, label: 'Employees', color: 'text-white', roles: ['admin', 'designer'] },
  { path: '/settings', icon: SettingsIcon, label: 'Settings', color: 'text-white', roles: ['admin', 'designer'] },
  ]

function PageSpinner() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-700"></div>
    </div>
  )
}

function Sidebar({ isCollapsed, toggleSidebar, onLogout, isMobile, closeMobileSidebar, userRole }) {
  const location = useLocation()

  // Filter navigation items based on user role
  const filteredNavItems = navigationItems.filter(item => 
    item.roles.includes(userRole)
  )

  return (
    <motion.div
      initial={false}
      animate={{ width: isCollapsed && !isMobile ? 80 : isMobile && !isCollapsed ? '100%' : 280, x: isMobile && isCollapsed ? '-100%' : 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed left-0 top-0 h-full bg-[var(--color-sidebar)] border-r border-[var(--color-sidebar-border)] z-50 flex flex-col"
    >
      {/* Header with toggle button */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--color-sidebar-border)] h-16">
        <AnimatePresence mode="wait">
          {(!isCollapsed || isMobile) && (
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="text-lg font-bold bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] bg-clip-text text-white"
            >
              Event Tracker
            </motion.h1>
          )}
        </AnimatePresence>

        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="text-white hover:bg-white/10 hover:text-white ml-auto"
        >
          {isCollapsed && !isMobile ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 p-2 space-y-1">
        {filteredNavItems.map((item, index) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path

          return (
            <motion.div
              key={item.path}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 + 0.1 }}
            >
              <Link to={item.path} onClick={isMobile ? closeMobileSidebar : undefined}>
              <motion.div
                  whileHover={{ scale: 1.02, x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-white text-[#0e1048] border border-[#0e1048]'
                    : 'hover:bg-[var(--color-sidebar-accent)]/50 text-white'
                }`}

                >

                <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-[#0e1048]' : item.color}`} />

                  <AnimatePresence mode="wait">
                    {(!isCollapsed || isMobile) && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className={`font-medium whitespace-nowrap ${isActive ? 'text-[#0e1048]' : 'text-[var(--color-sidebar-foreground)]'}`}
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>

                  {/* Active indicator */}
                  {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className={`absolute right-2 w-2 h-2 rounded-full bg-[#0e1048]`}
                  />
                )}

                  {/* Tooltip for collapsed state */}
                  {isCollapsed && !isMobile && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-[var(--color-sidebar-accent)] text-[var(--color-sidebar-accent-foreground)] text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                      {item.label}
                    </div>
                  )}
                </motion.div>
              </Link>
            </motion.div>
          )
        })}
      </nav>

      {/* Logout Button */}
<div className="p-2 border-t border-[var(--color-sidebar-border)]">
  <motion.button
    whileHover={{ scale: 1.02, x: 2 }}
    whileTap={{ scale: 0.98 }}
    onClick={onLogout}
    className="relative flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 group w-full hover:bg-[var(--color-destructive)]/20 text-white"
  >
    <LogOut className="h-5 w-5 flex-shrink-0 text-white" />

    {/* Animated Logout Text (only if expanded) */}
    <AnimatePresence mode="wait">
      {(!isCollapsed || isMobile) && (
        <motion.span
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
          className="font-medium whitespace-nowrap"
        >
          Logout
        </motion.span>
      )}
    </AnimatePresence>

    {/* Tooltip for collapsed state */}
    {isCollapsed && !isMobile && (
      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-[var(--color-sidebar-accent)] text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-lg">
        Logout
      </div>
    )}
  </motion.button>
</div>

      {/* Footer status indicator */}
      <div className="p-4 border-t border-[var(--color-sidebar-border)]">
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.5 }}
    className={`${isCollapsed && !isMobile ? 'flex justify-center' : ''}`}
  >
    {isCollapsed && !isMobile ? (
      <div className="flex flex-col space-y-1">
        <div className="w-2 h-2 bg-[var(--color-chart-1)] rounded-full animate-pulse"></div>
        <div
          className="w-2 h-2 bg-[var(--color-chart-2)] rounded-full animate-pulse"
          style={{ animationDelay: '0.2s' }}
        ></div>
        <div
          className="w-2 h-2 bg-[var(--color-chart-3)] rounded-full animate-pulse"
          style={{ animationDelay: '0.4s' }}
        ></div>
      </div>
    ) : (
      <div className="p-3 bg-[var(--color-sidebar-accent)]/10 rounded-lg border border-[var(--color-sidebar-border)] text-sm text-white text-center">
        <p>
          Made with <span className="text-red-500">❤</span><span className="font-semibold"></span>
        </p>
      </div>
    )}
  </motion.div>
</div>

    </motion.div>
  )
}

function MainContent({ sidebarCollapsed, isMobile, userRole }) {
  const location = useLocation()

  // Role-based route protection
  const ProtectedComponent = ({ component: Component, allowedRoles }) => {
    if (!allowedRoles.includes(userRole)) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to access this page.</p>
          </div>
        </div>
      )
    }
    return <Component />
  }

  return (
    <motion.main
      initial={false}
      animate={{
        marginLeft: isMobile ? 0 : (sidebarCollapsed ? 80 : 280),
        width: isMobile ? '100%' : (sidebarCollapsed ? 'calc(100% - 80px)' : 'calc(100% - 280px)')
      }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="min-h-screen"
    >
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="p-6"
      >
        <Suspense fallback={<PageSpinner />}>
        <Routes>
          <Route path="/" element={<ProtectedComponent component={Dashboard} allowedRoles={['admin', 'designer']} />} />
          <Route path="/events" element={<ProtectedComponent component={Events} allowedRoles={['admin', 'designer']} />} />
          <Route path="/archive" element={<ProtectedComponent component={Archive} allowedRoles={['admin', 'designer']} />} />
          <Route path="/attendance-records" element={<ProtectedComponent component={Attendance} allowedRoles={['admin', 'designer']} />} />
          <Route path="/employees" element={<ProtectedComponent component={Employees} allowedRoles={['admin', 'designer']} />} />
          <Route path="/settings" element={<ProtectedComponent component={Settings} allowedRoles={['admin', 'designer']} />} />

          {/* Anything else falls back to the dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </motion.div>
    </motion.main>
  )
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [user, setUser] = useState(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is already authenticated on app load
    const checkAuth = () => {
      if (isAuthenticated()) {
        const userData = getUser()
        setIsLoggedIn(true)
        setUser(userData)
      } else {
        setIsLoggedIn(false)
        setUser(null)
      }
      setLoading(false)
    }

    checkAuth()

    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  useEffect(() => {
    if (isMobile) {
      setSidebarCollapsed(true) // Collapse sidebar by default on mobile
    } else {
      setSidebarCollapsed(false) // Expand sidebar by default on desktop
    }
  }, [isMobile])

  const handleLogin = (userData) => {
    setIsLoggedIn(true)
    setUser(userData)
  }

  const handleLogout = async () => {
    await logout()
    setIsLoggedIn(false)
    setUser(null)
    setSidebarCollapsed(false)
  }

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  const closeMobileSidebar = () => {
    if (isMobile) {
      setSidebarCollapsed(true)
    }
  }

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const adminShell = isLoggedIn ? (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)]">
      {isMobile && (
        <div className="mobile-menu-button-container">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="mobile-menu-button"
          >
            {sidebarCollapsed ? <Menu className="h-6 w-6" /> : <X className="h-6 w-6" />}
          </Button>
        </div>
      )}

      <Sidebar
        isCollapsed={sidebarCollapsed}
        toggleSidebar={toggleSidebar}
        onLogout={handleLogout}
        isMobile={isMobile}
        closeMobileSidebar={closeMobileSidebar}
        userRole={user?.role}
      />
      <MainContent
        sidebarCollapsed={sidebarCollapsed}
        isMobile={isMobile}
        userRole={user?.role}
      />
    </div>
  ) : (
    <LoginPage onLogin={handleLogin} />
  )

  return (
    <Router>
      <Routes>
        {/* The QR code lands here. Deliberately outside the login gate:
            employees scanning it do not have accounts. */}
        <Route
          path="/attendance"
          element={
            <Suspense fallback={
              <div className="min-h-screen flex items-center justify-center bg-indigo-950">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white"></div>
              </div>
            }>
              <AttendanceKiosk />
            </Suspense>
          }
        />

        <Route path="/*" element={adminShell} />
      </Routes>
    </Router>
  )
}

export default App

