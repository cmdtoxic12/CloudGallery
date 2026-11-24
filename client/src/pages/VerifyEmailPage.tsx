import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '../components/ui/Button'
import { authApi } from '../lib/api'
import { useAuthStore } from '../stores/auth'

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const loadUser = useAuthStore((s) => s.loadUser)

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Missing verification token')
      return
    }
    authApi
      .verifyEmail(token)
      .then((res) => {
        setStatus('success')
        setMessage(res.data.message || 'Email verified')
        loadUser()
        toast.success('Email verified!')
      })
      .catch((err: any) => {
        setStatus('error')
        setMessage(err.response?.data?.message || 'Verification failed')
      })
  }, [token, loadUser])

  return (
    <div className="container mx-auto px-4 py-16 max-w-md text-center">
      <div className="bg-[hsl(var(--card))] border rounded-2xl p-8 shadow-sm">
        {status === 'loading' && (
          <>
            <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p>Verifying your email…</p>
          </>
        )}
        {status === 'success' && (
          <>
            <h1 className="text-xl font-bold mb-2 text-green-600">Email verified</h1>
            <p className="text-[hsl(var(--muted-foreground))] mb-6">{message}</p>
            <Link to="/dashboard">
              <Button>Go to Dashboard</Button>
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <h1 className="text-xl font-bold mb-2 text-red-600">Verification failed</h1>
            <p className="text-[hsl(var(--muted-foreground))] mb-6">{message}</p>
            <Link to="/login">
              <Button variant="outline">Back to Login</Button>
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
