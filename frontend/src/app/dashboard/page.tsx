'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'

export default function Dashboard() {
  const { user, isAuthenticated, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Loading...</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Welcome back, {user.name}! 👋
              </h1>
              <p className="text-gray-600 text-lg">
                Ready to {user.userType === 'brand' ? 'create amazing campaigns' : 'find your next collaboration'}?
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Account Type</p>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {user.userType === 'brand' ? '🏢 Brand' : '🌟 Influencer'}
                </span>
              </div>
              <button
                onClick={logout}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
          <div className="flex items-start space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Profile Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium text-gray-900">{user.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium text-gray-900">{user.email}</p>
                </div>
                {user.company && (
                  <div>
                    <p className="text-sm text-gray-500">Company</p>
                    <p className="font-medium text-gray-900">{user.company}</p>
                  </div>
                )}
                {user.bio && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-500">Bio</p>
                    <p className="font-medium text-gray-900">{user.bio}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {user.userType === 'influencer' && (
            <>
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
                    <span className="text-2xl">🔍</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">Browse Campaigns</h3>
                </div>
                <p className="text-gray-600 mb-6">
                  Discover exciting collaboration opportunities from top brands
                </p>
                <Link
                  href="/marketplace"
                  className="block w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 text-center font-medium shadow-md hover:shadow-lg"
                >
                  Explore Marketplace
                </Link>
              </div>

              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mr-4">
                    <span className="text-2xl">📝</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">My Proposals</h3>
                </div>
                <p className="text-gray-600 mb-6">
                  Track and manage your submitted proposals
                </p>
                <Link
                  href="/proposals"
                  className="block w-full bg-gradient-to-r from-orange-600 to-orange-700 text-white px-6 py-3 rounded-xl hover:from-orange-700 hover:to-orange-800 transition-all duration-200 text-center font-medium shadow-md hover:shadow-lg"
                >
                  View Proposals
                </Link>
              </div>
            </>
          )}

          {user.userType === 'brand' && (
            <>
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mr-4">
                    <span className="text-2xl">✨</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">Create Campaign</h3>
                </div>
                <p className="text-gray-600 mb-6">
                  Launch a new campaign to connect with influencers
                </p>
                <Link
                  href="/campaigns/create"
                  className="block w-full bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 text-center font-medium shadow-md hover:shadow-lg"
                >
                  Create Campaign
                </Link>
              </div>

              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mr-4">
                    <span className="text-2xl">📊</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">Manage Campaigns</h3>
                </div>
                <p className="text-gray-600 mb-6">
                  Review proposals and manage your active campaigns
                </p>
                <Link
                  href="/campaigns/manage"
                  className="block w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-200 text-center font-medium shadow-md hover:shadow-lg"
                >
                  Manage Campaigns
                </Link>
              </div>
            </>
          )}

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mr-4">
                <span className="text-2xl">💬</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Messages</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Connect and communicate with your network
            </p>
            <Link
              href="/messages"
              className="block w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200 text-center font-medium shadow-md hover:shadow-lg"
            >
              View Messages
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}



