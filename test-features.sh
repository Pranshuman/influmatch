#!/bin/bash

# Feature Testing Script for Influmatch
echo "🧪 Testing Influmatch Features..."

# Test Backend
echo "📡 Testing Backend API..."
if curl -s http://localhost:5050/health > /dev/null; then
    echo "✅ Backend API: Running"
else
    echo "❌ Backend API: Not responding"
fi

# Test Frontend
echo "🌐 Testing Frontend..."
if curl -s http://localhost:3000 | grep -q "Influmatch"; then
    echo "✅ Frontend: Running"
else
    echo "❌ Frontend: Not responding"
fi

# Test Database Browser
echo "🗄️ Testing Database Browser..."
if curl -s http://localhost:3001 > /dev/null; then
    echo "✅ Database Browser: Running"
else
    echo "❌ Database Browser: Not responding"
fi

# Test Key Pages
echo "📄 Testing Key Pages..."

# Test Homepage
if curl -s http://localhost:3000 | grep -q "Sign In"; then
    echo "✅ Homepage: Has navigation buttons"
else
    echo "❌ Homepage: Missing navigation buttons"
fi

# Test Login Page
if curl -s http://localhost:3000/auth/login | grep -q "Sign in"; then
    echo "✅ Login Page: Accessible"
else
    echo "❌ Login Page: Not accessible"
fi

# Test Register Page
if curl -s http://localhost:3000/auth/register | grep -q "Sign up"; then
    echo "✅ Register Page: Accessible"
else
    echo "❌ Register Page: Not accessible"
fi

echo "🎉 Feature testing complete!"
echo ""
echo "📋 Quick Commands:"
echo "  Backend: npm run dev:sqlite"
echo "  Frontend: cd frontend && npm run dev"
echo "  Database: npm run browse:web"
echo ""
echo "🔧 If issues found:"
echo "  git log --oneline  # Check recent changes"
echo "  git checkout <commit> -- <file>  # Restore specific file"
