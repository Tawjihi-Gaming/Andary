#!/bin/bash

# Test Authentication APIs
# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="http://localhost:5000/api/auth"
COOKIE_FILE="test_cookies.txt"

echo -e "${YELLOW}🧪 Testing Logout and Edit Player Info APIs${NC}\n"

# Clean up old cookies
rm -f $COOKIE_FILE

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Step 1: Signup${NC}"
echo -e "${YELLOW}========================================${NC}"
# Generate unique username and email based on timestamp
TIMESTAMP=$(date +%s)
TEST_USERNAME="testuser_${TIMESTAMP}"
TEST_EMAIL="testuser_${TIMESTAMP}@example.com"

SIGNUP_RESPONSE=$(curl -s -X POST "$API_URL/signup" \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"$TEST_USERNAME\", \"email\": \"$TEST_EMAIL\", \"password\": \"password123\", \"avatarImageName\": \"avatar1.png\"}" \
  -c $COOKIE_FILE -b $COOKIE_FILE)
echo "$SIGNUP_RESPONSE" | jq .
echo ""

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Step 2: Login${NC}"
echo -e "${YELLOW}========================================${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$TEST_EMAIL\", \"password\": \"password123\"}" \
  -c $COOKIE_FILE -b $COOKIE_FILE)
echo "$LOGIN_RESPONSE" | jq .
echo ""

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Step 3: Get Current User (Me)${NC}"
echo -e "${YELLOW}========================================${NC}"
ME_RESPONSE=$(curl -s -X GET "$API_URL/me" \
  -c $COOKIE_FILE -b $COOKIE_FILE)
echo "$ME_RESPONSE" | jq .
echo ""

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Step 4: Edit Player Info - Update Username${NC}"
echo -e "${YELLOW}========================================${NC}"
EDIT_USERNAME_RESPONSE=$(curl -s -X PUT "$API_URL/edit" \
  -H "Content-Type: application/json" \
  -d '{"username": "newusername"}' \
  -c $COOKIE_FILE -b $COOKIE_FILE)
echo "$EDIT_USERNAME_RESPONSE" | jq .
echo ""

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Step 5: Verify Username Change${NC}"
echo -e "${YELLOW}========================================${NC}"
ME_AFTER_USERNAME=$(curl -s -X GET "$API_URL/me" \
  -c $COOKIE_FILE -b $COOKIE_FILE)
echo "$ME_AFTER_USERNAME" | jq .
echo ""

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Step 6: Edit Player Info - Update Avatar${NC}"
echo -e "${YELLOW}========================================${NC}"
EDIT_AVATAR_RESPONSE=$(curl -s -X PUT "$API_URL/edit" \
  -H "Content-Type: application/json" \
  -d '{"avatarImageName": "avatar2.png"}' \
  -c $COOKIE_FILE -b $COOKIE_FILE)
echo "$EDIT_AVATAR_RESPONSE" | jq .
echo ""

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Step 7: Verify Avatar Change${NC}"
echo -e "${YELLOW}========================================${NC}"
ME_AFTER_AVATAR=$(curl -s -X GET "$API_URL/me" \
  -c $COOKIE_FILE -b $COOKIE_FILE)
echo "$ME_AFTER_AVATAR" | jq .
echo ""

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Step 8: Edit Player Info - Update Email${NC}"
echo -e "${YELLOW}========================================${NC}"
EDIT_EMAIL_RESPONSE=$(curl -s -X PUT "$API_URL/edit" \
  -H "Content-Type: application/json" \
  -d '{"email": "newemail@example.com"}' \
  -c $COOKIE_FILE -b $COOKIE_FILE)
echo "$EDIT_EMAIL_RESPONSE" | jq .
echo ""

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Step 9: Verify Email Change${NC}"
echo -e "${YELLOW}========================================${NC}"
ME_AFTER_EMAIL=$(curl -s -X GET "$API_URL/me" \
  -c $COOKIE_FILE -b $COOKIE_FILE)
echo "$ME_AFTER_EMAIL" | jq .
echo ""

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Step 10: Edit Player Info - Update Password${NC}"
echo -e "${YELLOW}========================================${NC}"
EDIT_PASSWORD_RESPONSE=$(curl -s -X PUT "$API_URL/edit" \
  -H "Content-Type: application/json" \
  -d '{"password": "newpassword123"}' \
  -c $COOKIE_FILE -b $COOKIE_FILE)
echo "$EDIT_PASSWORD_RESPONSE" | jq .
echo ""

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Step 11: Edit Player Info - Update Multiple Fields${NC}"
echo -e "${YELLOW}========================================${NC}"
EDIT_MULTIPLE_RESPONSE=$(curl -s -X PUT "$API_URL/edit" \
  -H "Content-Type: application/json" \
  -d '{"username": "finalnamechange", "avatarImageName": "avatar3.png"}' \
  -c $COOKIE_FILE -b $COOKIE_FILE)
echo "$EDIT_MULTIPLE_RESPONSE" | jq .
echo ""

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Step 12: Verify Multiple Changes${NC}"
echo -e "${YELLOW}========================================${NC}"
ME_AFTER_MULTIPLE=$(curl -s -X GET "$API_URL/me" \
  -c $COOKIE_FILE -b $COOKIE_FILE)
echo "$ME_AFTER_MULTIPLE" | jq .
echo ""

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Step 13: Test Logout${NC}"
echo -e "${YELLOW}========================================${NC}"
LOGOUT_RESPONSE=$(curl -s -X POST "$API_URL/logout" \
  -c $COOKIE_FILE -b $COOKIE_FILE)
echo "$LOGOUT_RESPONSE" | jq .
echo ""

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Step 14: Verify Logout - Try to Get User${NC}"
echo -e "${YELLOW}========================================${NC}"
ME_AFTER_LOGOUT=$(curl -s -w "\nHTTP Status: %{http_code}\n" -X GET "$API_URL/me" \
  -c $COOKIE_FILE -b $COOKIE_FILE)
echo "$ME_AFTER_LOGOUT"
echo ""

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Step 15: Try to Edit After Logout (Should Fail)${NC}"
echo -e "${YELLOW}========================================${NC}"
EDIT_AFTER_LOGOUT=$(curl -s -w "\nHTTP Status: %{http_code}\n" -X PUT "$API_URL/edit" \
  -H "Content-Type: application/json" \
  -d '{"username": "shouldfail"}' \
  -c $COOKIE_FILE -b $COOKIE_FILE)
echo "$EDIT_AFTER_LOGOUT"
echo ""

echo -e "${GREEN}✅ All tests completed!${NC}"

# Clean up
rm -f $COOKIE_FILE
