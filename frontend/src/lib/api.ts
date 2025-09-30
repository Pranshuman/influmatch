// API service for Influmatch marketplace
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://influmatch-production.up.railway.app'

export interface User {
  id: number
  email: string
  name: string
  userType: 'brand' | 'influencer'
  company?: string
  bio?: string
  website?: string
  createdAt: string
}

export interface Listing {
  id: number
  title: string
  description: string
  category: string
  budget: number
  deadline?: number
  requirements?: string
  deliverables?: string
  brandId: number
  status: string
  createdAt: string
  updatedAt: string
  brandName: string
  brandBio?: string
  brandWebsite?: string
  brand?: User
  proposals?: Proposal[]
}

export interface Proposal {
  id: number
  listingId: number
  influencerId: number
  message: string
  proposedBudget?: number
  timeline?: string
  status: 'under_review' | 'accepted' | 'rejected' | 'withdrawn'
  createdAt: string
  updatedAt?: string
  influencer?: User
  brand?: User
  listingTitle?: string
  listingDescription?: string
  listingBudget?: number
  listingDeadline?: string
}

export interface Message {
  id: number
  senderId: number
  receiverId: number
  content: string
  conversationId: string
  createdAt: string
  sender?: User
  receiver?: User
}

export interface AuthResponse {
  token: string
  user: User
}

class MarketplaceAPI {
  private token: string | null = null

  setToken(token: string) {
    this.token = token
    localStorage.setItem('auth_token', token)
  }

  clearToken() {
    this.token = null
    localStorage.removeItem('auth_token')
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }
    
    return headers
  }

  async register(userData: {
    email: string
    password: string
    userType: 'brand' | 'influencer'
    name: string
    company?: string
  }): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(userData),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Registration failed')
    }

    const data = await response.json()
    this.setToken(data.token)
    return data
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Login failed')
    }

    const data = await response.json()
    this.setToken(data.token)
    return data
  }

  async getListings(): Promise<{ listings: Listing[] }> {
    const response = await fetch(`${API_BASE_URL}/api/listings`, {
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      throw new Error('Failed to fetch listings')
    }

    return response.json()
  }

  async getListing(id: string): Promise<{ listing: Listing }> {
    const response = await fetch(`${API_BASE_URL}/api/listings/${id}`, {
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      throw new Error('Failed to fetch listing')
    }

    return response.json()
  }

  async createListing(listingData: {
    title: string
    description: string
    category: string
    budget: number
    deadline?: number
    requirements?: string
    deliverables?: string
  }): Promise<{ listing: Listing }> {
    const response = await fetch(`${API_BASE_URL}/api/listings`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(listingData),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to create listing')
    }

    return response.json()
  }

  async submitProposal(listingId: string, proposalData: {
    message: string
    proposedBudget?: number
  }): Promise<{ proposal: Proposal }> {
    const response = await fetch(`${API_BASE_URL}/api/listings/${listingId}/proposals`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(proposalData),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to submit proposal')
    }

    return response.json()
  }

  async getUser(id: string | number): Promise<{ user: User }> {
    const response = await fetch(`${API_BASE_URL}/api/users/${id}`, {
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      throw new Error('Failed to fetch user')
    }

    return response.json()
  }

  async updateUser(id: string, userData: Partial<User>): Promise<{ user: User }> {
    const response = await fetch(`${API_BASE_URL}/api/users/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(userData),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to update user')
    }

    return response.json()
  }

  async sendMessage(messageData: {
    receiverId: string
    content: string
  }): Promise<{ message: Message }> {
    const response = await fetch(`${API_BASE_URL}/api/messages`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(messageData),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to send message')
    }

    return response.json()
  }

  async getMessages(conversationId: string): Promise<{ messages: Message[] }> {
    const response = await fetch(`${API_BASE_URL}/api/messages/${conversationId}`, {
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      throw new Error('Failed to fetch messages')
    }

    return response.json()
  }

  async healthCheck(): Promise<{ ok: boolean; timestamp: string; database: string }> {
    const response = await fetch(`${API_BASE_URL}/health`)
    
    if (!response.ok) {
      throw new Error('Health check failed')
    }

    return response.json()
  }

  // Proposal Status Management Methods
  async getMyProposals(): Promise<{ proposals: Proposal[] }> {
    const response = await fetch(`${API_BASE_URL}/api/proposals/my-proposals`, {
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to fetch my proposals')
    }

    return response.json()
  }

  async updateProposalStatus(proposalId: number, status: 'under_review' | 'accepted' | 'rejected' | 'withdrawn'): Promise<{ message: string; proposal: Proposal }> {
    const response = await fetch(`${API_BASE_URL}/api/proposals/${proposalId}/status`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ status }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to update proposal status')
    }

    return response.json()
  }

  async updateProposal(proposalId: number, proposalData: {
    message: string
    proposedBudget: number
    timeline: string
  }): Promise<{ message: string; proposal: Proposal }> {
    const response = await fetch(`${API_BASE_URL}/api/proposals/${proposalId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(proposalData),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to update proposal')
    }

    return response.json()
  }
}

export const marketplaceAPI = new MarketplaceAPI()


