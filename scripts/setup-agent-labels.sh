#!/bin/bash

# Setup script for Agent Coordination GitHub Labels
# This script creates all required labels for both repositories

echo "🏷️  Setting up GitHub labels for Agent Coordination..."

# Colors for labels
COLOR_AGENT="0052CC"      # Blue
COLOR_FRONTEND="FBCA04"   # Yellow
COLOR_BACKEND="1D76DB"    # Light Blue
COLOR_TESTING="F9D0C4"    # Light Pink
COLOR_SECURITY="D73A4A"   # Red
COLOR_PRIORITY_HIGH="B60205"  # Dark Red
COLOR_PRIORITY_MEDIUM="FF9F1C" # Orange
COLOR_PRIORITY_LOW="0E8A16"    # Green
COLOR_SYNC="6F42C1"       # Purple
COLOR_DASHBOARD="2EA44F"  # Green

# Function to create label
create_label() {
    local repo=$1
    local name=$2
    local color=$3
    local description=$4
    
    echo "Creating label '$name' in $repo..."
    gh label create "$name" --repo "$repo" --color "$color" --description "$description" --force
}

# Get repository information
FRONTEND_REPO="Dxstvn/eth"
BACKEND_REPO="Dxstvn/python-cryptoscrow-backend"

echo "Frontend repo: $FRONTEND_REPO"
echo "Backend repo: $BACKEND_REPO"

# Create labels for frontend repository
echo ""
echo "📁 Creating labels for frontend repository..."
create_label "$FRONTEND_REPO" "agent-task" "$COLOR_AGENT" "Task assigned to an agent"
create_label "$FRONTEND_REPO" "frontend" "$COLOR_FRONTEND" "Frontend development task"
create_label "$FRONTEND_REPO" "backend" "$COLOR_BACKEND" "Backend development task"
create_label "$FRONTEND_REPO" "testing" "$COLOR_TESTING" "Testing and QA task"
create_label "$FRONTEND_REPO" "security" "$COLOR_SECURITY" "Security review required"
create_label "$FRONTEND_REPO" "priority-critical" "$COLOR_PRIORITY_HIGH" "Critical priority - immediate action"
create_label "$FRONTEND_REPO" "priority-high" "$COLOR_PRIORITY_HIGH" "High priority task"
create_label "$FRONTEND_REPO" "priority-medium" "$COLOR_PRIORITY_MEDIUM" "Medium priority task"
create_label "$FRONTEND_REPO" "priority-low" "$COLOR_PRIORITY_LOW" "Low priority task"
create_label "$FRONTEND_REPO" "cross-repo" "$COLOR_SYNC" "Requires cross-repository coordination"
create_label "$FRONTEND_REPO" "backend-sync" "$COLOR_SYNC" "Synced from backend repository"
create_label "$FRONTEND_REPO" "agent-dashboard" "$COLOR_DASHBOARD" "Agent monitoring dashboard"
create_label "$FRONTEND_REPO" "pinned" "$COLOR_DASHBOARD" "Pinned issue"

# Create labels for backend repository
echo ""
echo "📁 Creating labels for backend repository..."
create_label "$BACKEND_REPO" "agent-task" "$COLOR_AGENT" "Task assigned to an agent"
create_label "$BACKEND_REPO" "frontend" "$COLOR_FRONTEND" "Frontend development task"
create_label "$BACKEND_REPO" "backend" "$COLOR_BACKEND" "Backend development task"
create_label "$BACKEND_REPO" "testing" "$COLOR_TESTING" "Testing and QA task"
create_label "$BACKEND_REPO" "security" "$COLOR_SECURITY" "Security review required"
create_label "$BACKEND_REPO" "blockchain" "$COLOR_BACKEND" "Blockchain/smart contract related"
create_label "$BACKEND_REPO" "api" "$COLOR_BACKEND" "API endpoint changes"
create_label "$BACKEND_REPO" "database" "$COLOR_BACKEND" "Database schema or query changes"
create_label "$BACKEND_REPO" "performance" "$COLOR_TESTING" "Performance optimization needed"
create_label "$BACKEND_REPO" "priority-critical" "$COLOR_PRIORITY_HIGH" "Critical priority - immediate action"
create_label "$BACKEND_REPO" "priority-high" "$COLOR_PRIORITY_HIGH" "High priority task"
create_label "$BACKEND_REPO" "priority-medium" "$COLOR_PRIORITY_MEDIUM" "Medium priority task"
create_label "$BACKEND_REPO" "cross-repo" "$COLOR_SYNC" "Requires cross-repository coordination"
create_label "$BACKEND_REPO" "frontend-request" "$COLOR_SYNC" "Request from frontend repository"
create_label "$BACKEND_REPO" "deployment" "$COLOR_DASHBOARD" "Deployment coordination"
create_label "$BACKEND_REPO" "integration" "$COLOR_TESTING" "Integration testing required"

echo ""
echo "✅ Label setup complete!"
echo ""
echo "Next steps:"
echo "1. Create a GitHub Personal Access Token (PAT) with repo scope"
echo "2. Add the PAT as a secret in both repositories"
echo "3. Test the workflows"