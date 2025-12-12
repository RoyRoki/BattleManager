#!/bin/bash
# Script to validate Firebase environment variables

echo "=== Firebase Environment Variables Validation ==="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_firebase_admin_sdk() {
    local env_file=$1
    local env_name=$2
    
    echo "Checking FIREBASE_ADMIN_SDK in $env_name..."
    
    if [ ! -f "$env_file" ]; then
        echo -e "${RED}✗ $env_file not found${NC}"
        return 1
    fi
    
    # Extract value (handling quotes and newlines)
    local value=$(grep "^FIREBASE_ADMIN_SDK=" "$env_file" | cut -d'=' -f2- | sed 's/^"//;s/"$//' | sed 's/^'\''//;s/'\''$//' | tr -d '\n' | sed 's/\\n$//')
    
    if [ -z "$value" ]; then
        echo -e "${RED}✗ FIREBASE_ADMIN_SDK not set${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✓ FIREBASE_ADMIN_SDK is set${NC}"
    echo "  Length: $(echo -n "$value" | wc -c) characters"
    
    # Validate JSON
    local project_id=$(echo -n "$value" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('project_id', ''))" 2>/dev/null)
    
    if [ -n "$project_id" ]; then
        echo -e "${GREEN}  ✓ Valid JSON${NC}"
        echo "  Project ID: $project_id"
        return 0
    else
        echo -e "${YELLOW}  ⚠ JSON validation failed - may have formatting issues${NC}"
        echo "  Attempting to fix and re-validate..."
        
        # Try to fix: remove trailing whitespace/newlines
        local fixed_value=$(echo -n "$value" | sed 's/[[:space:]]*$//')
        project_id=$(echo -n "$fixed_value" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('project_id', ''))" 2>/dev/null)
        
        if [ -n "$project_id" ]; then
            echo -e "${GREEN}  ✓ JSON is valid after trimming${NC}"
            echo "  Project ID: $project_id"
            return 0
        else
            echo -e "${RED}  ✗ JSON is still invalid after trimming${NC}"
            return 1
        fi
    fi
}

check_firebase_database_url() {
    local env_file=$1
    local env_name=$2
    
    echo "Checking FIREBASE_DATABASE_URL in $env_name..."
    
    if [ ! -f "$env_file" ]; then
        echo -e "${RED}✗ $env_file not found${NC}"
        return 1
    fi
    
    # Extract value (handling quotes, newlines, and escaped newlines)
    local value=$(grep "^FIREBASE_DATABASE_URL=" "$env_file" | cut -d'=' -f2- | sed 's/^"//;s/"$//' | sed 's/^'\''//;s/'\''$//' | tr -d '\n' | sed 's/\\n$//' | sed 's/[[:space:]]*$//')
    
    if [ -z "$value" ]; then
        echo -e "${RED}✗ FIREBASE_DATABASE_URL not set${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✓ FIREBASE_DATABASE_URL is set${NC}"
    echo "  Value: $value"
    
    # Validate URL format
    if [[ "$value" =~ ^https://.*\.(firebaseio\.com|firebasedatabase\.app)$ ]]; then
        echo -e "${GREEN}  ✓ Valid URL format${NC}"
        return 0
    else
        echo -e "${YELLOW}  ⚠ URL format may be incorrect${NC}"
        echo "  Expected: https://*.firebaseio.com or https://*.firebasedatabase.app"
        return 1
    fi
}

# Check local environment
echo "1. LOCAL ENVIRONMENT (.env.local):"
echo "-----------------------------------"
check_firebase_admin_sdk ".env.local" "local"
echo ""
check_firebase_database_url ".env.local" "local"
echo ""

# Check Vercel environment (if available)
if [ -f ".env.vercel" ]; then
    echo "2. VERCEL ENVIRONMENT (.env.vercel):"
    echo "-----------------------------------"
    check_firebase_admin_sdk ".env.vercel" "Vercel"
    echo ""
    check_firebase_database_url ".env.vercel" "Vercel"
    echo ""
fi

# Check Vercel CLI
echo "3. VERCEL CLI CHECK:"
echo "-----------------------------------"
if command -v vercel &> /dev/null; then
    echo -e "${GREEN}✓ Vercel CLI is installed${NC}"
    echo "Checking Vercel environment variables..."
    vercel env ls 2>&1 | grep -E "FIREBASE_ADMIN_SDK|FIREBASE_DATABASE_URL" | head -6
else
    echo -e "${YELLOW}⚠ Vercel CLI not found${NC}"
fi

echo ""
echo "=== Summary ==="
echo "Both FIREBASE_ADMIN_SDK and FIREBASE_DATABASE_URL should be set in:"
echo "  - Local .env.local file"
echo "  - Vercel (Production, Preview, Development environments)"
echo ""
echo "If JSON validation fails, check for:"
echo "  - Trailing newlines or whitespace"
echo "  - Incorrect escaping of special characters"
echo "  - Missing or extra quotes"








