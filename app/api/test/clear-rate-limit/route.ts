import { NextResponse } from 'next/server'

// This is a test endpoint to clear rate limits during E2E testing
// DO NOT USE IN PRODUCTION
export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  // Clear the rate limit map by restarting the process
  // Note: This only works if we have access to the global scope
  // In Next.js middleware, we can't directly access the Map from here
  
  return NextResponse.json({ 
    message: 'Rate limit clearing not directly available. Please restart the dev server to clear rate limits.',
    recommendation: 'Run: pkill -f "next dev" && npm run dev'
  })
}