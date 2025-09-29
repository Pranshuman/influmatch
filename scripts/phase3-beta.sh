#!/bin/bash

# Phase 3: Beta Launch Script
# This script manages the beta testing phase

set -e  # Exit on any error

echo "🚀 Starting Phase 3: Beta Launch"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Phase 2 is complete
check_phase2_completion() {
    log_info "Checking Phase 2 completion..."
    
    if [ ! -f tests/staging-tests.sh ]; then
        log_error "Phase 2 not completed. Please run phase2-staging.sh first."
        exit 1
    fi
    
    log_success "Phase 2 completion verified"
}

# Create beta user management system
create_beta_user_system() {
    log_info "Creating beta user management system..."
    
    # Create beta user invitation script
    cat > scripts/beta-invite.js << 'EOF'
const nodemailer = require('nodemailer');
const { Pool } = require('pg');

// Database configuration
const dbConfig = {
    user: process.env.POSTGRES_USER || 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    database: process.env.POSTGRES_DB || 'influmatch_prod',
    password: process.env.POSTGRES_PASSWORD || 'password',
    port: process.env.POSTGRES_PORT || 5432,
};

// Email configuration
const emailConfig = {
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
};

class BetaUserManager {
    constructor() {
        this.db = new Pool(dbConfig);
        this.transporter = nodemailer.createTransporter(emailConfig);
    }

    async inviteUser(email, name, userType) {
        try {
            // Generate invitation code
            const invitationCode = this.generateInvitationCode();
            
            // Store invitation in database
            await this.db.query(`
                INSERT INTO beta_invitations (email, name, userType, invitationCode, status, createdAt)
                VALUES ($1, $2, $3, $4, 'pending', NOW())
                ON CONFLICT (email) DO UPDATE SET
                    invitationCode = $4,
                    status = 'pending',
                    updatedAt = NOW()
            `, [email, name, userType, invitationCode]);

            // Send invitation email
            await this.sendInvitationEmail(email, name, invitationCode);
            
            console.log(`✅ Beta invitation sent to ${email}`);
            return { success: true, invitationCode };
            
        } catch (error) {
            console.error(`❌ Failed to invite ${email}:`, error);
            return { success: false, error: error.message };
        }
    }

    generateInvitationCode() {
        return Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
    }

    async sendInvitationEmail(email, name, invitationCode) {
        const betaUrl = `https://staging.influmatch.com/auth/register?invite=${invitationCode}`;
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: '🎉 You\'re invited to test Influmatch Beta!',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2563eb;">Welcome to Influmatch Beta!</h2>
                    <p>Hi ${name},</p>
                    <p>You've been invited to test Influmatch, the new influencer marketplace platform!</p>
                    <p>As a beta tester, you'll get early access to:</p>
                    <ul>
                        <li>🎯 Create and manage marketing campaigns (Brands)</li>
                        <li>📝 Submit proposals to campaigns (Influencers)</li>
                        <li>💬 Direct messaging with other users</li>
                        <li>📊 Track proposal status and analytics</li>
                    </ul>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${betaUrl}" 
                           style="background-color: #2563eb; color: white; padding: 12px 24px; 
                                  text-decoration: none; border-radius: 6px; display: inline-block;">
                            Join Beta Now
                        </a>
                    </div>
                    <p><strong>Your invitation code:</strong> ${invitationCode}</p>
                    <p>This beta invitation is valid for 7 days.</p>
                    <p>If you have any questions, feel free to reply to this email.</p>
                    <p>Thanks for helping us build the future of influencer marketing!</p>
                    <p>Best regards,<br>The Influmatch Team</p>
                </div>
            `
        };

        await this.transporter.sendMail(mailOptions);
    }

    async getBetaStats() {
        try {
            const stats = await this.db.query(`
                SELECT 
                    COUNT(*) as total_invitations,
                    COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
                    COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired
                FROM beta_invitations
            `);
            
            return stats.rows[0];
        } catch (error) {
            console.error('Error getting beta stats:', error);
            return null;
        }
    }
}

// CLI interface
if (require.main === module) {
    const manager = new BetaUserManager();
    const command = process.argv[2];
    
    switch (command) {
        case 'invite':
            const email = process.argv[3];
            const name = process.argv[4];
            const userType = process.argv[5] || 'influencer';
            
            if (!email || !name) {
                console.log('Usage: node beta-invite.js invite <email> <name> [userType]');
                process.exit(1);
            }
            
            manager.inviteUser(email, name, userType);
            break;
            
        case 'stats':
            manager.getBetaStats().then(stats => {
                console.log('📊 Beta Testing Stats:');
                console.log(`Total Invitations: ${stats.total_invitations}`);
                console.log(`Accepted: ${stats.accepted}`);
                console.log(`Pending: ${stats.pending}`);
                console.log(`Expired: ${stats.expired}`);
            });
            break;
            
        default:
            console.log('Usage:');
            console.log('  node beta-invite.js invite <email> <name> [userType]');
            console.log('  node beta-invite.js stats');
    }
}

module.exports = BetaUserManager;
EOF
    
    # Create beta invitation database table
    cat > scripts/beta-schema.sql << 'EOF'
-- Beta Invitations Table
CREATE TABLE IF NOT EXISTS beta_invitations (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    userType VARCHAR(50) NOT NULL CHECK (userType IN ('brand', 'influencer')),
    invitationCode VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acceptedAt TIMESTAMP
);

-- Beta Feedback Table
CREATE TABLE IF NOT EXISTS beta_feedback (
    id SERIAL PRIMARY KEY,
    userId INTEGER REFERENCES users(id) ON DELETE CASCADE,
    feedbackType VARCHAR(50) NOT NULL CHECK (feedbackType IN ('bug', 'feature', 'general', 'rating')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_beta_invitations_email ON beta_invitations(email);
CREATE INDEX IF NOT EXISTS idx_beta_invitations_code ON beta_invitations(invitationCode);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_userId ON beta_feedback(userId);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_type ON beta_feedback(feedbackType);
EOF
    
    log_success "Beta user management system created"
}

# Create feedback collection system
create_feedback_system() {
    log_info "Creating feedback collection system..."
    
    # Create feedback API endpoints
    cat > scripts/beta-feedback-api.js << 'EOF'
const express = require('express');
const { Pool } = require('pg');

const router = express.Router();

// Database configuration
const dbConfig = {
    user: process.env.POSTGRES_USER || 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    database: process.env.POSTGRES_DB || 'influmatch_prod',
    password: process.env.POSTGRES_PASSWORD || 'password',
    port: process.env.POSTGRES_PORT || 5432,
};

const db = new Pool(dbConfig);

// Submit feedback
router.post('/feedback', async (req, res) => {
    try {
        const { userId, feedbackType, title, description, rating } = req.body;
        
        const result = await db.query(`
            INSERT INTO beta_feedback (userId, feedbackType, title, description, rating)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [userId, feedbackType, title, description, rating]);
        
        res.status(201).json({
            success: true,
            feedback: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error submitting feedback:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to submit feedback'
        });
    }
});

// Get feedback stats
router.get('/feedback/stats', async (req, res) => {
    try {
        const stats = await db.query(`
            SELECT 
                feedbackType,
                COUNT(*) as count,
                AVG(rating) as avg_rating
            FROM beta_feedback
            GROUP BY feedbackType
        `);
        
        res.json({
            success: true,
            stats: stats.rows
        });
        
    } catch (error) {
        console.error('Error getting feedback stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get feedback stats'
        });
    }
});

module.exports = router;
EOF
    
    # Create feedback form component
    cat > frontend/src/components/BetaFeedbackForm.tsx << 'EOF'
'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface FeedbackFormData {
  feedbackType: 'bug' | 'feature' | 'general' | 'rating'
  title: string
  description: string
  rating?: number
}

export default function BetaFeedbackForm() {
  const { user } = useAuth()
  const [formData, setFormData] = useState<FeedbackFormData>({
    feedbackType: 'general',
    title: '',
    description: '',
    rating: 5
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/beta/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          userId: user.id,
          ...formData
        })
      })

      if (response.ok) {
        setIsSubmitted(true)
        setFormData({
          feedbackType: 'general',
          title: '',
          description: '',
          rating: 5
        })
      }
    } catch (error) {
      console.error('Error submitting feedback:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-green-800 mb-2">
          Thank you for your feedback!
        </h3>
        <p className="text-green-700">
          Your feedback helps us improve Influmatch. We'll review it and get back to you if needed.
        </p>
        <button
          onClick={() => setIsSubmitted(false)}
          className="mt-4 text-green-600 hover:text-green-800 underline"
        >
          Submit another feedback
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Beta Feedback
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Feedback Type
          </label>
          <select
            value={formData.feedbackType}
            onChange={(e) => setFormData({...formData, feedbackType: e.target.value as any})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="bug">Bug Report</option>
            <option value="feature">Feature Request</option>
            <option value="general">General Feedback</option>
            <option value="rating">Rating</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {formData.feedbackType === 'rating' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rating (1-5)
            </label>
            <select
              value={formData.rating}
              onChange={(e) => setFormData({...formData, rating: parseInt(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>1 - Poor</option>
              <option value={2}>2 - Fair</option>
              <option value={3}>3 - Good</option>
              <option value={4}>4 - Very Good</option>
              <option value={5}>5 - Excellent</option>
            </select>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </form>
    </div>
  )
}
EOF
    
    log_success "Feedback collection system created"
}

# Create beta testing plan
create_beta_plan() {
    log_info "Creating beta testing plan..."
    
    cat > BETA_TESTING_PLAN.md << 'EOF'
# Beta Testing Plan

## 🎯 Beta Testing Objectives

1. **Validate Core Features**: Ensure all main features work as expected
2. **User Experience**: Gather feedback on usability and design
3. **Performance**: Test platform under real user load
4. **Bug Discovery**: Identify and fix critical issues
5. **Feature Prioritization**: Understand what features users want most

## 👥 Beta User Selection

### Target: 20-50 Beta Users
- **Brands**: 15-25 users (marketing managers, small business owners)
- **Influencers**: 15-25 users (content creators, micro-influencers)
- **Mix of Experience**: Both tech-savvy and non-technical users

### Selection Criteria
- Active in social media marketing
- Willing to provide detailed feedback
- Available for 1-2 weeks of testing
- Diverse backgrounds and use cases

## 📋 Beta Testing Timeline

### Week 1: Onboarding & Initial Testing
- **Day 1-2**: Send invitations and onboard users
- **Day 3-5**: Users explore platform and complete basic tasks
- **Day 6-7**: Initial feedback collection

### Week 2: Deep Testing & Feedback
- **Day 8-10**: Users perform advanced workflows
- **Day 11-12**: Comprehensive feedback collection
- **Day 13-14**: Analysis and planning for improvements

## 🧪 Testing Scenarios

### For Brands
1. **Account Setup**
   - [ ] Register account
   - [ ] Complete profile
   - [ ] Verify email

2. **Campaign Management**
   - [ ] Create a campaign
   - [ ] Edit campaign details
   - [ ] View campaign analytics
   - [ ] Manage campaign status

3. **Proposal Management**
   - [ ] View received proposals
   - [ ] Accept/reject proposals
   - [ ] Communicate with influencers

### For Influencers
1. **Account Setup**
   - [ ] Register account
   - [ ] Complete profile
   - [ ] Verify email

2. **Campaign Discovery**
   - [ ] Browse available campaigns
   - [ ] Filter and search campaigns
   - [ ] View campaign details

3. **Proposal Management**
   - [ ] Submit proposals
   - [ ] Edit proposals
   - [ ] Track proposal status
   - [ ] Communicate with brands

## 📊 Success Metrics

### Quantitative Metrics
- **User Activation**: 80%+ complete onboarding
- **Feature Usage**: 70%+ use core features
- **Session Duration**: Average 10+ minutes
- **Return Rate**: 60%+ return within 48 hours
- **Completion Rate**: 80%+ complete main workflows

### Qualitative Metrics
- **User Satisfaction**: 4+ star average rating
- **Feature Requests**: Prioritized list of improvements
- **Bug Reports**: Comprehensive list of issues
- **Usability Feedback**: Specific UX improvements

## 🐛 Bug Reporting Process

### Critical Bugs (Fix Immediately)
- Authentication failures
- Data loss or corruption
- Security vulnerabilities
- Complete feature failures

### High Priority Bugs (Fix in 24 hours)
- UI/UX issues affecting workflow
- Performance problems
- Mobile responsiveness issues
- Integration failures

### Medium Priority Bugs (Fix in 1 week)
- Minor UI inconsistencies
- Non-critical feature issues
- Browser compatibility problems
- Content/typo issues

## 📈 Feedback Collection Methods

### 1. In-App Feedback Form
- Quick feedback submission
- Categorized feedback types
- Rating system

### 2. User Interviews
- 15-30 minute video calls
- Deep dive into user experience
- Feature prioritization discussions

### 3. Usage Analytics
- Track user behavior
- Identify drop-off points
- Measure feature adoption

### 4. Survey Forms
- Structured feedback collection
- Quantitative data gathering
- User satisfaction measurement

## 🎁 Beta User Incentives

### For All Beta Users
- Early access to new features
- Direct line to development team
- Recognition in launch materials
- Free premium features for 6 months

### For Top Contributors
- 1-year free premium subscription
- Co-creation opportunities
- Beta user ambassador program
- Exclusive beta user community

## 📞 Communication Plan

### Daily Updates
- Morning standup with beta users
- Daily bug fix updates
- Feature improvement announcements

### Weekly Reports
- Beta testing progress summary
- Key findings and insights
- Next week's focus areas

### Final Report
- Comprehensive beta testing results
- User feedback analysis
- Product improvement roadmap
- Launch readiness assessment

## 🚀 Post-Beta Actions

### Immediate (Week 3)
- Fix all critical and high-priority bugs
- Implement top 3 feature requests
- Optimize based on performance data
- Prepare for public launch

### Short-term (Month 1)
- Implement remaining feature requests
- Optimize user experience
- Scale infrastructure
- Launch marketing campaign

### Long-term (Month 2+)
- Continuous improvement based on user feedback
- Advanced feature development
- Market expansion
- Competitive analysis and response
EOF
    
    log_success "Beta testing plan created"
}

# Main execution
main() {
    echo "Starting Phase 3 beta launch preparation..."
    
    check_phase2_completion
    create_beta_user_system
    create_feedback_system
    create_beta_plan
    
    echo ""
    echo "✅ Phase 3 beta launch preparation completed!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Set up beta invitation database tables: psql -f scripts/beta-schema.sql"
    echo "2. Configure email settings in .env.production"
    echo "3. Start inviting beta users: node scripts/beta-invite.js invite <email> <name> [userType]"
    echo "4. Monitor beta user activity and feedback"
    echo "5. Run beta testing for 1-2 weeks"
    echo "6. Analyze feedback and make improvements"
    echo "7. Proceed to Phase 4: Public Launch"
    echo ""
    echo "🔗 Beta Management Commands:"
    echo "  - Invite user: node scripts/beta-invite.js invite user@example.com 'John Doe' brand"
    echo "  - View stats: node scripts/beta-invite.js stats"
    echo "  - Monitor feedback: Check beta_feedback table in database"
}

# Run main function
main "$@"
