#!/bin/bash

# Quick test script to verify agent functionality

echo "🧪 Testing Claude Code Agent"
echo "==========================="
echo ""
echo "This will test the frontend agent in the current terminal."
echo ""

# Test if claude command works
if command -v claude &> /dev/null; then
    echo "✅ Claude command found at: $(which claude)"
else
    echo "❌ Claude command not found"
    echo "Install with: npm install -g @anthropic/claude-code"
    exit 1
fi

echo ""
echo "Starting frontend agent..."
echo "Press Ctrl+C to stop"
echo ""

# Run the agent
cd /Users/dustinjasmin/eth-1
claude --agent clearhold-frontend-engineer