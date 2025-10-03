'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { marketplaceAPI, Deliverable } from '@/lib/api'

export default function ReviewDeliverablePage() {
  const [deliverable, setDeliverable] = useState<Deliverable | null>(null)
  const [loading, setLoading] = useState(true)
  const [reviewing, setReviewing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  
  const [formData, setFormData] = useState({
    status: 'approved' as 'approved' | 'rejected' | 'revision_requested',
    reviewNotes: ''
  })
  
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const deliverableId = params.id as string

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || !user || user.userType !== 'brand') {
        router.push('/auth/login')
        return
      }
      setAuthChecked(true)
    }
  }, [authLoading, isAuthenticated, user, router])

  useEffect(() => {
    if (authChecked && user) {
      fetchDeliverable()
    }
  }, [authChecked, user, deliverableId])

  const fetchDeliverable = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Get all deliverables and find the one we need
      const response = await marketplaceAPI.getBrandDeliverables()
      const foundDeliverable = response.deliverables.find(d => d.id === parseInt(deliverableId))
      
      if (!foundDeliverable) {
        setError('Deliverable not found')
        return
      }
      
      if (foundDeliverable.status !== 'submitted') {
        setError('This deliverable is not available for review')
        return
      }
      
      setDeliverable(foundDeliverable)
    } catch (err: any) {
      console.error('Error fetching deliverable:', err)
      setError(err.message || 'Failed to load deliverable. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const validateForm = () => {
    const errors: string[] = []
    
    // Validate status
    const validStatuses = ['approved', 'rejected', 'revision_requested']
    if (!validStatuses.includes(formData.status)) {
      errors.push('Please select a valid review status')
    }
    
    // Require review notes for rejection or revision requests
    if ((formData.status === 'rejected' || formData.status === 'revision_requested') && 
        (!formData.reviewNotes || formData.reviewNotes.trim().length === 0)) {
      errors.push('Review notes are required for rejection or revision requests')
    }
    
    // Validate review notes length
    if (formData.reviewNotes && formData.reviewNotes.length > 1000) {
      errors.push('Review notes must be less than 1000 characters')
    }
    
    return errors
  }

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Client-side validation
    const validationErrors = validateForm()
    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '))
      return
    }

    try {
      setReviewing(true)
      setError(null)
      
      await marketplaceAPI.reviewDeliverable(parseInt(deliverableId), {
        status: formData.status,
        reviewNotes: formData.reviewNotes.trim() || undefined
      })
      
      setSuccess(true)
      setTimeout(() => {
        router.push('/deliverables')
      }, 2000)
    } catch (err: any) {
      console.error('Error reviewing deliverable:', err)
      setError(err.message || 'Failed to review deliverable. Please try again.')
    } finally {
      setReviewing(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
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

  if (!authChecked || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading deliverable...</p>
        </div>
      </div>
    )
  }

  if (error && !deliverable) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">❌</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Deliverable</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link
            href="/deliverables"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Deliverables
          </Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-green-600 text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Deliverable Reviewed Successfully!</h2>
          <p className="text-gray-600 mb-4">Your review has been submitted.</p>
          <p className="text-sm text-gray-500">Redirecting to deliverables page...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Review Deliverable</h1>
              <p className="text-gray-600 mt-2">Review and approve the submitted deliverable</p>
            </div>
            <Link
              href="/deliverables"
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Back to Deliverables
            </Link>
          </div>
        </div>

        {deliverable && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Deliverable Info */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Deliverable Details</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-3xl">{getTypeIcon(deliverable.type)}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">{deliverable.title}</h3>
                      <p className="text-sm text-gray-600 capitalize">{deliverable.type}</p>
                    </div>
                  </div>
                  
                  {deliverable.description && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Description</h4>
                      <p className="text-sm text-gray-600">{deliverable.description}</p>
                    </div>
                  )}
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Campaign</h4>
                    <p className="text-sm text-gray-600">{deliverable.listingTitle}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Influencer</h4>
                    <p className="text-sm text-gray-600">{deliverable.influencerName}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Submitted</h4>
                    <p className="text-sm text-gray-600">{formatDate(deliverable.submittedAt!)}</p>
                  </div>
                  
                  {deliverable.dueDate && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Due Date</h4>
                      <p className="text-sm text-gray-600">{formatDate(deliverable.dueDate)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Review Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Review Deliverable</h2>
                
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800">{error}</p>
                  </div>
                )}
                
                {/* Submitted File */}
                {deliverable.fileUrl && (
                  <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-medium text-blue-900 mb-2">Submitted File</h3>
                    <a
                      href={deliverable.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      View Submitted File →
                    </a>
                  </div>
                )}
                
                {/* Submission Notes */}
                {deliverable.submissionNotes && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Submission Notes</h3>
                    <p className="text-gray-700">{deliverable.submissionNotes}</p>
                  </div>
                )}
                
                <form onSubmit={handleReview} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Review Decision *
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="status"
                          value="approved"
                          checked={formData.status === 'approved'}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                          className="mr-3 text-green-600 focus:ring-green-500"
                        />
                        <div>
                          <span className="font-medium text-green-700">✅ Approve</span>
                          <p className="text-sm text-gray-600">The deliverable meets all requirements</p>
                        </div>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="status"
                          value="revision_requested"
                          checked={formData.status === 'revision_requested'}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                          className="mr-3 text-orange-600 focus:ring-orange-500"
                        />
                        <div>
                          <span className="font-medium text-orange-700">🔄 Request Revision</span>
                          <p className="text-sm text-gray-600">The deliverable needs changes</p>
                        </div>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="status"
                          value="rejected"
                          checked={formData.status === 'rejected'}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                          className="mr-3 text-red-600 focus:ring-red-500"
                        />
                        <div>
                          <span className="font-medium text-red-700">❌ Reject</span>
                          <p className="text-sm text-gray-600">The deliverable does not meet requirements</p>
                        </div>
                      </label>
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="reviewNotes" className="block text-sm font-medium text-gray-700 mb-2">
                      Review Notes {formData.status === 'revision_requested' && <span className="text-red-500">*</span>}
                    </label>
                    <textarea
                      id="reviewNotes"
                      value={formData.reviewNotes}
                      onChange={(e) => setFormData({ ...formData, reviewNotes: e.target.value })}
                      placeholder={
                        formData.status === 'approved' 
                          ? "Optional: Add any positive feedback or notes..."
                          : formData.status === 'revision_requested'
                          ? "Required: Explain what changes are needed..."
                          : "Optional: Explain why the deliverable was rejected..."
                      }
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required={formData.status === 'revision_requested'}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <button
                      type="submit"
                      disabled={reviewing}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {reviewing ? 'Submitting Review...' : 'Submit Review'}
                    </button>
                    
                    <Link
                      href="/deliverables"
                      className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                    >
                      Cancel
                    </Link>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
