import { Link } from 'react-router-dom'
import { CloudUpload, Link2, Lock, Smartphone, Download, Heart, Rocket } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { useAuthStore } from '../stores/auth'

const features = [
  {
    icon: CloudUpload,
    title: 'Cloud Upload',
    desc: 'Upload high-quality JPG, PNG, WebP photos. Drag & drop multiple files with progress tracking.',
  },
  {
    icon: Link2,
    title: 'Shareable Links',
    desc: 'One unique gallery link for guests. Share via WhatsApp, email, or any messenger.',
  },
  {
    icon: Lock,
    title: 'Privacy Controls',
    desc: 'Public, private, or password-protected galleries. You control who sees your photos.',
  },
  {
    icon: Smartphone,
    title: 'Mobile Friendly',
    desc: 'Beautiful responsive galleries that look great on phones, tablets, and desktops.',
  },
  {
    icon: Download,
    title: 'Easy Downloads',
    desc: 'Guests can download individual photos or bulk-download the entire gallery.',
  },
  {
    icon: Heart,
    title: 'Favorites & Stats',
    desc: 'Favorite photos, track views, downloads, and shares with simple analytics.',
  },
]

export function HomePage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-blue-50 dark:from-primary-950/30 dark:via-[hsl(var(--background))] dark:to-blue-950/20" />
        <div className="container relative mx-auto px-4 py-20 md:py-32 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
            Upload Once. Share One Link.
            <br />
            <span className="text-primary-600">Everyone Views.</span>
          </h1>
          <p className="text-lg md:text-xl text-[hsl(var(--muted-foreground))] max-w-2xl mx-auto mb-10">
            The modern cloud photo gallery for events. Stop sending hundreds of compressed
            pictures through WhatsApp. Upload high-quality photos and share a single beautiful gallery link.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to={isAuthenticated ? '/dashboard' : '/register'}>
              <Button size="lg" className="w-full sm:w-auto">
                <Rocket className="h-5 w-5" />
                {isAuthenticated ? 'Go to Dashboard' : 'Start Free'}
              </Button>
            </Link>
            <a href="#features">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                See How It Works
              </Button>
            </a>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 bg-[hsl(var(--muted))]/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Everything you need for event photos
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-[hsl(var(--card))] border rounded-2xl p-6 hover:shadow-lg transition-shadow"
              >
                <div className="h-12 w-12 rounded-xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center mb-4">
                  <f.icon className="h-6 w-6 text-primary-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-[hsl(var(--muted-foreground))] text-sm leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
