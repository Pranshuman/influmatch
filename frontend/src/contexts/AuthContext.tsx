'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { marketplaceAPI, User } from '@/lib/api'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  register: (userData: {
    name: string
    email: string
    password: string
    userType: 'brand' | 'influencer'
    company?: string
    bio?: string
  }) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for stored token on mount
    const token = localStorage.getItem('auth_token')
    console.log('🔍 AuthContext useEffect - Token found:', token ? 'Yes' : 'No')
    
    if (token) {
      marketplaceAPI.setToken(token)
      // Load user data from token
      loadUserFromToken(token).catch((error) => {
        console.error('❌ loadUserFromToken failed:', error)
        // Clear invalid token
        marketplaceAPI.clearToken()
        setIsAuthenticated(false)
        setIsLoading(false)
      })
    } else {
      console.log('❌ No token found in localStorage')
      setIsAuthenticated(false)
      setIsLoading(false)
    }
  }, [])

  const loadUserFromToken = async (token: string) => {
    try {
      console.log('🔍 Loading user from token...')
      
      // Decode JWT token to get user info
      const payload = JSON.parse(atob(token.split('.')[1]))
      console.log('✅ JWT decoded:', payload)
      
      if (payload.userId) {
        console.log('📋 Fetching user data for ID:', payload.userId)
        
        // Fetch user data from backend
        const userData = await marketplaceAPI.getUser(payload.userId)
        console.log('✅ User data fetched:', userData.user)
        
        setUser(userData.user)
        setIsAuthenticated(true)
        setIsLoading(false)
        console.log('✅ Authentication state updated')
      } else {
        console.log('❌ No userId in JWT payload')
        throw new Error('No userId in JWT payload')
      }
    } catch (error) {
      console.error('❌ Error loading user from token:', error)
      // Clear invalid token
      marketplaceAPI.clearToken()
      setIsAuthenticated(false)
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const data = await marketplaceAPI.login(email, password)
      setUser(data.user)
      setIsAuthenticated(true)
      setIsLoading(false)
      return true
    } catch (error) {
      console.error('Login error:', error)
      return false
    }
  }

  const register = async (userData: {
    name: string
    email: string
    password: string
    userType: 'brand' | 'influencer'
    company?: string
    bio?: string
  }): Promise<boolean> => {
    try {
      const data = await marketplaceAPI.register(userData)
      setUser(data.user)
      setIsAuthenticated(true)
      setIsLoading(false)
      return true
    } catch (error) {
      console.error('Registration error:', error)
      return false
    }
  }

  const logout = () => {
    marketplaceAPI.clearToken()
    setUser(null)
    setIsAuthenticated(false)
    setIsLoading(false)
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}