import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Warehouse, Eye, EyeOff, AlertCircle, UserPlus } from 'lucide-react'
import { useRegister } from '../hooks/useApi'
import { useAuthStore } from '../store/auth.store'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')

  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const { mutate: register, isPending } = useRegister()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    register(
      { name, email, password },
      {
        onSuccess: (data) => {
          navigate('/login', { state: { message: 'Account created successfully. Please sign in.' } })
        },
        onError: (err: any) => {
          setError(err.response?.data?.error || 'Registration failed. Please try again.')
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
          <span className="text-white font-bold text-lg tracking-tight">WarehouseOS</span>
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Join the team,<br />
            <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              start managing
            </span><br />
            your inventory.
          </h1>
          <p className="text-slate-400 text-base leading-relaxed max-w-sm">
            Create your account to access real-time stock tracking, intelligent alerts, and seamless warehouse operations.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Stock Accuracy', value: '99.8%' },
            { label: 'Avg. Processing', value: '< 2min' },
            { label: 'Warehouses', value: 'Multi-site' },
            { label: 'Real-time Sync', value: 'Live' },
          ].map(({ label, value }) => (
            <div key={label} className="px-4 py-3 rounded-xl border border-slate-600/50 bg-slate-800/50">
              <p className="text-slate-400 text-xs">{label}</p>
              <p className="text-white font-semibold text-sm mt-1">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center">
              <Warehouse className="w-5 h-5 text-slate-900" />
            </div>
            <span className="text-white font-bold text-lg">WarehouseOS</span>
          </div>

          <div className="mb-8">
            <h2 className="text-white text-2xl font-bold">Create Account</h2>
            <p className="text-slate-400 text-sm mt-1">Fill in your details to get started</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/30 focus:border-slate-500 transition-all text-sm"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/30 focus:border-slate-500 transition-all text-sm"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 pr-12 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/30 focus:border-slate-500 transition-all text-sm"
                  placeholder="Minimum 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/30 focus:border-slate-500 transition-all text-sm"
                placeholder="Re-enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3 bg-white text-slate-900 rounded-xl font-semibold text-sm hover:bg-slate-100 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-400 border-t-slate-900 rounded-full animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Create Account
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-white hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
