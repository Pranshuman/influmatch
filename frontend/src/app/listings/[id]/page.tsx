'use client'

import { useState, useEffect, use } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { marketplaceAPI } from '@/lib/api'

interface Listing {
  id: string
  title: string
  description: string
  budget: number
  category: string
  brandId: string
  brandName: string
  createdAt: string
  status: string
  requirements?: string
  deliverables?: string
  timeline?: string
}

interface Proposal {
  id: number
  influencerId: number
  influencerName: string
  message: string
  proposedBudget: number
  status: string
  createdAt: string
  influencer?: {
    id: number
    name: string
    bio?: string
    website?: string
  }
}

export default function ListingDetails({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [listing, setListing] = useState<Listing | null>(null)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showProposalForm, setShowProposalForm] = useState(false)
  const [proposalData, setProposalData] = useState({
    message: '',
    proposedBudget: ''
  })
  const [submittingProposal, setSubmittingProposal] = useState(false)
  
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (resolvedParams.id) {
      fetchListing()
      fetchProposals()
    }
  }, [resolvedParams.id])

  const fetchListing = async () => {
    try {
      const data = await marketplaceAPI.getListing(resolvedParams.id)
      setListing(data.listing)
      console.log('📋 Listing loaded:', data.listing.title, 'owned by brand ID:', data.listing.brandId)
    } catch (err: any) {
      setError(err.message || 'Error loading campaign')
    } finally {
      setLoading(false)
    }
  }

  const fetchProposals = async () => {
    try {
      console.log('🔍 Fetching proposals for listing:', resolvedParams.id)
      console.log('👤 Current user:', user ? `${user.name} (ID: ${user.id}, Type: ${user.userType})` : 'Not logged in')
      
      const data = await marketplaceAPI.getProposalsForListing(resolvedParams.id)
      console.log('✅ Proposals fetched successfully:', data.proposals.length, 'proposals')
      setProposals(data.proposals || [])
    } catch (err: any) {
      console.error('❌ Error fetching proposals:', err)
      setProposals([])
    }
  }

  const handleProposalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAuthenticated) {
      router.push('/auth/login')
      return
    }

    setSubmittingProposal(true)
    try {
      const result = await marketplaceAPI.submitProposal(resolvedParams.id, {
        message: proposalData.message,
        proposedBudget: parseFloat(proposalData.proposedBudget)
      })

      if (result.proposal) {
        setShowProposalForm(false)
        setProposalData({ message: '', proposedBudget: '' })
        fetchProposals() // Refresh proposals
        alert('Proposal submitted successfully!')
      }
    } catch (err: any) {
      alert(`Error submitting proposal: ${err.message || 'Unknown error'}`)
    } finally {
      setSubmittingProposal(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Loading campaign...</h2>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    )
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600 mb-4">{error || 'Campaign not found'}</p>
          <Link
            href="/marketplace"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Marketplace
          </Link>
        </div>
      </div>
    )
  }

  const canSubmitProposal = isAuthenticated && user?.userType === 'influencer' && (listing.status === 'active' || listing.status === null)
  const isBrandOwner = isAuthenticated && user?.userType === 'brand' && user?.id === Number(listing.brandId)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <Link
              href="/marketplace"
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
            >
              ← Back to Marketplace
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="flex justify-between items-start mb-4">
                  <h1 className="text-3xl font-bold text-gray-900">{listing.title}</h1>
                  <span className="bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full">
                    {listing.status}
                  </span>
                </div>
                
                <div className="flex items-center text-gray-600 mb-6">
                  <span>Posted by <strong>{listing.brandName}</strong></span>
                  <span className="mx-2">•</span>
                  <span>{new Date(listing.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="prose max-w-none">
                  <p className="text-gray-700 text-lg leading-relaxed mb-6">
                    {listing.description}
                  </p>
                </div>

                {listing.requirements && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Requirements</h3>
                    <p className="text-gray-700">{listing.requirements}</p>
                  </div>
                )}

                {listing.deliverables && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Expected Deliverables</h3>
                    <p className="text-gray-700">{listing.deliverables}</p>
                  </div>
                )}

                {listing.timeline && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Timeline</h3>
                    <p className="text-gray-700">{listing.timeline}</p>
                  </div>
                )}
              </div>

              {/* Proposals Section */}
              {isBrandOwner && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Proposals ({proposals.length})
                  </h3>
                  
                  {proposals.length === 0 ? (
                    <p className="text-gray-600">No proposals yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {proposals.map((proposal) => (
                        <div key={proposal.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-gray-900">{proposal.influencerName}</h4>
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                              {proposal.status}
                            </span>
                          </div>
                          <p className="text-gray-700 mb-2">{proposal.message}</p>
                          <div className="flex justify-between items-center text-sm text-gray-600">
                            <span>Proposed Rate: <strong>${proposal.proposedBudget?.toLocaleString() || '0'}</strong></span>
                            <span>{new Date(proposal.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Budget:</span>
                    <span className="font-bold text-green-600 text-xl">
                      ${listing.budget?.toLocaleString() || '0'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Category:</span>
                    <span className="font-medium">{listing.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="font-medium">{listing.status}</span>
                  </div>
                </div>

                {canSubmitProposal && (
                  <div>
                    {!showProposalForm ? (
                      <button
                        onClick={() => setShowProposalForm(true)}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Submit Proposal
                      </button>
                    ) : (
                      <form onSubmit={handleProposalSubmit} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Your Message
                          </label>
                          <textarea
                            value={proposalData.message}
                            onChange={(e) => setProposalData({ ...proposalData, message: e.target.value })}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Tell the brand why you're perfect for this campaign..."
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Your Rate ($)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={proposalData.proposedBudget}
                            onChange={(e) => setProposalData({ ...proposalData, proposedBudget: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder="1000"
                            required
                          />
                        </div>
                        <div className="flex space-x-2">
                          <button
                            type="submit"
                            disabled={submittingProposal}
                            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                          >
                            {submittingProposal ? 'Submitting...' : 'Submit'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowProposalForm(false)}
                            className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {!isAuthenticated && (
                  <div className="text-center">
                    <p className="text-gray-600 mb-4">Sign in to submit a proposal</p>
                    <Link
                      href="/auth/login"
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors block"
                    >
                      Sign In
                    </Link>
                  </div>
                )}

                {isAuthenticated && user?.userType === 'brand' && !isBrandOwner && (
                  <p className="text-gray-600 text-center">
                    This is your own campaign
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}



