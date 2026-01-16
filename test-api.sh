#!/bin/bash

# Manual API Testing Script
# Usage: ./test-api.sh [port]
# Example: ./test-api.sh 3001
#
# Prerequisites:
# 1. Start the dev server: npm run dev
# 2. Ensure .env.local has OPENAI_API_KEY and Supabase config
# 3. Run this script in a separate terminal

echo "🧪 Testing Next.js API Routes"
echo "================================"
echo ""

# Use provided port or default to 3000
PORT="${1:-3000}"
BASE_URL="http://localhost:$PORT"

echo "🌐 Testing against: $BASE_URL"
echo ""

# Test 1: Config API
echo "1️⃣  Testing Config API (GET /api/config)"
echo "---"
CONFIG_RESPONSE=$(curl -s -X GET "$BASE_URL/api/config")
echo "Response: $CONFIG_RESPONSE"
echo ""
echo ""

# Test 2: Chat API - Valid Request
echo "2️⃣  Testing Chat API (POST /api/chat) - Valid Request"
echo "---"
CHAT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Say hello in 5 words or less", "mode": "chat"}')
echo "Response: $CHAT_RESPONSE"
echo ""
echo ""

# Test 3: Chat API - Missing Prompt
echo "3️⃣  Testing Chat API - Missing Prompt (Should fail)"
echo "---"
CHAT_ERROR=$(curl -s -X POST "$BASE_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d '{}')
echo "Response: $CHAT_ERROR"
echo ""
echo ""

# Test 4: Block Action API - Translate
echo "4️⃣  Testing Block Action API - Translate"
echo "---"
TRANSLATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/block-action" \
  -H "Content-Type: application/json" \
  -d '{"action": "translate", "blockText": "Hello world", "mode": "block"}')
echo "Response: $TRANSLATE_RESPONSE"
echo ""
echo ""

# Test 5: Block Action API - ELI5
echo "5️⃣  Testing Block Action API - ELI5"
echo "---"
ELI5_RESPONSE=$(curl -s -X POST "$BASE_URL/api/block-action" \
  -H "Content-Type: application/json" \
  -d '{"action": "eli5", "blockText": "Recursion is when a function calls itself", "mode": "block"}')
echo "Response: $ELI5_RESPONSE"
echo ""
echo ""

# Test 6: Block Action API - Ask (with prompt)
echo "6️⃣  Testing Block Action API - Ask"
echo "---"
ASK_RESPONSE=$(curl -s -X POST "$BASE_URL/api/block-action" \
  -H "Content-Type: application/json" \
  -d '{"action": "ask", "blockText": "React is a JavaScript library for building user interfaces.", "prompt": "What is React?", "mode": "block"}')
echo "Response: $ASK_RESPONSE"
echo ""
echo ""

# Test 7: Block Action API - Missing Prompt for Ask (Should fail)
echo "7️⃣  Testing Block Action API - Ask without prompt (Should fail)"
echo "---"
ASK_ERROR=$(curl -s -X POST "$BASE_URL/api/block-action" \
  -H "Content-Type: application/json" \
  -d '{"action": "ask", "blockText": "Some text", "mode": "block"}')
echo "Response: $ASK_ERROR"
echo ""
echo ""

# Test 8: Block Action API - Unsupported Action (Should fail)
echo "8️⃣  Testing Block Action API - Unsupported action (Should fail)"
echo "---"
UNSUPPORTED_ERROR=$(curl -s -X POST "$BASE_URL/api/block-action" \
  -H "Content-Type: application/json" \
  -d '{"action": "invalid", "blockText": "Some text", "mode": "block"}')
echo "Response: $UNSUPPORTED_ERROR"
echo ""
echo ""

echo "✅ API Testing Complete!"
echo ""
echo "Note: Tests 3, 7, and 8 should show error messages (this is expected)"
