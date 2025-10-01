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
const ProposalManagementCard = ({ proposal, onStatusUpdate, router }: { 
  proposal: Proposal, 
  onStatusUpdate: (proposalId: number, status: string) => void,
  router: any
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
    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-all duration-200">
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
            {(proposal.influencer?.name || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-1">
              {proposal.influencer?.name || 'Unknown Influencer'}
            </h4>
            <p className="text-sm text-gray-600">
              {proposal.influencer?.bio || 'No bio available'}
            </p>
          </div>
        </div>
        <StatusBadge status={proposal.status} />
      </div>

      <div className="space-y-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-2 font-medium">💬 Proposal Message:</p>
          <p className="text-gray-900 leading-relaxed">{proposal.message}</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 rounded-lg p-3">
            <p className="text-sm text-gray-600 mb-1">💰 Proposed Budget:</p>
            <p className="font-bold text-green-600 text-lg">
              ${proposal.proposedBudget?.toLocaleString() || '0'}
            </p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-sm text-gray-600 mb-1">⏰ Timeline:</p>
            <p className="font-semibold text-blue-600">{proposal.timeline || 'Not specified'}</p>
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-3">
          <p className="text-sm text-gray-600 mb-1">📅 Submitted:</p>
          <p className="text-sm font-medium text-purple-600">
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
            <>
              <button
                onClick={() => {
                  // Navigate to chat in the same tab using Next.js router
                  router.push(`/proposals/${proposal.id}/chat`)
                }}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Chat
              </button>
              <button
                onClick={() => handleStatusUpdate('withdrawn')}
                disabled={isUpdating}
                className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {isUpdating ? 'Updating...' : 'Withdraw'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// Campaign card component
const CampaignCard = ({ listing, onProposalUpdate, router }: { 
  listing: Listing, 
  onProposalUpdate: (listingId: number, proposalId: number, status: string) => void,
  router: any
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
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 hover:shadow-xl transition-all duration-200">
      <div className="mb-8">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">
              {listing.title}
            </h3>
            <p className="text-gray-600 mb-6 leading-relaxed">{listing.description}</p>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            {listing.status}
          </span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-green-50 rounded-xl p-4 text-center">
            <p className="text-sm text-gray-600 mb-1">💰 Budget</p>
            <p className="font-bold text-green-600 text-lg">${listing.budget?.toLocaleString() || '0'}</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <p className="text-sm text-gray-600 mb-1">📅 Deadline</p>
            <p className="font-semibold text-blue-600">
              {listing.deadline ? new Date(listing.deadline).toLocaleDateString() : 'Not set'}
            </p>
          </div>
          <div className="bg-purple-50 rounded-xl p-4 text-center">
            <p className="text-sm text-gray-600 mb-1">📝 Total Proposals</p>
            <p className="font-semibold text-purple-600 text-lg">{proposals.length}</p>
          </div>
          <div className="bg-orange-50 rounded-xl p-4 text-center">
            <p className="text-sm text-gray-600 mb-1">✅ Accepted</p>
            <p className="font-semibold text-orange-600 text-lg">{statusCounts.accepted}</p>
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
              router={router}
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Manage Campaigns 📊
              </h1>
              <p className="text-gray-600 text-lg">
                Review and manage proposals for your campaigns
              </p>
            </div>
            <Link
              href="/dashboard"
              className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 px-6 py-3 rounded-xl hover:from-gray-200 hover:to-gray-300 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Campaigns List */}
        {listings.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">📈</span>
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">
              No campaigns yet
            </h3>
            <p className="text-gray-600 mb-8 text-lg">
              Create your first campaign to start receiving proposals from influencers!
            </p>
            <button
              onClick={() => router.push('/campaigns/create')}
              className="inline-flex items-center bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-4 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
            >
              <span className="mr-2">✨</span>
              Create Your First Campaign
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {listings.map((listing) => (
              <CampaignCard
                key={listing.id}
                listing={listing}
                onProposalUpdate={handleProposalUpdate}
                router={router}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

