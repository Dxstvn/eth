import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// Sumsub sandbox configuration
const SUMSUB_APP_TOKEN = process.env.SUMSUB_APP_TOKEN || ''
const SUMSUB_SECRET_KEY = process.env.SUMSUB_SECRET_KEY || ''
const SUMSUB_BASE_URL = 'https://api.sumsub.com'

// Generate HMAC signature for Sumsub API
function generateSignature(method: string, url: string, timestamp: number) {
  const data = timestamp + method.toUpperCase() + url
  return crypto
    .createHmac('sha256', SUMSUB_SECRET_KEY)
    .update(data)
    .digest('hex')
}

export async function GET(request: NextRequest) {
  try {
    // Check if Sumsub credentials are configured
    if (!SUMSUB_APP_TOKEN || !SUMSUB_SECRET_KEY) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'KYC service not configured' 
        },
        { status: 503 }
      )
    }

    // Get userId from query params or headers
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    
    if (!userId) {
      // For demo purposes, return a mock status
      // In production, this should require authentication and get userId from session
      return NextResponse.json({
        success: true,
        data: {
          status: 'pending',
          reviewResult: null,
          reviewAnswer: null,
          rejectLabels: [],
          reviewRejectType: null
        }
      })
    }

    // Prepare the request to Sumsub
    const timestamp = Math.floor(Date.now() / 1000)
    const path = `/resources/applicants/-/externalUserId/${encodeURIComponent(userId)}`
    const signature = generateSignature('GET', path, timestamp)

    // Make request to Sumsub to get applicant status
    const response = await fetch(`${SUMSUB_BASE_URL}${path}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-App-Token': SUMSUB_APP_TOKEN,
        'X-App-Access-Sig': signature,
        'X-App-Access-Ts': timestamp.toString()
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Sumsub API error:', response.status, errorText)
      
      // If applicant not found, they haven't started yet
      if (response.status === 404) {
        return NextResponse.json({
          success: true,
          data: {
            status: 'not_started',
            reviewResult: null
          }
        })
      }

      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to get verification status' 
        },
        { status: response.status }
      )
    }

    const applicantData = await response.json()
    
    // Extract relevant status information
    const reviewResult = applicantData.review?.reviewResult
    const reviewAnswer = reviewResult?.reviewAnswer || null
    
    // Map Sumsub status to our status
    let status = 'pending'
    if (reviewAnswer === 'GREEN') {
      status = 'approved'
    } else if (reviewAnswer === 'RED') {
      status = 'rejected'
    } else if (applicantData.review?.reviewStatus === 'pending') {
      status = 'under_review'
    } else if (applicantData.inspectionId) {
      status = 'in_progress'
    }

    return NextResponse.json({
      success: true,
      data: {
        status,
        reviewResult: reviewAnswer,
        reviewAnswer,
        rejectLabels: reviewResult?.rejectLabels || [],
        reviewRejectType: reviewResult?.reviewRejectType || null,
        applicantId: applicantData.id,
        inspectionId: applicantData.inspectionId,
        createdAt: applicantData.createdAt,
        reviewCompletedAt: reviewResult?.completedAt || null
      }
    })

  } catch (error) {
    console.error('Error checking KYC status:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error while checking status' 
      },
      { status: 500 }
    )
  }
}