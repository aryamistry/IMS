import { useState } from 'react'
import { Plus, Mail, Phone, MapPin } from 'lucide-react'
import { useSuppliers, useCreateSupplier } from '../hooks/useApi'
import { DataTable, Modal, PageHeader, LoadingSpinner } from '../components/ui'
import type { Supplier } from '../types'

export default function SuppliersPage() {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' })
  const [error, setError] = useState('')

  const { data: suppliers = [], isLoading } = useSuppliers()
  const { mutate: createSupplier, isPending } = useCreateSupplier()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    createSupplier(
      { name: form.name, email: form.email || undefined, phone: form.phone || undefined, address: form.address || undefined },
      {
        onSuccess: () => {
          setShowModal(false)
          setForm({ name: '', email: '', phone: '', address: '' })
        },
        onError: (err: any) => setError(err.response?.data?.error || 'Failed to create supplier'),
      }
    )
  }

  const columns = [
    { key: 'name', header: 'Supplier', sortable: true, render: (s: Supplier) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-slate-600">{s.name.charAt(0).toUpperCase()}</span>
        </div>
        <span className="font-medium text-slate-800">{s.name}</span>
      </div>
    )},
    { key: 'email', header: 'Email', render: (s: Supplier) => s.email ? (
      <a href={`mailto:${s.email}`} className="flex items-center gap-1.5 text-slate-600 hover:text-slate-800 transition-colors">
        <Mail className="w-3.5 h-3.5 text-slate-400" />
        {s.email}
      </a>
    ) : <span className="text-slate-300">—</span>},
    { key: 'phone', header: 'Phone', render: (s: Supplier) => s.phone ? (
      <div className="flex items-center gap-1.5 text-slate-600">
        <Phone className="w-3.5 h-3.5 text-slate-400" />
        {s.phone}
      </div>
    ) : <span className="text-slate-300">—</span>},
    { key: 'address', header: 'Address', render: (s: Supplier) => s.address ? (
      <div className="flex items-center gap-1.5 text-slate-600">
        <MapPin className="w-3.5 h-3.5 text-slate-400" />
        <span className="truncate max-w-[200px]">{s.address}</span>
      </div>
    ) : <span className="text-slate-300">—</span>},
  ]

  if (isLoading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader
        title="Suppliers"
        subtitle={`${suppliers.length} registered suppliers`}
        action={
          <button className="btn-primary" onClick={() => { setError(''); setShowModal(true) }}>
            <Plus className="w-4 h-4" /> Add Supplier
          </button>
        }
      />

      <DataTable
        data={suppliers}
        columns={columns}
        searchKeys={['name', 'email']}
        emptyMessage="No suppliers yet. Add your first supplier."
      />

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Supplier">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}

          <div>
            <label className="label">Supplier Name *</label>
            <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. Acme Corp" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="contact@supplier.com" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 555 000 0000" />
            </div>
          </div>

          <div>
            <label className="label">Address</label>
            <textarea className="input resize-none" rows={2} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Street, City, Country" />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" className="btn-secondary flex-1" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={isPending}>
              {isPending ? 'Creating...' : 'Add Supplier'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
