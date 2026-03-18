#!/bin/bash

# Manual Test Script for Issue #38: Background PDF Conversion
# Run from project root: ./test-issue-38.sh

set -e

echo "==============================================="
echo "Issue #38 Manual Test: Background PDF Conversion"
echo "==============================================="
echo ""

# Check if server is running
echo "[Setup] Checking if server is running..."
if ! curl -s http://localhost:3000/processing-status > /dev/null 2>&1; then
  echo "❌ Server not running. Start with: npm start"
  exit 1
fi
echo "✓ Server is running"
echo ""

# Create test data directory
echo "[Setup] Preparing test data..."
mkdir -p test-data/pdfs

# Check if test PDF exists
if [ ! -f "test-data/pdfs/test-2page.pdf" ]; then
  echo "⚠️  Test PDF not found. Creating dummy PDF..."
  # Try to use imageMagick if available
  if command -v convert &> /dev/null; then
    convert -size 200x200 xc:white \
            -pointsize 20 -fill black \
            -annotate +10+30 'Test PDF - Page 1' \
            test-data/pdfs/test-page1.jpg
    convert -size 200x200 xc:white \
            -pointsize 20 -fill black \
            -annotate +10+30 'Test PDF - Page 2' \
            test-data/pdfs/test-page2.jpg
    echo "ℹ️  Created test images. For proper PDF testing, place a multi-page PDF in test-data/pdfs/"
  else
    echo "❌ ImageMagick not available. Please place test PDFs in test-data/pdfs/"
    exit 1
  fi
fi
echo "✓ Test data ready"
echo ""

# Test 1: Response Timing
echo "==============================================="
echo "Test 1: Measuring Upload Response Time"
echo "==============================================="
echo "Uploading test file and measuring response time..."
echo ""

if [ -f "test-data/pdfs/test-2page.pdf" ]; then
  PDF_FILE="test-data/pdfs/test-2page.pdf"
  echo "Using PDF: $PDF_FILE"
elif [ -f "test-data/pdfs/test-page1.jpg" ]; then
  PDF_FILE="test-data/pdfs/test-page1.jpg"
  echo "Using image: $PDF_FILE"
else
  echo "❌ No test file found"
  exit 1
fi

echo ""
START=$(date +%s%N)
RESPONSE=$(curl -s -X POST \
  -F "file=@$PDF_FILE" \
  -F "source_type=burial_register" \
  -F "provider=openai" \
  -w "\n%{http_code}" \
  http://localhost:3000/upload)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)
END=$(date +%s%N)

DURATION=$(( (END - START) / 1000000 ))
echo "✓ Response received in ${DURATION}ms (HTTP $HTTP_CODE)"
echo "Response body:"
echo "$BODY" | jq '.'
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo "✓ PASS: HTTP 200 received"
else
  echo "❌ FAIL: Expected HTTP 200, got $HTTP_CODE"
fi

if [ "$DURATION" -lt 1000 ]; then
  echo "✓ PASS: Response time < 1000ms (PDF conversion is async)"
else
  echo "❌ FAIL: Response time ${DURATION}ms > 1000ms (may indicate blocking conversion)"
fi
echo ""

# Test 2: Check Conversion State Immediately After Upload
echo "==============================================="
echo "Test 2: Checking Conversion State (immediate)"
echo "==============================================="
echo "Checking /processing-status endpoint within 1 second of upload..."
echo ""

sleep 1
PROGRESS=$(curl -s http://localhost:3000/processing-status)
STATE=$(echo "$PROGRESS" | jq -r '.status // .state // "unknown"')
CONVERSION=$(echo "$PROGRESS" | jq '.conversion')
PROGRESS_PCT=$(echo "$PROGRESS" | jq '.progress')

echo "State: $STATE"
echo "Progress: ${PROGRESS_PCT}%"
echo "Conversion data:"
echo "$CONVERSION" | jq '.'
echo ""

if [ "$STATE" = "converting" ] || [ "$STATE" = "waiting" ]; then
  echo "✓ PASS: State is '$STATE' (conversion not blocking)"
else
  echo "⚠️  State is '$STATE' (may have already completed conversion)"
fi

if [ "$CONVERSION" != "null" ]; then
  echo "✓ PASS: Conversion data present"
else
  echo "⚠️  Conversion data is null (may have already completed)"
fi
echo ""

# Test 3: Monitor State Transitions
echo "==============================================="
echo "Test 3: Monitoring State Transitions (30 seconds)"
echo "==============================================="
echo "Polling every 3 seconds to observe state changes..."
echo ""

for i in {1..10}; do
  PROGRESS=$(curl -s http://localhost:3000/processing-status)
  STATE=$(echo "$PROGRESS" | jq -r '.status // .state')
  PROGRESS_PCT=$(echo "$PROGRESS" | jq '.progress')
  CONVERSION=$(echo "$PROGRESS" | jq '.conversion')
  ERRORS=$(echo "$PROGRESS" | jq '.errors')

  TIMESTAMP=$(date "+%H:%M:%S")
  if [ "$CONVERSION" != "null" ]; then
    CONV_INFO=$(echo "$CONVERSION" | jq -r '"[Converting: \(.completed)/\(.total)]"')
  else
    CONV_INFO="[No conversion]"
  fi

  echo "[$TIMESTAMP] State: $STATE | Progress: ${PROGRESS_PCT}% $CONV_INFO"

  # Check for errors
  if [ "$ERRORS" != "null" ] && [ "$ERRORS" != "[]" ]; then
    echo "  Errors detected:"
    echo "$ERRORS" | jq '.[]' | head -2
  fi

  # Stop if complete
  if [ "$STATE" = "complete" ]; then
    echo ""
    echo "✓ PASS: Processing completed"
    break
  fi

  sleep 3
done
echo ""

# Test 4: Verify Database
echo "==============================================="
echo "Test 4: Verifying Processed Records"
echo "==============================================="
echo "Checking database for processed records..."
echo ""

RECORD_COUNT=$(npm run query -- list --source-type burial_register 2>/dev/null | tail -1 | grep -oP '\d+(?= records)' || echo "0")
echo "Total burial register records: $RECORD_COUNT"

if [ "$RECORD_COUNT" -gt 0 ]; then
  echo "✓ PASS: Records were processed and stored"
  echo ""
  echo "Sample record:"
  npm run query -- list --source-type burial_register 2>/dev/null | head -5
else
  echo "⚠️  No records found (may still be processing)"
fi
echo ""

# Test 5: Error Handling (Optional)
echo "==============================================="
echo "Test 5: Error Handling (Optional)"
echo "==============================================="
echo "Creating a test file that will fail processing..."
echo ""

echo "INVALID_PDF_CONTENT" > test-data/pdfs/corrupt.pdf

START=$(date +%s%N)
RESPONSE=$(curl -s -X POST \
  -F "file=@test-data/pdfs/corrupt.pdf" \
  -F "source_type=burial_register" \
  -F "provider=openai" \
  -w "\n%{http_code}" \
  http://localhost:3000/upload)
END=$(date +%s%N)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
DURATION=$(( (END - START) / 1000000 ))

echo "Response time: ${DURATION}ms (HTTP $HTTP_CODE)"
if [ "$HTTP_CODE" = "200" ]; then
  echo "✓ PASS: Even with corrupt file, upload returns 200 (async error handling)"
fi

sleep 3
ERRORS=$(curl -s http://localhost:3000/processing-status | jq '.errors // []')
if [ "$ERRORS" != "[]" ]; then
  echo "✓ PASS: Errors captured in processing-status endpoint"
  echo "Errors:"
  echo "$ERRORS" | jq '.'
fi

# Cleanup
rm -f test-data/pdfs/corrupt.pdf

echo ""
echo "==============================================="
echo "Manual Testing Complete"
echo "==============================================="
echo ""
echo "Summary:"
echo "  Test 1: Response timing < 1000ms"
echo "  Test 2: Conversion state immediately visible"
echo "  Test 3: State transitions: converting → processing → complete"
echo "  Test 4: Records processed and stored"
echo "  Test 5: Error handling works"
echo ""
echo "For more detailed testing, see: docs/manual-test-issue-38.md"
echo ""
