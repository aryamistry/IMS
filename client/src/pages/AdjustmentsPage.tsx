import { useState } from 'react'
import { Plus, Trash2, SlidersHorizontal } from 'lucide-react'
import { useAdjustments, useCreateAdjustment, useWarehouses, useProducts, useStock } from '../hooks/useApi'
import { DataTable, Modal, PageHeader, LoadingSpinner, StatusBadge } from '../components/ui'
import { format } from 'date-fns'

interface AdjItem {
  productId: string
  locationId: string
  countedQty: string
}

export default function AdjustmentsPage() {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ warehouseId: '', date: format(new Date(), 'yyyy-MM-dd'), notes: '' })
  const [items, setItems] = useState<AdjItem[]>([{ productId: '', locationId: '', countedQty: '' }])
  const [error, setError] = useState('')

  const { data: adjustments = [], isLoading } = useAdjustments()
  const { data: warehouses = [] } = useWarehouses()
  const { data: products = [] } = useProducts()
  const { data: stockBalances = [] } = useStock()
  const { mutate: createAdjustment, isPending } = useCreateAdjustment()

  const selectedWarehouse = warehouses.find((w: any) => String(w.id) === form.warehouseId) as any
  const locations = selectedWarehouse?.locations || []

  const getCurrentStock = (productId: string, locationId: string) => {
    const sb = stockBalances.find(
      (s: any) => String(s.product_id) === productId && String(s.location_id) === locationId
    )
    return sb ? Number((sb as any).quantity) : 0
  }

  const addItem = () => setItems(prev => [...prev, { productId: '', locationId: '', countedQty: '' }])
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i))
  const updateItem = (i: number, field: keyof AdjItem, value: string) =>
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item))

  const openModal = () => {
    setForm({ warehouseId: '', date: format(new Date(), 'yyyy-MM-dd'), notes: '' })
    setItems([{ productId: '', locationId: '', countedQty: '' }])
    setError('')
    setShowModal(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const validItems = items.filter(i => i.productId && i.locationId && i.countedQty !== '')
    if (!validItems.length) { setError('Add at least one item with product, location, and counted quantity.'); return }

    createAdjustment({
      date: form.date,
      notes: form.notes || undefined,
      items: validItems.map(i => ({
        productId: parseInt(i.productId),
        locationId: parseInt(i.locationId),
        countedQty: parseFloat(i.countedQty),
      })),
    }, {
      onSuccess: () => setShowModal(false),
      onError: (err: any) => setError(err.response?.data?.error || 'Failed to create adjustment'),
    })
  }

  const columns = [
    { key: 'reference_no', header: 'Reference', render: (a: any) => (
      <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">{a.reference_no}</span>
    )},
    { key: 'date', header: 'Date', render: (a: any) => {
      try { return format(new Date(a.created_at), 'MMM d, yyyy') } catch { return '—' }
    }},
    { key: 'items', header: 'Items Adjusted', render: (a: any) => (
      <span className="badge-orange">{a.adjustment_items?.length || 0} products</span>
    )},
    { key: 'notes', header: 'Notes', render: (a: any) => (
      <span className="text-slate-500 text-xs">{a.notes || '—'}</span>
    )},
    { key: 'status', header: 'Status', render: (a: any) => <StatusBadge status={a.status || 'done'} /> },
    { key: 'user', header: 'By', render: (a: any) => (
      <span className="text-slate-500 text-xs">{a.users?.name || '—'}</span>
    )},
  ]

  if (isLoading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader
        title="Stock Adjustments"
        subtitle="Correct stock levels by entering physically counted quantities"
        action={
          <button className="btn-primary" onClick={openModal}>
            <Plus className="w-4 h-4" /> New Adjustment
          </button>
        }
      />

      {adjustments.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <SlidersHorizontal className="w-6 h-6 text-orange-500" />
          </div>
          <p className="font-medium text-slate-700">No adjustments yet</p>
          <p className="text-sm text-slate-400 mt-1">Create an adjustment to reconcile physical stock counts with system records.</p>
        </div>
      ) : (
        <DataTable
          data={adjustments}
          columns={columns}
          searchKeys={['reference_no'] as any}
          emptyMessage="No adjustments yet."
        />
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Stock Adjustment" size="xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
            <strong>How it works:</strong> Enter the <em>physically counted quantity</em> for each product+location. The system will calculate the difference and update stock levels automatically.
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Warehouse (for location filter)</label>
              <select className="input" value={form.warehouseId} onChange={e => setForm(f => ({ ...f, warehouseId: e.target.value }))}>
                <option value="">All warehouses</option>
                {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date *</label>
              <input className="input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
            </div>
            <div className="col-span-2">
              <label className="label">Notes</label>
              <input className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. Annual stocktake — Zone A" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="label mb-0">Items to Adjust *</label>
              <button type="button" className="btn-secondary text-xs py-1.5" onClick={addItem}>
                <Plus className="w-3.5 h-3.5" /> Add Item
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="table-header">Product</th>
                    <th className="table-header">Location</th>
                    <th className="table-header w-28">System Qty</th>
                    <th className="table-header w-28">Counted Qty</th>
                    <th className="table-header w-24">Difference</th>
                    <th className="table-header w-10" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => {
                    const currentStock = getCurrentStock(item.productId, item.locationId)
                    const counted = item.countedQty !== '' ? parseFloat(item.countedQty) : null
                    const diff = counted !== null ? counted - currentStock : null
                    return (
                      <tr key={i} className="border-b border-slate-100 last:border-0">
                        <td className="px-3 py-2">
                          <select className="input py-1.5" value={item.productId} onChange={e => updateItem(i, 'productId', e.target.value)}>
                            <option value="">Select product</option>
                            {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select className="input py-1.5" value={item.locationId} onChange={e => updateItem(i, 'locationId', e.target.value)}>
                            <option value="">Select location</option>
                            {(form.warehouseId ? locations : warehouses.flatMap((w: any) => w.locations || [])).map((l: any) => (
                              <option key={l.id} value={l.id}>{l.location_code || l.description || `Loc #${l.id}`}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-slate-600 text-sm font-medium">
                            {item.productId && item.locationId ? currentStock.toLocaleString() : '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            className="input py-1.5"
                            type="number" min="0" step="0.01"
                            value={item.countedQty}
                            onChange={e => updateItem(i, 'countedQty', e.target.value)}
                            placeholder="0"
                          />
                        </td>
                        <td className="px-3 py-2">
                          {diff !== null ? (
                            <span className={`text-sm font-semibold ${diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                              {diff > 0 ? '+' : ''}{diff.toLocaleString()}
                            </span>
                          ) : <span className="text-slate-400 text-sm">—</span>}
                        </td>
                        <td className="px-3 py-2">
                          {items.length > 1 && (
                            <button type="button" onClick={() => removeItem(i)} className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-500 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" className="btn-secondary flex-1" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={isPending}>
              {isPending ? 'Saving...' : 'Apply Adjustment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
