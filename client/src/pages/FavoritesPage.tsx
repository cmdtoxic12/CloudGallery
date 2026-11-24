import { useQuery } from '@tanstack/react-query'
import { Heart, Image as ImageIcon } from 'lucide-react'
import { photoApi } from '../lib/api'
import { Link } from 'react-router-dom'

export function FavoritesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: async () => (await photoApi.favorites()).data.data!.photos,
  })

  const photos = data || []

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
        <Heart className="h-6 w-6 text-red-500" />
        Favorites
      </h1>
      <p className="text-[hsl(var(--muted-foreground))] mb-8">
        Photos you've liked across your galleries
      </p>

      {isLoading ? (
        <div className="photo-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-square rounded-lg bg-[hsl(var(--muted))] animate-pulse" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-20 border rounded-2xl">
          <Heart className="h-12 w-12 mx-auto text-[hsl(var(--muted-foreground))] mb-4" />
          <h3 className="text-lg font-medium mb-2">No favorites yet</h3>
          <p className="text-[hsl(var(--muted-foreground))]">
            Heart photos while browsing galleries to save them here.
          </p>
        </div>
      ) : (
        <div className="photo-grid">
          {photos.map((photo) => (
            <Link
              key={photo.id}
              to={`/g/${photo.gallery_slug}`}
              className="group relative aspect-square rounded-lg overflow-hidden bg-[hsl(var(--muted))]"
            >
              <img
                src={photo.thumbnail_url || photo.image_url}
                alt={photo.file_name}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                <p className="text-white text-xs truncate">{photo.gallery_name}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
