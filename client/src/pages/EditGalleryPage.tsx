import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Image as ImageIcon, Trash2 } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { galleryApi } from '../lib/api'
import type { GalleryVisibility, WatermarkPosition } from '../types'

const POSITIONS: { value: WatermarkPosition; label: string }[] = [
  { value: 'south_east', label: 'Bottom right' },
  { value: 'south_west', label: 'Bottom left' },
  { value: 'north_east', label: 'Top right' },
  { value: 'north_west', label: 'Top left' },
  { value: 'south', label: 'Bottom center' },
  { value: 'north', label: 'Top center' },
  { value: 'center', label: 'Center' },
]

export function EditGalleryPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
    location: '',
    event_date: '',
    visibility: 'public' as GalleryVisibility,
    password: '',
    watermark_enabled: false,
    watermark_text: '',
    watermark_position: 'south_east' as WatermarkPosition,
    watermark_opacity: 50,
    watermark_logo_url: '' as string | null,
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
        watermark_enabled: !!gallery.watermark_enabled,
        watermark_text: gallery.watermark_text || '',
        watermark_position: (gallery.watermark_position as WatermarkPosition) || 'south_east',
        watermark_opacity: gallery.watermark_opacity ?? 50,
        watermark_logo_url: gallery.watermark_logo_url || null,
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
        watermark_enabled: form.watermark_enabled,
        watermark_text: form.watermark_text || null,
        watermark_position: form.watermark_position,
        watermark_opacity: form.watermark_opacity,
      }
      if (form.visibility === 'password' && form.password) {
        payload.password = form.password
      }
      await galleryApi.update(id, payload)
      queryClient.invalidateQueries({ queryKey: ['gallery', id] })
      toast.success('Gallery updated')
      navigate(`/gallery/${id}`)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Update failed')
    } finally {
      setLoading(false)
    }
  }

  const handleLogoUpload = async (file: File | null) => {
    if (!file || !id) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file for the logo')
      return
    }
    setUploadingLogo(true)
    try {
      const { data } = await galleryApi.uploadWatermarkLogo(id, file)
      if (data.data?.gallery) {
        setForm((f) => ({
          ...f,
          watermark_enabled: true,
          watermark_logo_url: data.data!.gallery.watermark_logo_url || null,
        }))
        queryClient.invalidateQueries({ queryKey: ['gallery', id] })
        toast.success('Logo uploaded — will appear on downloads')
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Logo upload failed')
    } finally {
      setUploadingLogo(false)
      if (logoInputRef.current) logoInputRef.current.value = ''
    }
  }

  const clearLogo = async () => {
    if (!id) return
    setLoading(true)
    try {
      const { data } = await galleryApi.update(id, { clear_watermark_logo: true } as any)
      if (data.data?.gallery) {
        setForm((f) => ({ ...f, watermark_logo_url: null }))
      }
      queryClient.invalidateQueries({ queryKey: ['gallery', id] })
      toast.success('Logo removed')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to remove logo')
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
      <p className="text-[hsl(var(--muted-foreground))] mb-8">
        Update details, visibility, and download watermarks
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

        {/* Watermark section */}
        <div className="border-t pt-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Download watermark</h2>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Applied to single downloads and ZIP exports (not gallery previews)
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.watermark_enabled}
              onClick={() => setForm({ ...form, watermark_enabled: !form.watermark_enabled })}
              className={`relative h-7 w-12 rounded-full transition-colors ${
                form.watermark_enabled ? 'bg-primary-600' : 'bg-[hsl(var(--muted))]'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                  form.watermark_enabled ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>

          {form.watermark_enabled && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1.5">Watermark text</label>
                <input
                  type="text"
                  value={form.watermark_text}
                  onChange={(e) => setForm({ ...form, watermark_text: e.target.value })}
                  maxLength={80}
                  className="w-full h-11 px-3 rounded-lg border bg-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g. © Your Studio 2026"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Logo</label>
                <div className="flex items-center gap-3">
                  <div className="h-16 w-16 rounded-lg border bg-[hsl(var(--muted))] flex items-center justify-center overflow-hidden">
                    {form.watermark_logo_url ? (
                      <img src={form.watermark_logo_url} alt="Logo" className="h-full w-full object-contain" />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-[hsl(var(--muted-foreground))]" />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={(e) => handleLogoUpload(e.target.files?.[0] || null)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      loading={uploadingLogo}
                      onClick={() => logoInputRef.current?.click()}
                    >
                      {form.watermark_logo_url ? 'Replace logo' : 'Upload logo'}
                    </Button>
                    {form.watermark_logo_url && (
                      <Button type="button" variant="ghost" size="sm" onClick={clearLogo}>
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                  PNG with transparency works best
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Position</label>
                  <select
                    value={form.watermark_position}
                    onChange={(e) =>
                      setForm({ ...form, watermark_position: e.target.value as WatermarkPosition })
                    }
                    className="w-full h-11 px-3 rounded-lg border bg-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {POSITIONS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Opacity ({form.watermark_opacity}%)
                  </label>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={form.watermark_opacity}
                    onChange={(e) =>
                      setForm({ ...form, watermark_opacity: parseInt(e.target.value, 10) })
                    }
                    className="w-full mt-3"
                  />
                </div>
              </div>
            </>
          )}
        </div>

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
