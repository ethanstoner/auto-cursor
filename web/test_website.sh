#!/bin/bash
# Quick QA test for Auto-Cursor website

BASE_URL="http://localhost:8765"
PASSED=0
FAILED=0

echo "🧪 Testing Auto-Cursor Website"
echo "================================"
echo ""

# Test 1: Server is running
echo "Test 1: Server accessibility..."
if curl -s "$BASE_URL" > /dev/null 2>&1; then
    echo "✅ Server is running"
    ((PASSED++))
else
    echo "❌ Server is not accessible"
    ((FAILED++))
    exit 1
fi

# Test 2: HTML structure
echo ""
echo "Test 2: HTML structure..."
HTML=$(curl -s "$BASE_URL")
if echo "$HTML" | grep -q "sidebar"; then
    echo "✅ Sidebar found in HTML"
    ((PASSED++))
else
    echo "❌ Sidebar not found"
    ((FAILED++))
fi

if echo "$HTML" | grep -q "view-container"; then
    echo "✅ View container found"
    ((PASSED++))
else
    echo "❌ View container not found"
    ((FAILED++))
fi

if echo "$HTML" | grep -q "kanban-board"; then
    echo "✅ Kanban board found"
    ((PASSED++))
else
    echo "❌ Kanban board not found"
    ((FAILED++))
fi

# Test 3: Static assets
echo ""
echo "Test 3: Static assets..."
if curl -s "$BASE_URL/static/logo.png" > /dev/null 2>&1; then
    echo "✅ Logo is accessible"
    ((PASSED++))
else
    echo "❌ Logo not accessible"
    ((FAILED++))
fi

if curl -s "$BASE_URL/static/css/style.css" | grep -q "sidebar"; then
    echo "✅ CSS file contains sidebar styles"
    ((PASSED++))
else
    echo "❌ CSS missing sidebar styles"
    ((FAILED++))
fi

if curl -s "$BASE_URL/static/js/app.js" | grep -q "switchView"; then
    echo "✅ JavaScript file contains view switching"
    ((PASSED++))
else
    echo "❌ JavaScript missing view switching"
    ((FAILED++))
fi

# Test 4: API endpoints
echo ""
echo "Test 4: API endpoints..."
if curl -s "$BASE_URL/api/projects" | grep -q "\["; then
    echo "✅ Projects API works"
    ((PASSED++))
else
    echo "❌ Projects API failed"
    ((FAILED++))
fi

if curl -s "$BASE_URL/api/agents" | grep -q "\["; then
    echo "✅ Agents API works"
    ((PASSED++))
else
    echo "❌ Agents API failed"
    ((FAILED++))
fi

# Test 5: Favicon
echo ""
echo "Test 5: Favicon..."
if echo "$HTML" | grep -q "favicon"; then
    echo "✅ Favicon link found"
    ((PASSED++))
else
    echo "❌ Favicon link not found"
    ((FAILED++))
fi

# Summary
echo ""
echo "================================"
echo "Results: $PASSED passed, $FAILED failed"
if [ $FAILED -eq 0 ]; then
    echo "✅ All tests passed!"
    exit 0
else
    echo "❌ Some tests failed"
    exit 1
fi
