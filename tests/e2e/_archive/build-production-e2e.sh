#!/bin/bash

echo "🏗️  Building production version for E2E testing with ngrok backend..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if ngrok URL is provided as argument
NGROK_URL="${1:-https://1f2561dafffa.ngrok-free.app}"

echo "📡 Using ngrok URL: $NGROK_URL"

# Update the .env.production.e2e file with the current ngrok URL
if [ -f ".env.production.e2e" ]; then
    # Use sed to update the URL
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=$NGROK_URL|" .env.production.e2e
    else
        # Linux
        sed -i "s|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=$NGROK_URL|" .env.production.e2e
    fi
    echo -e "${GREEN}✅ Updated ngrok URL in .env.production.e2e${NC}"
else
    echo -e "${RED}❌ .env.production.e2e file not found${NC}"
    exit 1
fi

# Build with production E2E environment
echo "🔨 Building production version..."
NODE_ENV=production dotenv -e .env.production.e2e -- next build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Production build complete!${NC}"
    echo ""
    echo "You can now run E2E tests with:"
    echo "  npm run test:e2e:prod"
    echo ""
    echo "Or start the production server manually:"
    echo "  dotenv -e .env.production.e2e -- npm run start"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi