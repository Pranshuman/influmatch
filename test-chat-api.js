// Test script for proposal chat API endpoints
// Run with: node test-chat-api.js

const API_BASE = 'https://influmatch-production.up.railway.app'

// Test data - you'll need to replace these with actual IDs from your database
const TEST_DATA = {
  brandToken: 'YOUR_BRAND_TOKEN_HERE',
  influencerToken: 'YOUR_INFLUENCER_TOKEN_HERE',
  proposalId: 1, // Replace with actual proposal ID
  conversationId: 'proposal-1'
}

async function testChatAPI() {
  console.log('🧪 Testing Proposal Chat API...\n')

  try {
    // Test 1: Start proposal chat (Brand only)
    console.log('1. Testing POST /api/proposals/:id/start-chat')
    const startChatResponse = await fetch(`${API_BASE}/api/proposals/${TEST_DATA.proposalId}/start-chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_DATA.brandToken}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (startChatResponse.ok) {
      const startChatData = await startChatResponse.json()
      console.log('✅ Start chat successful:', startChatData.message)
      console.log('   Conversation ID:', startChatData.conversationId)
      console.log('   Has existing messages:', startChatData.hasExistingMessages)
    } else {
      const error = await startChatResponse.json()
      console.log('❌ Start chat failed:', error.error)
    }

    // Test 2: Get proposal chat data
    console.log('\n2. Testing GET /api/proposals/:id/chat')
    const getChatResponse = await fetch(`${API_BASE}/api/proposals/${TEST_DATA.proposalId}/chat`, {
      headers: {
        'Authorization': `Bearer ${TEST_DATA.brandToken}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (getChatResponse.ok) {
      const chatData = await getChatResponse.json()
      console.log('✅ Get chat successful')
      console.log('   Proposal ID:', chatData.proposal.id)
      console.log('   Listing title:', chatData.listing.title)
      console.log('   Messages count:', chatData.messages.length)
      console.log('   Conversation ID:', chatData.conversationId)
    } else {
      const error = await getChatResponse.json()
      console.log('❌ Get chat failed:', error.error)
    }

    // Test 3: Send proposal message
    console.log('\n3. Testing POST /api/messages (proposal-specific)')
    const sendMessageResponse = await fetch(`${API_BASE}/api/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_DATA.brandToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: 'Hello! This is a test message for the proposal chat.',
        proposalId: TEST_DATA.proposalId,
        conversationId: TEST_DATA.conversationId
      })
    })
    
    if (sendMessageResponse.ok) {
      const messageData = await sendMessageResponse.json()
      console.log('✅ Send message successful')
      console.log('   Message ID:', messageData.message.id)
      console.log('   Content:', messageData.message.content)
      console.log('   Sender:', messageData.message.sender?.name)
    } else {
      const error = await sendMessageResponse.json()
      console.log('❌ Send message failed:', error.error)
    }

    // Test 4: Get updated chat data
    console.log('\n4. Testing GET /api/proposals/:id/chat (after sending message)')
    const getUpdatedChatResponse = await fetch(`${API_BASE}/api/proposals/${TEST_DATA.proposalId}/chat`, {
      headers: {
        'Authorization': `Bearer ${TEST_DATA.brandToken}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (getUpdatedChatResponse.ok) {
      const updatedChatData = await getUpdatedChatResponse.json()
      console.log('✅ Get updated chat successful')
      console.log('   Messages count:', updatedChatData.messages.length)
      if (updatedChatData.messages.length > 0) {
        const lastMessage = updatedChatData.messages[updatedChatData.messages.length - 1]
        console.log('   Last message:', lastMessage.content)
        console.log('   Last message sender:', lastMessage.sender?.name)
      }
    } else {
      const error = await getUpdatedChatResponse.json()
      console.log('❌ Get updated chat failed:', error.error)
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message)
  }
}

// Instructions for running the test
console.log('📋 Instructions:')
console.log('1. First, run the SQL script in Supabase SQL Editor:')
console.log('   - Go to your Supabase project dashboard')
console.log('   - Navigate to SQL Editor')
console.log('   - Run the contents of update-schema.sql')
console.log('')
console.log('2. Update the TEST_DATA object with real values:')
console.log('   - Get a brand token from browser dev tools (localStorage.getItem("token"))')
console.log('   - Get an influencer token from browser dev tools')
console.log('   - Find an accepted proposal ID from your database')
console.log('')
console.log('3. Run this test: node test-chat-api.js')
console.log('')

// Uncomment the line below to run the test
// testChatAPI()
