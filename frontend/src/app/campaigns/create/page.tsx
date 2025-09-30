'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function CreateCampaign() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    budget: '',
    category: 'lifestyle',
    requirements: '',
    deliverables: '',
    timeline: '',
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
      const token = localStorage.getItem('auth_token')
      const response = await fetch('http://localhost:5050/api/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          budget: parseFloat(formData.budget),
          deadline: formData.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }),
      })

      if (response.ok) {
        setSuccess(true)
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Failed to create campaign')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
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
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Create New Campaign
              </h1>
              <p className="text-gray-600">
                Post a campaign to connect with influencers
              </p>
            </div>
            <Link
              href="/dashboard"
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
            >
              ← Back to Dashboard
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Campaign Title *
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Summer Fashion Campaign"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  required
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe your campaign goals and what you're looking for..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-2">
                    Budget ($) *
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="1000"
                  />
                </div>

                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="lifestyle">Lifestyle</option>
                    <option value="fashion">Fashion</option>
                    <option value="beauty">Beauty</option>
                    <option value="fitness">Fitness</option>
                    <option value="food">Food</option>
                    <option value="travel">Travel</option>
                    <option value="technology">Technology</option>
                    <option value="business">Business</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="requirements" className="block text-sm font-medium text-gray-700 mb-2">
                  Requirements
                </label>
                <textarea
                  id="requirements"
                  name="requirements"
                  rows={3}
                  value={formData.requirements}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Minimum 10k followers, specific age range, location requirements..."
                />
              </div>

              <div>
                <label htmlFor="deliverables" className="block text-sm font-medium text-gray-700 mb-2">
                  Expected Deliverables
                </label>
                <textarea
                  id="deliverables"
                  name="deliverables"
                  rows={3}
                  value={formData.deliverables}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 3 Instagram posts, 5 Instagram stories, 1 TikTok video..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-2">
                    Deadline *
                  </label>
                  <input
                    id="deadline"
                    name="deadline"
                    type="datetime-local"
                    required
                    value={formData.deadline}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>

                <div>
                  <label htmlFor="timeline" className="block text-sm font-medium text-gray-700 mb-2">
                    Timeline
                  </label>
                  <input
                    id="timeline"
                    name="timeline"
                    type="text"
                    value={formData.timeline}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 2 weeks from start date"
                  />
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isLoading ? 'Creating Campaign...' : 'Create Campaign'}
                </button>
                <Link
                  href="/dashboard"
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors text-center"
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



