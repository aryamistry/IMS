import { Bell, Search } from 'lucide-react'
import { useAuthStore } from '../../store/auth.store'
import { useDashboard } from '../../hooks/useApi'

export default function Header() {
  const { user } = useAuthStore()
  const { data: stats } = useDashboard()

  return (
    <header className="fixed top-0 left-[240px] right-0 h-[60px] bg-white border-b border-slate-200 flex items-center justify-between px-6 z-20">
      {/* Search */}
      <div className="relative w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search products, receipts..."
          className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-800/10 focus:border-slate-300 transition-all"
        />
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-4">
        {/* Low stock alert */}
        {stats && stats.lowStockAlerts > 0 && (
          <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-xs text-orange-700 font-medium">
              {stats.lowStockAlerts} low stock {stats.lowStockAlerts === 1 ? 'alert' : 'alerts'}
            </span>
          </div>
        )}

        {/* Notifications */}
        <button className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
          <Bell className="w-4 h-4" />
          {stats && stats.lowStockAlerts > 0 && (
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
          )}
        </button>

        {/* User */}
        <div className="flex items-center gap-2.5 pl-4 border-l border-slate-200">
          <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center">
            <span className="text-white text-xs font-semibold">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-700">{user?.name}</p>
            <p className="text-[10px] text-slate-400">Admin</p>
          </div>
        </div>
      </div>
    </header>
  )
}
