#!/bin/bash

# Script to run Claude with agent context

AGENT=$1
WORKING_DIR=$2

if [ -z "$AGENT" ]; then
    echo "Usage: $0 <agent-name> [working-directory]"
    echo ""
    echo "Available agents:"
    echo "  - clearhold-frontend-engineer"
    echo "  - cryptoescrow-backend-engineer"
    echo "  - clearhold-testing-expert"
    echo "  - clearhold-security-auditor"
    exit 1
fi

if [ -z "$WORKING_DIR" ]; then
    WORKING_DIR="."
fi

AGENT_FILE="/Users/dustinjasmin/eth-1/.claude/agents/${AGENT}.md"

if [ ! -f "$AGENT_FILE" ]; then
    echo "Error: Agent file not found: $AGENT_FILE"
    exit 1
fi

echo "🤖 Starting $AGENT"
echo "📁 Working directory: $WORKING_DIR"
echo ""
echo "Agent context loaded from: $AGENT_FILE"
echo ""
echo "Instructions:"
echo "1. This agent will monitor GitHub for tasks"
echo "2. Make commits with appropriate prefixes"
echo "3. Coordinate with other agents via GitHub"
echo ""

cd "$WORKING_DIR"

# Start Claude with the agent context as initial prompt
claude --add-dir /Users/dustinjasmin/eth-1 --add-dir /Users/dustinjasmin/personal-cryptoscrow-backend