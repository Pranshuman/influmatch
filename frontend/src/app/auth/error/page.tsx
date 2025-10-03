'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function AuthError() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case 'Configuration':
        return 'There is a problem with the server configuration.'
      case 'AccessDenied':
        return 'Access denied. You do not have permission to sign in.'
      case 'Verification':
        return 'The verification token has expired or has already been used.'
      case 'Default':
        return 'An error occurred during authentication.'
      default:
        return 'An unexpected error occurred. Please try again.'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-red-600 text-2xl">⚠️</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Authentication Error
          </h1>
          <p className="text-gray-600">
            {getErrorMessage(error)}
          </p>
        </div>

        {/* Error Details */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="text-red-400 text-sm">🔍</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Error Code: {error}
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  {getErrorMessage(error)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-4">
          <Link
            href="/auth/login"
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 font-medium text-center block"
          >
            Try Again
          </Link>
          
          <Link
            href="/"
            className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-xl hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 font-medium text-center block"
          >
            Go Home
          </Link>
        </div>

        {/* Help */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            If this problem persists, please contact support.
          </p>
        </div>
      </div>
    </div>
  )
}
