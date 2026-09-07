import { useState } from 'react'
import { BarChart3, AlertTriangle, History } from 'lucide-react'
import { useStock, useLowStock, useStockHistory } from '../hooks/useApi'
import { DataTable, MoveBadge, PageHeader, LoadingSpinner } from '../components/ui'
import { format } from 'date-fns'
import clsx from 'clsx'

type Tab = 'current' | 'low' | 'history'

export default function StockPage() {
  const [tab, setTab] = useState<Tab>('current')
  const { data: stock = [], isLoading: loadingStock } = useStock()
  const { data: lowStock = [], isLoading: loadingLow } = useLowStock()
  const { data: history = [], isLoading: loadingHistory } = useStockHistory(100)

  const stockColumns = [
    { key: 'product', header: 'Product', sortable: true, render: (s: any) => (
      <div>
        <p className="font-medium text-slate-800">{s.products?.name || '—'}</p>
        <p className="text-xs font-mono text-slate-400">{s.products?.sku || ''}</p>
      </div>
    )},
    { key: 'category', header: 'Category', render: (s: any) => (
      <span className="badge-slate">{s.products?.product_categories?.category_name || '—'}</span>
    )},
    { key: 'warehouse', header: 'Warehouse', render: (s: any) => s.locations?.warehouses?.name || '—' },
    { key: 'location', header: 'Location', render: (s: any) => (
      <span className="text-slate-600">{s.locations?.location_code || s.locations?.description || '—'}</span>
    )},
    { key: 'quantity', header: 'Quantity', sortable: true, render: (s: any) => {
      const qty = Number(s.quantity || 0)
      const reorder = s.products?.reorder_level || 0
      const isLow = qty <= reorder
      return (
        <div className="flex items-center gap-2">
          <span className={clsx('font-semibold tabular-nums', isLow ? 'text-red-600' : 'text-slate-800')}>
            {qty.toLocaleString()}
          </span>
          <span className="text-slate-400 text-xs">{s.products?.units_of_measure?.symbol || ''}</span>
          {isLow && <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />}
        </div>
      )
    }},
    { key: 'reorder', header: 'Reorder At', render: (s: any) => (
      <span className="text-slate-400 text-sm">{s.products?.reorder_level || 0}</span>
    )},
  ]

  const lowStockColumns = [
    { key: 'name', header: 'Product', render: (s: any) => (
      <div>
        <p className="font-medium text-slate-800">{s.name}</p>
        <p className="text-xs font-mono text-slate-400">{s.sku}</p>
      </div>
    )},
    { key: 'categoryName', header: 'Category', render: (s: any) => (
      <span className="badge-slate">{s.categoryName}</span>
    )},
    { key: 'totalStock', header: 'Current Stock', render: (s: any) => (
      <span className="font-semibold text-red-600">{Number(s.totalStock).toLocaleString()}</span>
    )},
    { key: 'reorderLevel', header: 'Reorder Level', render: (s: any) => (
      <span className="text-slate-600">{s.reorderLevel}</span>
    )},
    { key: 'deficit', header: 'Deficit', render: (s: any) => (
      <span className="badge-red">−{(s.reorderLevel - Number(s.totalStock)).toLocaleString()}</span>
    )},
  ]

  const historyColumns = [
    { key: 'product', header: 'Product', render: (m: any) => (
      <span className="font-medium text-slate-800">{m.products?.name || '—'}</span>
    )},
    { key: 'moveType', header: 'Type', render: (m: any) => <MoveBadge type={m.move_type || ''} /> },
    { key: 'quantity', header: 'Quantity', render: (m: any) => (
      <span className={clsx('font-semibold tabular-nums', Number(m.quantity) > 0 ? 'text-emerald-600' : 'text-red-500')}>
        {Number(m.quantity) > 0 ? '+' : ''}{Number(m.quantity).toLocaleString()}
      </span>
    )},
    { key: 'created_at', header: 'Date & Time', render: (m: any) => (
      <span className="text-slate-500 text-xs">
        {(() => { try { return format(new Date(m.created_at), 'MMM d, yyyy HH:mm') } catch { return '—' } })()}
      </span>
    )},
  ]

  const tabs: { id: Tab; label: string; icon: any; count?: number }[] = [
    { id: 'current', label: 'Current Stock', icon: BarChart3, count: stock.length },
    { id: 'low', label: 'Low Stock', icon: AlertTriangle, count: lowStock.length },
    { id: 'history', label: 'Movement History', icon: History, count: history.length },
  ]

  return (
    <div>
      <PageHeader
        title="Stock"
        subtitle="Warehouse inventory levels and movement history"
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
        {tabs.map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150',
              tab === id
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
            {count !== undefined && (
              <span className={clsx(
                'text-xs px-1.5 py-0.5 rounded-full font-semibold',
                tab === id ? 'bg-slate-100 text-slate-600' : 'bg-slate-200 text-slate-500'
              )}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'current' && (
        loadingStock ? <LoadingSpinner /> :
        <DataTable
          data={stock}
          columns={stockColumns}
          searchKeys={[]}
          emptyMessage="No stock data. Start by creating receipts."
        />
      )}

      {tab === 'low' && (
        loadingLow ? <LoadingSpinner /> :
        lowStock.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <BarChart3 className="w-6 h-6 text-emerald-500" />
            </div>
            <p className="font-medium text-slate-700">All stock levels are healthy</p>
            <p className="text-sm text-slate-400 mt-1">No products are below their reorder level</p>
          </div>
        ) : (
          <DataTable
            data={lowStock}
            columns={lowStockColumns}
            searchKeys={['name'] as any}
            emptyMessage="No low stock items."
          />
        )
      )}

      {tab === 'history' && (
        loadingHistory ? <LoadingSpinner /> :
        <DataTable
          data={history}
          columns={historyColumns}
          searchKeys={[]}
          emptyMessage="No movement history yet."
        />
      )}
    </div>
  )
}
