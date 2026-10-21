import { useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Lock, User, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { API_BASE_URL } from '../utils/auth'

// Served straight from /public, so it is not bundled twice
const logo = '/icon.svg'

const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          login: email,
          password: password,
        }),
      })

      const data = await response.json()

      if (data.success) {
        localStorage.setItem('auth_token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        onLogin(data.user)
      } else {
        setError(data.message || 'Login failed')
      }
    } catch (error) {
      console.error('Login error:', error)
      setError('Network error. Please check if the backend server is running.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50/50 relative overflow-hidden font-mono">
      
      {/* --- Ambient Background Effects --- */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -inset-10 opacity-40">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-900/10 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-indigo-900/10 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-blue-800/10 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
        </div>
        
        {/* Floating Particles */}
        <div className="floating-element absolute top-10 left-10 w-4 h-4 bg-blue-900/10 rounded-full"></div>
        <div className="floating-element absolute bottom-20 right-20 w-6 h-6 bg-indigo-900/10 rounded-full"></div>
        <div className="floating-element absolute top-1/2 right-10 w-3 h-3 bg-blue-800/10 rounded-full"></div>
      </div>

      {/* --- Centered Login Card --- */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 w-full max-w-md px-4"
      >
        <div className="snake-border-card bg-white/80 backdrop-blur-xl shadow-2xl rounded-3xl">
          {/* Snake line elements for animated border */}
          <div className="snake-line"></div>
          <div className="snake-line"></div>
          <div className="snake-line"></div>
          <div className="snake-line"></div>
          
          {/* Motion Lines inside the card */}
          <div className="motion-lines opacity-50">
            <div className="motion-line"></div>
            <div className="motion-line"></div>
            <div className="motion-line"></div>
          </div>
          
          <div className="enhanced-card-content p-8 md:p-10">
            {/* Logo Section */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-center mb-8"
            >
              <div className="mb-6 relative inline-block">
                <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl transform scale-110"></div>
                <motion.img
                  src={logo}
                  alt=""
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring', stiffness: 260, damping: 18 }}
                  className="relative h-16 w-16 rounded-2xl shadow-lg"
                />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">
                Event Tracker
              </h1>
              <p className="text-gray-500 text-sm">
                Sign in to manage your events
              </p>
            </motion.div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3"
              >
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <p className="text-red-600 text-sm font-medium">{error}</p>
              </motion.div>
            )}

            {/* Login Form */}
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              onSubmit={handleLogin}
              className="space-y-6"
            >
              {/* Username or email */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">
                  Username or Email
                </label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 z-10 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                  <Input
                    type="text"
                    autoCapitalize="none"
                    autoCorrect="off"
                    placeholder="symond  or  name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="enhanced-input pl-12 h-12 bg-gray-50/50 border-gray-200 text-gray-900 placeholder-gray-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl transition-all duration-300"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">
                  Password
                </label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 z-10 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="enhanced-input pl-12 pr-12 h-12 bg-gray-50/50 border-gray-200 text-gray-900 placeholder-gray-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl transition-all duration-300"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors z-10"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Options */}
              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center space-x-2 text-sm text-gray-500 hover:text-gray-700 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input type="checkbox" className="peer h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500/20" />
                  </div>
                  <span className="group-hover:text-gray-700 transition-colors">Remember me</span>
                </label>
                <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline transition-all">
                  Forgot password?
                </a>
              </div>

              {/* Login Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="enhanced-button w-full h-12 bg-gradient-to-r from-blue-900 to-blue-800 hover:from-blue-800 hover:to-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 hover:shadow-blue-900/30 hover:-translate-y-0.5 transition-all duration-300"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <span>Sign In</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </Button>
            </motion.form>

            {/* Footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="mt-8 text-center"
            >
              <p className="text-xs text-gray-400">
                © {new Date().getFullYear()} Event Tracker. All rights reserved.
              </p>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default LoginPage