#!/bin/bash

# Master Deployment Script for Influmatch
# This script orchestrates the entire phased deployment process

set -e  # Exit on any error

echo "🚀 Influmatch Phased Deployment Orchestrator"
echo "============================================="

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

log_phase() {
    echo -e "${PURPLE}[PHASE]${NC} $1"
}

# Display deployment phases
show_phases() {
    echo ""
    echo "📋 Available Deployment Phases:"
    echo ""
    echo "  Phase 1: Pre-Production Setup"
    echo "    - Database migration (SQLite → PostgreSQL)"
    echo "    - Environment configuration"
    echo "    - Hosting platform setup"
    echo "    - Security configuration"
    echo ""
    echo "  Phase 2: Staging Deployment"
    echo "    - Deploy to staging environment"
    echo "    - Testing and validation"
    echo "    - Performance testing"
    echo "    - Monitoring setup"
    echo ""
    echo "  Phase 3: Beta Launch"
    echo "    - Beta user management"
    echo "    - Feedback collection system"
    echo "    - Beta testing plan"
    echo "    - User invitation system"
    echo ""
    echo "  Phase 4: Production Launch"
    echo "    - Production deployment"
    echo "    - Monitoring and analytics"
    echo "    - Backup and recovery"
    echo "    - Launch marketing"
    echo ""
    echo "  All Phases: Complete Deployment"
    echo "    - Run all phases sequentially"
    echo "    - Full production deployment"
    echo ""
}

# Run specific phase
run_phase() {
    local phase=$1
    
    case $phase in
        "1"|"phase1")
            log_phase "Starting Phase 1: Pre-Production Setup"
            ./scripts/phase1-setup.sh
            ;;
        "2"|"phase2")
            log_phase "Starting Phase 2: Staging Deployment"
            ./scripts/phase2-staging.sh
            ;;
        "3"|"phase3")
            log_phase "Starting Phase 3: Beta Launch"
            ./scripts/phase3-beta.sh
            ;;
        "4"|"phase4")
            log_phase "Starting Phase 4: Production Launch"
            ./scripts/phase4-production.sh
            ;;
        *)
            log_error "Invalid phase: $phase"
            show_phases
            exit 1
            ;;
    esac
}

# Run all phases
run_all_phases() {
    log_info "Starting complete phased deployment..."
    
    echo ""
    log_phase "Phase 1: Pre-Production Setup"
    ./scripts/phase1-setup.sh
    
    echo ""
    log_phase "Phase 2: Staging Deployment"
    ./scripts/phase2-staging.sh
    
    echo ""
    log_phase "Phase 3: Beta Launch"
    ./scripts/phase3-beta.sh
    
    echo ""
    log_phase "Phase 4: Production Launch"
    ./scripts/phase4-production.sh
    
    echo ""
    log_success "🎉 Complete phased deployment finished!"
    echo ""
    echo "📊 Deployment Summary:"
    echo "  ✅ Phase 1: Infrastructure ready"
    echo "  ✅ Phase 2: Staging deployed"
    echo "  ✅ Phase 3: Beta testing complete"
    echo "  ✅ Phase 4: Production launched"
    echo ""
    echo "🚀 Influmatch is now live in production!"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking deployment prerequisites..."
    
    # Check if we're in the right directory
    if [ ! -f "server-sqlite.js" ]; then
        log_error "Please run this script from the Influmatch root directory"
        exit 1
    fi
    
    # Check if scripts directory exists
    if [ ! -d "scripts" ]; then
        log_error "Scripts directory not found. Please ensure all deployment scripts are present."
        exit 1
    fi
    
    # Check if all phase scripts exist
    local required_scripts=("phase1-setup.sh" "phase2-staging.sh" "phase3-beta.sh" "phase4-production.sh")
    for script in "${required_scripts[@]}"; do
        if [ ! -f "scripts/$script" ]; then
            log_error "Required script not found: scripts/$script"
            exit 1
        fi
    done
    
    log_success "All prerequisites met"
}

# Interactive mode
interactive_mode() {
    echo ""
    echo "🎯 Interactive Deployment Mode"
    echo "=============================="
    echo ""
    
    show_phases
    
    echo "Select deployment option:"
    echo "1) Run Phase 1 only"
    echo "2) Run Phase 2 only"
    echo "3) Run Phase 3 only"
    echo "4) Run Phase 4 only"
    echo "5) Run all phases"
    echo "6) Show phases and exit"
    echo ""
    
    read -p "Enter your choice (1-6): " choice
    
    case $choice in
        1) run_phase "1" ;;
        2) run_phase "2" ;;
        3) run_phase "3" ;;
        4) run_phase "4" ;;
        5) run_all_phases ;;
        6) show_phases ;;
        *) log_error "Invalid choice. Please run the script again." ;;
    esac
}

# Show help
show_help() {
    echo "Influmatch Phased Deployment Script"
    echo ""
    echo "Usage:"
    echo "  ./deploy.sh [phase]"
    echo ""
    echo "Arguments:"
    echo "  phase     Phase to run (1, 2, 3, 4, or 'all')"
    echo "  --help    Show this help message"
    echo "  --phases  Show available phases"
    echo ""
    echo "Examples:"
    echo "  ./deploy.sh 1          # Run Phase 1 only"
    echo "  ./deploy.sh all        # Run all phases"
    echo "  ./deploy.sh            # Interactive mode"
    echo ""
    echo "Phases:"
    echo "  1 - Pre-Production Setup"
    echo "  2 - Staging Deployment"
    echo "  3 - Beta Launch"
    echo "  4 - Production Launch"
    echo ""
}

# Main execution
main() {
    # Check prerequisites
    check_prerequisites
    
    # Parse arguments
    case "${1:-}" in
        "1"|"phase1")
            run_phase "1"
            ;;
        "2"|"phase2")
            run_phase "2"
            ;;
        "3"|"phase3")
            run_phase "3"
            ;;
        "4"|"phase4")
            run_phase "4"
            ;;
        "all")
            run_all_phases
            ;;
        "--help"|"-h")
            show_help
            ;;
        "--phases")
            show_phases
            ;;
        "")
            interactive_mode
            ;;
        *)
            log_error "Invalid argument: $1"
            show_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@"





