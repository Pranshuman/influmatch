'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { marketplaceAPI, Proposal, Listing } from '@/lib/api'

export default function CreateDeliverablePage() {
  const [campaigns, setCampaigns] = useState<Listing[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<Listing | null>(null)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [deliverableCounts, setDeliverableCounts] = useState<Array<{
    campaignId: number
    totalAcceptedProposals: number
    totalDeliverables: number
    unattendedProposals: number
  }>>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  
  const [formData, setFormData] = useState({
    proposalId: '',
    title: '',
    description: '',
    type: 'image' as 'image' | 'video' | 'post' | 'story' | 'reel' | 'other',
    dueDate: ''
  })
  
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()

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
      fetchCampaigns()
    }
  }, [authChecked, user])

  const fetchCampaigns = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Get all campaigns for this brand and deliverable counts
      const [listingsResponse, countsResponse] = await Promise.all([
        marketplaceAPI.getListings(),
        marketplaceAPI.getCampaignDeliverableCounts()
      ])
      
      const brandCampaigns = listingsResponse.listings.filter(listing => listing.brandId === user?.id)
      setCampaigns(brandCampaigns)
      setDeliverableCounts(countsResponse.counts)
    } catch (err: any) {
      console.error('Error fetching campaigns:', err)
      setError(err.message || 'Failed to load campaigns. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fetchProposalsForCampaign = async (campaignId: number) => {
    try {
      setLoading(true)
      setError(null)
      
      // Get proposals for this specific campaign
      const response = await marketplaceAPI.getProposalsForListing(campaignId.toString())
      const acceptedProposals = response.proposals.filter(proposal => proposal.status === 'accepted')
      setProposals(acceptedProposals)
    } catch (err: any) {
      console.error('Error fetching proposals:', err)
      setError(err.message || 'Failed to load proposals. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCampaignSelect = (campaign: Listing) => {
    setSelectedCampaign(campaign)
    setProposals([])
    setFormData({
      proposalId: '',
      title: '',
      description: '',
      type: 'image',
      dueDate: ''
    })
    fetchProposalsForCampaign(campaign.id)
  }

  const getUnattendedCount = (campaignId: number) => {
    const count = deliverableCounts.find(c => c.campaignId === campaignId)
    return count?.unattendedProposals || 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.proposalId || !formData.title.trim()) {
      setError('Please fill in all required fields')
      return
    }

    try {
      setCreating(true)
      setError(null)
      
      await marketplaceAPI.createDeliverable({
        proposalId: parseInt(formData.proposalId),
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        type: formData.type,
        dueDate: formData.dueDate || undefined
      })
      
      setSuccess(true)
      setTimeout(() => {
        router.push('/deliverables')
      }, 2000)
    } catch (err: any) {
      console.error('Error creating deliverable:', err)
      setError(err.message || 'Failed to create deliverable. Please try again.')
    } finally {
      setCreating(false)
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

  if (!authChecked || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading proposals...</p>
        </div>
      </div>
    )
  }

  if (error && proposals.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">❌</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Proposals</h2>
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
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Deliverable Created Successfully!</h2>
          <p className="text-gray-600 mb-4">The deliverable has been created and assigned to the influencer.</p>
          <p className="text-sm text-gray-500">Redirecting to deliverables page...</p>
        </div>
      </div>
    )
  }

  if (campaigns.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">No Campaigns Found</h2>
            <p className="text-gray-600 mb-4">
              You need to create campaigns and have accepted proposals before you can create deliverables.
            </p>
            <Link
              href="/campaigns/manage"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Manage Campaigns
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Create Deliverable</h1>
              <p className="text-gray-600 mt-2">
                {!selectedCampaign 
                  ? "Select a campaign to create deliverables for accepted proposals"
                  : `Creating deliverable for: ${selectedCampaign.title}`
                }
              </p>
            </div>
            <div className="flex space-x-3">
              {selectedCampaign && (
                <button
                  onClick={() => {
                    setSelectedCampaign(null)
                    setProposals([])
                    setFormData({
                      proposalId: '',
                      title: '',
                      description: '',
                      type: 'image',
                      dueDate: ''
                    })
                  }}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Back to Campaigns
                </button>
              )}
              <Link
                href="/deliverables"
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Back to Deliverables
              </Link>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {!selectedCampaign ? (
          /* Campaign Selection */
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Select a Campaign</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaigns.map((campaign) => {
                const unattendedCount = getUnattendedCount(campaign.id)
                return (
                  <div
                    key={campaign.id}
                    className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-blue-200 relative"
                    onClick={() => handleCampaignSelect(campaign)}
                  >
                    {/* Notification Bubble */}
                    {unattendedCount > 0 && (
                      <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center shadow-lg animate-pulse">
                        {unattendedCount > 99 ? '99+' : unattendedCount}
                      </div>
                    )}
                    
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 pr-2">{campaign.title}</h3>
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex-shrink-0">
                        ${campaign.budget.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">{campaign.description}</p>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>Category: {campaign.category}</span>
                      <span className="text-blue-600 font-medium">
                        {unattendedCount > 0 ? `${unattendedCount} pending` : 'Click to view'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          /* Proposal Selection and Form */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Accepted Proposals */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Accepted Proposals</h2>
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    {proposals.length} proposal{proposals.length !== 1 ? 's' : ''}
                  </span>
                </div>
                
                {loading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-sm text-gray-600 mt-2">Loading proposals...</p>
                  </div>
                ) : proposals.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-4xl mb-2">📝</div>
                    <p className="text-gray-600 text-sm">No accepted proposals for this campaign</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {proposals.map((proposal) => (
                      <div
                        key={proposal.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          formData.proposalId === proposal.id.toString()
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setFormData({ ...formData, proposalId: proposal.id.toString() })}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900 text-sm">{proposal.influencer?.name}</h4>
                          <span className="text-xs text-gray-500">${proposal.proposedBudget}</span>
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2">{proposal.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Create Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Deliverable Details</h2>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Instagram Post with Product Photo"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe what the influencer needs to deliver..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                      Type *
                    </label>
                    <select
                      id="type"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="image">🖼️ Image</option>
                      <option value="video">🎥 Video</option>
                      <option value="post">📝 Post</option>
                      <option value="story">📖 Story</option>
                      <option value="reel">🎬 Reel</option>
                      <option value="other">📄 Other</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-2">
                      Due Date
                    </label>
                    <input
                      type="date"
                      id="dueDate"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <button
                      type="submit"
                      disabled={creating || !formData.proposalId}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {creating ? 'Creating...' : 'Create Deliverable'}
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
