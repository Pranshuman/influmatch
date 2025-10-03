'use client'

import { useState, useEffect, use } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { marketplaceAPI, Listing, Proposal } from '@/lib/api'
import { formatDateSafely } from '@/lib/dateUtils'

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
  const [proposalError, setProposalError] = useState('')
  const [userProposal, setUserProposal] = useState<Proposal | null>(null)
  
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
      
      // Check if current user has a proposal for this listing
      if (user && user.userType === 'influencer') {
        const userProposal = data.proposals.find(p => p.influencerId === user.id)
        setUserProposal(userProposal || null)
      }
    } catch (err: any) {
      console.error('❌ Error fetching proposals:', err)
      setProposals([])
      setUserProposal(null)
    }
  }

  const handleProposalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAuthenticated) {
      router.push('/auth/login')
      return
    }

    setSubmittingProposal(true)
    setProposalError('')
    
    try {
      const result = await marketplaceAPI.submitProposal(resolvedParams.id, {
        message: proposalData.message,
        proposedBudget: parseFloat(proposalData.proposedBudget)
      })

      if (result.proposal) {
        setShowProposalForm(false)
        setProposalData({ message: '', proposedBudget: '' })
        setProposalError('')
        fetchProposals() // Refresh proposals
        // Show success message instead of alert
        setProposalError('success:Proposal submitted successfully!')
        setTimeout(() => setProposalError(''), 3000)
      }
    } catch (err: any) {
      console.error('Proposal submission error:', err)
      
      // Handle specific error cases
      if (err.message && err.message.includes('already submitted')) {
        setProposalError('You have already submitted a proposal for this campaign. You can edit your existing proposal instead.')
      } else {
        setProposalError(`Error submitting proposal: ${err.message || 'Unknown error'}`)
      }
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

  const canSubmitProposal = isAuthenticated && user?.userType === 'influencer' && (listing.status === 'active' || listing.status === null || listing.status === undefined) && !userProposal
  const isBrandOwner = isAuthenticated && user?.userType === 'brand' && user?.id === Number(listing.brandId)
  const hasExistingProposal = userProposal !== null

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header Section */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
            <div className="flex justify-between items-center">
              <Link
                href="/marketplace"
                className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 px-6 py-3 rounded-xl hover:from-gray-200 hover:to-gray-300 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
              >
                ← Back to Marketplace
              </Link>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                {listing.status}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 mb-6">
                <div className="mb-6">
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
                    {listing.title}
                  </h1>
                  
                  <div className="flex items-center text-gray-600 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                      {listing.brandName?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Posted by <strong>{listing.brandName}</strong></p>
                      <p className="text-sm text-gray-500">{new Date(listing.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                <div className="prose max-w-none">
                  <p className="text-gray-700 text-lg leading-relaxed mb-8">
                    {listing.description}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {listing.requirements && (
                    <div className="bg-blue-50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
                        <span className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center mr-2">
                          <span className="text-blue-600 text-sm">📋</span>
                        </span>
                        Requirements
                      </h3>
                      <p className="text-blue-800 leading-relaxed">{listing.requirements}</p>
                    </div>
                  )}

                  {listing.deliverables && (
                    <div className="bg-green-50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-green-900 mb-3 flex items-center">
                        <span className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center mr-2">
                          <span className="text-green-600 text-sm">🎯</span>
                        </span>
                        Expected Deliverables
                      </h3>
                      <p className="text-green-800 leading-relaxed">{listing.deliverables}</p>
                    </div>
                  )}
                </div>

                {listing.deadline && (
                  <div className="mt-6 bg-orange-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-orange-900 mb-2 flex items-center">
                      <span className="w-6 h-6 bg-orange-100 rounded-lg flex items-center justify-center mr-2">
                        <span className="text-orange-600 text-sm">⏰</span>
                      </span>
                      Application Deadline
                    </h3>
                    <p className="text-orange-800 font-medium">{formatDateSafely(listing.deadline)}</p>
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
                            <h4 className="font-semibold text-gray-900">{proposal.influencer?.name || 'Unknown'}</h4>
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                              {proposal.status}
                            </span>
                          </div>
                          <p className="text-gray-700 mb-2">{proposal.message}</p>
                          <div className="flex justify-between items-center text-sm text-gray-600">
                            <span>Proposed Rate: <strong>Rs. {proposal.proposedBudget?.toLocaleString() || '0'}</strong></span>
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
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sticky top-8">
                {/* Campaign Summary */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center mr-2">
                      <span className="text-blue-600 text-sm">💰</span>
                    </span>
                    Campaign Summary
                  </h3>
                  <div className="space-y-4">
                    <div className="bg-green-50 rounded-xl p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-green-700 font-medium">Budget:</span>
                        <span className="font-bold text-green-600 text-xl">
                          Rs. {listing.budget?.toLocaleString() || '0'}
                        </span>
                      </div>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-blue-700 font-medium">Category:</span>
                        <span className="font-medium text-blue-600 capitalize">{listing.category}</span>
                      </div>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-purple-700 font-medium">Status:</span>
                        <span className="font-medium text-purple-600">{listing.status}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Show proposal error/success message */}
                {proposalError && (
                  <div className={`mb-6 p-4 rounded-xl flex items-center ${
                    proposalError.startsWith('success:') 
                      ? 'bg-green-50 text-green-800 border border-green-200' 
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    <span className="mr-3 text-xl">
                      {proposalError.startsWith('success:') ? '✅' : '⚠️'}
                    </span>
                    <div>
                      <p className="font-medium">
                        {proposalError.startsWith('success:') ? 'Success!' : 'Error'}
                      </p>
                      <p className="text-sm">
                        {proposalError.startsWith('success:') ? proposalError.substring(8) : proposalError}
                      </p>
                    </div>
                  </div>
                )}

                {/* Show existing proposal status */}
                {hasExistingProposal && userProposal && (
                  <div className="mb-6 p-6 bg-blue-50 border border-blue-200 rounded-xl">
                    <h4 className="font-semibold text-blue-900 mb-4 flex items-center">
                      <span className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center mr-2">
                        <span className="text-blue-600 text-sm">📝</span>
                      </span>
                      Your Proposal Status
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-blue-700 font-medium">Status:</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          userProposal.status === 'under_review' ? 'bg-yellow-100 text-yellow-800' :
                          userProposal.status === 'accepted' ? 'bg-green-100 text-green-800' :
                          userProposal.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {userProposal.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-blue-700 font-medium">Your Rate:</span>
                        <span className="font-bold text-blue-900 text-lg">Rs. {userProposal.proposedBudget?.toLocaleString() || '0'}</span>
                      </div>
                      <div className="text-sm text-blue-600">
                        Submitted: {new Date(userProposal.createdAt).toLocaleDateString()}
                      </div>
                      {userProposal.status === 'under_review' && (
                        <div className="pt-3">
                          <Link
                            href={`/proposals/edit/${userProposal.id}`}
                            className="inline-flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                          >
                            ✏️ Edit Proposal
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Proposal Form */}
                {canSubmitProposal && (
                  <div>
                    {!showProposalForm ? (
                      <button
                        onClick={() => setShowProposalForm(true)}
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-6 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                      >
                        🚀 Submit Your Proposal
                      </button>
                    ) : (
                      <div className="bg-gray-50 rounded-xl p-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <span className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center mr-2">
                            <span className="text-blue-600 text-sm">✍️</span>
                          </span>
                          Submit Proposal
                        </h4>
                        <form onSubmit={handleProposalSubmit} className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Your Message *
                            </label>
                            <textarea
                              value={proposalData.message}
                              onChange={(e) => setProposalData({ ...proposalData, message: e.target.value })}
                              rows={4}
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                              placeholder="Tell the brand why you're perfect for this campaign. Highlight your experience, audience, and how you can help achieve their goals..."
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Your Rate (Rs.) *
                            </label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg">Rs.</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={proposalData.proposedBudget}
                                onChange={(e) => setProposalData({ ...proposalData, proposedBudget: e.target.value })}
                                className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                placeholder="1000"
                                required
                              />
                            </div>
                          </div>
                          <div className="flex space-x-3 pt-2">
                            <button
                              type="submit"
                              disabled={submittingProposal}
                              className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-4 rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {submittingProposal ? (
                                <span className="flex items-center justify-center">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  Submitting...
                                </span>
                              ) : (
                                '🚀 Submit Proposal'
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowProposalForm(false)
                                setProposalError('')
                              }}
                              className="flex-1 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 py-3 px-4 rounded-xl hover:from-gray-200 hover:to-gray-300 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      </div>
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



