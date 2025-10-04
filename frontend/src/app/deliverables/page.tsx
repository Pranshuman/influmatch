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
      
      if (user?.userType === 'influencer') {
        const response = await marketplaceAPI.getMyDeliverables()
        setDeliverables(response.deliverables)
      } else {
        // For brands, fetch all deliverables
        const response = await marketplaceAPI.getBrandDeliverables()
        setDeliverables(response.deliverables)
      }
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
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">All Deliverables</h2>
              {user?.userType === 'brand' && (
                <Link
                  href="/deliverables/create"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  Create New Deliverable
                </Link>
              )}
            </div>
            
            <div className="space-y-4">
              {deliverables.map((deliverable) => (
                <div key={deliverable.id} className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-all duration-200">
                  {/* Campaign Header */}
                  <div className="mb-4 pb-3 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold text-sm">📋</span>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{deliverable.listingTitle}</h3>
                          <p className="text-sm text-gray-600">Campaign</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(deliverable.status)}`}>
                        {getStatusText(deliverable.status)}
                      </span>
                    </div>
                  </div>

                  {/* Deliverable Details */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <span className="text-2xl">{getTypeIcon(deliverable.type)}</span>
                        <h4 className="text-lg font-semibold text-gray-900">{deliverable.title}</h4>
                      </div>
                      
                      {deliverable.description && (
                        <p className="text-gray-600 mb-3">{deliverable.description}</p>
                      )}
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        {user?.userType === 'brand' && (
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-gray-500 mb-1">Influencer</p>
                            <p className="font-medium text-gray-900">{deliverable.influencerName}</p>
                          </div>
                        )}
                        {deliverable.dueDate && (
                          <div className="bg-blue-50 rounded-lg p-3">
                            <p className="text-gray-500 mb-1">Due Date</p>
                            <p className="font-medium text-blue-600">{formatDate(deliverable.dueDate)}</p>
                          </div>
                        )}
                        <div className="bg-green-50 rounded-lg p-3">
                          <p className="text-gray-500 mb-1">Created</p>
                          <p className="font-medium text-green-600">{formatDate(deliverable.createdAt)}</p>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-3">
                          <p className="text-gray-500 mb-1">Type</p>
                          <p className="font-medium text-purple-600 capitalize">{deliverable.type}</p>
                        </div>
                      </div>

                      {deliverable.submissionNotes && (
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                          <p className="text-sm text-blue-800">
                            <strong>📝 Submission Notes:</strong> {deliverable.submissionNotes}
                          </p>
                        </div>
                      )}

                      {deliverable.reviewNotes && (
                        <div className="mt-4 p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                          <p className="text-sm text-yellow-800">
                            <strong>🔍 Review Notes:</strong> {deliverable.reviewNotes}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col space-y-2 ml-6">
                      
                      {user?.userType === 'influencer' && deliverable.status === 'pending' && (
                        <Link
                          href={`/deliverables/${deliverable.id}/submit`}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors text-center"
                        >
                          ✏️ Submit
                        </Link>
                      )}
                      
                      {user?.userType === 'influencer' && deliverable.status === 'revision_requested' && (
                        <Link
                          href={`/deliverables/${deliverable.id}/submit`}
                          className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-700 transition-colors text-center"
                        >
                          🔄 Resubmit
                        </Link>
                      )}
                      
                      {user?.userType === 'brand' && (deliverable.status === 'submitted' || deliverable.status === 'under_review') && (
                        <Link
                          href={`/deliverables/${deliverable.id}/review`}
                          className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700 transition-colors text-center"
                        >
                          🔍 Review
                        </Link>
                      )}

                      {user?.userType === 'brand' && deliverable.status === 'revision_requested' && (
                        <Link
                          href={`/deliverables/${deliverable.id}/review`}
                          className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-700 transition-colors text-center"
                        >
                          🔄 Re-review
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
