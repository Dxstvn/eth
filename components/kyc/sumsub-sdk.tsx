"use client"

import React, { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/context/auth-context'
import { apiClient } from '@/services/api/client'
import { Loader2 } from 'lucide-react'

declare global {
  interface Window {
    snsWebSdk: any
  }
}

interface SumsubSDKProps {
  onComplete: (success: boolean) => void
  onError: (error: any) => void
}

export function SumsubWebSDK({ onComplete, onError }: SumsubSDKProps) {
  const { user } = useAuth()
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [sdkInstance, setSdkInstance] = useState<any>(null)

  useEffect(() => {
    loadSumsubSDK()
  }, [])

  const loadSumsubSDK = async () => {
    try {
      // Load Sumsub Web SDK script
      if (!window.snsWebSdk) {
        const script = document.createElement('script')
        script.src = 'https://static.sumsub.com/idensic/static/sns-websdk-builder.js'
        script.async = true
        
        await new Promise((resolve, reject) => {
          script.onload = resolve
          script.onerror = reject
          document.body.appendChild(script)
        })
      }

      // Initialize SDK
      await initializeSumsubSDK()
    } catch (error) {
      console.error('Failed to load Sumsub SDK:', error)
      onError(error)
    }
  }

  const fetchAccessToken = async () => {
    try {
      const basicInfo = JSON.parse(sessionStorage.getItem('kycBasicInfo') || '{}')
      
      const response = await apiClient.post('/api/kyc/sumsub-token', {
        userId: user?.uid,
        email: user?.email,
        fixedInfo: {
          firstName: basicInfo.firstName,
          lastName: basicInfo.lastName,
          dob: basicInfo.dateOfBirth,
          nationality: basicInfo.nationality,
          country: basicInfo.country,
          phone: basicInfo.phone
        },
        levelName: 'basic-kyc-aml'
      })
      
      if (response.success && response.data) {
        return response.data.token
      }
      
      throw new Error('Failed to get access token')
    } catch (error) {
      console.error('Token fetch error:', error)
      throw error
    }
  }

  const initializeSumsubSDK = async () => {
    try {
      const accessToken = await fetchAccessToken()
      
      // Initialize Sumsub Web SDK
      const snsWebSdkInstance = window.snsWebSdk
        .init(
          accessToken,
          // Token refresh callback
          async () => {
            try {
              const newToken = await fetchAccessToken()
              return newToken
            } catch (error) {
              console.error('Token refresh failed:', error)
              throw error
            }
          }
        )
        .withConf({
          lang: 'en',
          theme: 'light',
          onMessage: (type: string, payload: any) => {
            console.log('Sumsub message:', type, payload)
          },
          onError: (error: any) => {
            console.error('Sumsub error:', error)
            onError(error)
          },
          uiConf: {
            customCss: getCustomStyles(),
            components: {
              'photo': {
                'video': {
                  'instructions': {
                    'title': 'Take a photo of your document',
                    'text': 'Please ensure all details are clearly visible'
                  }
                }
              },
              'selfie': {
                'video': {
                  'instructions': {
                    'title': 'Take a selfie',
                    'text': 'Please look directly at the camera'
                  }
                }
              }
            }
          }
        })
        .withOptions({ 
          addViewportTag: false, 
          adaptIframeHeight: true 
        })
        .on('applicantLoaded', (event: any) => {
          console.log('Applicant loaded:', event)
          setLoading(false)
        })
        .on('idCheck.stepCompleted', (payload: any) => {
          console.log('Step completed:', payload)
        })
        .on('idCheck.onStepCompleted', (payload: any) => {
          console.log('Step completed:', payload)
        })
        .on('idCheck.onError', (payload: any) => {
          console.error('Verification error:', payload)
          onError(payload)
        })
        .on('idCheck.onReady', () => {
          console.log('SDK ready')
          setLoading(false)
        })
        .on('idCheck.applicantStatus', (payload: any) => {
          console.log('Applicant status:', payload)
          
          // Check if verification is complete
          if (payload.reviewResult) {
            const { reviewAnswer } = payload.reviewResult
            if (reviewAnswer === 'GREEN') {
              onComplete(true)
            } else if (reviewAnswer === 'RED') {
              onComplete(false)
            }
          }
        })
        .on('idCheck.onApplicantSubmitted', () => {
          console.log('Application submitted')
          // Don't call onComplete here - wait for the review result
        })
        .on('idCheck.onApplicantResubmitted', () => {
          console.log('Application resubmitted')
        })
        .on('idCheck.moduleResultPresented', (payload: any) => {
          console.log('Module result:', payload)
        })
        .build()
      
      // Mount to container
      if (containerRef.current) {
        snsWebSdkInstance.launch('#sumsub-websdk-container')
        setSdkInstance(snsWebSdkInstance)
      }
    } catch (error) {
      console.error('SDK initialization error:', error)
      setLoading(false)
      onError(error)
    }
  }

  const getCustomStyles = () => {
    return `
      /* Custom styles for Sumsub SDK */
      .sumsub-container {
        font-family: inherit;
      }
      
      /* Customize primary color to match ClearHold brand */
      .sns-button-primary {
        background-color: #134e4a !important;
        border-color: #134e4a !important;
      }
      
      .sns-button-primary:hover {
        background-color: #0f3e3a !important;
        border-color: #0f3e3a !important;
      }
      
      .sns-link {
        color: #134e4a !important;
      }
      
      .sns-checkbox:checked {
        background-color: #134e4a !important;
        border-color: #134e4a !important;
      }
      
      /* Improve mobile experience */
      @media (max-width: 768px) {
        .sns-modal {
          padding: 1rem !important;
        }
        
        .sns-camera-screen {
          padding: 1rem !important;
        }
      }
      
      /* Better loading states */
      .sns-loader {
        color: #134e4a !important;
      }
      
      /* Style adjustments for better integration */
      .sns-layout {
        background-color: transparent !important;
      }
      
      .sns-step-item.active {
        color: #134e4a !important;
      }
      
      .sns-step-item.active::before {
        background-color: #134e4a !important;
      }
    `
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sdkInstance && typeof sdkInstance.destroy === 'function') {
        sdkInstance.destroy()
      }
    }
  }, [sdkInstance])

  return (
    <div className="relative min-h-[600px]">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
            <p className="text-sm text-gray-600">Loading verification module...</p>
          </div>
        </div>
      )}
      
      <div 
        id="sumsub-websdk-container" 
        ref={containerRef}
        className="w-full min-h-[600px]"
      />
    </div>
  )
}