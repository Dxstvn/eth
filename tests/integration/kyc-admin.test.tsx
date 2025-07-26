import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import { KYCApplicationDetail } from '@/components/kyc/admin/KYCApplicationDetail'
import { KYCQueueManager } from '@/components/kyc/admin/KYCQueueManager'
import { KYCAnalytics } from '@/components/kyc/admin/KYCAnalytics'
import { KYCAdminControls } from '@/components/kyc/admin/KYCAdminControls'
import { KYCProvider } from '@/context/kyc-context'
import { kycAuditLogger, KYCActionType } from '@/lib/services/kyc-audit-logger'

// Mock KYC applications data
const mockApplications = [
  {
    id: 'kyc-001',
    userId: 'user-001',
    personalInfo: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      dateOfBirth: '1990-01-01',
      nationality: 'US'
    },
    documentInfo: {
      idType: 'passport',
      idNumber: 'P12345678',
      idExpiryDate: '2025-12-31'
    },
    riskAssessment: {
      sourceOfFunds: ['employment'],
      expectedMonthlyVolume: '1000-5000',
      isPEP: false,
      hasSanctions: false
    },
    status: 'under_review',
    submittedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    riskScore: 'low',
    verificationId: 'ver-001'
  },
  {
    id: 'kyc-002',
    userId: 'user-002',
    personalInfo: {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      dateOfBirth: '1985-06-15',
      nationality: 'UK'
    },
    documentInfo: {
      idType: 'drivers_license',
      idNumber: 'DL987654',
      idExpiryDate: '2024-08-20'
    },
    riskAssessment: {
      sourceOfFunds: ['business', 'investment'],
      expectedMonthlyVolume: '10000-50000',
      isPEP: true,
      hasSanctions: false,
      pepDetails: 'Local government official'
    },
    status: 'under_review',
    submittedAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    riskScore: 'high',
    verificationId: 'ver-002'
  },
  {
    id: 'kyc-003',
    userId: 'user-003',
    personalInfo: {
      firstName: 'Robert',
      lastName: 'Johnson',
      email: 'robert.j@example.com',
      dateOfBirth: '1992-03-20',
      nationality: 'CA'
    },
    documentInfo: {
      idType: 'national_id',
      idNumber: 'NI456789',
      idExpiryDate: '2026-05-15'
    },
    riskAssessment: {
      sourceOfFunds: ['employment'],
      expectedMonthlyVolume: '500-1000',
      isPEP: false,
      hasSanctions: false
    },
    status: 'additional_info_required',
    submittedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    riskScore: 'medium',
    verificationId: 'ver-003',
    additionalInfoRequested: ['proof_of_address', 'employment_verification']
  }
]

// Setup MSW server
const server = setupServer(
  rest.get('/api/kyc/applications', (req, res, ctx) => {
    const status = req.url.searchParams.get('status')
    const page = parseInt(req.url.searchParams.get('page') || '1')
    const limit = parseInt(req.url.searchParams.get('limit') || '10')
    
    let filtered = mockApplications
    if (status) {
      filtered = mockApplications.filter(app => app.status === status)
    }
    
    const start = (page - 1) * limit
    const paginatedApps = filtered.slice(start, start + limit)
    
    return res(
      ctx.json({
        applications: paginatedApps,
        total: filtered.length,
        page,
        totalPages: Math.ceil(filtered.length / limit)
      })
    )
  }),
  rest.get('/api/kyc/applications/:id', (req, res, ctx) => {
    const app = mockApplications.find(a => a.id === req.params.id)
    if (!app) {
      return res(ctx.status(404), ctx.json({ error: 'Application not found' }))
    }
    return res(ctx.json(app))
  }),
  rest.put('/api/kyc/applications/:id/status', (req, res, ctx) => {
    const app = mockApplications.find(a => a.id === req.params.id)
    if (!app) {
      return res(ctx.status(404), ctx.json({ error: 'Application not found' }))
    }
    return res(ctx.json({ ...app, status: req.body as string }))
  }),
  rest.post('/api/kyc/applications/bulk-action', (req, res, ctx) => {
    return res(ctx.json({ success: true, processed: (req.body as any).applicationIds.length }))
  }),
  rest.get('/api/kyc/analytics', (req, res, ctx) => {
    return res(
      ctx.json({
        totalApplications: 150,
        pendingReview: 12,
        approved: 120,
        rejected: 8,
        additionalInfoRequired: 10,
        averageProcessingTime: 3600000, // 1 hour in ms
        riskDistribution: {
          low: 100,
          medium: 40,
          high: 10
        },
        dailyStats: Array.from({ length: 7 }, (_, i) => ({
          date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
          submitted: Math.floor(Math.random() * 20) + 5,
          approved: Math.floor(Math.random() * 15) + 3,
          rejected: Math.floor(Math.random() * 3)
        }))
      })
    )
  }),
  rest.post('/api/kyc/export', (req, res, ctx) => {
    return res(
      ctx.set('Content-Type', 'text/csv'),
      ctx.set('Content-Disposition', 'attachment; filename="kyc-export.csv"'),
      ctx.body('id,name,status,risk_score\nkyc-001,John Doe,under_review,low\n')
    )
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// Admin wrapper component
function AdminTestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <KYCProvider>
      {children}
    </KYCProvider>
  )
}

describe('KYC Admin Workflow Integration Tests', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
  })

  describe('Application Review Workflow', () => {
    it('should display list of pending KYC applications', async () => {
      render(
        <AdminTestWrapper>
          <KYCQueueManager />
        </AdminTestWrapper>
      )

      // Wait for applications to load
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
        expect(screen.getByText('Robert Johnson')).toBeInTheDocument()
      })

      // Check status badges
      expect(screen.getAllByText('Under Review')).toHaveLength(2)
      expect(screen.getByText('Additional Info Required')).toBeInTheDocument()
    })

    it('should filter applications by status', async () => {
      render(
        <AdminTestWrapper>
          <KYCQueueManager />
        </AdminTestWrapper>
      )

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Filter by status
      const statusFilter = screen.getByLabelText(/filter by status/i)
      await user.selectOptions(statusFilter, 'under_review')

      // Should only show under_review applications
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
        expect(screen.queryByText('Robert Johnson')).not.toBeInTheDocument()
      })
    })

    it('should sort applications by submission date', async () => {
      render(
        <AdminTestWrapper>
          <KYCQueueManager />
        </AdminTestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Click sort by date
      const sortButton = screen.getByRole('button', { name: /sort by date/i })
      await user.click(sortButton)

      // Check order - newest first
      const applicationCards = screen.getAllByTestId(/application-card/i)
      const firstCard = within(applicationCards[0])
      expect(firstCard.getByText('John Doe')).toBeInTheDocument() // Most recent
    })

    it('should open detailed view when clicking on application', async () => {
      render(
        <AdminTestWrapper>
          <KYCQueueManager />
          <KYCApplicationDetail applicationId="kyc-001" />
        </AdminTestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Click on application
      const viewButton = screen.getAllByRole('button', { name: /view details/i })[0]
      await user.click(viewButton)

      // Should show detailed information
      await waitFor(() => {
        expect(screen.getByText(/personal information/i)).toBeInTheDocument()
        expect(screen.getByText('john.doe@example.com')).toBeInTheDocument()
        expect(screen.getByText('P12345678')).toBeInTheDocument()
      })
    })

    it('should allow admin to approve application', async () => {
      const logSpy = vi.spyOn(kycAuditLogger, 'log')
      
      render(
        <AdminTestWrapper>
          <KYCApplicationDetail applicationId="kyc-001" />
        </AdminTestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/john doe/i)).toBeInTheDocument()
      })

      // Click approve button
      const approveButton = screen.getByRole('button', { name: /approve/i })
      await user.click(approveButton)

      // Confirm action
      const confirmButton = screen.getByRole('button', { name: /confirm approval/i })
      await user.click(confirmButton)

      // Check audit log
      await waitFor(() => {
        expect(logSpy).toHaveBeenCalledWith(
          KYCActionType.KYC_APPROVED,
          expect.objectContaining({
            kycId: 'kyc-001'
          }),
          expect.any(Object)
        )
      })
    })

    it('should allow admin to reject application with reason', async () => {
      render(
        <AdminTestWrapper>
          <KYCApplicationDetail applicationId="kyc-001" />
        </AdminTestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/john doe/i)).toBeInTheDocument()
      })

      // Click reject button
      const rejectButton = screen.getByRole('button', { name: /reject/i })
      await user.click(rejectButton)

      // Enter rejection reason
      const reasonTextarea = screen.getByLabelText(/rejection reason/i)
      await user.type(reasonTextarea, 'Document appears to be fraudulent')

      // Confirm rejection
      const confirmButton = screen.getByRole('button', { name: /confirm rejection/i })
      await user.click(confirmButton)

      // Should update status
      await waitFor(() => {
        expect(screen.getByText(/rejected/i)).toBeInTheDocument()
      })
    })

    it('should request additional information', async () => {
      render(
        <AdminTestWrapper>
          <KYCApplicationDetail applicationId="kyc-001" />
        </AdminTestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/john doe/i)).toBeInTheDocument()
      })

      // Click request info button
      const requestInfoButton = screen.getByRole('button', { name: /request.*info/i })
      await user.click(requestInfoButton)

      // Select required documents
      const addressProofCheckbox = screen.getByLabelText(/proof of address/i)
      const bankStatementCheckbox = screen.getByLabelText(/bank statement/i)
      
      await user.click(addressProofCheckbox)
      await user.click(bankStatementCheckbox)

      // Add custom message
      const messageTextarea = screen.getByLabelText(/additional message/i)
      await user.type(messageTextarea, 'Please provide documents from the last 3 months')

      // Submit request
      const submitButton = screen.getByRole('button', { name: /send request/i })
      await user.click(submitButton)

      // Should update status
      await waitFor(() => {
        expect(screen.getByText(/additional.*info.*required/i)).toBeInTheDocument()
      })
    })
  })

  describe('Bulk Operations', () => {
    it('should select multiple applications for bulk action', async () => {
      render(
        <AdminTestWrapper>
          <KYCQueueManager />
        </AdminTestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Select multiple applications
      const checkboxes = screen.getAllByRole('checkbox', { name: /select application/i })
      await user.click(checkboxes[0]) // John Doe
      await user.click(checkboxes[1]) // Jane Smith

      // Should show bulk action buttons
      expect(screen.getByText(/2 selected/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /bulk approve/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /bulk reject/i })).toBeInTheDocument()
    })

    it('should perform bulk approval', async () => {
      render(
        <AdminTestWrapper>
          <KYCQueueManager />
        </AdminTestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Select applications
      const checkboxes = screen.getAllByRole('checkbox', { name: /select application/i })
      await user.click(checkboxes[0])
      await user.click(checkboxes[1])

      // Click bulk approve
      const bulkApproveButton = screen.getByRole('button', { name: /bulk approve/i })
      await user.click(bulkApproveButton)

      // Confirm action
      const confirmButton = screen.getByRole('button', { name: /confirm bulk approval/i })
      await user.click(confirmButton)

      // Should show success message
      await waitFor(() => {
        expect(screen.getByText(/2 applications approved/i)).toBeInTheDocument()
      })
    })

    it('should export selected applications', async () => {
      render(
        <AdminTestWrapper>
          <KYCQueueManager />
        </AdminTestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Select applications
      const checkboxes = screen.getAllByRole('checkbox', { name: /select application/i })
      await user.click(checkboxes[0])
      await user.click(checkboxes[1])

      // Click export
      const exportButton = screen.getByRole('button', { name: /export selected/i })
      await user.click(exportButton)

      // Select format
      const csvRadio = screen.getByLabelText(/csv/i)
      await user.click(csvRadio)

      // Confirm export
      const confirmExportButton = screen.getByRole('button', { name: /download/i })
      await user.click(confirmExportButton)

      // Should trigger download
      await waitFor(() => {
        expect(screen.getByText(/export completed/i)).toBeInTheDocument()
      })
    })
  })

  describe('Analytics Dashboard', () => {
    it('should display KYC analytics overview', async () => {
      render(
        <AdminTestWrapper>
          <KYCAnalytics />
        </AdminTestWrapper>
      )

      // Wait for analytics to load
      await waitFor(() => {
        expect(screen.getByText(/total applications/i)).toBeInTheDocument()
        expect(screen.getByText('150')).toBeInTheDocument()
        expect(screen.getByText(/pending review/i)).toBeInTheDocument()
        expect(screen.getByText('12')).toBeInTheDocument()
      })

      // Check risk distribution
      expect(screen.getByText(/risk distribution/i)).toBeInTheDocument()
      expect(screen.getByText(/low.*100/i)).toBeInTheDocument()
      expect(screen.getByText(/medium.*40/i)).toBeInTheDocument()
      expect(screen.getByText(/high.*10/i)).toBeInTheDocument()
    })

    it('should display processing time metrics', async () => {
      render(
        <AdminTestWrapper>
          <KYCAnalytics />
        </AdminTestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/average processing time/i)).toBeInTheDocument()
        expect(screen.getByText(/1 hour/i)).toBeInTheDocument()
      })
    })

    it('should show daily submission trends', async () => {
      render(
        <AdminTestWrapper>
          <KYCAnalytics />
        </AdminTestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/daily submissions/i)).toBeInTheDocument()
      })

      // Should display chart or table with daily stats
      const chartContainer = screen.getByTestId('daily-stats-chart')
      expect(chartContainer).toBeInTheDocument()
    })

    it('should export analytics report', async () => {
      render(
        <AdminTestWrapper>
          <KYCAnalytics />
        </AdminTestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/total applications/i)).toBeInTheDocument()
      })

      // Click export analytics
      const exportButton = screen.getByRole('button', { name: /export analytics/i })
      await user.click(exportButton)

      // Select date range
      const startDateInput = screen.getByLabelText(/start date/i)
      const endDateInput = screen.getByLabelText(/end date/i)
      
      await user.type(startDateInput, '2024-01-01')
      await user.type(endDateInput, '2024-01-31')

      // Generate report
      const generateButton = screen.getByRole('button', { name: /generate report/i })
      await user.click(generateButton)

      await waitFor(() => {
        expect(screen.getByText(/report generated/i)).toBeInTheDocument()
      })
    })

    it('should filter analytics by date range', async () => {
      render(
        <AdminTestWrapper>
          <KYCAnalytics />
        </AdminTestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/total applications/i)).toBeInTheDocument()
      })

      // Apply date filter
      const dateRangeSelect = screen.getByLabelText(/date range/i)
      await user.selectOptions(dateRangeSelect, 'last_7_days')

      // Should update metrics
      await waitFor(() => {
        // Numbers should be different for filtered range
        expect(screen.queryByText('150')).not.toBeInTheDocument()
      })
    })
  })

  describe('Real-time Updates', () => {
    it('should receive real-time status updates', async () => {
      // Mock WebSocket or SSE connection
      const mockEventSource = {
        addEventListener: vi.fn((event, handler) => {
          if (event === 'kyc-update') {
            // Simulate real-time update after 1 second
            setTimeout(() => {
              handler({
                data: JSON.stringify({
                  applicationId: 'kyc-001',
                  status: 'approved',
                  updatedBy: 'admin-user',
                  timestamp: new Date().toISOString()
                })
              })
            }, 1000)
          }
        }),
        close: vi.fn()
      }

      global.EventSource = vi.fn().mockImplementation(() => mockEventSource)

      render(
        <AdminTestWrapper>
          <KYCQueueManager />
        </AdminTestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })

      // Should receive and display update
      await waitFor(() => {
        expect(screen.getByText(/john doe.*approved/i)).toBeInTheDocument()
      }, { timeout: 2000 })
    })

    it('should show notification for new applications', async () => {
      render(
        <AdminTestWrapper>
          <KYCAdminControls />
        </AdminTestWrapper>
      )

      // Simulate new application notification
      server.use(
        rest.get('/api/kyc/notifications', (req, res, ctx) => {
          return res(
            ctx.json({
              newApplications: 3,
              pendingReview: 15,
              requiresAttention: 2
            })
          )
        })
      )

      // Poll for updates
      await waitFor(() => {
        expect(screen.getByText(/3 new applications/i)).toBeInTheDocument()
        expect(screen.getByText(/2 require attention/i)).toBeInTheDocument()
      })
    })
  })

  describe('Admin Controls', () => {
    it('should manage admin team members', async () => {
      render(
        <AdminTestWrapper>
          <KYCAdminControls />
        </AdminTestWrapper>
      )

      // Open team management
      const teamButton = screen.getByRole('button', { name: /manage team/i })
      await user.click(teamButton)

      // Should show team members
      await waitFor(() => {
        expect(screen.getByText(/team members/i)).toBeInTheDocument()
      })

      // Add new team member
      const addMemberButton = screen.getByRole('button', { name: /add member/i })
      await user.click(addMemberButton)

      const emailInput = screen.getByLabelText(/email/i)
      const roleSelect = screen.getByLabelText(/role/i)

      await user.type(emailInput, 'newadmin@example.com')
      await user.selectOptions(roleSelect, 'reviewer')

      const inviteButton = screen.getByRole('button', { name: /send invite/i })
      await user.click(inviteButton)

      // Should show success
      await waitFor(() => {
        expect(screen.getByText(/invitation sent/i)).toBeInTheDocument()
      })
    })

    it('should configure automatic approval rules', async () => {
      render(
        <AdminTestWrapper>
          <KYCAdminControls />
        </AdminTestWrapper>
      )

      // Open automation settings
      const automationButton = screen.getByRole('button', { name: /automation/i })
      await user.click(automationButton)

      // Configure auto-approval rule
      const lowRiskCheckbox = screen.getByLabelText(/auto-approve low risk/i)
      await user.click(lowRiskCheckbox)

      const thresholdInput = screen.getByLabelText(/risk threshold/i)
      await user.clear(thresholdInput)
      await user.type(thresholdInput, '20')

      // Save settings
      const saveButton = screen.getByRole('button', { name: /save rules/i })
      await user.click(saveButton)

      // Should show confirmation
      await waitFor(() => {
        expect(screen.getByText(/rules saved/i)).toBeInTheDocument()
      })
    })

    it('should set review SLA timers', async () => {
      render(
        <AdminTestWrapper>
          <KYCAdminControls />
        </AdminTestWrapper>
      )

      // Open SLA settings
      const slaButton = screen.getByRole('button', { name: /sla settings/i })
      await user.click(slaButton)

      // Set review time limits
      const standardReviewInput = screen.getByLabelText(/standard review time/i)
      const highRiskReviewInput = screen.getByLabelText(/high risk review time/i)

      await user.clear(standardReviewInput)
      await user.type(standardReviewInput, '24')

      await user.clear(highRiskReviewInput)
      await user.type(highRiskReviewInput, '4')

      // Save SLA settings
      const saveButton = screen.getByRole('button', { name: /save sla/i })
      await user.click(saveButton)

      // Should update SLA timers
      await waitFor(() => {
        expect(screen.getByText(/sla updated/i)).toBeInTheDocument()
      })
    })
  })

  describe('Compliance Reporting', () => {
    it('should generate compliance audit report', async () => {
      render(
        <AdminTestWrapper>
          <KYCAdminControls />
        </AdminTestWrapper>
      )

      // Open compliance section
      const complianceButton = screen.getByRole('button', { name: /compliance/i })
      await user.click(complianceButton)

      // Generate audit report
      const auditReportButton = screen.getByRole('button', { name: /generate audit report/i })
      await user.click(auditReportButton)

      // Select report parameters
      const reportTypeSelect = screen.getByLabelText(/report type/i)
      await user.selectOptions(reportTypeSelect, 'monthly_compliance')

      const includeDetailsCheckbox = screen.getByLabelText(/include detailed logs/i)
      await user.click(includeDetailsCheckbox)

      // Generate report
      const generateButton = screen.getByRole('button', { name: /generate/i })
      await user.click(generateButton)

      // Should show report ready
      await waitFor(() => {
        expect(screen.getByText(/report ready/i)).toBeInTheDocument()
        expect(screen.getByRole('link', { name: /download report/i })).toBeInTheDocument()
      })
    })

    it('should track admin actions for compliance', async () => {
      const logSpy = vi.spyOn(kycAuditLogger, 'log')

      render(
        <AdminTestWrapper>
          <KYCApplicationDetail applicationId="kyc-001" />
        </AdminTestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/john doe/i)).toBeInTheDocument()
      })

      // Perform admin action
      const overrideButton = screen.getByRole('button', { name: /admin override/i })
      await user.click(overrideButton)

      // Enter override reason
      const reasonInput = screen.getByLabelText(/override reason/i)
      await user.type(reasonInput, 'Executive approval granted')

      const confirmButton = screen.getByRole('button', { name: /confirm override/i })
      await user.click(confirmButton)

      // Should log admin action
      await waitFor(() => {
        expect(logSpy).toHaveBeenCalledWith(
          KYCActionType.KYC_ADMIN_OVERRIDE,
          expect.objectContaining({
            reason: 'Executive approval granted'
          }),
          expect.any(Object)
        )
      })
    })
  })
})