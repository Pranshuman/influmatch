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
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome, {user.name}!
          </h1>
          <button
            onClick={logout}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Logout
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Profile
            </h3>
            <p className="text-gray-600 mb-4">
              You are registered as a <span className="font-medium">{user.userType}</span>
            </p>
            {user.company && (
              <p className="text-gray-600">Company: {user.company}</p>
            )}
            {user.bio && (
              <p className="text-gray-600">Bio: {user.bio}</p>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Quick Actions
            </h3>
            <div className="space-y-2">
              {user.userType === 'influencer' && (
                <Link
                  href="/marketplace"
                  className="block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors text-center"
                >
                  Browse Campaigns
                </Link>
              )}
              {user.userType === 'brand' && (
                <>
                  <Link
                    href="/campaigns/create"
                    className="block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors text-center"
                  >
                    Create Campaign
                  </Link>
                  <Link
                    href="/campaigns/manage"
                    className="block bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 transition-colors text-center"
                  >
                    Manage Campaigns
                  </Link>
                </>
              )}
              {user.userType === 'influencer' && (
                <Link
                  href="/proposals"
                  className="block bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 transition-colors text-center"
                >
                  My Proposals
                </Link>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Messages
            </h3>
            <p className="text-gray-600 mb-4">
              Connect with other users
            </p>
            <Link
              href="/messages"
              className="block bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition-colors text-center"
            >
              View Messages
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}



