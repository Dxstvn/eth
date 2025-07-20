import { NextResponse } from 'next/server';

export async function GET() {
  // Test environment variables
  const envVars = {
    // API Configuration
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'Not set (using default)',
    
    // Firebase Configuration
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '✓ Set' : '✗ Not set',
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? '✓ Set' : '✗ Not set',
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? '✓ Set' : '✗ Not set',
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? '✓ Set' : '✗ Not set',
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? '✓ Set' : '✗ Not set',
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? '✓ Set' : '✗ Not set',
    
    // Other Configuration
    NEXT_PUBLIC_ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT || 'Not set',
    NEXT_PUBLIC_BLOCKCHAIN_NETWORK: process.env.NEXT_PUBLIC_BLOCKCHAIN_NETWORK || 'Not set',
    
    // Vercel-specific
    VERCEL: process.env.VERCEL || 'Not running on Vercel',
    VERCEL_ENV: process.env.VERCEL_ENV || 'Not set',
    VERCEL_URL: process.env.VERCEL_URL || 'Not set',
    NODE_ENV: process.env.NODE_ENV || 'Not set',
  };

  // Check if Firebase is properly configured
  const firebaseConfigured = [
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  ].every(v => !!v);

  return NextResponse.json({
    status: 'Environment Variables Test',
    timestamp: new Date().toISOString(),
    environment: envVars,
    summary: {
      firebaseConfigured,
      apiUrlConfigured: !!process.env.NEXT_PUBLIC_API_URL,
      runningOnVercel: !!process.env.VERCEL,
      totalEnvVars: Object.keys(process.env).length,
    },
    recommendation: firebaseConfigured 
      ? 'All required environment variables are set!' 
      : 'Some required environment variables are missing. Please configure them in Vercel dashboard.',
  });
}