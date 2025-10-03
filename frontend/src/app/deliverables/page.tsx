'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { marketplaceAPI, Deliverable } from '@/lib/api'

export default function DeliverablesPage() {
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || !user) {
        router.push('/auth/login')
        return
      }
      setAuthChecked(true)
    }
  }, [authLoading, isAuthenticated, user, router])

  useEffect(() => {
    if (authChecked && user) {
      fetchDeliverables()
    }
  }, [authChecked, user])

  const fetchDeliverables = async () => {
    try {
      setLoading(true)
      setError(null)
      
      let response
      if (user?.userType === 'influencer') {
        response = await marketplaceAPI.getMyDeliverables()
      } else {
        response = await marketplaceAPI.getBrandDeliverables()
      }
      
      setDeliverables(response.deliverables)
    } catch (err: any) {
      console.error('Error fetching deliverables:', err)
      setError(err.message || 'Failed to load deliverables. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800'
      case 'submitted': return 'bg-blue-100 text-blue-800'
      case 'under_review': return 'bg-yellow-100 text-yellow-800'
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'revision_requested': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending'
      case 'submitted': return 'Submitted'
      case 'under_review': return 'Under Review'
      case 'approved': return 'Approved'
      case 'rejected': return 'Rejected'
      case 'revision_requested': return 'Revision Requested'
      default: return status
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return '🖼️'
      case 'video': return '🎥'
      case 'post': return '📝'
      case 'story': return '📖'
      case 'reel': return '🎬'
      default: return '📄'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (!authChecked || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading deliverables...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">❌</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Deliverables</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchDeliverables}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {user?.userType === 'influencer' ? 'My Deliverables' : 'Deliverables to Review'}
              </h1>
              <p className="text-gray-600 mt-2">
                {user?.userType === 'influencer' 
                  ? 'Track and submit your campaign deliverables'
                  : 'Review and approve influencer deliverables'
                }
              </p>
            </div>
            <Link
              href="/dashboard"
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-900">{deliverables.length}</div>
            <div className="text-gray-600">Total Deliverables</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-blue-600">
              {deliverables.filter(d => d.status === 'submitted' || d.status === 'under_review').length}
            </div>
            <div className="text-gray-600">Pending Review</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-green-600">
              {deliverables.filter(d => d.status === 'approved').length}
            </div>
            <div className="text-gray-600">Approved</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-2xl font-bold text-orange-600">
              {deliverables.filter(d => d.status === 'revision_requested').length}
            </div>
            <div className="text-gray-600">Need Revision</div>
          </div>
        </div>

        {/* Deliverables List */}
        {deliverables.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Deliverables Yet</h3>
            <p className="text-gray-600 mb-4">
              {user?.userType === 'influencer' 
                ? 'You don\'t have any deliverables assigned yet. Check back after your proposals are accepted.'
                : 'No deliverables have been submitted for review yet.'
              }
            </p>
            <Link
              href="/dashboard"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">All Deliverables</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {deliverables.map((deliverable) => (
                <div key={deliverable.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="text-2xl">{getTypeIcon(deliverable.type)}</span>
                        <h3 className="text-lg font-semibold text-gray-900">{deliverable.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(deliverable.status)}`}>
                          {getStatusText(deliverable.status)}
                        </span>
                      </div>
                      
                      {deliverable.description && (
                        <p className="text-gray-600 mb-2">{deliverable.description}</p>
                      )}
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>Campaign: {deliverable.listingTitle}</span>
                        {user?.userType === 'brand' && (
                          <span>Influencer: {deliverable.influencerName}</span>
                        )}
                        {deliverable.dueDate && (
                          <span>Due: {formatDate(deliverable.dueDate)}</span>
                        )}
                        <span>Created: {formatDate(deliverable.createdAt)}</span>
                      </div>

                      {deliverable.submissionNotes && (
                        <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm text-blue-800">
                            <strong>Submission Notes:</strong> {deliverable.submissionNotes}
                          </p>
                        </div>
                      )}

                      {deliverable.reviewNotes && (
                        <div className="mt-2 p-3 bg-yellow-50 rounded-lg">
                          <p className="text-sm text-yellow-800">
                            <strong>Review Notes:</strong> {deliverable.reviewNotes}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      {deliverable.fileUrl && (
                        <a
                          href={deliverable.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                        >
                          View File
                        </a>
                      )}
                      
                      {user?.userType === 'influencer' && deliverable.status === 'pending' && (
                        <Link
                          href={`/deliverables/${deliverable.id}/submit`}
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
                        >
                          Submit
                        </Link>
                      )}
                      
                      {user?.userType === 'brand' && deliverable.status === 'submitted' && (
                        <Link
                          href={`/deliverables/${deliverable.id}/review`}
                          className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700 transition-colors"
                        >
                          Review
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
