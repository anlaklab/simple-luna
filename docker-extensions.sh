#!/bin/bash

# 🚀 Luna Dynamic Extensions Manager for Docker
# Manage dynamic extensions in Docker containers

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
LUNA_SERVER_URL="http://localhost:3000"
CONTAINER_NAME="luna-server"

print_header() {
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}🚀 Luna Dynamic Extensions Manager${NC}"
    echo -e "${CYAN}========================================${NC}"
}

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_extension() {
    echo -e "${PURPLE}[EXTENSION]${NC} $1"
}

# Check if Docker container is running
check_container() {
    if ! docker ps | grep -q "$CONTAINER_NAME"; then
        print_error "Luna server container is not running!"
        print_status "Start it with: ./docker-start.sh"
        exit 1
    fi
    print_success "Luna server container is running"
}

# Test server connectivity
check_connectivity() {
    if ! curl -f "$LUNA_SERVER_URL/api/dynamic-extensions/health" > /dev/null 2>&1; then
        print_error "Cannot connect to Luna server or Dynamic Extensions API not available"
        print_status "Make sure the server is running and accessible at $LUNA_SERVER_URL"
        exit 1
    fi
    print_success "Connected to Luna Dynamic Extensions API"
}

# List all loaded extensions
list_extensions() {
    print_extension "📋 Listing all loaded extensions..."
    
    RESPONSE=$(curl -s "$LUNA_SERVER_URL/api/dynamic-extensions" 2>/dev/null)
    
    if [ $? -eq 0 ] && [ ! -z "$RESPONSE" ]; then
        echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    else
        print_error "Failed to retrieve extensions list"
    fi
}

# Show extension statistics
show_stats() {
    print_extension "📊 Getting extension system statistics..."
    
    RESPONSE=$(curl -s "$LUNA_SERVER_URL/api/dynamic-extensions/stats" 2>/dev/null)
    
    if [ $? -eq 0 ] && [ ! -z "$RESPONSE" ]; then
        echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    else
        print_error "Failed to retrieve extension statistics"
    fi
}

# Check system health
check_health() {
    print_extension "🏥 Checking Dynamic Extensions system health..."
    
    RESPONSE=$(curl -s -w "HTTP_CODE:%{http_code}" "$LUNA_SERVER_URL/api/dynamic-extensions/health" 2>/dev/null)
    HTTP_CODE=$(echo "$RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d':' -f2)
    RESPONSE_BODY=$(echo "$RESPONSE" | sed 's/HTTP_CODE:[0-9]*$//')
    
    if [ "$HTTP_CODE" = "200" ]; then
        print_success "System health: HEALTHY"
        echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
    elif [ "$HTTP_CODE" = "503" ]; then
        print_warning "System health: DEGRADED"
        echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
    else
        print_error "Health check failed (HTTP $HTTP_CODE)"
    fi
}

# Test all extensions
test_extensions() {
    print_extension "🧪 Testing all loaded extensions..."
    
    RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" "$LUNA_SERVER_URL/api/dynamic-extensions/test-all" -d '{}' 2>/dev/null)
    
    if [ $? -eq 0 ] && [ ! -z "$RESPONSE" ]; then
        echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    else
        print_error "Failed to test extensions"
    fi
}

# Test specific extension
test_extension() {
    local extension_type="$1"
    
    if [ -z "$extension_type" ]; then
        print_error "Extension type is required"
        print_status "Usage: $0 test-extension <type>"
        return 1
    fi
    
    print_extension "🧪 Testing extension: $extension_type"
    
    RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" "$LUNA_SERVER_URL/api/dynamic-extensions/$extension_type/test" -d '{}' 2>/dev/null)
    
    if [ $? -eq 0 ] && [ ! -z "$RESPONSE" ]; then
        echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    else
        print_error "Failed to test extension $extension_type"
    fi
}

# Enable extension
enable_extension() {
    local extension_type="$1"
    
    if [ -z "$extension_type" ]; then
        print_error "Extension type is required"
        print_status "Usage: $0 enable <type>"
        return 1
    fi
    
    print_extension "✅ Enabling extension: $extension_type"
    
    RESPONSE=$(curl -s -X POST "$LUNA_SERVER_URL/api/dynamic-extensions/$extension_type/enable" 2>/dev/null)
    
    if [ $? -eq 0 ] && [ ! -z "$RESPONSE" ]; then
        echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    else
        print_error "Failed to enable extension $extension_type"
    fi
}

# Disable extension
disable_extension() {
    local extension_type="$1"
    
    if [ -z "$extension_type" ]; then
        print_error "Extension type is required"
        print_status "Usage: $0 disable <type>"
        return 1
    fi
    
    print_extension "❌ Disabling extension: $extension_type"
    
    RESPONSE=$(curl -s -X POST "$LUNA_SERVER_URL/api/dynamic-extensions/$extension_type/disable" 2>/dev/null)
    
    if [ $? -eq 0 ] && [ ! -z "$RESPONSE" ]; then
        echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    else
        print_error "Failed to disable extension $extension_type"
    fi
}

# Reload all extensions
reload_extensions() {
    print_extension "🔄 Reloading all dynamic extensions..."
    
    # Default configuration
    local enabled_extensions='["chart", "table", "video"]'
    
    if [ ! -z "$1" ]; then
        enabled_extensions="$1"
    fi
    
    RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" "$LUNA_SERVER_URL/api/dynamic-extensions/reload" -d "{\"enabledExtensions\": $enabled_extensions}" 2>/dev/null)
    
    if [ $? -eq 0 ] && [ ! -z "$RESPONSE" ]; then
        echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    else
        print_error "Failed to reload extensions"
    fi
}

# Add new extension (copy to container)
add_extension() {
    local source_file="$1"
    local extension_name="$2"
    
    if [ -z "$source_file" ] || [ -z "$extension_name" ]; then
        print_error "Source file and extension name are required"
        print_status "Usage: $0 add <source-file> <extension-name>"
        print_status "Example: $0 add ./my-audio-extension.ts audio"
        return 1
    fi
    
    if [ ! -f "$source_file" ]; then
        print_error "Source file not found: $source_file"
        return 1
    fi
    
    print_extension "📁 Adding new extension: $extension_name"
    
    # Copy file to container
    TARGET_PATH="/app/server/src/modules/shared/extensions/${extension_name}-extension.ts"
    
    if docker cp "$source_file" "$CONTAINER_NAME:$TARGET_PATH"; then
        print_success "Extension file copied to container"
        
        # Reload extensions to pick up the new one
        print_status "Reloading extensions to include new extension..."
        reload_extensions "[\"chart\", \"table\", \"video\", \"$extension_name\"]"
    else
        print_error "Failed to copy extension file to container"
    fi
}

# Show container logs
show_logs() {
    print_status "📋 Showing Luna server logs (last 50 lines)..."
    docker logs --tail 50 "$CONTAINER_NAME"
}

# Interactive mode
interactive_mode() {
    print_header
    echo ""
    
    while true; do
        echo -e "${CYAN}Choose an option:${NC}"
        echo "1. List extensions"
        echo "2. Show statistics"
        echo "3. Check health"
        echo "4. Test all extensions"
        echo "5. Test specific extension"
        echo "6. Enable extension"
        echo "7. Disable extension"
        echo "8. Reload extensions"
        echo "9. Show logs"
        echo "0. Exit"
        echo ""
        read -p "Enter your choice (0-9): " choice
        
        case $choice in
            1) list_extensions ;;
            2) show_stats ;;
            3) check_health ;;
            4) test_extensions ;;
            5) 
                read -p "Enter extension type: " ext_type
                test_extension "$ext_type"
                ;;
            6)
                read -p "Enter extension type to enable: " ext_type
                enable_extension "$ext_type"
                ;;
            7)
                read -p "Enter extension type to disable: " ext_type
                disable_extension "$ext_type"
                ;;
            8) reload_extensions ;;
            9) show_logs ;;
            0) 
                print_success "Goodbye!"
                exit 0
                ;;
            *) 
                print_error "Invalid choice. Please try again."
                ;;
        esac
        
        echo ""
        read -p "Press Enter to continue..."
        echo ""
    done
}

# Show help
show_help() {
    print_header
    echo ""
    echo "Dynamic Extensions Manager for Luna Docker"
    echo ""
    echo "USAGE:"
    echo "  $0 [COMMAND] [ARGS]"
    echo ""
    echo "COMMANDS:"
    echo "  list                    List all loaded extensions"
    echo "  stats                   Show extension statistics"
    echo "  health                  Check system health"
    echo "  test-all                Test all extensions"
    echo "  test-extension <type>   Test specific extension"
    echo "  enable <type>           Enable extension"
    echo "  disable <type>          Disable extension"
    echo "  reload [extensions]     Reload extensions (optional JSON array)"
    echo "  add <file> <name>       Add new extension from file"
    echo "  logs                    Show container logs"
    echo "  interactive             Start interactive mode"
    echo "  help                    Show this help"
    echo ""
    echo "EXAMPLES:"
    echo "  $0 list"
    echo "  $0 test-extension chart"
    echo "  $0 enable audio"
    echo "  $0 reload '[\"chart\", \"table\", \"video\", \"audio\"]'"
    echo "  $0 add ./audio-extension.ts audio"
    echo "  $0 interactive"
    echo ""
}

# Main script logic
main() {
    # Parse command
    COMMAND="$1"
    
    case "$COMMAND" in
        "list")
            check_container
            check_connectivity
            list_extensions
            ;;
        "stats")
            check_container
            check_connectivity
            show_stats
            ;;
        "health")
            check_container
            check_connectivity
            check_health
            ;;
        "test-all")
            check_container
            check_connectivity
            test_extensions
            ;;
        "test-extension")
            check_container
            check_connectivity
            test_extension "$2"
            ;;
        "enable")
            check_container
            check_connectivity
            enable_extension "$2"
            ;;
        "disable")
            check_container
            check_connectivity
            disable_extension "$2"
            ;;
        "reload")
            check_container
            check_connectivity
            reload_extensions "$2"
            ;;
        "add")
            check_container
            add_extension "$2" "$3"
            ;;
        "logs")
            check_container
            show_logs
            ;;
        "interactive")
            check_container
            check_connectivity
            interactive_mode
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        "")
            # No command provided, start interactive mode
            check_container
            check_connectivity
            interactive_mode
            ;;
        *)
            print_error "Unknown command: $COMMAND"
            show_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@" 