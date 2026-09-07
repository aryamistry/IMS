import { useState } from 'react'
import { Plus, ChevronDown, ChevronRight, Warehouse, MapPin, User, Mail, ShieldCheck } from 'lucide-react'
import { useWarehouses, useCreateWarehouse, useCreateLocation } from '../hooks/useApi'
import { PageHeader, LoadingSpinner, Modal } from '../components/ui'
import { useAuthStore } from '../store/auth.store'

export default function SettingsPage() {
  const { user } = useAuthStore()
  const { data: warehouses = [], isLoading } = useWarehouses()
  const { mutate: createWarehouse, isPending: creatingWarehouse } = useCreateWarehouse()
  const { mutate: createLocation, isPending: creatingLocation } = useCreateLocation()

  // Warehouse create modal
  const [showWhModal, setShowWhModal] = useState(false)
  const [whForm, setWhForm] = useState({ name: '', address: '' })
  const [whError, setWhError] = useState('')

  // Location inline state: { [warehouseId]: { open, locationCode, description, error } }
  const [locForms, setLocForms] = useState<Record<number, { open: boolean; locationCode: string; description: string; error: string }>>({})
  
  // Warehouse expand/collapse
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})

  const handleCreateWarehouse = (e: React.FormEvent) => {
    e.preventDefault()
    setWhError('')
    if (!whForm.name.trim()) { setWhError('Name is required'); return }
    createWarehouse({ name: whForm.name, address: whForm.address || undefined }, {
      onSuccess: () => { setShowWhModal(false); setWhForm({ name: '', address: '' }) },
      onError: (err: any) => setWhError(err.response?.data?.error || 'Failed to create warehouse'),
    })
  }

  const toggleLocForm = (warehouseId: number) => {
    setLocForms(prev => ({
      ...prev,
      [warehouseId]: prev[warehouseId]
        ? { ...prev[warehouseId], open: !prev[warehouseId].open }
        : { open: true, locationCode: '', description: '', error: '' },
    }))
  }

  const updateLocField = (warehouseId: number, field: string, value: string) => {
    setLocForms(prev => ({ ...prev, [warehouseId]: { ...prev[warehouseId], [field]: value } }))
  }

  const handleAddLocation = (warehouseId: number) => {
    const form = locForms[warehouseId]
    if (!form?.locationCode?.trim()) {
      setLocForms(prev => ({ ...prev, [warehouseId]: { ...prev[warehouseId], error: 'Location code is required' } }))
      return
    }
    createLocation(
      { warehouseId, locationCode: form.locationCode, description: form.description || undefined },
      {
        onSuccess: () => setLocForms(prev => ({
          ...prev,
          [warehouseId]: { open: false, locationCode: '', description: '', error: '' },
        })),
        onError: (err: any) => setLocForms(prev => ({
          ...prev,
          [warehouseId]: { ...prev[warehouseId], error: err.response?.data?.error || 'Failed to add location' },
        })),
      }
    )
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="max-w-3xl space-y-6">
      {/* ── Warehouse management ──────────────────────────────── */}
      <PageHeader
        title="Settings"
        subtitle="Warehouse & location management"
        action={
          <button className="btn-primary" onClick={() => setShowWhModal(true)}>
            <Plus className="w-4 h-4" /> New Warehouse
          </button>
        }
      />

      <div className="space-y-3">
        {warehouses.length === 0 && (
          <div className="card p-8 text-center text-slate-400 text-sm">
            No warehouses yet. Create your first warehouse above.
          </div>
        )}
        {warehouses.map((wh: any) => {
          const isExpanded = expanded[wh.id] ?? true
          const locForm = locForms[wh.id]
          const locations: any[] = wh.locations || []

          return (
            <div key={wh.id} className="card overflow-hidden">
              {/* Warehouse header */}
              <button
                type="button"
                onClick={() => setExpanded(p => ({ ...p, [wh.id]: !isExpanded }))}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Warehouse className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-slate-800 text-sm">{wh.name}</p>
                    {wh.address && <p className="text-xs text-slate-400">{wh.address}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 badge-slate">{locations.length} location{locations.length !== 1 ? 's' : ''}</span>
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-slate-100 px-5 py-4 space-y-3">
                  {/* Existing locations */}
                  {locations.length > 0 ? (
                    <div className="space-y-1">
                      {locations.map((loc: any) => (
                        <div key={loc.id} className="flex items-center gap-2 text-sm text-slate-600 py-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{loc.location_code}</span>
                          {loc.description && <span className="text-slate-400">{loc.description}</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">No locations yet.</p>
                  )}

                  {/* Add location form */}
                  {locForm?.open ? (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                      {locForm.error && (
                        <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded">{locForm.error}</div>
                      )}
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <label className="label text-xs">Location Code *</label>
                          <input
                            className="input py-1.5 text-sm font-mono"
                            placeholder="e.g. RACK-A1"
                            value={locForm.locationCode}
                            onChange={e => updateLocField(wh.id, 'locationCode', e.target.value)}
                          />
                        </div>
                        <div className="flex-1">
                          <label className="label text-xs">Description</label>
                          <input
                            className="input py-1.5 text-sm"
                            placeholder="Optional"
                            value={locForm.description}
                            onChange={e => updateLocField(wh.id, 'description', e.target.value)}
                          />
                        </div>
                        <button
                          type="button"
                          className="btn-primary py-1.5 text-sm"
                          onClick={() => handleAddLocation(wh.id)}
                          disabled={creatingLocation}
                        >
                          {creatingLocation ? '...' : 'Add'}
                        </button>
                        <button type="button" className="btn-secondary py-1.5 text-sm" onClick={() => toggleLocForm(wh.id)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1"
                      onClick={() => toggleLocForm(wh.id)}
                    >
                      <Plus className="w-3 h-3" /> Add location
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Profile section (secondary) ──────────────────────── */}
      <div className="card p-6">
        <h2 className="section-title mb-4">My Profile</h2>
        <div className="space-y-4">
          {[
            { icon: User, label: 'Full name', value: user?.name },
            { icon: Mail, label: 'Email address', value: user?.email },
            { icon: ShieldCheck, label: 'Role ID', value: user?.role_id ? `Role #${user.role_id}` : 'Unknown' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-slate-600" />
              </div>
              <div>
                <p className="text-slate-500 text-xs">{label}</p>
                <p className="font-medium text-slate-800">{value || '—'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── New Warehouse modal ───────────────────────────────── */}
      <Modal open={showWhModal} onClose={() => setShowWhModal(false)} title="New Warehouse">
        <form onSubmit={handleCreateWarehouse} className="space-y-4">
          {whError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{whError}</div>
          )}
          <div>
            <label className="label">Warehouse Name *</label>
            <input
              className="input"
              value={whForm.name}
              onChange={e => setWhForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Main Distribution Centre"
              required
            />
          </div>
          <div>
            <label className="label">Address</label>
            <input
              className="input"
              value={whForm.address}
              onChange={e => setWhForm(f => ({ ...f, address: e.target.value }))}
              placeholder="Optional"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1" onClick={() => setShowWhModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={creatingWarehouse}>
              {creatingWarehouse ? 'Creating...' : 'Create Warehouse'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
