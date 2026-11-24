import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Image, Eye, HardDrive, Calendar, MapPin, MoreVertical, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { galleryApi } from '../lib/api'
import { formatBytes, formatDate } from '../lib/utils'
import { Button } from '../components/ui/Button'
import type { Gallery } from '../types'

export function DashboardPage() {
  const navigate = useNavigate()

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => (await galleryApi.stats()).data.data!,
  })

  const { data: galleriesData, isLoading: galleriesLoading, refetch } = useQuery({
    queryKey: ['galleries'],
    queryFn: async () => (await galleryApi.list()).data.data!.galleries,
  })

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Permanently delete gallery "${name}" and all its photos from Cloudinary? This cannot be undone.`)) return
    try {
      await galleryApi.delete(id)
      toast.success('Gallery and photos permanently deleted')
      refetch()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete')
    }
  }

  const stats = [
    { label: 'Galleries', value: statsData?.totalGalleries ?? 0, icon: Image },
    { label: 'Photos', value: statsData?.totalPhotos ?? 0, icon: Image },
    { label: 'Views', value: statsData?.totalViews ?? 0, icon: Eye },
    { label: 'Storage', value: formatBytes(statsData?.storageUsed ?? 0), icon: HardDrive },
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-[hsl(var(--muted-foreground))]">Manage your event photo galleries</p>
        </div>
        <Button onClick={() => navigate('/create')}>
          <Plus className="h-4 w-4" />
          New Gallery
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {stats.map((s) => (
          <div key={s.label} className="bg-[hsl(var(--card))] border rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center">
                <s.icon className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statsLoading ? '—' : s.value}</p>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Galleries */}
      <h2 className="text-lg font-semibold mb-4">Your Galleries</h2>
      {galleriesLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-xl bg-[hsl(var(--muted))] animate-pulse" />
          ))}
        </div>
      ) : galleriesData?.length === 0 ? (
        <div className="text-center py-16 border rounded-2xl bg-[hsl(var(--card))]">
          <Image className="h-12 w-12 mx-auto text-[hsl(var(--muted-foreground))] mb-4" />
          <h3 className="text-lg font-medium mb-2">No galleries yet</h3>
          <p className="text-[hsl(var(--muted-foreground))] mb-6">
            Create your first event gallery and start uploading photos.
          </p>
          <Button onClick={() => navigate('/create')}>
            <Plus className="h-4 w-4" />
            Create Gallery
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {galleriesData?.map((g: Gallery) => (
            <div
              key={g.id}
              className="group relative bg-[hsl(var(--card))] border rounded-xl overflow-hidden hover:shadow-md transition-shadow"
            >
              <Link to={`/gallery/${g.id}`}>
                <div className="aspect-[16/10] bg-[hsl(var(--muted))] relative">
                  {g.cover_photo_url ? (
                    <img
                      src={g.cover_photo_url}
                      alt={g.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="h-12 w-12 text-[hsl(var(--muted-foreground))]" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium bg-black/60 text-white capitalize">
                    {g.visibility}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold truncate">{g.name}</h3>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-[hsl(var(--muted-foreground))]">
                    <span className="flex items-center gap-1">
                      <Image className="h-3.5 w-3.5" />
                      {g.photo_count ?? 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" />
                      {g.views}
                    </span>
                    {g.event_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(g.event_date)}
                      </span>
                    )}
                    {g.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {g.location}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
              <button
                onClick={(e) => {
                  e.preventDefault()
                  handleDelete(g.id, g.name)
                }}
                className="absolute top-2 left-2 p-1.5 rounded-lg bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                title="Delete gallery"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
