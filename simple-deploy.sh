#!/bin/bash

# Simple Deployment Script for Non-Technical Users
# This script provides a user-friendly way to deploy Influmatch

set -e  # Exit on any error

echo "🚀 Influmatch Simple Deployment"
echo "=============================="
echo ""
echo "Welcome! This script will help you deploy Influmatch step by step."
echo "You don't need to be a coding expert - just follow the instructions!"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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

log_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

# Function to pause and wait for user input
pause() {
    echo ""
    read -p "Press Enter to continue..."
    echo ""
}

# Function to open URLs in browser
open_url() {
    local url=$1
    echo "Opening $url in your browser..."
    
    # Try different commands to open URL
    if command -v open &> /dev/null; then
        open "$url"
    elif command -v xdg-open &> /dev/null; then
        xdg-open "$url"
    elif command -v start &> /dev/null; then
        start "$url"
    else
        echo "Please open this URL in your browser: $url"
    fi
}

# Step 1: Create hosting accounts
create_accounts() {
    log_step "Step 1: Create Hosting Accounts"
    echo ""
    echo "We need to create accounts on hosting services. Don't worry - they're all free!"
    echo ""
    
    echo "1. Vercel (for hosting your website):"
    echo "   - Go to: https://vercel.com"
    echo "   - Click 'Sign Up'"
    echo "   - Use your email and create a password"
    echo "   - Verify your email"
    echo ""
    read -p "Have you created your Vercel account? (y/n): " vercel_done
    
    if [ "$vercel_done" != "y" ]; then
        open_url "https://vercel.com"
        pause
    fi
    
    echo ""
    echo "2. Railway (for hosting your backend):"
    echo "   - Go to: https://railway.app"
    echo "   - Click 'Sign Up'"
    echo "   - Use your email and create a password"
    echo "   - Verify your email"
    echo ""
    read -p "Have you created your Railway account? (y/n): " railway_done
    
    if [ "$railway_done" != "y" ]; then
        open_url "https://railway.app"
        pause
    fi
    
    echo ""
    echo "3. Supabase (for your database):"
    echo "   - Go to: https://supabase.com"
    echo "   - Click 'Sign Up'"
    echo "   - Use your email and create a password"
    echo "   - Create a new project"
    echo ""
    read -p "Have you created your Supabase account and project? (y/n): " supabase_done
    
    if [ "$supabase_done" != "y" ]; then
        open_url "https://supabase.com"
        pause
    fi
    
    log_success "Great! You now have all the hosting accounts you need."
}

# Step 2: Get database connection
get_database_connection() {
    log_step "Step 2: Get Database Connection"
    echo ""
    echo "Now we need to get your database connection string from Supabase."
    echo ""
    echo "1. Go to your Supabase project dashboard"
    echo "2. Click on 'Settings' in the left sidebar"
    echo "3. Click on 'Database'"
    echo "4. Look for 'Connection String' section"
    echo "5. Copy the connection string (it starts with 'postgresql://')"
    echo ""
    
    open_url "https://supabase.com/dashboard"
    pause
    
    echo "Please paste your database connection string here:"
    read -p "Database URL: " database_url
    
    if [ -z "$database_url" ]; then
        log_error "Database URL is required. Please try again."
        get_database_connection
    fi
    
    # Save database URL to file
    echo "DATABASE_URL=$database_url" > .env.simple
    log_success "Database connection saved!"
}

# Step 3: Deploy backend
deploy_backend() {
    log_step "Step 3: Deploy Backend to Railway"
    echo ""
    echo "Now we'll deploy your backend to Railway."
    echo ""
    echo "1. Go to Railway dashboard"
    echo "2. Click 'New Project'"
    echo "3. Choose 'Deploy from GitHub repo' or 'Upload code'"
    echo "4. Upload your project files"
    echo "5. Add these environment variables:"
    echo "   - NODE_ENV = production"
    echo "   - DATABASE_URL = (paste your database URL)"
    echo "   - JWT_SECRET = (generate a random password)"
    echo "6. Click 'Deploy'"
    echo ""
    
    open_url "https://railway.app/dashboard"
    pause
    
    echo "Please enter your Railway backend URL (it will look like: https://your-app.railway.app):"
    read -p "Backend URL: " backend_url
    
    if [ -z "$backend_url" ]; then
        log_error "Backend URL is required. Please try again."
        deploy_backend
    fi
    
    # Save backend URL to file
    echo "BACKEND_URL=$backend_url" >> .env.simple
    log_success "Backend deployment information saved!"
}

# Step 4: Deploy frontend
deploy_frontend() {
    log_step "Step 4: Deploy Frontend to Vercel"
    echo ""
    echo "Now we'll deploy your frontend to Vercel."
    echo ""
    echo "1. Go to Vercel dashboard"
    echo "2. Click 'New Project'"
    echo "3. Import your project from GitHub or upload the frontend folder"
    echo "4. Add this environment variable:"
    echo "   - NEXT_PUBLIC_API_URL = (paste your backend URL)"
    echo "5. Click 'Deploy'"
    echo ""
    
    open_url "https://vercel.com/dashboard"
    pause
    
    echo "Please enter your Vercel frontend URL (it will look like: https://your-app.vercel.app):"
    read -p "Frontend URL: " frontend_url
    
    if [ -z "$frontend_url" ]; then
        log_error "Frontend URL is required. Please try again."
        deploy_frontend
    fi
    
    # Save frontend URL to file
    echo "FRONTEND_URL=$frontend_url" >> .env.simple
    log_success "Frontend deployment information saved!"
}

# Step 5: Test deployment
test_deployment() {
    log_step "Step 5: Test Your Deployment"
    echo ""
    echo "Let's test if everything is working correctly!"
    echo ""
    
    if [ -f ".env.simple" ]; then
        source .env.simple
        echo "Your deployment URLs:"
        echo "  Frontend: $FRONTEND_URL"
        echo "  Backend: $BACKEND_URL"
        echo ""
        
        echo "Please test these features:"
        echo "1. Go to your frontend URL"
        echo "2. Try to create an account"
        echo "3. Try to log in"
        echo "4. Try to create a campaign (if you're a brand)"
        echo "5. Try to submit a proposal (if you're an influencer)"
        echo ""
        
        open_url "$FRONTEND_URL"
        pause
        
        echo "Did everything work correctly? (y/n):"
        read -p "Test results: " test_results
        
        if [ "$test_results" = "y" ]; then
            log_success "Excellent! Your deployment is working correctly."
        else
            log_warning "Some issues were found. Check the error messages and try to fix them."
            echo "Common solutions:"
            echo "- Check if your backend is running on Railway"
            echo "- Check if your database is connected on Supabase"
            echo "- Check if your environment variables are set correctly"
        fi
    else
        log_error "Deployment information not found. Please run the deployment steps again."
    fi
}

# Step 6: Launch preparation
launch_preparation() {
    log_step "Step 6: Prepare for Launch"
    echo ""
    echo "Congratulations! Your platform is deployed and working."
    echo ""
    echo "Now let's prepare for your public launch:"
    echo ""
    echo "1. **Test with friends and family**"
    echo "   - Send them your website URL"
    echo "   - Ask them to try creating accounts"
    echo "   - Get their feedback"
    echo ""
    echo "2. **Create a simple announcement**"
    echo "   - Write: 'Influmatch is now live! Connect brands with influencers.'"
    echo "   - Include your website URL"
    echo "   - Share on social media"
    echo ""
    echo "3. **Set up monitoring**"
    echo "   - Go to UptimeRobot.com (free)"
    echo "   - Add your website URL to monitor"
    echo "   - Set up email alerts"
    echo ""
    echo "4. **Plan your marketing**"
    echo "   - Share on LinkedIn"
    echo "   - Post on social media"
    echo "   - Email friends and colleagues"
    echo ""
    
    log_success "You're ready to launch! 🎉"
}

# Main menu
show_menu() {
    echo ""
    echo "What would you like to do?"
    echo "1) Start deployment from the beginning"
    echo "2) Continue from where you left off"
    echo "3) Test your existing deployment"
    echo "4) Get help with deployment"
    echo "5) Exit"
    echo ""
    read -p "Enter your choice (1-5): " choice
    
    case $choice in
        1)
            create_accounts
            get_database_connection
            deploy_backend
            deploy_frontend
            test_deployment
            launch_preparation
            ;;
        2)
            if [ -f ".env.simple" ]; then
                echo "Continuing from where you left off..."
                source .env.simple
                echo "Your current deployment:"
                echo "  Frontend: $FRONTEND_URL"
                echo "  Backend: $BACKEND_URL"
                echo ""
                echo "What would you like to do next?"
                echo "1) Test deployment"
                echo "2) Deploy backend"
                echo "3) Deploy frontend"
                echo "4) Prepare for launch"
                read -p "Enter your choice (1-4): " continue_choice
                
                case $continue_choice in
                    1) test_deployment ;;
                    2) deploy_backend ;;
                    3) deploy_frontend ;;
                    4) launch_preparation ;;
                    *) echo "Invalid choice" ;;
                esac
            else
                echo "No previous deployment found. Starting from the beginning..."
                create_accounts
            fi
            ;;
        3)
            test_deployment
            ;;
        4)
            echo ""
            echo "Need help? Here are some resources:"
            echo "1. Read the Non-Technical Deployment Guide: NON_TECHNICAL_DEPLOYMENT_GUIDE.md"
            echo "2. Check the hosting service documentation:"
            echo "   - Vercel: https://vercel.com/docs"
            echo "   - Railway: https://docs.railway.app"
            echo "   - Supabase: https://supabase.com/docs"
            echo "3. Ask for help in online communities:"
            echo "   - Reddit: r/webdev, r/startups"
            echo "   - Stack Overflow: For technical questions"
            echo ""
            ;;
        5)
            echo "Goodbye! Come back anytime you need help with deployment."
            exit 0
            ;;
        *)
            echo "Invalid choice. Please try again."
            show_menu
            ;;
    esac
}

# Main execution
main() {
    echo "Welcome to Influmatch Simple Deployment!"
    echo "This script will guide you through deploying your platform step by step."
    echo ""
    echo "Don't worry if you're not a coding expert - we'll walk you through everything!"
    echo ""
    
    show_menu
}

# Run main function
main "$@"





