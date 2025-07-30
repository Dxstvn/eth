import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// Sumsub sandbox configuration
const SUMSUB_APP_TOKEN = process.env.SUMSUB_APP_TOKEN || ''
const SUMSUB_SECRET_KEY = process.env.SUMSUB_SECRET_KEY || ''
const SUMSUB_BASE_URL = 'https://api.sumsub.com'

interface TokenRequest {
  userId: string
  email: string
  fixedInfo?: {
    firstName?: string
    lastName?: string
    dob?: string
    nationality?: string
    country?: string
    phone?: string
  }
  levelName: string
}

// Generate HMAC signature for Sumsub API
function generateSignature(method: string, url: string, timestamp: number, body: string = '') {
  const data = timestamp + method.toUpperCase() + url + body
  return crypto
    .createHmac('sha256', SUMSUB_SECRET_KEY)
    .update(data)
    .digest('hex')
}

export async function POST(request: NextRequest) {
  try {
    // Check if Sumsub credentials are configured
    if (!SUMSUB_APP_TOKEN || !SUMSUB_SECRET_KEY) {
      console.error('Sumsub credentials not configured')
      return NextResponse.json(
        { 
          success: false, 
          error: 'KYC service not configured. Please contact support.' 
        },
        { status: 503 }
      )
    }

    const body: TokenRequest = await request.json()
    const { userId, email, fixedInfo, levelName } = body

    // Validate required fields
    if (!userId || !email || !levelName) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: userId, email, or levelName' 
        },
        { status: 400 }
      )
    }

    // Prepare the request to Sumsub
    const timestamp = Math.floor(Date.now() / 1000)
    const path = `/resources/accessTokens?userId=${encodeURIComponent(userId)}&levelName=${encodeURIComponent(levelName)}&ttlInSecs=600`
    
    // Prepare fixed info if provided
    const requestBody = {
      externalUserId: userId,
      email: email,
      ...(fixedInfo && {
        fixedInfo: {
          ...(fixedInfo.firstName && { firstName: fixedInfo.firstName }),
          ...(fixedInfo.lastName && { lastName: fixedInfo.lastName }),
          ...(fixedInfo.dob && { dob: fixedInfo.dob }),
          ...(fixedInfo.nationality && { nationality: fixedInfo.nationality }),
          ...(fixedInfo.country && { country: fixedInfo.country }),
          ...(fixedInfo.phone && { phone: fixedInfo.phone })
        }
      })
    }

    const bodyString = JSON.stringify(requestBody)
    const signature = generateSignature('POST', path, timestamp, bodyString)

    // Make request to Sumsub
    const response = await fetch(`${SUMSUB_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Token': SUMSUB_APP_TOKEN,
        'X-App-Access-Sig': signature,
        'X-App-Access-Ts': timestamp.toString()
      },
      body: bodyString
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Sumsub API error:', response.status, errorText)
      
      // Parse error message if possible
      let errorMessage = 'Failed to generate verification token'
      try {
        const errorData = JSON.parse(errorText)
        errorMessage = errorData.description || errorData.message || errorMessage
      } catch {
        // Use default error message
      }

      return NextResponse.json(
        { 
          success: false, 
          error: errorMessage 
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    // Return the token
    return NextResponse.json({
      success: true,
      data: {
        token: data.token,
        userId: data.userId
      }
    })

  } catch (error) {
    console.error('Error generating Sumsub token:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error while generating verification token' 
      },
      { status: 500 }
    )
  }
}

// Also support GET for checking endpoint status
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Sumsub token endpoint is available',
    configured: !!(SUMSUB_APP_TOKEN && SUMSUB_SECRET_KEY)
  })
}