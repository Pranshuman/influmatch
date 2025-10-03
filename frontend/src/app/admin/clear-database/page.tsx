'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

export default function ClearDatabasePage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()

  if (!isAuthenticated) {
    router.push('/auth/login')
    return null
  }

  const handleClearDatabase = async () => {
    if (!confirmed) {
      setError('Please confirm that you want to clear the database')
      return
    }

    try {
      setLoading(true)
      setError(null)
      setResult(null)

      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No authentication token found')
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050'}/api/admin/clear-database`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to clear database')
      }

      const data = await response.json()
      setResult(data)
    } catch (err: any) {
      console.error('Error clearing database:', err)
      setError(err.message || 'Failed to clear database')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-red-600 mb-4">⚠️ Clear Database</h1>
            <p className="text-gray-600">
              This will permanently delete all campaigns, proposals, deliverables, and messages.
              <br />
              <strong>Users will be preserved.</strong>
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {result && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="text-green-800 font-semibold mb-2">✅ Database Cleared Successfully!</h3>
              <div className="text-sm text-green-700">
                <p><strong>Before:</strong></p>
                <ul className="ml-4">
                  <li>Deliverables: {result.before.deliverables}</li>
                  <li>Messages: {result.before.messages}</li>
                  <li>Proposals: {result.before.proposals}</li>
                  <li>Listings: {result.before.listings}</li>
                  <li>Users: {result.before.users}</li>
                </ul>
                <p className="mt-2"><strong>After:</strong></p>
                <ul className="ml-4">
                  <li>Deliverables: {result.after.deliverables}</li>
                  <li>Messages: {result.after.messages}</li>
                  <li>Proposals: {result.after.proposals}</li>
                  <li>Listings: {result.after.listings}</li>
                  <li>Users: {result.after.users}</li>
                </ul>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="confirm"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mr-3 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
              />
              <label htmlFor="confirm" className="text-sm text-gray-700">
                I understand that this action will permanently delete all campaigns, proposals, deliverables, and messages. This cannot be undone.
              </label>
            </div>

            <button
              onClick={handleClearDatabase}
              disabled={loading || !confirmed}
              className="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? 'Clearing Database...' : 'Clear Database'}
            </button>

            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>

          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="text-yellow-800 font-semibold mb-2">⚠️ Important Notes:</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• This action is irreversible</li>
              <li>• All campaigns, proposals, deliverables, and messages will be deleted</li>
              <li>• User accounts will be preserved</li>
              <li>• Make sure you have backups if needed</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
