import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Warehouse, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useLogin } from '../hooks/useApi'
import { useAuthStore } from '../store/auth.store'

export default function LoginPage() {
  const [email, setEmail] = useState('admin@warehouse.com')
  const [password, setPassword] = useState('password123')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')

  const navigate = useNavigate()
  const location = useLocation()
  const { setAuth } = useAuthStore()
  const { mutate: login, isPending } = useLogin()

  const successMessage = location.state?.message

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    login(
      { email, password },
      {
        onSuccess: (data) => {
          setAuth(data.token, data.user)
          navigate('/dashboard')
        },
        onError: (err: any) => {
          setError(err.response?.data?.error || 'Login failed. Please try again.')
        },
      }
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] p-12 bg-gradient-to-br from-slate-900 to-slate-800 border-r border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center">
            <Warehouse className="w-5 h-5 text-slate-900" />
          </div>
          <span className="text-white font-semibold text-lg">WarehouseOS</span>
        </div>

        <div>
          <h1 className="text-4xl font-bold text-white leading-tight tracking-tight">
            Manage your
            <br />
            <span className="text-slate-400">inventory</span>
            <br />
            with confidence.
          </h1>
          <p className="mt-4 text-slate-400 text-sm leading-relaxed">
            Real-time stock tracking, intelligent alerts, and seamless warehouse operations — all in one place.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-4">
            {[
              { label: 'Stock Accuracy', value: '99.8%' },
              { label: 'Avg. Processing', value: '< 2min' },
              { label: 'Warehouses', value: 'Multi-site' },
              { label: 'Real-time Sync', value: 'Live' },
            ].map((stat) => (
              <div key={stat.label} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <p className="text-slate-400 text-xs">{stat.label}</p>
                <p className="text-white font-semibold mt-1">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-slate-600 text-xs">© 2025 WarehouseOS. All rights reserved.</p>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center">
              <Warehouse className="w-5 h-5 text-slate-900" />
            </div>
            <span className="text-white font-semibold text-lg">WarehouseOS</span>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Sign in</h2>
            <p className="text-slate-400 text-sm mt-1">Access your warehouse dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {successMessage && !error && (
              <div className="flex items-center gap-3 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <AlertCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <p className="text-emerald-400 text-sm">{successMessage}</p>
              </div>
            )}
            {error && (
              <div className="flex items-center gap-3 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all text-sm"
                placeholder="admin@warehouse.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all text-sm pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-white hover:bg-slate-100 text-slate-900 font-semibold py-3 rounded-xl transition-all duration-150 text-sm disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-slate-400 border-t-slate-800 rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="text-slate-600 text-xs text-center mt-8">
            Demo: admin@warehouse.com / password123
          </p>
          <p className="text-center text-sm text-slate-500 mt-4">
            Don't have an account?{' '}
            <a href="/register" className="text-white hover:underline font-medium">
              Create an account
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
