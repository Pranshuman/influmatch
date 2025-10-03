'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { marketplaceAPI } from '@/lib/api'
import { Proposal } from '@/lib/api'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

export default function EditProposalPage() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const params = useParams()
  const proposalId = params.id as string

  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    message: '',
    proposedBudget: '',
    timeline: ''
  })

  useEffect(() => {
    if (!isAuthenticated || user?.userType !== 'influencer') {
      router.push('/auth/login')
      return
    }

    fetchProposal()
  }, [isAuthenticated, user, router, proposalId])

  const fetchProposal = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Get all proposals and find the one we want to edit
      const response = await marketplaceAPI.getMyProposals()
      const targetProposal = response.proposals.find(p => p.id === parseInt(proposalId))
      
      if (!targetProposal) {
        setError('Proposal not found')
        return
      }

      if (targetProposal.status !== 'under_review') {
        setError('This proposal cannot be edited. Only proposals with "Under Review" status can be modified.')
        return
      }

      setProposal(targetProposal)
      setFormData({
        message: targetProposal.message,
        proposedBudget: targetProposal.proposedBudget?.toString() || '',
        timeline: targetProposal.timeline || ''
      })
    } catch (err) {
      console.error('Error fetching proposal:', err)
      setError('Failed to load proposal. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!proposal) return

    try {
      setSaving(true)
      setError(null)

      await marketplaceAPI.updateProposal(proposal.id, {
        message: formData.message,
        proposedBudget: parseInt(formData.proposedBudget),
        timeline: formData.timeline
      })

      // Redirect back to proposals page
      router.push('/proposals')
    } catch (err) {
      console.error('Error updating proposal:', err)
      setError('Failed to update proposal. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    router.push('/proposals')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading proposal...</p>
        </div>
      </div>
    )
  }

  if (error || !proposal) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-red-600 mb-4">{error || 'Proposal not found'}</p>
          <button
            onClick={() => router.push('/proposals')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Back to Proposals
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Proposal</h1>
            <p className="text-gray-600">
              Update your proposal for: <span className="font-medium">{proposal.listingTitle}</span>
            </p>
          </div>
          <Link
            href="/proposals"
            className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
          >
            ← Back to Proposals
          </Link>
        </div>

        {/* Campaign Info */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Campaign Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Campaign Budget:</p>
              <p className="font-semibold">Rs. {proposal.listingBudget?.toLocaleString() || '0'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Deadline:</p>
              <p className="font-semibold">
                {proposal.listingDeadline ? new Date(proposal.listingDeadline).toLocaleDateString() : 'Not set'}
              </p>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="space-y-6">
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                Proposal Message *
              </label>
              <textarea
                id="message"
                name="message"
                rows={4}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe your approach and why you're the right fit for this campaign..."
                required
              />
            </div>

            <div>
              <label htmlFor="proposedBudget" className="block text-sm font-medium text-gray-700 mb-2">
                Proposed Budget (Rs.) *
              </label>
              <input
                type="number"
                id="proposedBudget"
                name="proposedBudget"
                value={formData.proposedBudget}
                onChange={(e) => setFormData({ ...formData, proposedBudget: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your proposed budget"
                min="0"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                Campaign budget: Rs. {proposal.listingBudget?.toLocaleString() || '0'}
              </p>
            </div>

            <div>
              <label htmlFor="timeline" className="block text-sm font-medium text-gray-700 mb-2">
                Timeline *
              </label>
              <input
                type="text"
                id="timeline"
                name="timeline"
                value={formData.timeline}
                onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 2 weeks, 1 month, etc."
                required
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {saving ? 'Saving...' : 'Update Proposal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

