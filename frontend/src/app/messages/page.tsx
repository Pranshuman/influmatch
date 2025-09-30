'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Message {
  id: string
  senderId: string
  receiverId: string
  senderName: string
  receiverName: string
  content: string
  createdAt: string
  conversationId: string
}

interface Conversation {
  id: string
  participants: string[]
  participantNames: string[]
  lastMessage?: Message
  unreadCount: number
}

export default function Messages() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login')
      return
    }
    fetchConversations()
  }, [isAuthenticated, router])

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation)
    }
  }, [selectedConversation])

  const fetchConversations = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:5050/api/messages', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setConversations(data)
      } else {
        setError('Failed to load conversations')
      }
    } catch (err) {
      setError('Error loading conversations')
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (conversationId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:5050/api/messages/${conversationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setMessages(data)
      }
    } catch (err) {
      console.error('Error fetching messages:', err)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedConversation) return

    setSendingMessage(true)
    try {
      const token = localStorage.getItem('token')
      const conversation = conversations.find(c => c.id === selectedConversation)
      const otherParticipant = conversation?.participants.find(p => p !== user?.id)
      
      const response = await fetch('http://localhost:5050/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          receiverId: otherParticipant,
          content: newMessage.trim(),
          conversationId: selectedConversation
        }),
      })

      if (response.ok) {
        setNewMessage('')
        fetchMessages(selectedConversation)
        fetchConversations() // Refresh conversations to update last message
      } else {
        alert('Failed to send message')
      }
    } catch (err) {
      alert('Error sending message')
    } finally {
      setSendingMessage(false)
    }
  }

  if (!isAuthenticated) {
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Loading messages...</h2>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Messages</h1>
              <p className="text-gray-600">Connect with brands and influencers</p>
            </div>
            <Link
              href="/dashboard"
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
            >
              ← Back to Dashboard
            </Link>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="flex h-96">
              {/* Conversations List */}
              <div className="w-1/3 border-r border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">Conversations</h3>
                </div>
                <div className="overflow-y-auto h-full">
                  {conversations.length === 0 ? (
                    <div className="p-4 text-center text-gray-600">
                      <p>No conversations yet</p>
                      <p className="text-sm mt-2">Start by submitting a proposal or creating a campaign!</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {conversations.map((conversation) => (
                        <button
                          key={conversation.id}
                          onClick={() => setSelectedConversation(conversation.id)}
                          className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                            selectedConversation === conversation.id ? 'bg-blue-50 border-r-2 border-blue-600' : ''
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium text-gray-900">
                                {conversation.participantNames.find(name => name !== user?.name)}
                              </h4>
                              {conversation.lastMessage && (
                                <p className="text-sm text-gray-600 truncate mt-1">
                                  {conversation.lastMessage.content}
                                </p>
                              )}
                            </div>
                            {conversation.unreadCount > 0 && (
                              <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                                {conversation.unreadCount}
                              </span>
                            )}
                          </div>
                          {conversation.lastMessage && (
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(conversation.lastMessage.createdAt).toLocaleDateString()}
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 flex flex-col">
                {selectedConversation ? (
                  <>
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {messages.length === 0 ? (
                        <div className="text-center text-gray-600 py-8">
                          <p>No messages yet</p>
                          <p className="text-sm mt-2">Start the conversation!</p>
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
                                  : 'bg-gray-200 text-gray-900'
                              }`}
                            >
                              <p className="text-sm">{message.content}</p>
                              <p className={`text-xs mt-1 ${
                                message.senderId === user?.id ? 'text-blue-100' : 'text-gray-500'
                              }`}>
                                {new Date(message.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Message Input */}
                    <div className="border-t border-gray-200 p-4">
                      <form onSubmit={sendMessage} className="flex space-x-2">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Type your message..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          disabled={sendingMessage}
                        />
                        <button
                          type="submit"
                          disabled={!newMessage.trim() || sendingMessage}
                          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          {sendingMessage ? 'Sending...' : 'Send'}
                        </button>
                      </form>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-600">
                    <div className="text-center">
                      <p className="text-lg">Select a conversation to start messaging</p>
                      <p className="text-sm mt-2">Or create a campaign to connect with influencers!</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}



