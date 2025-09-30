'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { marketplaceAPI } from '@/lib/api'
import { Proposal } from '@/lib/api'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'accepted':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'withdrawn':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'under_review':
        return 'Under Review'
      case 'accepted':
        return 'Accepted'
      case 'rejected':
        return 'Rejected'
      case 'withdrawn':
        return 'Withdrawn'
      default:
        return status
    }
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(status)}`}>
      {getStatusText(status)}
    </span>
  )
}

// Proposal card component
const ProposalCard = ({ proposal }: { proposal: Proposal }) => {
  const router = useRouter()
  const { user } = useAuth()

  const handleViewCampaign = () => {
    router.push(`/listings/${proposal.listingId}`)
  }

  const handleEditProposal = () => {
    router.push(`/proposals/edit/${proposal.id}`)
  }

  const canEdit = proposal.status === 'under_review' && user?.userType === 'influencer'

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {proposal.listingTitle}
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            by {proposal.brand?.name || 'Unknown Brand'}
          </p>
        </div>
        <StatusBadge status={proposal.status} />
      </div>

      <div className="space-y-3 mb-4">
        <div>
          <p className="text-sm text-gray-600 mb-1">Your Proposal:</p>
          <p className="text-gray-900">{proposal.message}</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Proposed Budget:</p>
            <p className="font-semibold text-green-600">
              ${proposal.proposedBudget?.toLocaleString() || '0'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Timeline:</p>
            <p className="font-semibold">{proposal.timeline || 'Not specified'}</p>
          </div>
        </div>

        <div>
          <p className="text-sm text-gray-600">Campaign Budget:</p>
          <p className="font-semibold">
            ${proposal.listingBudget?.toLocaleString() || '0'}
          </p>
        </div>

        <div>
          <p className="text-sm text-gray-600">Submitted:</p>
          <p className="text-sm">
            {new Date(proposal.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleViewCampaign}
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          View Campaign
        </button>
        
        {canEdit && (
          <button
            onClick={handleEditProposal}
            className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            Edit Proposal
          </button>
        )}
      </div>
    </div>
  )
}

export default function MyProposalsPage() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated || user?.userType !== 'influencer') {
      router.push('/auth/login')
      return
    }

    fetchProposals()
  }, [isAuthenticated, user, router])

  const fetchProposals = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await marketplaceAPI.getMyProposals()
      setProposals(response.proposals)
    } catch (err) {
      console.error('Error fetching proposals:', err)
      setError('Failed to load your proposals. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getStatusCounts = () => {
    const counts = {
      under_review: 0,
      accepted: 0,
      rejected: 0,
      withdrawn: 0
    }
    
    proposals.forEach(proposal => {
      counts[proposal.status as keyof typeof counts]++
    })
    
    return counts
  }

  const statusCounts = getStatusCounts()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your proposals...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchProposals}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Proposals</h1>
            <p className="text-gray-600">
              Track the status of your campaign proposals
            </p>
          </div>
          <Link
            href="/dashboard"
            className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Status Summary */}
        {proposals.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Under Review</p>
                  <p className="text-2xl font-bold text-gray-900">{statusCounts.under_review}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Accepted</p>
                  <p className="text-2xl font-bold text-gray-900">{statusCounts.accepted}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Rejected</p>
                  <p className="text-2xl font-bold text-gray-900">{statusCounts.rejected}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Withdrawn</p>
                  <p className="text-2xl font-bold text-gray-900">{statusCounts.withdrawn}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Proposals List */}
        {proposals.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No proposals yet</h3>
            <p className="text-gray-600 mb-6">
              Start by browsing campaigns and submitting your first proposal!
            </p>
            <button
              onClick={() => router.push('/marketplace')}
              className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Browse Campaigns
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {proposals.map((proposal) => (
              <ProposalCard key={proposal.id} proposal={proposal} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
