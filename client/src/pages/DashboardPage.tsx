import { Package, Warehouse, Users, BarChart3, AlertTriangle, TrendingUp } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { useDashboard } from '../hooks/useApi'
import { StatCard, MoveBadge, LoadingSpinner } from '../components/ui'
import { format } from 'date-fns'

const COLORS = ['#1e293b', '#475569', '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0', '#f1f5f9', '#f8fafc']

export default function DashboardPage() {
  const { data: stats, isLoading, error } = useDashboard()

  if (isLoading) return <LoadingSpinner />
  if (error) return <div className="text-red-500">Failed to load dashboard</div>
  if (!stats) return null

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {format(new Date(), 'EEEE, MMMM do yyyy')} — Live inventory overview
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Products"
          value={stats.totalProducts}
          icon={<Package className="w-5 h-5 text-slate-700" />}
          iconBg="bg-slate-100"
          subtitle="SKUs in system"
        />
        <StatCard
          title="Total Stock"
          value={Number(stats.totalStock || 0).toLocaleString()}
          icon={<TrendingUp className="w-5 h-5 text-emerald-700" />}
          iconBg="bg-emerald-50"
          subtitle="Units across all locations"
        />
        <StatCard
          title="Low Stock Alerts"
          value={stats.lowStockAlerts}
          icon={<AlertTriangle className="w-5 h-5 text-orange-600" />}
          iconBg="bg-orange-50"
          subtitle="Below reorder level"
        />
        <StatCard
          title="Warehouses"
          value={stats.totalWarehouses}
          icon={<Warehouse className="w-5 h-5 text-blue-700" />}
          iconBg="bg-blue-50"
          subtitle={`${stats.totalSuppliers} active suppliers`}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Movement trend - takes 2/3 */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="section-title">Stock Movement Trend</h2>
              <p className="text-xs text-slate-400 mt-0.5">Last 7 days — Receipts vs Deliveries</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                <span className="text-slate-500">Receipts</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-red-400" />
                <span className="text-slate-500">Deliveries</span>
              </div>
            </div>
          </div>
          {stats.movementTrend && stats.movementTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={stats.movementTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReceipts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorDeliveries" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f87171" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickFormatter={(v) => {
                    try { return format(new Date(v), 'MMM d') } catch { return v }
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value: any, name: any) => [Number(value).toLocaleString(), name === 'receipts' ? 'Receipts' : 'Deliveries']}
                  labelFormatter={(label) => { try { return format(new Date(label), 'MMM d, yyyy') } catch { return label } }}
                />
                <Area type="monotone" dataKey="receipts" stroke="#10b981" strokeWidth={2} fill="url(#colorReceipts)" />
                <Area type="monotone" dataKey="deliveries" stroke="#f87171" strokeWidth={2} fill="url(#colorDeliveries)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-slate-400 text-sm">
              No movement data yet
            </div>
          )}
        </div>

        {/* Category distribution - takes 1/3 */}
        <div className="card p-5">
          <div className="mb-5">
            <h2 className="section-title">Stock by Category</h2>
            <p className="text-xs text-slate-400 mt-0.5">Inventory distribution</p>
          </div>
          {stats.categoryStock && stats.categoryStock.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={stats.categoryStock}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={85}
                  dataKey="total"
                  nameKey="category"
                  paddingAngle={2}
                >
                  {stats.categoryStock.map((_: any, index: number) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(v: any) => [Number(v).toLocaleString() + ' units']}
                />
                <Legend
                  iconType="circle"
                  iconSize={6}
                  formatter={(value: any) => <span style={{ fontSize: 11, color: '#64748b' }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-slate-400 text-sm">
              No stock data yet
            </div>
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="section-title">Recent Activity</h2>
            <p className="text-xs text-slate-400 mt-0.5">Latest stock movements</p>
          </div>
          <BarChart3 className="w-4 h-4 text-slate-400" />
        </div>

        {!stats.recentMoves || stats.recentMoves.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            No stock movements yet
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {stats.recentMoves.map((move: any, i: number) => (
              <div
                key={i}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/50 transition-colors"
              >
                {/* Type indicator */}
                <div className={`w-1.5 h-8 rounded-full flex-shrink-0 ${
                  move.move_type === 'receipt' ? 'bg-emerald-400' :
                  move.move_type === 'delivery' ? 'bg-red-400' :
                  move.move_type === 'transfer' ? 'bg-blue-400' : 'bg-orange-400'
                }`} />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">
                    {move.products?.name ?? 'Unknown product'}
                  </p>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-semibold ${Number(move.quantity) > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {Number(move.quantity) > 0 ? '+' : ''}{Number(move.quantity).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {(() => {
                      try { return format(new Date(move.created_at), 'MMM d, HH:mm') }
                      catch { return '' }
                    })()}
                  </p>
                </div>

                <MoveBadge type={move.move_type || ''} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
