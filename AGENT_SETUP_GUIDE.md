# Agent Coordination Setup Guide

This guide will help you set up the automated agent coordination system for the ClearHold project.

## Prerequisites

- GitHub CLI (`gh`) installed and authenticated
- Admin access to both repositories
- Claude Code with all 4 agents configured

## Initial Setup Steps

### 1. Create GitHub Labels

Run the setup script to create all required labels:

```bash
cd /Users/dustinjasmin/eth-1
./scripts/setup-agent-labels.sh
```

### 2. Create GitHub Personal Access Token (PAT)

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Name it: `ClearHold Agent Coordination`
4. Select scopes:
   - `repo` (Full control of private repositories)
   - `workflow` (Update GitHub Action workflows)
5. Generate and copy the token

### 3. Add Repository Secrets

Add the PAT to both repositories:

#### Frontend Repository:
```bash
gh secret set CROSS_REPO_TOKEN --repo dustinjasmin/eth-1
# Paste your PAT when prompted
```

#### Backend Repository:
```bash
gh secret set CROSS_REPO_TOKEN --repo dustinjasmin/personal-cryptoscrow-backend
# Paste your PAT when prompted
```

### 4. Enable Repository Dispatch

For cross-repository communication, ensure both repositories have Actions enabled:

1. Go to Settings → Actions → General
2. Under "Actions permissions", select "Allow all actions and reusable workflows"
3. Under "Workflow permissions", select "Read and write permissions"

### 5. Update Workflow Files (if needed)

The workflows reference the cross-repo token. Update these lines if you used a different secret name:

```yaml
github-token: ${{ secrets.CROSS_REPO_TOKEN }}
```

### 6. Test the Setup

#### Test Label Creation:
```bash
# List labels to verify they were created
gh label list --repo dustinjasmin/eth-1
gh label list --repo dustinjasmin/personal-cryptoscrow-backend
```

#### Test Workflow Trigger:
```bash
# Manually trigger the dashboard workflow
gh workflow run agent-monitoring-dashboard.yml --repo dustinjasmin/eth-1
```

#### Test Cross-Repository Communication:
```bash
# Trigger a repository dispatch event
gh api repos/dustinjasmin/eth-1/dispatches \
  --method POST \
  -H "Accept: application/vnd.github+json" \
  -f "event_type=backend-api-changes" \
  -f 'client_payload[backend_issue]=1' \
  -f 'client_payload[changed_endpoints]=["auth/login","wallet/register"]'
```

## Viewing the Agent Dashboard

### First Time:
1. Wait for the dashboard workflow to run (or trigger manually)
2. Go to Issues tab in the frontend repository
3. Look for "📊 Agent Activity Dashboard" issue

### Direct Links:
- Dashboard: `https://github.com/dustinjasmin/eth-1/issues?q=label:agent-dashboard`
- All Agent Tasks: `https://github.com/dustinjasmin/eth-1/issues?q=label:agent-task`
- Frontend Tasks: `https://github.com/dustinjasmin/eth-1/issues?q=label:frontend+label:agent-task`

### Dashboard Features:
- **Metrics**: Task counts, completion rates, resolution times
- **Agent Status**: Shows if each agent is active or idle
- **Performance Indicators**: Visual charts and health checks
- **Quick Links**: Direct access to filtered task views

## How Agents Work Together

### Example Flow:

1. **You start with one agent:**
   ```
   "Frontend engineer, please create a new dashboard component"
   ```

2. **Frontend agent commits:**
   ```bash
   git commit -m "[FRONTEND] Create dashboard component"
   ```

3. **Automation triggers:**
   - Workflow detects frontend changes
   - Creates backend task if API needed
   - Creates testing task automatically

4. **Other agents respond:**
   - Backend engineer sees the task
   - Implements required endpoints
   - Testing expert writes tests
   - Security auditor reviews if needed

5. **Progress tracking:**
   - Check the dashboard issue for metrics
   - Monitor individual task issues
   - View workflow runs in Actions tab

## Troubleshooting

### Workflows Not Triggering:
- Check if Actions are enabled in repository settings
- Verify the PAT has correct permissions
- Check workflow syntax with `gh workflow list`

### Labels Not Created:
- Ensure you have admin access to repositories
- Run `gh auth status` to check authentication
- Manually create missing labels via GitHub UI

### Cross-Repo Communication Failing:
- Verify the CROSS_REPO_TOKEN secret exists
- Check PAT expiration date
- Test with a simple repository dispatch event

### Dashboard Not Updating:
- Check if the workflow is running: `gh run list --workflow=agent-monitoring-dashboard.yml`
- Look for errors in workflow logs
- Manually trigger: `gh workflow run agent-monitoring-dashboard.yml`

## Next Steps

1. Make a test commit with an agent prefix to trigger workflows
2. Monitor the Actions tab for workflow runs
3. Check Issues for created tasks
4. View the Agent Dashboard for overall status

## Agent Commit Prefixes

Agents should use these prefixes for automatic detection:
- `[FRONTEND]` - Frontend engineer
- `[BACKEND]` - Backend engineer
- `[TEST]` - Testing expert
- `[SECURITY]` - Security auditor

## Support

For issues with:
- **Workflows**: Check `.github/workflows/` files
- **Agents**: Review `.claude/agents/` configurations
- **GitHub**: Consult GitHub Actions documentation