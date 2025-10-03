'use client'

import { useSession } from 'next-auth/react'

export default function DebugAuth() {
  const { data: session, status } = useSession()

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6">NextAuth Debug Information</h1>
        
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-2">Session Status:</h2>
            <p className="text-gray-700">{status}</p>
          </div>
          
          <div>
            <h2 className="text-lg font-semibold mb-2">Session Data:</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(session, null, 2)}
            </pre>
          </div>
          
          <div>
            <h2 className="text-lg font-semibold mb-2">Environment Variables:</h2>
            <div className="space-y-2 text-sm">
              <p>NEXTAUTH_URL: {process.env.NEXT_PUBLIC_NEXTAUTH_URL || 'Not set'}</p>
              <p>GOOGLE_CLIENT_ID: {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? 'Set' : 'Not set'}</p>
              <p>SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
