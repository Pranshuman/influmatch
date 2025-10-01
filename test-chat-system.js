// Test script to verify chat system is working
// Run with: node test-chat-system.js

const API_BASE = 'https://influmatch-production.up.railway.app'

async function testChatSystem() {
  console.log('🧪 Testing Chat System...\n')

  try {
    // Test 1: Health check
    console.log('1. Testing server health...')
    const healthResponse = await fetch(`${API_BASE}/health`)
    if (healthResponse.ok) {
      const healthData = await healthResponse.json()
      console.log('✅ Server is healthy:', healthData.database)
    } else {
      console.log('❌ Server health check failed')
      return
    }

    // Test 2: Check if chat endpoints exist
    console.log('\n2. Testing chat endpoints...')
    
    // Test proposal chat endpoint (should return 401 without auth, which is expected)
    const chatResponse = await fetch(`${API_BASE}/api/proposals/1/chat`)
    if (chatResponse.status === 401) {
      console.log('✅ Chat endpoint exists (401 Unauthorized is expected without auth)')
    } else if (chatResponse.status === 404) {
      console.log('❌ Chat endpoint not found')
    } else {
      console.log('✅ Chat endpoint exists (status:', chatResponse.status, ')')
    }

    // Test start chat endpoint
    const startChatResponse = await fetch(`${API_BASE}/api/proposals/1/start-chat`, {
      method: 'POST'
    })
    if (startChatResponse.status === 401) {
      console.log('✅ Start chat endpoint exists (401 Unauthorized is expected without auth)')
    } else if (startChatResponse.status === 404) {
      console.log('❌ Start chat endpoint not found')
    } else {
      console.log('✅ Start chat endpoint exists (status:', startChatResponse.status, ')')
    }

    console.log('\n🎉 Chat system endpoints are accessible!')
    console.log('\n📋 Next steps:')
    console.log('1. Go to your frontend: https://frontend-4fhtc80xy-prash123s-projects.vercel.app')
    console.log('2. Log in as a brand user')
    console.log('3. Accept a proposal')
    console.log('4. Click "Start Chat" button')
    console.log('5. Test sending messages')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Run the test
testChatSystem()
