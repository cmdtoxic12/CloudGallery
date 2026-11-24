import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '../components/ui/Button'
import { galleryApi } from '../lib/api'
import type { GalleryVisibility } from '../types'

export function EditGalleryPage() {
  const { id } = useParams<{ id: string }>()
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

  const { data: gallery, isLoading } = useQuery({
    queryKey: ['gallery', id],
    queryFn: async () => (await galleryApi.getById(id!)).data.data!.gallery,
    enabled: !!id,
  })

  useEffect(() => {
    if (gallery) {
      setForm({
        name: gallery.name || '',
        description: gallery.description || '',
        location: gallery.location || '',
        event_date: gallery.event_date ? gallery.event_date.slice(0, 10) : '',
        visibility: gallery.visibility || 'public',
        password: '',
      })
    }
  }, [gallery])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    if (form.name.trim().length < 2) {
      toast.error('Gallery name is required')
      return
    }
    if (form.visibility === 'password' && form.password && form.password.length < 4) {
      toast.error('Password must be at least 4 characters')
      return
    }
    setLoading(true)
    try {
      const payload: any = {
        name: form.name.trim(),
        description: form.description || null,
        location: form.location || null,
        event_date: form.event_date || null,
        visibility: form.visibility,
      }
      if (form.visibility === 'password' && form.password) {
        payload.password = form.password
      }
      await galleryApi.update(id, payload)
      toast.success('Gallery updated')
      navigate(`/gallery/${id}`)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Update failed')
    } finally {
      setLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-xl">
      <h1 className="text-2xl font-bold mb-2">Edit Gallery</h1>
      <p className="text-[hsl(var(--muted-foreground))] mb-8">Update details or visibility</p>

      <form onSubmit={handleSubmit} className="space-y-5 bg-[hsl(var(--card))] border rounded-2xl p-6">
        <div>
          <label className="block text-sm font-medium mb-1.5">Gallery Name *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full h-11 px-3 rounded-lg border bg-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border bg-transparent focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
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
            <label className="block text-sm font-medium mb-1.5">
              {gallery?.visibility === 'password' ? 'New password (leave blank to keep)' : 'Gallery Password'}
            </label>
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
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  )
}
