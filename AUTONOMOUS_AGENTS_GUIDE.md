# Running Autonomous Agents Locally

This guide explains how to run all ClearHold agents locally for truly autonomous operation.

## Quick Start

### 1. One-Command Launch (Recommended)
```bash
cd /Users/dustinjasmin/eth-1
./scripts/run-all-agents.sh
```

This script will:
- Open 4 new terminal windows
- Start each agent in the correct directory
- Display status and monitoring information

### 2. Manual Launch (Alternative)

If you prefer to launch agents manually:

#### Terminal 1: Frontend Engineer
```bash
cd /Users/dustinjasmin/eth-1
claude-code --agent clearhold-frontend-engineer
```

#### Terminal 2: Backend Engineer
```bash
cd /Users/dustinjasmin/personal-cryptoscrow-backend
claude-code --agent cryptoescrow-backend-engineer
```

#### Terminal 3: Testing Expert
```bash
cd /Users/dustinjasmin/eth-1
claude-code --agent clearhold-testing-expert
```

#### Terminal 4: Security Auditor
```bash
cd /Users/dustinjasmin/eth-1
claude-code --agent clearhold-security-auditor
```

## Terminal Organization Tips

### macOS Terminal.app
1. **Arrange Windows**: 
   - Drag terminals to corners for 2x2 grid
   - Use Mission Control to see all at once

2. **Color Code Terminals**:
   - Terminal → Preferences → Profiles
   - Frontend: Blue background
   - Backend: Green background
   - Testing: Yellow background
   - Security: Red background

3. **Name Windows**:
   - Each window auto-named by the script
   - Shows agent type in title bar

### iTerm2 (Recommended for macOS)
```bash
# Install iTerm2 if not already installed
brew install --cask iterm2
```

1. **Split Panes**:
   - Cmd+D: Split vertically
   - Cmd+Shift+D: Split horizontally
   - Create 2x2 grid for all agents

2. **Broadcast Input** (for simultaneous commands):
   - Cmd+Shift+I: Toggle broadcast to all panes

### tmux (Advanced - Works on any system)
```bash
# Create tmux session with all agents
tmux new-session -d -s agents

# Create panes
tmux split-window -h
tmux split-window -v
tmux select-pane -t 0
tmux split-window -v

# Start agents in each pane
tmux send-keys -t 0 'cd /Users/dustinjasmin/eth-1 && claude-code --agent clearhold-frontend-engineer' Enter
tmux send-keys -t 1 'cd /Users/dustinjasmin/personal-cryptoscrow-backend && claude-code --agent cryptoescrow-backend-engineer' Enter
tmux send-keys -t 2 'cd /Users/dustinjasmin/eth-1 && claude-code --agent clearhold-testing-expert' Enter
tmux send-keys -t 3 'cd /Users/dustinjasmin/eth-1 && claude-code --agent clearhold-security-auditor' Enter

# Attach to session
tmux attach-session -t agents
```

## Monitoring Agent Activity

### 1. Check Running Agents
```bash
# See all running agents
ps aux | grep "claude-code --agent" | grep -v grep

# Count active agents
ps aux | grep "claude-code --agent" | grep -v grep | wc -l
```

### 2. View Agent Logs
Each terminal shows real-time agent activity:
- Task reception
- Code changes
- Git operations
- Cross-agent communication

### 3. GitHub Dashboard
Monitor overall system status:
```bash
open https://github.com/dustinjasmin/eth-1/issues?q=label:agent-dashboard
```

### 4. Watch for Activity
```bash
# Watch for new commits from agents
watch -n 30 'git log --oneline -10 --grep="\[FRONTEND\]\|\[BACKEND\]\|\[TEST\]\|\[SECURITY\]"'
```

## Autonomous Operation Flow

1. **Initial Trigger**:
   - You push code or create an issue
   - GitHub Actions detect changes
   - Tasks created with `agent-task` label

2. **Agent Response**:
   - Agents poll GitHub for new tasks
   - Pick up tasks matching their expertise
   - Start working autonomously

3. **Cross-Agent Communication**:
   - Frontend agent commits with `[FRONTEND]`
   - Triggers backend task creation
   - Backend agent sees task, implements
   - Testing agent runs tests
   - Security reviews if needed

4. **Continuous Loop**:
   - Agents keep monitoring
   - Respond to new tasks
   - Coordinate through commits
   - Update dashboard

## Power User Tips

### 1. Keep Agents Running 24/7
```bash
# Use caffeinate on macOS to prevent sleep
caffeinate -s ./scripts/run-all-agents.sh
```

### 2. Auto-Restart on Failure
Create `~/Library/LaunchAgents/com.clearhold.agents.plist`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.clearhold.agents</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Users/dustinjasmin/eth-1/scripts/run-all-agents.sh</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

### 3. Resource Monitoring
```bash
# Monitor CPU/Memory usage
top -pid $(pgrep -f "claude-code --agent" | tr '\n' ',' | sed 's/,$//')
```

### 4. Quick Agent Control
```bash
# Stop all agents
pkill -f "claude-code --agent"

# Restart specific agent
pkill -f "clearhold-frontend-engineer" && claude-code --agent clearhold-frontend-engineer
```

## Troubleshooting

### Agents Not Responding to Tasks
1. Check GitHub authentication: `gh auth status`
2. Verify labels exist: `gh label list`
3. Check agent logs in terminal
4. Ensure workflows are active

### High Resource Usage
1. Limit concurrent operations
2. Add delays between operations
3. Use nice/renice for priority

### Agents Stopping Unexpectedly
1. Check error messages in terminal
2. Verify GitHub token hasn't expired
3. Check network connectivity
4. Review agent configuration

## Security Considerations

1. **Never leave terminals unlocked** when agents are running
2. **Use separate GitHub tokens** for each agent (optional)
3. **Monitor commits** for unexpected changes
4. **Set up alerts** for critical operations

## Next Steps

1. Run the launch script
2. Test with a simple task
3. Monitor the dashboard
4. Watch agents collaborate
5. Enjoy autonomous development!

Remember: The agents will work together to complete tasks, but always review their work before deploying to production!