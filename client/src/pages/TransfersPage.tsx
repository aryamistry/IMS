import { useState } from 'react'
import { Plus, Trash2, ArrowRight } from 'lucide-react'
import { useTransfers, useCreateTransfer, useWarehouses, useProducts, useStock } from '../hooks/useApi'
import { DataTable, Modal, PageHeader, LoadingSpinner, StatusBadge } from '../components/ui'
import { format } from 'date-fns'

interface LineItem {
  productId: string
  fromLocationId: string
  toLocationId: string
  quantity: string
}

export default function TransfersPage() {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ fromWarehouseId: '', toWarehouseId: '', date: format(new Date(), 'yyyy-MM-dd'), notes: '' })
  const [items, setItems] = useState<LineItem[]>([{ productId: '', fromLocationId: '', toLocationId: '', quantity: '' }])
  const [error, setError] = useState('')

  const { data: transfers = [], isLoading } = useTransfers()
  const { data: warehouses = [] } = useWarehouses()
  const { data: products = [] } = useProducts()
  const { data: stockBalances = [] } = useStock()
  const { mutate: createTransfer, isPending } = useCreateTransfer()

  const fromWarehouse = warehouses.find((w: any) => String(w.id) === form.fromWarehouseId) as any
  const toWarehouse = warehouses.find((w: any) => String(w.id) === form.toWarehouseId) as any

  const getAvailableStock = (productId: string, locationId: string) => {
    const sb = stockBalances.find((s: any) => String(s.product_id) === productId && String(s.location_id) === locationId)
    return sb ? Number((sb as any).quantity) : 0
  }

  const addItem = () => setItems(prev => [...prev, { productId: '', fromLocationId: '', toLocationId: '', quantity: '' }])
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i))
  const updateItem = (i: number, field: keyof LineItem, value: string) =>
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item))

  const openModal = () => {
    setForm({ fromWarehouseId: '', toWarehouseId: '', date: format(new Date(), 'yyyy-MM-dd'), notes: '' })
    setItems([{ productId: '', fromLocationId: '', toLocationId: '', quantity: '' }])
    setError('')
    setShowModal(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (form.fromWarehouseId === form.toWarehouseId) {
      setError('Source and destination warehouses must be different.')
      return
    }
    const validItems = items.filter(i => i.productId && i.fromLocationId && i.toLocationId && i.quantity)
    if (!validItems.length) { setError('Add at least one complete item.'); return }

    createTransfer({
      fromWarehouseId: parseInt(form.fromWarehouseId),
      toWarehouseId: parseInt(form.toWarehouseId),
      date: form.date,
      notes: form.notes || undefined,
      items: validItems.map(i => ({
        productId: parseInt(i.productId),
        fromLocationId: parseInt(i.fromLocationId),
        toLocationId: parseInt(i.toLocationId),
        quantity: parseFloat(i.quantity),
      })),
    }, {
      onSuccess: () => setShowModal(false),
      onError: (err: any) => setError(err.response?.data?.error || 'Transfer failed'),
    })
  }

  const columns = [
    { key: 'reference_no', header: 'Reference', render: (t: any) => (
      <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">{t.reference_no}</span>
    )},
    { key: 'route', header: 'Route', render: (t: any) => (
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium text-slate-700">{t.warehouses_transfers_from_warehouseTowarehouses?.name || '—'}</span>
        <ArrowRight className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
        <span className="font-medium text-slate-700">{t.warehouses_transfers_to_warehouseTowarehouses?.name || '—'}</span>
      </div>
    )},
    { key: 'date', header: 'Date', render: (t: any) => {
      try { return format(new Date(t.created_at), 'MMM d, yyyy') } catch { return '—' }
    }},
    { key: 'items', header: 'Items', render: (t: any) => (
      <span className="badge-blue">{t.transfer_items?.length || 0} products</span>
    )},
    { key: 'status', header: 'Status', render: (t: any) => <StatusBadge status={t.status || 'draft'} /> },
  ]

  if (isLoading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader
        title="Transfers"
        subtitle="Move stock between warehouses"
        action={
          <button className="btn-primary" onClick={openModal}>
            <Plus className="w-4 h-4" /> New Transfer
          </button>
        }
      />

      <DataTable
        data={transfers}
        columns={columns}
        searchKeys={['reference_no'] as any}
        emptyMessage="No transfers yet."
      />

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Transfer" size="xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}

          <div className="grid grid-cols-3 gap-4 items-end">
            <div>
              <label className="label">From Warehouse *</label>
              <select className="input" value={form.fromWarehouseId} onChange={e => setForm(f => ({ ...f, fromWarehouseId: e.target.value }))} required>
                <option value="">Select source</option>
                {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div className="flex justify-center pb-2">
              <div className="flex items-center gap-2 text-slate-400">
                <div className="h-px w-8 bg-slate-200" />
                <ArrowRight className="w-4 h-4 text-blue-400" />
                <div className="h-px w-8 bg-slate-200" />
              </div>
            </div>
            <div>
              <label className="label">To Warehouse *</label>
              <select className="input" value={form.toWarehouseId} onChange={e => setForm(f => ({ ...f, toWarehouseId: e.target.value }))} required>
                <option value="">Select destination</option>
                {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Date *</label>
              <input className="input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Notes</label>
              <input className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="label mb-0">Items to Transfer *</label>
              <button type="button" className="btn-secondary text-xs py-1.5" onClick={addItem}>
                <Plus className="w-3.5 h-3.5" /> Add Item
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="table-header">Product</th>
                    <th className="table-header">From Location</th>
                    <th className="table-header">To Location</th>
                    <th className="table-header w-28">Quantity</th>
                    <th className="table-header w-28">Available</th>
                    <th className="table-header w-10" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => {
                    const avail = getAvailableStock(item.productId, item.fromLocationId)
                    const over = item.quantity && parseFloat(item.quantity) > avail
                    return (
                      <tr key={i} className="border-b border-slate-100 last:border-0">
                        <td className="px-3 py-2">
                          <select className="input py-1.5" value={item.productId} onChange={e => updateItem(i, 'productId', e.target.value)}>
                            <option value="">Product</option>
                            {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select className="input py-1.5" value={item.fromLocationId} onChange={e => updateItem(i, 'fromLocationId', e.target.value)} disabled={!fromWarehouse}>
                            <option value="">From</option>
                            {fromWarehouse?.locations?.map((l: any) => <option key={l.id} value={l.id}>{l.location_code || l.description || `Loc #${l.id}`}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select className="input py-1.5" value={item.toLocationId} onChange={e => updateItem(i, 'toLocationId', e.target.value)} disabled={!toWarehouse}>
                            <option value="">To</option>
                            {toWarehouse?.locations?.map((l: any) => <option key={l.id} value={l.id}>{l.location_code || l.description || `Loc #${l.id}`}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            className={`input py-1.5 ${over ? 'border-red-300' : ''}`}
                            type="number" min="0.01" step="0.01"
                            value={item.quantity}
                            onChange={e => updateItem(i, 'quantity', e.target.value)}
                            placeholder="0"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <span className={`text-sm font-medium ${over ? 'text-red-500' : 'text-emerald-600'}`}>
                            {item.productId && item.fromLocationId ? avail.toLocaleString() : '—'}
                          </span>
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
              {isPending ? 'Processing...' : 'Execute Transfer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
