# Agent Task Template

When creating issues for agents, use this format:

## Title Format
`[AGENT-TYPE] Brief description`

Examples:
- `[FRONTEND-AGENT] Integrate new authentication flow`
- `[BACKEND-AGENT] Optimize database queries`
- `[TEST-AGENT] Add E2E tests for payment flow`
- `[SECURITY-AGENT] Audit new API endpoints`

## Issue Body Format

```markdown
## Context
Brief description of what changed or what needs to be done

## Files Affected
- file1.ts
- file2.tsx

## Priority
- [ ] Critical (security/breaking)
- [ ] High (functionality)
- [ ] Medium (enhancement)
- [ ] Low (cleanup)

## Agent Instructions
Specific tasks for the agent to complete

## Success Criteria
- [ ] Task 1 completed
- [ ] Task 2 completed
- [ ] Tests pass
- [ ] No security issues

## Related PRs/Issues
- #123
- #456
```

## Labels to Use
- `agent-task` - All agent tasks
- `frontend` - Frontend agent
- `backend` - Backend agent  
- `testing` - Testing agent
- `security` - Security agent
- `priority-high` - Urgent tasks
- `blocked` - Agent is blocked