#!/bin/bash

# Function to update a single file
update_file() {
    local file="$1"
    echo "Updating $file..."
    
    # Add vitest imports if not present
    if ! grep -q "from 'vitest'" "$file"; then
        # Check if it already has jest imports to replace
        if grep -q "^describe\|^it\|^test\|^expect\|^beforeEach\|^afterEach\|^beforeAll\|^afterAll" "$file"; then
            # Add vitest import at the top of the file after React import
            sed -i '' "1a\\
import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest'
" "$file"
        fi
    fi
    
    # Replace jest.mock with vi.mock
    sed -i '' 's/jest\.mock/vi.mock/g' "$file"
    
    # Replace jest.fn with vi.fn
    sed -i '' 's/jest\.fn/vi.fn/g' "$file"
    
    # Replace jest.spyOn with vi.spyOn
    sed -i '' 's/jest\.spyOn/vi.spyOn/g' "$file"
    
    # Replace jest.clearAllMocks with vi.clearAllMocks
    sed -i '' 's/jest\.clearAllMocks/vi.clearAllMocks/g' "$file"
    
    # Replace jest.resetAllMocks with vi.resetAllMocks
    sed -i '' 's/jest\.resetAllMocks/vi.resetAllMocks/g' "$file"
    
    # Replace jest.Mock with any (TypeScript)
    sed -i '' 's/as jest\.Mock/as any/g' "$file"
    
    # Replace jest.Mocked with any
    sed -i '' 's/jest\.Mocked</any/g' "$file"
    
    # Replace jest.useFakeTimers with vi.useFakeTimers
    sed -i '' 's/jest\.useFakeTimers/vi.useFakeTimers/g' "$file"
    
    # Replace jest.useRealTimers with vi.useRealTimers
    sed -i '' 's/jest\.useRealTimers/vi.useRealTimers/g' "$file"
    
    # Replace jest.advanceTimersByTime with vi.advanceTimersByTime
    sed -i '' 's/jest\.advanceTimersByTime/vi.advanceTimersByTime/g' "$file"
    
    # Replace jest.runAllTimers with vi.runAllTimers
    sed -i '' 's/jest\.runAllTimers/vi.runAllTimers/g' "$file"
}

# Find all test files (excluding node_modules and backend)
find . -path "*/node_modules" -prune -o -path "*/backend" -prune -o \
    \( -name "*.test.tsx" -o -name "*.test.ts" \) -type f -print | while read -r file; do
    if grep -q "jest\." "$file" 2>/dev/null; then
        update_file "$file"
    fi
done

echo "Conversion complete!"