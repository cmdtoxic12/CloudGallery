import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Upload, Share2, Download, Heart, X, ChevronLeft, ChevronRight,
  Lock, MapPin, Calendar, Eye, Image as ImageIcon, Trash2, CheckSquare,
  Pencil, Archive, RotateCcw
} from 'lucide-react'
import { toast } from 'sonner'
import { galleryApi, photoApi } from '../lib/api'
import { formatDate, getShareUrl, cn } from '../lib/utils'
import { Button } from '../components/ui/Button'
import { useAuthStore } from '../stores/auth'
import type { Photo } from '../types'

interface Props {
  isOwnerView?: boolean
}

export function GalleryPage({ isOwnerView = false }: Props) {
  const { id, slug } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isAuthenticated } = useAuthStore()
  const [password, setPassword] = useState('')
  const [needsPassword, setNeedsPassword] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [selectMode, setSelectMode] = useState(false)
  const [showTrash, setShowTrash] = useState(false)
  const [busy, setBusy] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounter = useRef(0)

  const galleryQuery = useQuery({
    queryKey: ['gallery', id || slug],
    queryFn: async () => {
      if (id) {
        const { data } = await galleryApi.getById(id)
        return data.data!.gallery
      }
      try {
        const { data } = await galleryApi.getBySlug(slug!)
        return data.data!.gallery
      } catch (err: any) {
        if (err.response?.data?.requiresPassword) {
          setNeedsPassword(true)
          throw err
        }
        throw err
      }
    },
    enabled: !!(id || slug) && !needsPassword,
    retry: false,
  })

  const gallery = galleryQuery.data

  const photosQuery = useQuery({
    queryKey: ['photos', gallery?.id, showTrash],
    queryFn: async () => {
      const { data } = await photoApi.list(gallery!.id, 1, 100, showTrash)
      return data.data!.photos as Photo[]
    },
    enabled: !!gallery?.id,
  })

  const photos = photosQuery.data || []

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data } = await galleryApi.unlock(slug!, password)
      if (data.success) {
        setUnlocked(true)
        setNeedsPassword(false)
        queryClient.setQueryData(['gallery', slug], data.data!.gallery)
        toast.success('Gallery unlocked')
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Incorrect password')
    }
  }

  const isSupportedImage = (f: File) => {
    const type = (f.type || '').toLowerCase()
    const name = (f.name || '').toLowerCase()
    if (type.startsWith('image/')) return true
    // iOS often omits MIME for HEIC — allow by extension
    return /\.(jpe?g|png|webp|gif|heic|heif|hif|avif|tiff?|dng)$/i.test(name)
  }

  const handleUpload = async (files: FileList | File[] | null) => {
    if (!files || !gallery || !isOwnerView) return
    const fileArr = Array.from(files).filter(isSupportedImage)
    if (fileArr.length === 0) {
      toast.error('Please select image files (JPG, PNG, WebP, HEIC/HEIF from iPhone)')
      return
    }
    if (fileArr.length > 20) {
      toast.error('Maximum 20 photos per upload')
      return
    }
    setUploading(true)
    setUploadProgress(0)
    try {
      await photoApi.upload(gallery.id, fileArr, setUploadProgress)
      toast.success(`${fileArr.length} photo(s) uploaded`)
      photosQuery.refetch()
      galleryQuery.refetch()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Upload failed')
    } finally {
      setUploading(false)
      setUploadProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isOwnerView || showTrash || uploading) return
    dragCounter.current += 1
    if (e.dataTransfer.types.includes('Files')) setIsDragging(true)
  }

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current -= 1
    if (dragCounter.current <= 0) {
      dragCounter.current = 0
      setIsDragging(false)
    }
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current = 0
    setIsDragging(false)
    if (!isOwnerView || showTrash || uploading) return
    const files = e.dataTransfer.files
    if (files?.length) handleUpload(files)
  }

  const toggleFavorite = async (photoId: string) => {
    if (!isAuthenticated) {
      toast.warning('Please login to favorite photos')
      return
    }
    try {
      await photoApi.toggleFavorite(photoId)
      photosQuery.refetch()
    } catch {
      toast.error('Failed to update favorite')
    }
  }

  const downloadPhoto = async (photo: Photo) => {
    try {
      const { data } = await photoApi.trackDownload(photo.id)
      const url = data.data?.url || photo.image_url
      const name = data.data?.file_name || photo.file_name
      const a = document.createElement('a')
      a.href = url
      a.download = name
      a.target = '_blank'
      a.rel = 'noopener'
      a.click()
      if (data.data?.watermarked) {
        toast.success('Download started (watermark applied)')
      }
    } catch {
      // Fallback to original
      const a = document.createElement('a')
      a.href = photo.image_url
      a.download = photo.file_name
      a.target = '_blank'
      a.click()
    }
  }

  const handleDeleteOne = async (photoId: string) => {
    if (!confirm('Move this photo to trash?')) return
    try {
      await photoApi.delete(photoId)
      toast.success('Photo moved to trash')
      photosQuery.refetch()
      galleryQuery.refetch()
    } catch {
      toast.error('Failed to delete')
    }
  }

  const handleBulkDelete = async () => {
    if (selected.size === 0) return
    if (!confirm(`Move ${selected.size} photo(s) to trash?`)) return
    setBusy(true)
    try {
      await photoApi.bulkDelete(Array.from(selected))
      toast.success('Photos moved to trash')
      setSelected(new Set())
      setSelectMode(false)
      photosQuery.refetch()
      galleryQuery.refetch()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Bulk delete failed')
    } finally {
      setBusy(false)
    }
  }

  const handlePurge = async () => {
    const ids = selected.size > 0 ? Array.from(selected) : photos.map((p) => p.id)
    if (ids.length === 0) return
    if (!confirm(`Permanently delete ${ids.length} photo(s) from Cloudinary and database? This cannot be undone.`)) return
    setBusy(true)
    try {
      await photoApi.purge(ids)
      toast.success('Photos permanently deleted')
      setSelected(new Set())
      setSelectMode(false)
      photosQuery.refetch()
      galleryQuery.refetch()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Permanent delete failed')
    } finally {
      setBusy(false)
    }
  }

  const handleRestore = async () => {
    if (selected.size === 0) return
    setBusy(true)
    try {
      await photoApi.restore(Array.from(selected))
      toast.success('Photos restored')
      setSelected(new Set())
      setSelectMode(false)
      photosQuery.refetch()
      galleryQuery.refetch()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Restore failed')
    } finally {
      setBusy(false)
    }
  }

  const handleBulkDownload = async (all = false) => {
    if (!gallery) return
    const payload = all || selected.size === 0
      ? { galleryId: gallery.id }
      : { ids: Array.from(selected) }
    setBusy(true)
    try {
      const res = await photoApi.bulkDownload(payload)
      const blob = new Blob([res.data], { type: 'application/zip' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${gallery.slug || 'gallery'}-photos.zip`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Download started')
    } catch (err: any) {
      toast.error('ZIP download failed')
    } finally {
      setBusy(false)
    }
  }

  const share = () => {
    if (!gallery) return
    const url = getShareUrl(gallery.slug)
    navigator.clipboard.writeText(url)
    toast.success('Link copied!')
    galleryApi.trackShare(gallery.id, 'copy').catch(() => {})
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return
      if (e.key === 'Escape') setLightboxIndex(null)
      if (e.key === 'ArrowLeft') setLightboxIndex((i) => (i! - 1 + photos.length) % photos.length)
      if (e.key === 'ArrowRight') setLightboxIndex((i) => (i! + 1) % photos.length)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightboxIndex, photos.length])

  if (needsPassword && !unlocked) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-md">
        <div className="bg-[hsl(var(--card))] border rounded-2xl p-8 text-center">
          <Lock className="h-12 w-12 mx-auto text-primary-600 mb-4" />
          <h2 className="text-xl font-bold mb-2">Password Protected</h2>
          <p className="text-[hsl(var(--muted-foreground))] mb-6">
            Enter the gallery password to view photos.
          </p>
          <form onSubmit={handleUnlock} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-11 px-3 rounded-lg border bg-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Gallery password"
              required
            />
            <Button type="submit" className="w-full">Unlock Gallery</Button>
          </form>
        </div>
      </div>
    )
  }

  if (galleryQuery.isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (galleryQuery.isError || !gallery) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold mb-2">Gallery unavailable</h2>
        <p className="text-[hsl(var(--muted-foreground))] mb-6">
          This gallery could not be loaded.
        </p>
        <Button onClick={() => navigate('/')}>Go Home</Button>
      </div>
    )
  }

  return (
    <div
      className="container mx-auto px-4 py-8 relative"
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Full-page drop overlay */}
      {isDragging && isOwnerView && !showTrash && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary-600/20 backdrop-blur-sm pointer-events-none">
          <div className="rounded-2xl border-2 border-dashed border-primary-600 bg-[hsl(var(--card))] px-10 py-12 text-center shadow-xl">
            <Upload className="h-12 w-12 mx-auto text-primary-600 mb-3" />
            <p className="text-lg font-semibold">Drop photos to upload</p>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">JPG, PNG, WebP, HEIC · up to 20 files</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{gallery.name}</h1>
          <div className="flex flex-wrap gap-4 mt-2 text-sm text-[hsl(var(--muted-foreground))]">
            {gallery.location && (
              <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{gallery.location}</span>
            )}
            {gallery.event_date && (
              <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{formatDate(gallery.event_date)}</span>
            )}
            <span className="flex items-center gap-1"><ImageIcon className="h-4 w-4" />{gallery.photo_count ?? photos.length} photos</span>
            <span className="flex items-center gap-1"><Eye className="h-4 w-4" />{gallery.views} views</span>
          </div>
          {gallery.description && (
            <p className="mt-2 text-[hsl(var(--muted-foreground))]">{gallery.description}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {isOwnerView && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.heic,.heif,.hif,.jpg,.jpeg,.png,.webp,.avif,image/heic,image/heif,image/heic-sequence,image/heif-sequence"
                multiple
                className="hidden"
                onChange={(e) => handleUpload(e.target.files)}
                disabled={uploading || busy}
              />
              <Button
                disabled={uploading || busy}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                {uploading ? `${uploadProgress}%` : 'Upload'}
              </Button>
              <Link to={`/gallery/${gallery.id}/edit`}>
                <Button variant="outline">
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectMode(!selectMode)
                  setSelected(new Set())
                }}
              >
                <CheckSquare className="h-4 w-4" />
                {selectMode ? 'Cancel' : 'Select'}
              </Button>
              <Button
                variant={showTrash ? 'secondary' : 'outline'}
                onClick={() => {
                  setShowTrash(!showTrash)
                  setSelected(new Set())
                  setSelectMode(false)
                }}
              >
                <Archive className="h-4 w-4" />
                {showTrash ? 'Active' : 'Trash'}
              </Button>
            </>
          )}
          <Button variant="secondary" onClick={() => handleBulkDownload(true)} disabled={busy || photos.length === 0}>
            <Download className="h-4 w-4" />
            Download All
          </Button>
          <Button variant="secondary" onClick={share}>
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectMode && isOwnerView && (
        <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-xl border bg-[hsl(var(--muted))]/40">
          <span className="text-sm font-medium mr-2">{selected.size} selected</span>
          {!showTrash && (
            <>
              <Button size="sm" variant="outline" disabled={selected.size === 0 || busy} onClick={() => handleBulkDownload(false)}>
                <Download className="h-4 w-4" /> Download
              </Button>
              <Button size="sm" variant="outline" disabled={selected.size === 0 || busy} onClick={handleBulkDelete}>
                <Trash2 className="h-4 w-4" /> Trash
              </Button>
            </>
          )}
          {showTrash && (
            <>
              <Button size="sm" variant="outline" disabled={selected.size === 0 || busy} onClick={handleRestore}>
                <RotateCcw className="h-4 w-4" /> Restore
              </Button>
              <Button size="sm" variant="danger" disabled={selected.size === 0 || busy} onClick={handlePurge}>
                <Trash2 className="h-4 w-4" /> Delete Forever
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (selected.size === photos.length) setSelected(new Set())
              else setSelected(new Set(photos.map((p) => p.id)))
            }}
          >
            {selected.size === photos.length ? 'Deselect all' : 'Select all'}
          </Button>
        </div>
      )}

      {uploading && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-[hsl(var(--muted-foreground))]">Uploading photos…</span>
            <span className="font-medium">{uploadProgress}%</span>
          </div>
          <div className="h-2 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
            <div className="h-full bg-primary-600 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      )}

      {/* Drag & drop zone (owner, active photos view) */}
      {isOwnerView && !showTrash && (
        <button
          type="button"
          onClick={() => !uploading && fileInputRef.current?.click()}
          disabled={uploading}
          className={cn(
            'w-full mb-6 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors',
            isDragging
              ? 'border-primary-600 bg-primary-50 dark:bg-primary-950/40'
              : 'border-[hsl(var(--border))] hover:border-primary-400 hover:bg-[hsl(var(--muted))]/40',
            uploading && 'opacity-60 cursor-not-allowed'
          )}
        >
          <Upload className="h-8 w-8 mx-auto text-primary-600 mb-2" />
          <p className="font-medium">
            {uploading ? 'Uploading…' : 'Drag & drop photos here'}
          </p>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            or click to browse · JPG, PNG, WebP, HEIC/HEIF (iPhone) · up to 20 files · max 25MB each
          </p>
        </button>
      )}

      {/* Photo grid */}
      {photosQuery.isLoading ? (
        <div className="photo-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="aspect-square rounded-lg bg-[hsl(var(--muted))] animate-pulse" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-16 border rounded-2xl">
          <ImageIcon className="h-12 w-12 mx-auto text-[hsl(var(--muted-foreground))] mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {showTrash ? 'Trash is empty' : 'No photos yet'}
          </h3>
          <p className="text-[hsl(var(--muted-foreground))] mb-4">
            {showTrash
              ? 'Deleted photos will appear here for recovery.'
              : isOwnerView
                ? 'Drag & drop images above, or click Upload to add photos.'
                : 'Check back later.'}
          </p>
          {isOwnerView && !showTrash && (
            <Button disabled={uploading} onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" />
              Choose photos
            </Button>
          )}
        </div>
      ) : (
        <div className="photo-grid">
          {photos.map((photo, idx) => (
            <div
              key={photo.id}
              className={cn(
                'group relative aspect-square rounded-lg overflow-hidden cursor-pointer bg-[hsl(var(--muted))]',
                selectMode && selected.has(photo.id) && 'ring-2 ring-primary-600'
              )}
              onClick={() => {
                if (selectMode) {
                  const next = new Set(selected)
                  if (next.has(photo.id)) next.delete(photo.id)
                  else next.add(photo.id)
                  setSelected(next)
                } else if (!showTrash) {
                  setLightboxIndex(idx)
                }
              }}
            >
              <img
                src={photo.thumbnail_url || photo.image_url}
                alt={photo.file_name}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
              {/* Always visible on mobile; hover-reveal on desktop */}
              {!selectMode && !showTrash && (
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-end gap-1.5 p-2 bg-gradient-to-t from-black/55 via-black/20 to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    aria-label="Favorite"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFavorite(photo.id)
                    }}
                    className={cn(
                      'p-2 rounded-full bg-black/55 text-white active:scale-95 touch-manipulation',
                      photo.is_favorited && 'text-red-400'
                    )}
                  >
                    <Heart className={cn('h-4 w-4', photo.is_favorited && 'fill-current')} />
                  </button>
                  <button
                    type="button"
                    aria-label="Download"
                    onClick={(e) => {
                      e.stopPropagation()
                      downloadPhoto(photo)
                    }}
                    className="p-2 rounded-full bg-black/55 text-white active:scale-95 touch-manipulation"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  {isOwnerView && (
                    <button
                      type="button"
                      aria-label="Delete"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteOne(photo.id)
                      }}
                      className="p-2 rounded-full bg-black/55 text-white active:scale-95 touch-manipulation"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
              {selectMode && (
                <div className="absolute top-2 left-2">
                  <div
                    className={cn(
                      'h-5 w-5 rounded border-2 flex items-center justify-center',
                      selected.has(photo.id)
                        ? 'bg-primary-600 border-primary-600'
                        : 'border-white bg-black/30'
                    )}
                  >
                    {selected.has(photo.id) && (
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && photos[lightboxIndex] && (
        <div className="fixed inset-0 z-50 bg-black/95 lightbox-overlay flex items-center justify-center">
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 p-2.5 text-white/90 z-10 touch-manipulation"
            aria-label="Close"
          >
            <X className="h-8 w-8" />
          </button>
          <button
            type="button"
            onClick={() => setLightboxIndex((lightboxIndex - 1 + photos.length) % photos.length)}
            className="absolute left-2 md:left-4 p-2 text-white/90 z-10 touch-manipulation"
            aria-label="Previous"
          >
            <ChevronLeft className="h-10 w-10" />
          </button>
          <button
            type="button"
            onClick={() => setLightboxIndex((lightboxIndex + 1) % photos.length)}
            className="absolute right-2 md:right-4 p-2 text-white/90 z-10 touch-manipulation"
            aria-label="Next"
          >
            <ChevronRight className="h-10 w-10" />
          </button>
          <img
            src={photos[lightboxIndex].image_url}
            alt={photos[lightboxIndex].file_name}
            className="max-h-[82vh] max-w-[94vw] object-contain"
          />
          <div className="absolute bottom-0 inset-x-0 pb-safe">
            <div className="flex items-center justify-center gap-3 px-4 py-4 bg-gradient-to-t from-black/80 to-transparent">
              <span className="text-white/80 text-sm tabular-nums min-w-[4.5rem] text-center">
                {lightboxIndex + 1} / {photos.length}
              </span>
              <button
                type="button"
                onClick={() => toggleFavorite(photos[lightboxIndex].id)}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/15 text-white text-sm font-medium touch-manipulation active:scale-95',
                  photos[lightboxIndex].is_favorited && 'text-red-400'
                )}
              >
                <Heart className={cn('h-4 w-4', photos[lightboxIndex].is_favorited && 'fill-current')} />
                Favorite
              </button>
              <button
                type="button"
                onClick={() => downloadPhoto(photos[lightboxIndex])}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary-600 text-white text-sm font-medium touch-manipulation active:scale-95"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
              {isOwnerView && (
                <button
                  type="button"
                  onClick={() => {
                    const id = photos[lightboxIndex].id
                    handleDeleteOne(id)
                    setLightboxIndex(null)
                  }}
                  className="inline-flex items-center gap-2 px-3 py-2.5 rounded-full bg-white/15 text-white text-sm font-medium touch-manipulation active:scale-95"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
