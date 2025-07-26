#!/bin/bash

# Script to run all ClearHold agents in separate terminals
# This enables autonomous agent coordination

echo "🤖 ClearHold Autonomous Agent Launcher"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Claude Code is installed
if ! command -v claude &> /dev/null; then
    echo -e "${RED}❌ Claude Code is not installed or not in PATH${NC}"
    echo "Please install Claude Code first:"
    echo "  npm install -g @anthropic/claude-code"
    exit 1
fi

# Function to open new terminal with agent
open_agent_terminal() {
    local agent_name=$1
    local working_dir=$2
    local terminal_title=$3
    local position=$4
    
    echo -e "${BLUE}📂 Starting $terminal_title in $working_dir${NC}"
    
    # For macOS using Terminal.app
    if [[ "$OSTYPE" == "darwin"* ]]; then
        osascript <<EOF
tell application "Terminal"
    set newWindow to do script "cd $working_dir && echo '🤖 $terminal_title' && echo '==================' && echo '' && echo 'Working Directory: $working_dir' && echo 'Agent: $agent_name' && echo '' && echo 'Starting agent...' && claude --agent $agent_name"
    set custom title of front window to "$terminal_title"
end tell
EOF
    # For Linux using gnome-terminal
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        gnome-terminal --title="$terminal_title" -- bash -c "cd $working_dir && echo '🤖 $terminal_title' && echo '==================' && echo '' && echo 'Working Directory: $working_dir' && echo 'Agent: $agent_name' && echo '' && echo 'Starting agent...' && claude --agent $agent_name; exec bash"
    fi
    
    sleep 2  # Give terminal time to open
}

# Display plan
echo -e "${GREEN}📋 Autonomous Agent Execution Plan${NC}"
echo ""
echo "1. Frontend Engineer - Monitor frontend repository"
echo "2. Backend Engineer - Monitor backend repository"
echo "3. Testing Expert - Monitor both repositories"
echo "4. Security Auditor - Monitor both repositories"
echo ""
echo -e "${YELLOW}⚠️  Prerequisites:${NC}"
echo "   - GitHub labels are set up (run setup-agent-labels.sh)"
echo "   - GitHub workflows are pushed to both repos"
echo "   - CROSS_REPO_TOKEN is configured"
echo "   - Agents are configured in .claude/agents/"
echo ""

# Ask for confirmation
read -p "Ready to launch all agents? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo -e "${GREEN}🚀 Launching agents...${NC}"
echo ""

# Launch Frontend Engineer
open_agent_terminal \
    "clearhold-frontend-engineer" \
    "/Users/dustinjasmin/eth-1" \
    "Frontend Engineer Agent" \
    "1"

# Launch Backend Engineer
open_agent_terminal \
    "cryptoescrow-backend-engineer" \
    "/Users/dustinjasmin/personal-cryptoscrow-backend" \
    "Backend Engineer Agent" \
    "2"

# Launch Testing Expert (monitors both repos)
open_agent_terminal \
    "clearhold-testing-expert" \
    "/Users/dustinjasmin/eth-1" \
    "Testing Expert Agent" \
    "3"

# Launch Security Auditor (monitors both repos)
open_agent_terminal \
    "clearhold-security-auditor" \
    "/Users/dustinjasmin/eth-1" \
    "Security Auditor Agent" \
    "4"

echo ""
echo -e "${GREEN}✅ All agents launched!${NC}"
echo ""
echo -e "${BLUE}📊 Monitoring Dashboard:${NC}"
echo "   https://github.com/dustinjasmin/eth-1/issues?q=label:agent-dashboard"
echo ""
echo -e "${YELLOW}💡 Next Steps:${NC}"
echo "1. Each agent is now running in its own terminal"
echo "2. They will monitor GitHub for tasks labeled 'agent-task'"
echo "3. Watch the terminals for agent activity"
echo "4. Check the dashboard for overall status"
echo ""
echo -e "${RED}🛑 To stop agents:${NC}"
echo "   Close each terminal window or press Ctrl+C in each"
echo ""

# Create agent status checker
cat > /tmp/check-agent-status.sh << 'EOF'
#!/bin/bash
echo "🤖 Agent Status Check"
echo "===================="
echo ""
ps aux | grep "claude --agent" | grep -v grep
echo ""
echo "Active agents: $(ps aux | grep "claude --agent" | grep -v grep | wc -l)"
EOF

chmod +x /tmp/check-agent-status.sh

echo -e "${GREEN}💡 TIP:${NC} Run ${BLUE}/tmp/check-agent-status.sh${NC} to check agent status"
echo ""