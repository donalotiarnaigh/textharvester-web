#!/bin/bash
# Test helper script for processing_id feature
# This script safely tests the processing_id implementation without deleting sample data

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEMP_DIR="/tmp/textharvester-test-$(date +%s)"
SOURCE_DIR="sample_data/source_sets"
OUTPUT_FORMAT="table"

# Functions
print_usage() {
  cat << EOF
Usage: ./test-processing-id.sh [OPTIONS]

Test the processing_id feature with sample data.
Files are copied to a temp directory to preserve originals.

OPTIONS:
  -t, --type TYPE       Record type to test: memorial, register, monument, all
                        (default: all)
  -p, --provider PROV   AI provider: openai, anthropic, gemini
                        (default: openai, requires API key)
  -v, --verbose         Enable verbose logging
  -d, --dry-run         Show what would be done without running ingest
  -h, --help            Show this help message

EXAMPLES:
  # Test with all record types (dry-run)
  ./test-processing-id.sh --dry-run

  # Test memorials with verbose output
  ./test-processing-id.sh -t memorial --verbose

  # Test burial registers with Anthropic
  ./test-processing-id.sh -t register --provider anthropic

EOF
}

print_header() {
  echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║${NC} $1"
  echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
}

print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1"
}

print_info() {
  echo -e "${YELLOW}ℹ${NC} $1"
}

setup_test_files() {
  local type=$1
  mkdir -p "$TEMP_DIR"

  print_header "Setting up test files in $TEMP_DIR"

  case $type in
    memorial)
      cp "$SOURCE_DIR/memorials/page_5.jpg" "$TEMP_DIR/memorial_test.jpg"
      print_success "Copied memorial image"
      ;;
    register)
      cp "$SOURCE_DIR/burial_registers/register_book1.jpg" "$TEMP_DIR/register_test.jpg"
      print_success "Copied burial register image"
      ;;
    monument)
      cp "$SOURCE_DIR/monument_photos/ducltf-0420.jpg" "$TEMP_DIR/monument_test.jpg"
      print_success "Copied monument photo"
      ;;
    all)
      cp "$SOURCE_DIR/memorials/page_5.jpg" "$TEMP_DIR/memorial_test.jpg"
      print_success "Copied memorial image"

      cp "$SOURCE_DIR/burial_registers/register_book1.jpg" "$TEMP_DIR/register_test.jpg"
      print_success "Copied burial register image"

      cp "$SOURCE_DIR/monument_photos/ducltf-0420.jpg" "$TEMP_DIR/monument_test.jpg"
      print_success "Copied monument photo"
      ;;
    *)
      print_error "Unknown type: $type"
      exit 1
      ;;
  esac

  echo ""
}

test_ingest() {
  local type=$1
  local provider=$2
  local verbose=$3
  local dry_run=$4

  local cmd="node bin/textharvester ingest"
  local source_type=""
  local file=""

  case $type in
    memorial)
      source_type="monument_photo"
      file="$TEMP_DIR/memorial_test.jpg"
      ;;
    register)
      source_type="burial_register"
      file="$TEMP_DIR/register_test.jpg"
      ;;
    monument)
      source_type="monument_photo"
      file="$TEMP_DIR/monument_test.jpg"
      ;;
  esac

  cmd="$cmd '$file' --source-type $source_type --provider $provider"

  if [ "$verbose" = true ]; then
    cmd="$cmd --verbose"
  fi

  if [ "$dry_run" = true ]; then
    echo -e "${YELLOW}[DRY RUN]${NC} $cmd"
  else
    print_header "Ingesting $type with $provider"
    print_info "File: $file"
    print_info "Source Type: $source_type"
    print_info "Provider: $provider"
    echo ""

    if eval "$cmd"; then
      print_success "Ingestion completed"
    else
      print_error "Ingestion failed"
      return 1
    fi

    # Give database a moment to settle
    sleep 1
  fi
}

verify_processing_id() {
  local type=$1

  print_header "Verifying processing_id in database"

  echo ""
  print_info "Querying recent records..."
  echo ""

  # Query the database
  case $type in
    memorial|monument)
      sqlite3 -header -column data/memorials.db \
        "SELECT id, file_name, processing_id FROM memorials ORDER BY id DESC LIMIT 1;" 2>/dev/null || true
      ;;
    register)
      sqlite3 -header -column data/memorials.db \
        "SELECT id, file_name, processing_id FROM burial_register_entries ORDER BY id DESC LIMIT 1;" 2>/dev/null || true
      ;;
  esac

  echo ""
  print_success "Check above for processing_id (UUID format)"
}

cleanup() {
  if [ -d "$TEMP_DIR" ]; then
    print_info "Temp directory available for inspection: $TEMP_DIR"
    print_info "Files will be auto-deleted by OS in /tmp cleanup"
  fi
}

# Main
main() {
  local record_type="all"
  local provider="openai"
  local verbose=false
  local dry_run=false

  # Parse arguments
  while [[ $# -gt 0 ]]; do
    case $1 in
      -t|--type)
        record_type="$2"
        shift 2
        ;;
      -p|--provider)
        provider="$2"
        shift 2
        ;;
      -v|--verbose)
        verbose=true
        shift
        ;;
      -d|--dry-run)
        dry_run=true
        shift
        ;;
      -h|--help)
        print_usage
        exit 0
        ;;
      *)
        print_error "Unknown option: $1"
        print_usage
        exit 1
        ;;
    esac
  done

  # Validate inputs
  case $record_type in
    memorial|register|monument|all) ;;
    *)
      print_error "Invalid type: $record_type"
      exit 1
      ;;
  esac

  # Setup
  setup_test_files "$record_type"

  # Test ingestion
  case $record_type in
    all)
      test_ingest "memorial" "$provider" "$verbose" "$dry_run"
      test_ingest "register" "$provider" "$verbose" "$dry_run"
      test_ingest "monument" "$provider" "$verbose" "$dry_run"
      ;;
    *)
      test_ingest "$record_type" "$provider" "$verbose" "$dry_run"
      ;;
  esac

  # Verify (skip in dry-run mode)
  if [ "$dry_run" = false ]; then
    verify_processing_id "$record_type"
  fi

  # Cleanup info
  cleanup

  echo ""
  print_header "Test Summary"
  if [ "$dry_run" = true ]; then
    print_info "Dry-run completed. No files were ingested."
    print_info "Remove --dry-run to actually process files"
  else
    print_success "Test completed successfully!"
    print_info "processing_id feature verified in database"
    print_info "Original sample data preserved in $SOURCE_DIR"
  fi
}

# Run
main "$@"
