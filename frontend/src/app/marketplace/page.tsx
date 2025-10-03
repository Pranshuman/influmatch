'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Listing, marketplaceAPI } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

export default function Marketplace() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Check authentication and user type
    if (!isAuthenticated) {
      router.push('/auth/login')
      return
    }

    if (user?.userType === 'brand') {
      router.push('/dashboard')
      return
    }

    const fetchListings = async () => {
      try {
        setLoading(true)
        const data = await marketplaceAPI.getListings(currentPage, 12)
        setListings(data.listings)
        setTotalPages(data.totalPages)
        setTotal(data.total)
      } catch (err: any) {
        setError(err.message || 'Failed to load campaigns')
      } finally {
        setLoading(false)
      }
    }

    fetchListings()
  }, [isAuthenticated, user, router, currentPage])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Loading campaigns...</h2>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Campaigns</h2>
          <p className="text-gray-600 mb-4">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
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
                Campaign Marketplace 🚀
              </h1>
              <p className="text-gray-600 text-lg">
                Discover exciting collaboration opportunities from top brands
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

        {listings.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">🎯</span>
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">
              No campaigns available yet
            </h3>
            <p className="text-gray-600 mb-8 text-lg">
              Be the first to create a campaign and start connecting with influencers!
            </p>
            <Link
              href="/campaigns/create"
              className="inline-flex items-center bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-4 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
            >
              <span className="mr-2">✨</span>
              Create First Campaign
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {listings.map((listing) => (
              <div key={listing.id} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-200 group">
                {/* Header with Status */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {listing.title}
                    </h3>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      {listing.status}
                    </span>
                  </div>
                </div>
                
                {/* Description */}
                <p className="text-gray-600 text-sm mb-6 line-clamp-3 leading-relaxed">
                  {listing.description}
                </p>
                
                {/* Details Grid */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-xl">
                    <span className="text-sm text-gray-600">💰 Budget</span>
                    <span className="font-bold text-green-600 text-lg">
                      ${listing.budget.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-xl">
                    <span className="text-sm text-gray-600">🏷️ Category</span>
                    <span className="font-medium text-blue-600 capitalize">{listing.category}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-xl">
                    <span className="text-sm text-gray-600">🏢 Brand</span>
                    <span className="font-medium text-purple-600">{listing.brandName}</span>
                  </div>
                </div>
                
                {/* Action Button */}
                <Link
                  href={`/listings/${listing.id}`}
                  className="block w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white text-center py-3 px-4 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium shadow-md hover:shadow-lg group-hover:scale-105 transform"
                >
                  View Details & Apply
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-12 flex justify-center">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                
                <div className="flex space-x-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
              
              <div className="mt-4 text-center text-sm text-gray-600">
                Showing {((currentPage - 1) * 12) + 1} to {Math.min(currentPage * 12, total)} of {total} campaigns
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
