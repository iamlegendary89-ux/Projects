#!/bin/bash

# SmartMatch Discovery v3 - Docker Test Script
# This script demonstrates building and running the v3 system in Docker

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="smartmatch-discovery"
CONTAINER_NAME="smartmatch-discovery-test"
DOCKERFILE="Dockerfile_v3"

# Helper functions
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

check_dependencies() {
    log_info "Checking dependencies..."

    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi

    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed or not in PATH"
        exit 1
    fi

    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed or not in PATH"
        exit 1
    fi

    log_success "All dependencies are available"
}

setup_environment() {
    log_info "Setting up environment..."

    # Create necessary directories
    mkdir -p logs data

    # Create .env file if it doesn't exist
    if [ ! -f ".env" ]; then
        log_warning ".env file not found. Creating template..."
        cat > .env << EOF
# SmartMatch Discovery v3 - Environment Configuration
# Copy this file and update with your actual API keys

# Google CSE API Configuration
GOOGLE_CSE_API_KEY=your_google_cse_api_key_here
GOOGLE_CSE_SEARCH_ENGINE_ID=your_search_engine_id_here

# Archive.org Configuration
ARCHIVE_ORG_BASE_URL=https://archive.org
ARCHIVE_ORG_TIMEOUT=30000

# HTTP Client Configuration
HTTP_TIMEOUT=30000
HTTP_MAX_RETRIES=3
HTTP_USER_AGENT=SmartMatch-Discovery/3.0

# Discovery Configuration
DISCOVERY_MAX_CONCURRENCY=5
DISCOVERY_TIMEOUT=30000
DISCOVERY_QUALITY_THRESHOLD=60
DISCOVERY_MAX_IMAGES=5
DISCOVERY_MAX_CONTENT_LENGTH=100000

# Logging Configuration
LOG_LEVEL=info
LOG_FILE_PATH=./logs/discovery.log

# Processing Configuration
PROCESSING_MAX_CONTENT_LENGTH=100000
PROCESSING_MAX_IMAGE_SIZE=5242880

# Node Environment
NODE_ENV=production
EOF
        log_info "Created .env template. Please update with your API keys."
    fi

    log_success "Environment setup complete"
}

build_image() {
    log_info "Building Docker image..."

    # Copy package.json for Docker build
    cp package_v3.json package.json 2>/dev/null || true

    # Build the image
    docker build -f "$DOCKERFILE" -t "$IMAGE_NAME" .

    # Clean up
    rm -f package.json 2>/dev/null || true

    log_success "Docker image built successfully"
}

test_basic_functionality() {
    log_info "Testing basic CLI functionality..."

    # Test help command
    log_info "Testing help command..."
    docker run --rm "$IMAGE_NAME" --help > /dev/null
    log_success "Help command works"

    # Test health check (without API keys)
    log_info "Testing health command..."
    if docker run --rm "$IMAGE_NAME" health --json 2>/dev/null; then
        log_success "Health command works"
    else
        log_warning "Health command failed (expected without API keys)"
    fi
}

test_discovery_workflow() {
    log_info "Testing discovery workflow..."

    # Check if API keys are configured
    if [ -z "$GOOGLE_CSE_API_KEY" ] || [ "$GOOGLE_CSE_API_KEY" = "your_google_cse_api_key_here" ]; then
        log_warning "GOOGLE_CSE_API_KEY not configured. Skipping discovery test."
        log_info "To test discovery, set your API keys in the .env file"
        return 0
    fi

    log_info "Running discovery workflow for 'iPhone 15 Pro'..."

    # Run discovery with timeout
    timeout 120 docker run --rm \
        -e GOOGLE_CSE_API_KEY="$GOOGLE_CSE_API_KEY" \
        -e GOOGLE_CSE_SEARCH_ENGINE_ID="$GOOGLE_CSE_SEARCH_ENGINE_ID" \
        "$IMAGE_NAME" discover "iPhone 15 Pro" --json > discovery_result.json

    if [ $? -eq 0 ]; then
        log_success "Discovery workflow completed successfully"
        log_info "Results saved to discovery_result.json"

        # Show summary
        if command -v jq &> /dev/null; then
            echo "Discovery Summary:"
            jq '.quality // "No quality data"' discovery_result.json 2>/dev/null || echo "Could not parse results"
        else
            echo "Install jq to see formatted results"
        fi
    else
        log_error "Discovery workflow failed or timed out"
        return 1
    fi
}

run_interactive_tests() {
    log_info "Running interactive tests..."

    # Test CSE service
    log_info "Testing CSE search..."
    docker run --rm \
        -e GOOGLE_CSE_API_KEY="$GOOGLE_CSE_API_KEY" \
        -e GOOGLE_CSE_SEARCH_ENGINE_ID="$GOOGLE_CSE_SEARCH_ENGINE_ID" \
        "$IMAGE_NAME" cse search "iPhone review" --max-results 3 --json

    # Test content processing
    log_info "Testing content processing..."
    docker run --rm \
        "$IMAGE_NAME" content extract "https://example.com" --json

    # Test image processing
    log_info "Testing image processing..."
    docker run --rm \
        "$IMAGE_NAME" image analyze "https://via.placeholder.com/800x600.jpg" --json
}

cleanup() {
    log_info "Cleaning up..."

    # Stop and remove test container if running
    docker stop "$CONTAINER_NAME" 2>/dev/null || true
    docker rm "$CONTAINER_NAME" 2>/dev/null || true

    # Remove test image
    docker rmi "$IMAGE_NAME" 2>/dev/null || true

    log_success "Cleanup complete"
}

show_usage() {
    cat << EOF
SmartMatch Discovery v3 - Docker Test Script

Usage: $0 [OPTIONS] [COMMAND]

Commands:
    all         Run all tests (default)
    build       Build Docker image only
    basic       Test basic functionality
    discovery   Test discovery workflow
    interactive Run interactive service tests
    cleanup     Clean up Docker resources

Options:
    -h, --help      Show this help message
    -v, --verbose   Enable verbose output
    --no-cleanup    Skip cleanup after tests

Environment Variables:
    GOOGLE_CSE_API_KEY          Your Google CSE API key
    GOOGLE_CSE_SEARCH_ENGINE_ID  Your Google CSE Search Engine ID

Examples:
    # Run all tests
    $0

    # Build only
    $0 build

    # Test with your API keys
    GOOGLE_CSE_API_KEY=your_key GOOGLE_CSE_SEARCH_ENGINE_ID=your_id $0 discovery

    # Run specific test
    $0 basic
EOF
}

# Main script logic
main() {
    local command="all"
    local skip_cleanup=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -v|--verbose)
                set -x
                shift
                ;;
            --no-cleanup)
                skip_cleanup=true
                shift
                ;;
            build|basic|discovery|interactive|cleanup)
                command="$1"
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done

    log_info "SmartMatch Discovery v3 - Docker Test Script"
    log_info "Command: $command"

    case $command in
        all)
            check_dependencies
            setup_environment
            build_image
            test_basic_functionality
            test_discovery_workflow
            run_interactive_tests
            ;;
        build)
            check_dependencies
            setup_environment
            build_image
            ;;
        basic)
            check_dependencies
            build_image
            test_basic_functionality
            ;;
        discovery)
            check_dependencies
            build_image
            test_discovery_workflow
            ;;
        interactive)
            check_dependencies
            build_image
            run_interactive_tests
            ;;
        cleanup)
            cleanup
            exit 0
            ;;
    esac

    if [ "$skip_cleanup" = false ]; then
        cleanup
    fi

    log_success "Test script completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Set your API keys in the .env file"
    echo "2. Run: GOOGLE_CSE_API_KEY=your_key $0 discovery"
    echo "3. Check discovery_result.json for results"
}

# Run main function with all arguments
main "$@"
