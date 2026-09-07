import { useState } from 'react'
import { Plus, Trash2, Edit2 } from 'lucide-react'
import { useDeliveries, useCreateDelivery, useUpdateDelivery, useWarehouses, useProducts, useStock } from '../hooks/useApi'
import { DataTable, Modal, PageHeader, LoadingSpinner, StatusBadge } from '../components/ui'
import { format } from 'date-fns'

interface LineItem {
  productId: string
  locationId: string
  quantity: string
}

export default function DeliveriesPage() {
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState({ warehouseId: '', customerName: '', date: format(new Date(), 'yyyy-MM-dd'), notes: '' })
  const [items, setItems] = useState<LineItem[]>([{ productId: '', locationId: '', quantity: '' }])
  const [error, setError] = useState('')

  const { data: deliveries = [], isLoading } = useDeliveries()
  const { data: warehouses = [] } = useWarehouses()
  const { data: products = [] } = useProducts()
  const { data: stockBalances = [] } = useStock()
  const { mutate: createDelivery, isPending: isCreating } = useCreateDelivery()
  const { mutate: updateDelivery, isPending: isUpdating } = useUpdateDelivery()
  const isPending = isCreating || isUpdating

  const selectedWarehouse = warehouses.find((w: any) => String(w.id) === form.warehouseId)
  const locations = (selectedWarehouse as any)?.locations || []

  // For a selected product + location, get available stock
  const getAvailableStock = (productId: string, locationId: string) => {
    const sb = stockBalances.find((s: any) => String(s.product_id) === productId && String(s.location_id) === locationId)
    return sb ? Number((sb as any).quantity) : 0
  }

  const addItem = () => setItems(prev => [...prev, { productId: '', locationId: '', quantity: '' }])
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i))
  const updateItem = (i: number, field: keyof LineItem, value: string) =>
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item))

  const openModal = (delivery?: any) => {
    if (delivery) {
      setEditId(delivery.id)
      setForm({
        warehouseId: String(delivery.warehouse_id || ''),
        customerName: delivery.customer_name || '',
        date: format(new Date(delivery.created_at), 'yyyy-MM-dd'),
        notes: '',
      })
      setItems(delivery.delivery_items?.map((i: any) => ({
        productId: String(i.product_id),
        locationId: String(i.location_id),
        quantity: String(i.quantity),
      })) || [{ productId: '', locationId: '', quantity: '' }])
    } else {
      setEditId(null)
      setForm({ warehouseId: String(warehouses[0]?.id || ''), customerName: '', date: format(new Date(), 'yyyy-MM-dd'), notes: '' })
      setItems([{ productId: '', locationId: '', quantity: '' }])
    }
    setError('')
    setShowModal(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const validItems = items.filter(i => i.productId && i.locationId && i.quantity)
    if (!validItems.length) { setError('Add at least one item.'); return }

    const payload = {
      warehouseId: parseInt(form.warehouseId),
      customerName: form.customerName,
      date: form.date,
      notes: form.notes || undefined,
      items: validItems.map(i => ({
        productId: parseInt(i.productId),
        locationId: parseInt(i.locationId),
        quantity: parseFloat(i.quantity),
      })),
    }

    if (editId) {
      updateDelivery({ id: editId, ...payload }, {
        onSuccess: () => setShowModal(false),
        onError: (err: any) => setError(err.response?.data?.error || 'Failed to update delivery'),
      })
    } else {
      createDelivery(payload, {
        onSuccess: () => setShowModal(false),
        onError: (err: any) => setError(err.response?.data?.error || 'Failed to create delivery'),
      })
    }
  }

  const columns = [
    { key: 'reference_no', header: 'Reference', render: (d: any) => (
      <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">{d.reference_no}</span>
    )},
    { key: 'customer', header: 'Supplier/Customer', render: (d: any) => (
      <span className="font-medium text-slate-700">{d.customer_name || '—'}</span>
    )},
    { key: 'warehouse', header: 'Warehouse', render: (d: any) => d.warehouses?.name || '—' },
    { key: 'date', header: 'Date', render: (d: any) => {
      try { return format(new Date(d.created_at), 'MMM d, yyyy') } catch { return '—' }
    }},
    { key: 'items', header: 'Items', render: (d: any) => (
      <span className="badge-slate">{d.delivery_items?.length || 0} line items</span>
    )},
    { key: 'status', header: 'Status', render: (d: any) => <StatusBadge status={d.status || 'draft'} /> },
    { key: 'user', header: 'Created By', render: (d: any) => (
      <span className="text-slate-500 text-xs">{d.users?.name || '—'}</span>
    )},
    { key: 'actions', header: '', align: 'right' as const, render: (d: any) => (
      <button onClick={() => openModal(d)} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-500 transition-colors">
        <Edit2 className="w-3.5 h-3.5" />
      </button>
    )},
  ]

  if (isLoading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader
        title="Deliveries"
        subtitle="Outgoing stock delivery orders"
        action={
          <button className="btn-primary" onClick={() => openModal()}>
            <Plus className="w-4 h-4" /> New Delivery
          </button>
        }
      />

      <DataTable
        data={deliveries}
        columns={columns}
        searchKeys={['reference_no'] as any}
        emptyMessage="No deliveries yet."
      />

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editId ? "Edit Delivery Order" : "New Delivery Order"} size="xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Warehouse *</label>
              <select className="input" value={form.warehouseId} onChange={e => setForm(f => ({ ...f, warehouseId: e.target.value }))} required>
                <option value="">Select warehouse</option>
                {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Customer / Supplier</label>
              <input className="input" value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} placeholder="E.g. Acme Corp" />
            </div>
            <div>
              <label className="label">Date *</label>
              <input className="input" type="date" min={new Date().toISOString().split('T')[0]} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
            </div>
            <div className="col-span-2">
              <label className="label">Notes</label>
              <input className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="label mb-0">Line Items *</label>
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
                    <th className="table-header w-28">Quantity</th>
                    <th className="table-header w-32">Available</th>
                    <th className="table-header w-10" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => {
                    const avail = getAvailableStock(item.productId, item.locationId)
                    const over = item.quantity && parseFloat(item.quantity) > avail
                    return (
                      <tr key={i} className="border-b border-slate-100 last:border-0">
                        <td className="px-3 py-2">
                          <select className="input py-1.5" value={item.productId} onChange={e => updateItem(i, 'productId', e.target.value)} required>
                            <option value="">Select product</option>
                            {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select className="input py-1.5" value={item.locationId} onChange={e => updateItem(i, 'locationId', e.target.value)} required disabled={!form.warehouseId}>
                            <option value="">Select location</option>
                            {locations.map((l: any) => <option key={l.id} value={l.id}>{l.location_code || l.description || `Loc #${l.id}`}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            className={`input py-1.5 ${over ? 'border-red-300 focus:border-red-400' : ''}`}
                            type="number" min="0.01" step="0.01"
                            value={item.quantity}
                            onChange={e => updateItem(i, 'quantity', e.target.value)}
                            placeholder="0" required
                          />
                        </td>
                        <td className="px-3 py-2">
                          <span className={`text-sm font-medium ${over ? 'text-red-500' : 'text-emerald-600'}`}>
                            {item.productId && item.locationId ? avail.toLocaleString() : '—'}
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
              {isPending ? 'Saving...' : editId ? 'Save Changes' : 'Create Delivery'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
