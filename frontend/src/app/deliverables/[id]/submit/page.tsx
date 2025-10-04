'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { marketplaceAPI, Deliverable } from '@/lib/api'

export default function SubmitDeliverablePage() {
  const [deliverable, setDeliverable] = useState<Deliverable | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  
  const [formData, setFormData] = useState({
    fileUrl: '',
    submissionNotes: ''
  })
  
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const deliverableId = params.id as string

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || !user || user.userType !== 'influencer') {
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
      const response = await marketplaceAPI.getMyDeliverables()
      const foundDeliverable = response.deliverables.find(d => d.id === parseInt(deliverableId))
      
      if (!foundDeliverable) {
        setError('Deliverable not found')
        return
      }
      
      if (foundDeliverable.status !== 'pending' && foundDeliverable.status !== 'revision_requested') {
        setError('This deliverable has already been submitted or is not available for submission')
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
    
    if (!formData.fileUrl.trim()) {
      errors.push('File URL is required')
    } else {
      // Validate URL format
      try {
        new URL(formData.fileUrl.trim())
      } catch {
        errors.push('Please enter a valid URL')
      }
      
      // Check URL length
      if (formData.fileUrl.length > 500) {
        errors.push('File URL is too long (max 500 characters)')
      }
    }
    
    // Validate submission notes length
    if (formData.submissionNotes && formData.submissionNotes.length > 1000) {
      errors.push('Submission notes must be less than 1000 characters')
    }
    
    return errors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Client-side validation
    const validationErrors = validateForm()
    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '))
      return
    }
    
    try {
      setSubmitting(true)
      setError(null)
      
      await marketplaceAPI.submitDeliverable(parseInt(deliverableId), {
        fileUrl: formData.fileUrl.trim(),
        submissionNotes: formData.submissionNotes.trim() || undefined
      })
      
      setSuccess(true)
      setTimeout(() => {
        router.push('/deliverables')
      }, 2000)
    } catch (err: any) {
      console.error('Error submitting deliverable:', err)
      setError(err.message || 'Failed to submit deliverable. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
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
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Deliverable Submitted Successfully!</h2>
          <p className="text-gray-600 mb-4">Your deliverable has been submitted for review.</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Submit Deliverable</h1>
              <p className="text-gray-600 mt-2">Upload your deliverable for review</p>
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
                  
                  {deliverable.dueDate && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Due Date</h4>
                      <p className="text-sm text-gray-600">{formatDate(deliverable.dueDate)}</p>
                    </div>
                  )}
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Status</h4>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      deliverable.status === 'pending' 
                        ? 'bg-gray-100 text-gray-800' 
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {deliverable.status === 'pending' ? 'Pending Submission' : 'Revision Requested'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Submission Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">
                  {deliverable.status === 'pending' ? 'Submit Your Deliverable' : 'Resubmit Your Deliverable'}
                </h2>
                
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800">{error}</p>
                  </div>
                )}
                
                {/* Show review notes if this is a revision request */}
                {deliverable.status === 'revision_requested' && deliverable.reviewNotes && (
                  <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <h3 className="font-medium text-orange-900 mb-2">📝 Revision Request</h3>
                    <p className="text-orange-800">{deliverable.reviewNotes}</p>
                  </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="fileUrl" className="block text-sm font-medium text-gray-700 mb-2">
                      File URL *
                    </label>
                    <input
                      type="url"
                      id="fileUrl"
                      value={formData.fileUrl}
                      onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
                      placeholder="https://example.com/your-file.jpg"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Upload your file to a cloud service (Google Drive, Dropbox, etc.) and paste the shareable link here.
                    </p>
                  </div>
                  
                  <div>
                    <label htmlFor="submissionNotes" className="block text-sm font-medium text-gray-700 mb-2">
                      Submission Notes (Optional)
                    </label>
                    <textarea
                      id="submissionNotes"
                      value={formData.submissionNotes}
                      onChange={(e) => setFormData({ ...formData, submissionNotes: e.target.value })}
                      placeholder="Add any notes about your submission..."
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {submitting 
                        ? (deliverable.status === 'pending' ? 'Submitting...' : 'Resubmitting...') 
                        : (deliverable.status === 'pending' ? 'Submit Deliverable' : 'Resubmit Deliverable')
                      }
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
