import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '../components/ui/Button'
import { galleryApi } from '../lib/api'
import type { GalleryVisibility } from '../types'

export function CreateGalleryPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
    location: '',
    event_date: '',
    visibility: 'public' as GalleryVisibility,
    password: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.name.trim().length < 2) {
      toast.error('Gallery name is required')
      return
    }
    if (form.visibility === 'password' && form.password.length < 4) {
      toast.error('Password must be at least 4 characters')
      return
    }
    setLoading(true)
    try {
      const { data } = await galleryApi.create(form)
      if (data.success && data.data?.gallery) {
        toast.success('Gallery created!')
        navigate(`/gallery/${data.data.gallery.id}`)
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create gallery')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-xl">
      <h1 className="text-2xl font-bold mb-2">Create New Gallery</h1>
      <p className="text-[hsl(var(--muted-foreground))] mb-8">
        Set up an event gallery and start uploading photos
      </p>

      <form onSubmit={handleSubmit} className="space-y-5 bg-[hsl(var(--card))] border rounded-2xl p-6">
        <div>
          <label className="block text-sm font-medium mb-1.5">Gallery Name *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full h-11 px-3 rounded-lg border bg-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="e.g. Sarah & John's Wedding"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border bg-transparent focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            placeholder="Optional description..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Location</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="w-full h-11 px-3 rounded-lg border bg-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="City or venue"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Event Date</label>
            <input
              type="date"
              value={form.event_date}
              onChange={(e) => setForm({ ...form, event_date: e.target.value })}
              className="w-full h-11 px-3 rounded-lg border bg-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Visibility</label>
          <div className="grid grid-cols-3 gap-2">
            {(['public', 'private', 'password'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setForm({ ...form, visibility: v })}
                className={`h-11 rounded-lg border text-sm font-medium capitalize transition-colors ${
                  form.visibility === v
                    ? 'border-primary-600 bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300'
                    : 'hover:bg-[hsl(var(--muted))]'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {form.visibility === 'password' && (
          <div>
            <label className="block text-sm font-medium mb-1.5">Gallery Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full h-11 px-3 rounded-lg border bg-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Min 4 characters"
            />
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate(-1)} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" loading={loading} className="flex-1">
            Create Gallery
          </Button>
        </div>
      </form>
    </div>
  )
}
