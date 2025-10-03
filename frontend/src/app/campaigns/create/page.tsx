'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { marketplaceAPI } from '@/lib/api'

export default function CreateCampaign() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    budget: '',
    category: 'lifestyle',
    requirements: '',
    deliverables: '',
    campaignDeadline: '',
    deadline: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()

  // Handle redirect in useEffect to avoid setState during render
  useEffect(() => {
    // Only check authentication after loading is complete
    if (!authLoading) {
      console.log('🔍 Create Campaign - Auth Check:', {
        isAuthenticated,
        user: user ? { id: user.id, name: user.name, userType: user.userType } : null,
        shouldRedirect: !isAuthenticated || !user || user.userType !== 'brand'
      })
      
      if (!isAuthenticated || !user || user.userType !== 'brand') {
        console.log('❌ Authentication failed - redirecting to login')
        setIsRedirecting(true)
        router.push('/auth/login')
      } else {
        console.log('✅ Authentication successful - user can create campaigns')
      }
      setAuthChecked(true)
    }
  }, [authLoading, isAuthenticated, user, router])

  // Show loading state while checking authentication or redirecting
  if (authLoading || !authChecked || isRedirecting || !isAuthenticated || !user || user.userType !== 'brand') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {isRedirecting ? 'Redirecting to login...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      // Validate application deadline if provided and set to end of day (EOD)
      let deadlineTimestamp = undefined
      if (formData.deadline) {
        const deadlineDate = new Date(formData.deadline)
        if (isNaN(deadlineDate.getTime())) {
          setError('Invalid application deadline date. Please select a valid date.')
          setIsLoading(false)
          return
        }
        // Set to end of day (23:59:59.999)
        deadlineDate.setHours(23, 59, 59, 999)
        deadlineTimestamp = deadlineDate.getTime()
      }

      // Validate campaign deadline if provided and set to end of day (EOD)
      let campaignDeadlineTimestamp = undefined
      if (formData.campaignDeadline) {
        const campaignDeadlineDate = new Date(formData.campaignDeadline)
        if (isNaN(campaignDeadlineDate.getTime())) {
          setError('Invalid campaign deadline date. Please select a valid date.')
          setIsLoading(false)
          return
        }
        // Set to end of day (23:59:59.999)
        campaignDeadlineDate.setHours(23, 59, 59, 999)
        campaignDeadlineTimestamp = campaignDeadlineDate.getTime()
      }

      const result = await marketplaceAPI.createListing({
        ...formData,
        budget: parseFloat(formData.budget),
        deadline: deadlineTimestamp,
        campaignDeadline: campaignDeadlineTimestamp
      })
      
      if (result.listing) {
        setSuccess(true)
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            ✅ Campaign created successfully!
          </div>
          <p className="text-gray-600">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header Section */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                  Create New Campaign ✨
                </h1>
                <p className="text-gray-600 text-lg">
                  Launch a campaign to connect with amazing influencers
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

          {/* Campaign Form */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl flex items-center">
                  <span className="mr-3 text-xl">⚠️</span>
                  <div>
                    <p className="font-medium">Error creating campaign</p>
                    <p className="text-sm">{error}</p>
                  </div>
                </div>
              )}

              {/* Basic Information Section */}
              <div className="space-y-6">
                <div className="border-b border-gray-200 pb-4">
                  <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                    <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-blue-600 font-bold">1</span>
                    </span>
                    Basic Information
                  </h3>
                </div>

                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-3">
                    Campaign Title *
                  </label>
                  <input
                    id="title"
                    name="title"
                    type="text"
                    required
                    value={formData.title}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="e.g., Summer Fashion Campaign 2024"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-3">
                    Campaign Description *
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={4}
                    required
                    value={formData.description}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Describe your campaign goals, target audience, and what you're looking for in influencers..."
                  />
                </div>
              </div>

              {/* Budget & Category Section */}
              <div className="space-y-6">
                <div className="border-b border-gray-200 pb-4">
                  <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                    <span className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-green-600 font-bold">2</span>
                    </span>
                    Budget & Category
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-3">
                      Budget (Rs.) *
                    </label>
                    <input
                      id="budget"
                      name="budget"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={formData.budget}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter amount"
                    />
                  </div>

                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-3">
                      Category *
                    </label>
                    <select
                      id="category"
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="lifestyle">🌟 Lifestyle</option>
                      <option value="fashion">👗 Fashion</option>
                      <option value="beauty">💄 Beauty</option>
                      <option value="fitness">💪 Fitness</option>
                      <option value="food">🍕 Food</option>
                      <option value="travel">✈️ Travel</option>
                      <option value="technology">💻 Technology</option>
                      <option value="business">💼 Business</option>
                      <option value="other">🔖 Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Requirements & Deliverables Section */}
              <div className="space-y-6">
                <div className="border-b border-gray-200 pb-4">
                  <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                    <span className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-purple-600 font-bold">3</span>
                    </span>
                    Requirements & Deliverables
                  </h3>
                </div>

                <div>
                  <label htmlFor="requirements" className="block text-sm font-medium text-gray-700 mb-3">
                    Influencer Requirements
                  </label>
                  <textarea
                    id="requirements"
                    name="requirements"
                    rows={3}
                    value={formData.requirements}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="e.g., Minimum 10k followers, specific age range, location requirements, engagement rate..."
                  />
                </div>

                <div>
                  <label htmlFor="deliverables" className="block text-sm font-medium text-gray-700 mb-3">
                    Expected Deliverables
                  </label>
                  <textarea
                    id="deliverables"
                    name="deliverables"
                    rows={3}
                    value={formData.deliverables}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="e.g., 3 Instagram posts, 5 Instagram stories, 1 TikTok video, 1 YouTube short..."
                  />
                </div>
              </div>

              {/* Timeline Section */}
              <div className="space-y-6">
                <div className="border-b border-gray-200 pb-4">
                  <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                    <span className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-orange-600 font-bold">4</span>
                    </span>
                    Timeline
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-3">
                      Application Deadline (End of Day) *
                    </label>
                    <input
                      id="deadline"
                      name="deadline"
                      type="date"
                      required
                      value={formData.deadline}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      min={new Date().toISOString().slice(0, 10)}
                    />
                  </div>

                  <div>
                    <label htmlFor="campaignDeadline" className="block text-sm font-medium text-gray-700 mb-3">
                      Campaign Deadline (End of Day)
                    </label>
                    <input
                      id="campaignDeadline"
                      name="campaignDeadline"
                      type="date"
                      value={formData.campaignDeadline}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      min={new Date().toISOString().slice(0, 10)}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4 pt-6">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-6 rounded-xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Creating Campaign...
                    </span>
                  ) : (
                    '🚀 Create Campaign'
                  )}
                </button>
                <Link
                  href="/dashboard"
                  className="flex-1 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 py-4 px-6 rounded-xl hover:from-gray-200 hover:to-gray-300 transition-all duration-200 text-center font-medium shadow-md hover:shadow-lg"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}



