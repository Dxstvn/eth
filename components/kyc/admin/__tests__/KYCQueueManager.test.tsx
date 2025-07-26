import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { KYCQueueManager } from '../KYCQueueManager'
import { toast } from 'sonner'

// Mock dependencies
jest.mock('sonner')
jest.mock('../KYCApplicationDetail', () => ({
  __esModule: true,
  default: ({ application, onUpdate }: any) => (
    <div data-testid="application-detail">
      Application Detail: {application.id}
      <button onClick={onUpdate}>Update</button>
    </div>
  )
}))

// Mock applications data
const mockApplications = [
  {
    id: 'app-1',
    userId: 'user-1',
    userName: 'John Doe',
    email: 'john@example.com',
    status: 'pending',
    submittedAt: '2024-01-20T10:00:00Z',
    lastUpdated: '2024-01-20T10:00:00Z',
    riskLevel: 'low',
    priority: 'normal',
    documents: {
      identityDocument: { verified: true },
      addressProof: { verified: true }
    },
    livenessCheck: { completed: true, score: 0.95 },
    riskAssessment: { score: 25, level: 'low' }
  },
  {
    id: 'app-2',
    userId: 'user-2',
    userName: 'Jane Smith',
    email: 'jane@example.com',
    status: 'in_review',
    submittedAt: '2024-01-19T14:30:00Z',
    lastUpdated: '2024-01-20T09:00:00Z',
    riskLevel: 'medium',
    priority: 'high',
    documents: {
      identityDocument: { verified: true },
      addressProof: { verified: false }
    },
    livenessCheck: { completed: true, score: 0.85 },
    riskAssessment: { score: 50, level: 'medium' }
  },
  {
    id: 'app-3',
    userId: 'user-3',
    userName: 'Bob Johnson',
    email: 'bob@example.com',
    status: 'approved',
    submittedAt: '2024-01-18T08:00:00Z',
    lastUpdated: '2024-01-19T16:00:00Z',
    riskLevel: 'low',
    priority: 'normal',
    documents: {
      identityDocument: { verified: true },
      addressProof: { verified: true }
    },
    livenessCheck: { completed: true, score: 0.98 },
    riskAssessment: { score: 15, level: 'low' }
  },
  {
    id: 'app-4',
    userId: 'user-4',
    userName: 'Alice Brown',
    email: 'alice@example.com',
    status: 'rejected',
    submittedAt: '2024-01-17T12:00:00Z',
    lastUpdated: '2024-01-18T10:00:00Z',
    riskLevel: 'high',
    priority: 'urgent',
    documents: {
      identityDocument: { verified: false },
      addressProof: { verified: false }
    },
    livenessCheck: { completed: false },
    riskAssessment: { score: 85, level: 'high' }
  }
]

describe('KYCQueueManager', () => {
  const mockOnSelectApplication = jest.fn()
  const mockOnBulkAction = jest.fn()
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders queue manager with applications', () => {
      render(
        <KYCQueueManager 
          applications={mockApplications}
          onSelectApplication={mockOnSelectApplication}
          onBulkAction={mockOnBulkAction}
        />
      )
      
      expect(screen.getByText('KYC Application Queue')).toBeInTheDocument()
      expect(screen.getByText('4 applications')).toBeInTheDocument()
    })

    it('displays statistics cards', () => {
      render(
        <KYCQueueManager 
          applications={mockApplications}
          onSelectApplication={mockOnSelectApplication}
          onBulkAction={mockOnBulkAction}
        />
      )
      
      expect(screen.getByText('Pending Review')).toBeInTheDocument()
      expect(screen.getByText('In Review')).toBeInTheDocument()
      expect(screen.getByText('Approved Today')).toBeInTheDocument()
      expect(screen.getByText('High Priority')).toBeInTheDocument()
    })

    it('shows correct counts in statistics', () => {
      render(
        <KYCQueueManager 
          applications={mockApplications}
          onSelectApplication={mockOnSelectApplication}
          onBulkAction={mockOnBulkAction}
        />
      )
      
      // Check counts
      const stats = screen.getByTestId('stats-container')
      expect(within(stats).getByText('1')).toBeInTheDocument() // Pending
      expect(within(stats).getByText('1')).toBeInTheDocument() // In Review
      expect(within(stats).getByText('0')).toBeInTheDocument() // Approved Today
      expect(within(stats).getByText('2')).toBeInTheDocument() // High Priority
    })
  })

  describe('Filtering', () => {
    it('filters by status', async () => {
      render(
        <KYCQueueManager 
          applications={mockApplications}
          onSelectApplication={mockOnSelectApplication}
          onBulkAction={mockOnBulkAction}
        />
      )
      
      const statusFilter = screen.getByRole('combobox', { name: /status/i })
      await user.click(statusFilter)
      await user.click(screen.getByRole('option', { name: /pending/i }))
      
      // Should only show pending applications
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
      expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument()
    })

    it('filters by risk level', async () => {
      render(
        <KYCQueueManager 
          applications={mockApplications}
          onSelectApplication={mockOnSelectApplication}
          onBulkAction={mockOnBulkAction}
        />
      )
      
      const riskFilter = screen.getByRole('combobox', { name: /risk level/i })
      await user.click(riskFilter)
      await user.click(screen.getByRole('option', { name: /high/i }))
      
      // Should only show high risk applications
      expect(screen.getByText('Alice Brown')).toBeInTheDocument()
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
    })

    it('filters by priority', async () => {
      render(
        <KYCQueueManager 
          applications={mockApplications}
          onSelectApplication={mockOnSelectApplication}
          onBulkAction={mockOnBulkAction}
        />
      )
      
      const priorityFilter = screen.getByRole('combobox', { name: /priority/i })
      await user.click(priorityFilter)
      await user.click(screen.getByRole('option', { name: /urgent/i }))
      
      // Should only show urgent priority applications
      expect(screen.getByText('Alice Brown')).toBeInTheDocument()
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
    })

    it('searches by name or email', async () => {
      render(
        <KYCQueueManager 
          applications={mockApplications}
          onSelectApplication={mockOnSelectApplication}
          onBulkAction={mockOnBulkAction}
        />
      )
      
      const searchInput = screen.getByPlaceholderText(/search/i)
      await user.type(searchInput, 'jane')
      
      // Should only show matching applications
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
    })

    it('combines multiple filters', async () => {
      render(
        <KYCQueueManager 
          applications={mockApplications}
          onSelectApplication={mockOnSelectApplication}
          onBulkAction={mockOnBulkAction}
        />
      )
      
      // Filter by status and risk
      const statusFilter = screen.getByRole('combobox', { name: /status/i })
      await user.click(statusFilter)
      await user.click(screen.getByRole('option', { name: /all/i }))
      
      const riskFilter = screen.getByRole('combobox', { name: /risk level/i })
      await user.click(riskFilter)
      await user.click(screen.getByRole('option', { name: /low/i }))
      
      // Should show only low risk applications
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument()
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
    })

    it('clears filters', async () => {
      render(
        <KYCQueueManager 
          applications={mockApplications}
          onSelectApplication={mockOnSelectApplication}
          onBulkAction={mockOnBulkAction}
        />
      )
      
      // Apply filter
      const statusFilter = screen.getByRole('combobox', { name: /status/i })
      await user.click(statusFilter)
      await user.click(screen.getByRole('option', { name: /pending/i }))
      
      // Clear filters
      const clearButton = screen.getByRole('button', { name: /clear filters/i })
      await user.click(clearButton)
      
      // Should show all applications again
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument()
      expect(screen.getByText('Alice Brown')).toBeInTheDocument()
    })
  })

  describe('Sorting', () => {
    it('sorts by submission date', async () => {
      render(
        <KYCQueueManager 
          applications={mockApplications}
          onSelectApplication={mockOnSelectApplication}
          onBulkAction={mockOnBulkAction}
        />
      )
      
      const submittedHeader = screen.getByRole('button', { name: /submitted/i })
      await user.click(submittedHeader)
      
      const rows = screen.getAllByRole('row')
      // First row is header, check data rows
      expect(within(rows[1]).getByText('John Doe')).toBeInTheDocument()
      
      // Click again to reverse sort
      await user.click(submittedHeader)
      const reversedRows = screen.getAllByRole('row')
      expect(within(reversedRows[1]).getByText('Alice Brown')).toBeInTheDocument()
    })

    it('sorts by risk level', async () => {
      render(
        <KYCQueueManager 
          applications={mockApplications}
          onSelectApplication={mockOnSelectApplication}
          onBulkAction={mockOnBulkAction}
        />
      )
      
      const riskHeader = screen.getByRole('button', { name: /risk/i })
      await user.click(riskHeader)
      
      const rows = screen.getAllByRole('row')
      // Should sort by risk level (high first)
      expect(within(rows[1]).getByText('Alice Brown')).toBeInTheDocument()
    })

    it('sorts by priority', async () => {
      render(
        <KYCQueueManager 
          applications={mockApplications}
          onSelectApplication={mockOnSelectApplication}
          onBulkAction={mockOnBulkAction}
        />
      )
      
      const priorityHeader = screen.getByRole('button', { name: /priority/i })
      await user.click(priorityHeader)
      
      const rows = screen.getAllByRole('row')
      // Should sort by priority (urgent first)
      expect(within(rows[1]).getByText('Alice Brown')).toBeInTheDocument()
    })
  })

  describe('Selection', () => {
    it('selects individual applications', async () => {
      render(
        <KYCQueueManager 
          applications={mockApplications}
          onSelectApplication={mockOnSelectApplication}
          onBulkAction={mockOnBulkAction}
        />
      )
      
      const firstCheckbox = screen.getAllByRole('checkbox')[1] // Skip header checkbox
      await user.click(firstCheckbox)
      
      expect(firstCheckbox).toBeChecked()
      expect(screen.getByText('1 selected')).toBeInTheDocument()
    })

    it('selects all applications', async () => {
      render(
        <KYCQueueManager 
          applications={mockApplications}
          onSelectApplication={mockOnSelectApplication}
          onBulkAction={mockOnBulkAction}
        />
      )
      
      const selectAllCheckbox = screen.getAllByRole('checkbox')[0]
      await user.click(selectAllCheckbox)
      
      const checkboxes = screen.getAllByRole('checkbox')
      checkboxes.forEach(checkbox => {
        expect(checkbox).toBeChecked()
      })
      
      expect(screen.getByText('4 selected')).toBeInTheDocument()
    })

    it('deselects all when clicking select all again', async () => {
      render(
        <KYCQueueManager 
          applications={mockApplications}
          onSelectApplication={mockOnSelectApplication}
          onBulkAction={mockOnBulkAction}
        />
      )
      
      const selectAllCheckbox = screen.getAllByRole('checkbox')[0]
      await user.click(selectAllCheckbox)
      await user.click(selectAllCheckbox)
      
      const checkboxes = screen.getAllByRole('checkbox')
      checkboxes.forEach(checkbox => {
        expect(checkbox).not.toBeChecked()
      })
    })
  })

  describe('Bulk Actions', () => {
    it('shows bulk action buttons when items are selected', async () => {
      render(
        <KYCQueueManager 
          applications={mockApplications}
          onSelectApplication={mockOnSelectApplication}
          onBulkAction={mockOnBulkAction}
        />
      )
      
      // Select an item
      const firstCheckbox = screen.getAllByRole('checkbox')[1]
      await user.click(firstCheckbox)
      
      expect(screen.getByRole('button', { name: /bulk approve/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /bulk reject/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /assign reviewer/i })).toBeInTheDocument()
    })

    it('handles bulk approve', async () => {
      render(
        <KYCQueueManager 
          applications={mockApplications}
          onSelectApplication={mockOnSelectApplication}
          onBulkAction={mockOnBulkAction}
        />
      )
      
      // Select items
      const checkboxes = screen.getAllByRole('checkbox')
      await user.click(checkboxes[1])
      await user.click(checkboxes[2])
      
      const bulkApproveButton = screen.getByRole('button', { name: /bulk approve/i })
      await user.click(bulkApproveButton)
      
      expect(mockOnBulkAction).toHaveBeenCalledWith('approve', ['app-1', 'app-2'])
    })

    it('handles bulk reject', async () => {
      render(
        <KYCQueueManager 
          applications={mockApplications}
          onSelectApplication={mockOnSelectApplication}
          onBulkAction={mockOnBulkAction}
        />
      )
      
      // Select items
      const firstCheckbox = screen.getAllByRole('checkbox')[1]
      await user.click(firstCheckbox)
      
      const bulkRejectButton = screen.getByRole('button', { name: /bulk reject/i })
      await user.click(bulkRejectButton)
      
      expect(mockOnBulkAction).toHaveBeenCalledWith('reject', ['app-1'])
    })

    it('handles assign reviewer', async () => {
      render(
        <KYCQueueManager 
          applications={mockApplications}
          onSelectApplication={mockOnSelectApplication}
          onBulkAction={mockOnBulkAction}
        />
      )
      
      // Select items
      const firstCheckbox = screen.getAllByRole('checkbox')[1]
      await user.click(firstCheckbox)
      
      const assignButton = screen.getByRole('button', { name: /assign reviewer/i })
      await user.click(assignButton)
      
      // Should show assignment dialog/dropdown
      expect(mockOnBulkAction).toHaveBeenCalledWith('assign', ['app-1'])
    })
  })

  describe('Individual Actions', () => {
    it('opens application detail on row click', async () => {
      render(
        <KYCQueueManager 
          applications={mockApplications}
          onSelectApplication={mockOnSelectApplication}
          onBulkAction={mockOnBulkAction}
        />
      )
      
      const row = screen.getByText('John Doe').closest('tr')!
      await user.click(row)
      
      expect(mockOnSelectApplication).toHaveBeenCalledWith(mockApplications[0])
    })

    it('shows action menu for each application', async () => {
      render(
        <KYCQueueManager 
          applications={mockApplications}
          onSelectApplication={mockOnSelectApplication}
          onBulkAction={mockOnBulkAction}
        />
      )
      
      const actionButtons = screen.getAllByRole('button', { name: /actions/i })
      await user.click(actionButtons[0])
      
      expect(screen.getByRole('menuitem', { name: /view details/i })).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: /approve/i })).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: /reject/i })).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: /request more info/i })).toBeInTheDocument()
    })

    it('handles view details from action menu', async () => {
      render(
        <KYCQueueManager 
          applications={mockApplications}
          onSelectApplication={mockOnSelectApplication}
          onBulkAction={mockOnBulkAction}
        />
      )
      
      const actionButtons = screen.getAllByRole('button', { name: /actions/i })
      await user.click(actionButtons[0])
      
      const viewDetailsItem = screen.getByRole('menuitem', { name: /view details/i })
      await user.click(viewDetailsItem)
      
      expect(mockOnSelectApplication).toHaveBeenCalledWith(mockApplications[0])
    })
  })

  describe('Status Badges', () => {
    it('displays correct status badges', () => {
      render(
        <KYCQueueManager 
          applications={mockApplications}
          onSelectApplication={mockOnSelectApplication}
          onBulkAction={mockOnBulkAction}
        />
      )
      
      expect(screen.getByText('Pending').closest('span')).toHaveClass('bg-yellow-100')
      expect(screen.getByText('In Review').closest('span')).toHaveClass('bg-blue-100')
      expect(screen.getByText('Approved').closest('span')).toHaveClass('bg-green-100')
      expect(screen.getByText('Rejected').closest('span')).toHaveClass('bg-red-100')
    })

    it('displays risk level badges', () => {
      render(
        <KYCQueueManager 
          applications={mockApplications}
          onSelectApplication={mockOnSelectApplication}
          onBulkAction={mockOnBulkAction}
        />
      )
      
      const lowRiskBadges = screen.getAllByText('Low')
      expect(lowRiskBadges[0].closest('span')).toHaveClass('bg-green-100')
      
      const mediumRiskBadge = screen.getByText('Medium')
      expect(mediumRiskBadge.closest('span')).toHaveClass('bg-yellow-100')
      
      const highRiskBadge = screen.getByText('High')
      expect(highRiskBadge.closest('span')).toHaveClass('bg-red-100')
    })
  })

  describe('Export Functionality', () => {
    it('exports filtered data', async () => {
      const mockExport = jest.fn()
      
      render(
        <KYCQueueManager 
          applications={mockApplications}
          onSelectApplication={mockOnSelectApplication}
          onBulkAction={mockOnBulkAction}
          onExport={mockExport}
        />
      )
      
      // Apply filter
      const statusFilter = screen.getByRole('combobox', { name: /status/i })
      await user.click(statusFilter)
      await user.click(screen.getByRole('option', { name: /pending/i }))
      
      // Export
      const exportButton = screen.getByRole('button', { name: /export/i })
      await user.click(exportButton)
      
      expect(mockExport).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'app-1' })
        ])
      )
    })
  })

  describe('Empty States', () => {
    it('shows empty state when no applications', () => {
      render(
        <KYCQueueManager 
          applications={[]}
          onSelectApplication={mockOnSelectApplication}
          onBulkAction={mockOnBulkAction}
        />
      )
      
      expect(screen.getByText(/no applications found/i)).toBeInTheDocument()
    })

    it('shows no results when filters return empty', async () => {
      render(
        <KYCQueueManager 
          applications={mockApplications}
          onSelectApplication={mockOnSelectApplication}
          onBulkAction={mockOnBulkAction}
        />
      )
      
      const searchInput = screen.getByPlaceholderText(/search/i)
      await user.type(searchInput, 'nonexistent')
      
      expect(screen.getByText(/no applications match/i)).toBeInTheDocument()
    })
  })

  describe('Loading States', () => {
    it('shows loading indicator when loading prop is true', () => {
      render(
        <KYCQueueManager 
          applications={mockApplications}
          onSelectApplication={mockOnSelectApplication}
          onBulkAction={mockOnBulkAction}
          loading
        />
      )
      
      expect(screen.getByText(/loading applications/i)).toBeInTheDocument()
    })
  })

  describe('Pagination', () => {
    it('paginates large datasets', () => {
      const manyApplications = Array.from({ length: 25 }, (_, i) => ({
        ...mockApplications[0],
        id: `app-${i}`,
        userName: `User ${i}`
      }))
      
      render(
        <KYCQueueManager 
          applications={manyApplications}
          onSelectApplication={mockOnSelectApplication}
          onBulkAction={mockOnBulkAction}
        />
      )
      
      // Should show pagination controls
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
      expect(screen.getByText(/page 1 of/i)).toBeInTheDocument()
    })

    it('navigates between pages', async () => {
      const manyApplications = Array.from({ length: 25 }, (_, i) => ({
        ...mockApplications[0],
        id: `app-${i}`,
        userName: `User ${i}`
      }))
      
      render(
        <KYCQueueManager 
          applications={manyApplications}
          onSelectApplication={mockOnSelectApplication}
          onBulkAction={mockOnBulkAction}
        />
      )
      
      // Go to next page
      const nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)
      
      expect(screen.getByText(/page 2 of/i)).toBeInTheDocument()
    })
  })
})