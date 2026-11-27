import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '../components/ui/Button'
import { authApi, settingsApi } from '../lib/api'
import { useAuthStore } from '../stores/auth'

export function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
  const [checkingRegistration, setCheckingRegistration] = useState(true)
  const [registrationOpen, setRegistrationOpen] = useState(true)

  useEffect(() => {
    let active = true
    settingsApi.registrationStatus()
      .then(({ data }) => { if (active) setRegistrationOpen(data.data?.registrationOpen !== false) })
      .catch(() => { if (active) setRegistrationOpen(false) })
      .finally(() => { if (active) setCheckingRegistration(false) })
    return () => { active = false }
  }, [])
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    try {
      const { data } = await authApi.register(form)
      if (data.success && data.data) {
        setAuth(data.data.user, data.data.token)
        toast.success('Account created!')
        navigate('/dashboard')
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  if (checkingRegistration) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-md text-center text-[hsl(var(--muted-foreground))]">
        Checking account registration availability…
      </div>
    )
  }

  if (!registrationOpen) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-md">
        <div className="bg-[hsl(var(--card))] border rounded-2xl p-8 shadow-sm text-center">
          <h1 className="text-2xl font-bold mb-3">Registration is currently closed</h1>
          <p className="text-[hsl(var(--muted-foreground))] mb-6">
            New CloudGallery accounts cannot be created at the moment. Please contact the administrator if you need access.
          </p>
          <Link to="/login" className="text-primary-600 font-medium hover:underline">Sign in to your existing account</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <div className="bg-[hsl(var(--card))] border rounded-2xl p-8 shadow-sm">
        <h1 className="text-2xl font-bold mb-2">Create your account</h1>
        <p className="text-[hsl(var(--muted-foreground))] mb-8">
          Start sharing beautiful event galleries in minutes
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full h-11 px-3 rounded-lg border bg-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full h-11 px-3 rounded-lg border bg-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Password</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full h-11 px-3 rounded-lg border bg-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Min 6 characters"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Confirm Password</label>
            <input
              type="password"
              required
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              className="w-full h-11 px-3 rounded-lg border bg-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" className="w-full" loading={loading}>
            Create Account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
