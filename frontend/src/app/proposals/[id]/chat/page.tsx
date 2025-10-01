'use client'

import { useState, useEffect, use } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { marketplaceAPI } from '@/lib/api'
import { Proposal, Listing, Message } from '@/lib/api'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

export default function ProposalChatPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const params_hook = useParams()
  const proposalId = params_hook.id as string

  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [listing, setListing] = useState<Listing | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [conversationId, setConversationId] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login')
      return
    }

    fetchChatData()
  }, [isAuthenticated, router, proposalId])

  const fetchChatData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const data = await marketplaceAPI.getProposalChat(parseInt(proposalId))
      setProposal(data.proposal)
      setListing(data.listing)
      setMessages(data.messages)
      setConversationId(data.conversationId)
    } catch (err: any) {
      console.error('Error fetching chat data:', err)
      setError(err.message || 'Failed to load chat')
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !conversationId) return

    setSending(true)
    try {
      await marketplaceAPI.sendMessage({
        content: newMessage.trim(),
        proposalId: parseInt(proposalId),
        conversationId
      })
      
      setNewMessage('')
      fetchChatData() // Refresh messages
    } catch (err: any) {
      console.error('Error sending message:', err)
      alert(`Failed to send message: ${err.message}`)
    } finally {
      setSending(false)
    }
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading chat...</p>
        </div>
      </div>
    )
  }

  if (error || !proposal || !listing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-red-600 mb-4">{error || 'Chat not found'}</p>
          <button
            onClick={() => router.back()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const isBrand = user?.userType === 'brand'
  const otherUser = isBrand ? proposal.influencer : listing.brand

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Chat: {listing.title}
              </h1>
              <p className="text-sm text-gray-600">
                {isBrand ? 'Influencer' : 'Brand'}: {otherUser?.name}
              </p>
            </div>
            <Link
              href={isBrand ? '/campaigns/manage' : '/proposals'}
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Back
            </Link>
          </div>
        </div>

        <div className="flex h-[calc(100vh-120px)]">
          {/* Campaign Info Sidebar */}
          <div className="w-80 bg-white border-r border-gray-200 p-6 overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaign Details</h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900">Campaign</h4>
                <p className="text-sm text-gray-600">{listing.title}</p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900">Budget</h4>
                <p className="text-sm text-gray-600">${listing.budget?.toLocaleString()}</p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900">Proposed Rate</h4>
                <p className="text-sm text-gray-600">${proposal.proposedBudget?.toLocaleString()}</p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900">Status</h4>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Accepted
                </span>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900">Proposal Message</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  {proposal.message}
                </p>
              </div>
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.senderId === user?.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-gray-200 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          message.senderId === user?.id ? 'text-blue-100' : 'text-gray-500'
                        }`}
                      >
                        {formatTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Message Input */}
            <div className="border-t border-gray-200 p-4">
              <form onSubmit={sendMessage} className="flex space-x-4">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
