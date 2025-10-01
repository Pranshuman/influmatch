'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { marketplaceAPI } from '@/lib/api'
import { Listing, Proposal } from '@/lib/api'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// Status badge component (reused from proposals page)
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

// Proposal management card component
const ProposalManagementCard = ({ proposal, onStatusUpdate }: { 
  proposal: Proposal, 
  onStatusUpdate: (proposalId: number, status: string) => void 
}) => {
  const [isUpdating, setIsUpdating] = useState(false)

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      setIsUpdating(true)
      const result = await marketplaceAPI.updateProposalStatus(proposal.id, newStatus as any)
      console.log('Proposal status updated successfully:', result)
      onStatusUpdate(proposal.id, newStatus)
    } catch (error: any) {
      console.error('Error updating proposal status:', error)
      const errorMessage = error.message || 'Failed to update proposal status. Please try again.'
      alert(`Error: ${errorMessage}`)
    } finally {
      setIsUpdating(false)
    }
  }

  const canUpdateStatus = proposal.status === 'under_review' || proposal.status === 'accepted'

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-1">
            {proposal.influencer?.name || 'Unknown Influencer'}
          </h4>
          <p className="text-sm text-gray-600">
            {proposal.influencer?.bio || 'No bio available'}
          </p>
        </div>
        <StatusBadge status={proposal.status} />
      </div>

      <div className="space-y-3 mb-4">
        <div>
          <p className="text-sm text-gray-600 mb-1">Proposal Message:</p>
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
          <p className="text-sm text-gray-600">Submitted:</p>
          <p className="text-sm">
            {new Date(proposal.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {canUpdateStatus && (
        <div className="flex gap-2">
          {proposal.status === 'under_review' && (
            <>
              <button
                onClick={() => handleStatusUpdate('accepted')}
                disabled={isUpdating}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {isUpdating ? 'Updating...' : 'Accept'}
              </button>
              <button
                onClick={() => handleStatusUpdate('rejected')}
                disabled={isUpdating}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {isUpdating ? 'Updating...' : 'Reject'}
              </button>
            </>
          )}
          {proposal.status === 'accepted' && (
            <button
              onClick={() => handleStatusUpdate('withdrawn')}
              disabled={isUpdating}
              className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {isUpdating ? 'Updating...' : 'Withdraw'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// Campaign card component
const CampaignCard = ({ listing, onProposalUpdate }: { 
  listing: Listing, 
  onProposalUpdate: (listingId: number, proposalId: number, status: string) => void 
}) => {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProposals = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await marketplaceAPI.getProposalsForListing(listing.id.toString())
      setProposals(response.proposals)
    } catch (err) {
      console.error('Error fetching proposals:', err)
      setError('Failed to load proposals')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProposals()
  }, [listing.id])

  const handleProposalStatusUpdate = (proposalId: number, status: string) => {
    setProposals(prev => 
      prev.map(proposal => 
        proposal.id === proposalId 
          ? { ...proposal, status: status as any }
          : proposal
      )
    )
    onProposalUpdate(listing.id, proposalId, status)
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

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {listing.title}
        </h3>
        <p className="text-gray-600 mb-4">{listing.description}</p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">Budget</p>
            <p className="font-semibold">${listing.budget?.toLocaleString() || '0'}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Deadline</p>
            <p className="font-semibold">
              {listing.deadline ? new Date(listing.deadline).toLocaleDateString() : 'Not set'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Total Proposals</p>
            <p className="font-semibold">{proposals.length}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Accepted</p>
            <p className="font-semibold text-green-600">{statusCounts.accepted}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading proposals...</p>
        </div>
      ) : error ? (
        <div className="text-center py-4">
          <p className="text-red-600 mb-2">{error}</p>
          <button
            onClick={fetchProposals}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
          >
            Try Again
          </button>
        </div>
      ) : proposals.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-600">No proposals yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-gray-900">Proposals</h4>
          {proposals.map((proposal) => (
            <ProposalManagementCard
              key={proposal.id}
              proposal={proposal}
              onStatusUpdate={handleProposalStatusUpdate}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function CampaignManagementPage() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated || user?.userType !== 'brand') {
      router.push('/auth/login')
      return
    }

    fetchMyCampaigns()
  }, [isAuthenticated, user, router])

  const fetchMyCampaigns = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await marketplaceAPI.getListings()
      // Filter to only show campaigns created by the current brand
      const myCampaigns = response.listings.filter(listing => listing.brandId === user?.id)
      setListings(myCampaigns)
    } catch (err) {
      console.error('Error fetching campaigns:', err)
      setError('Failed to load your campaigns. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleProposalUpdate = (listingId: number, proposalId: number, status: string) => {
    console.log(`Proposal ${proposalId} for campaign ${listingId} updated to ${status}`)
    // The state is already updated in the component, this is just for logging
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your campaigns...</p>
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
            onClick={fetchMyCampaigns}
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Campaigns</h1>
            <p className="text-gray-600">
              Review and manage proposals for your campaigns
            </p>
          </div>
          <Link
            href="/dashboard"
            className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Campaigns List */}
        {listings.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
            <p className="text-gray-600 mb-6">
              Create your first campaign to start receiving proposals from influencers!
            </p>
            <button
              onClick={() => router.push('/campaigns/create')}
              className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Create Campaign
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {listings.map((listing) => (
              <CampaignCard
                key={listing.id}
                listing={listing}
                onProposalUpdate={handleProposalUpdate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

