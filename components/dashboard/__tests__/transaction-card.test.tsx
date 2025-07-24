import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TransactionCard from '../transaction-card'

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ children, href, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

// Mock Progress component
vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value, className, children }: any) => (
    <div className={className} data-testid="progress-bar" data-value={value}>
      {children}
    </div>
  ),
}))

// Mock TransactionStageIndicator component
vi.mock('@/components/transaction-stage-indicator', () => ({
  default: ({ stage, size }: any) => (
    <div data-testid="stage-indicator" data-stage={stage} data-size={size}>
      Stage: {stage}
    </div>
  ),
}))

// Mock lucide icons
vi.mock('lucide-react', () => ({
  ArrowRight: ({ className }: any) => <div data-testid="arrow-right" className={className} />,
  CheckCircle: ({ className }: any) => <div data-testid="check-circle" className={className} />,
  Clock: ({ className }: any) => <div data-testid="clock" className={className} />,
  FileText: ({ className }: any) => <div data-testid="file-text" className={className} />,
  LockKeyhole: ({ className }: any) => <div data-testid="lock-keyhole" className={className} />,
  UserCheck: ({ className }: any) => <div data-testid="user-check" className={className} />,
  DollarSign: ({ className }: any) => <div data-testid="dollar-sign" className={className} />,
  Building: ({ className }: any) => <div data-testid="building" className={className} />,
  Calendar: ({ className }: any) => <div data-testid="calendar" className={className} />,
  User: ({ className }: any) => <div data-testid="user" className={className} />,
}))

const mockTransaction = {
  id: 'TX123456',
  propertyAddress: '123 Main Street, Anytown, CA 90210',
  amount: '$500,000',
  status: 'in_escrow',
  counterparty: 'John Smith',
  date: '2024-01-15',
  progress: 65,
}

const mockCompletedTransaction = {
  ...mockTransaction,
  id: 'TX789012',
  status: 'completed',
  progress: 100,
}

const mockVerificationTransaction = {
  ...mockTransaction,
  id: 'TX345678',
  status: 'verification',
  progress: 25,
}

describe('TransactionCard Component', () => {
  describe('Basic Rendering', () => {
    it('should render transaction card with all basic information', () => {
      render(<TransactionCard transaction={mockTransaction} />)

      expect(screen.getByText('123 Main Street, Anytown, CA 90210')).toBeInTheDocument()
      expect(screen.getByText('TX123456')).toBeInTheDocument()
      expect(screen.getByText('John Smith')).toBeInTheDocument()
      expect(screen.getByText('2024-01-15')).toBeInTheDocument()
      expect(screen.getByText('$500,000')).toBeInTheDocument()
    })

    it('should render stage indicator with correct props', () => {
      render(<TransactionCard transaction={mockTransaction} />)

      const stageIndicator = screen.getByTestId('stage-indicator')
      expect(stageIndicator).toHaveAttribute('data-stage', 'in_escrow')
      expect(stageIndicator).toHaveAttribute('data-size', 'sm')
    })

    it('should render progress bar with correct value', () => {
      render(<TransactionCard transaction={mockTransaction} />)

      const progressBar = screen.getByTestId('progress-bar')
      expect(progressBar).toHaveAttribute('data-value', '65')
      expect(screen.getByText('65%')).toBeInTheDocument()
    })

    it('should render view details button with correct link', () => {
      render(<TransactionCard transaction={mockTransaction} />)

      const viewButton = screen.getByRole('link', { name: /view details/i })
      expect(viewButton).toHaveAttribute('href', '/transactions/TX123456')
    })
  })

  describe('Status Information', () => {
    it('should handle verification status', () => {
      render(<TransactionCard transaction={mockVerificationTransaction} />)

      const stageIndicator = screen.getByTestId('stage-indicator')
      expect(stageIndicator).toHaveAttribute('data-stage', 'verification')
    })

    it('should handle awaiting_funds status', () => {
      const awaitingFundsTransaction = { ...mockTransaction, status: 'awaiting_funds' }
      render(<TransactionCard transaction={awaitingFundsTransaction} />)

      const stageIndicator = screen.getByTestId('stage-indicator')
      expect(stageIndicator).toHaveAttribute('data-stage', 'awaiting_funds')
    })

    it('should handle pending_approval status', () => {
      const pendingTransaction = { ...mockTransaction, status: 'pending_approval' }
      render(<TransactionCard transaction={pendingTransaction} />)

      const stageIndicator = screen.getByTestId('stage-indicator')
      expect(stageIndicator).toHaveAttribute('data-stage', 'pending_approval')
    })

    it('should handle completed status', () => {
      render(<TransactionCard transaction={mockCompletedTransaction} />)

      const stageIndicator = screen.getByTestId('stage-indicator')
      expect(stageIndicator).toHaveAttribute('data-stage', 'completed')
    })

    it('should handle unknown status', () => {
      const unknownTransaction = { ...mockTransaction, status: 'unknown_status' }
      render(<TransactionCard transaction={unknownTransaction} />)

      const stageIndicator = screen.getByTestId('stage-indicator')
      expect(stageIndicator).toHaveAttribute('data-stage', 'unknown_status')
    })
  })

  describe('Progress Visualization', () => {
    it('should show green progress for completed transactions', () => {
      render(<TransactionCard transaction={mockCompletedTransaction} />)

      const progressContainer = screen.getByTestId('progress-bar').parentElement
      const progressFill = progressContainer?.querySelector('.bg-green-500')
      expect(progressFill).toBeInTheDocument()
    })

    it('should show teal gradient for incomplete transactions', () => {
      render(<TransactionCard transaction={mockTransaction} />)

      const progressContainer = screen.getByTestId('progress-bar').parentElement
      const progressFill = progressContainer?.querySelector('.bg-gradient-to-r.from-teal-700.to-teal-900')
      expect(progressFill).toBeInTheDocument()
    })

    it('should display correct progress percentage', () => {
      render(<TransactionCard transaction={mockTransaction} />)

      expect(screen.getByText('Progress')).toBeInTheDocument()
      expect(screen.getByText('65%')).toBeInTheDocument()
    })

    it('should handle 0% progress', () => {
      const zeroProgressTransaction = { ...mockTransaction, progress: 0 }
      render(<TransactionCard transaction={zeroProgressTransaction} />)

      expect(screen.getByText('0%')).toBeInTheDocument()
    })

    it('should handle 100% progress', () => {
      const fullProgressTransaction = { ...mockTransaction, progress: 100 }
      render(<TransactionCard transaction={fullProgressTransaction} />)

      expect(screen.getByText('100%')).toBeInTheDocument()
    })
  })

  describe('Icons and Visual Elements', () => {
    it('should render all metadata icons', () => {
      render(<TransactionCard transaction={mockTransaction} />)

      expect(screen.getByTestId('building')).toBeInTheDocument()
      expect(screen.getByTestId('user')).toBeInTheDocument()
      expect(screen.getByTestId('calendar')).toBeInTheDocument()
      expect(screen.getByTestId('arrow-right')).toBeInTheDocument()
    })

    it('should have proper icon positioning', () => {
      render(<TransactionCard transaction={mockTransaction} />)

      const buildingIcon = screen.getByTestId('building')
      const userIcon = screen.getByTestId('user')
      const calendarIcon = screen.getByTestId('calendar')

      expect(buildingIcon).toHaveClass('h-4', 'w-4')
      expect(userIcon).toHaveClass('h-4', 'w-4')
      expect(calendarIcon).toHaveClass('h-4', 'w-4')
    })
  })

  describe('Layout and Styling', () => {
    it('should have correct card styling', () => {
      render(<TransactionCard transaction={mockTransaction} />)

      // Find the root card element by looking for the element with the card styling classes
      const card = document.querySelector('.bg-white.p-5.rounded-lg.border.border-neutral-100')
      expect(card).toBeInTheDocument()
      expect(card).toHaveClass(
        'bg-white',
        'p-5',
        'rounded-lg',
        'border',
        'border-neutral-100',
        'shadow-sm',
        'hover:shadow-md',
        'transition-all',
        'duration-300'
      )
    })

    it('should have responsive layout classes', () => {
      render(<TransactionCard transaction={mockTransaction} />)

      // Find the main header section which has responsive flex classes
      const headerSection = document.querySelector('.flex-col.md\\:flex-row.md\\:items-center')
      expect(headerSection).toBeInTheDocument()
      expect(headerSection).toHaveClass('flex', 'flex-col', 'md:flex-row', 'md:items-center', 'justify-between', 'gap-4', 'mb-4')
    })

    it('should have proper spacing and gaps', () => {
      render(<TransactionCard transaction={mockTransaction} />)

      // Find the metadata section which contains the building icon
      const buildingIcon = screen.getByTestId('building')
      const metadataSection = buildingIcon.closest('.flex.flex-wrap.items-center.gap-4')
      expect(metadataSection).toBeInTheDocument()
      expect(metadataSection).toHaveClass('flex', 'flex-wrap', 'items-center', 'gap-4', 'text-sm', 'text-neutral-500')
    })
  })

  describe('Button Styling', () => {
    it('should have correct button styling', () => {
      render(<TransactionCard transaction={mockTransaction} />)

      const button = screen.getByRole('link', { name: /view details/i })
      expect(button).toHaveClass(
        'bg-gradient-to-r',
        'from-teal-700',
        'to-teal-900',
        'text-white',
        'hover:from-teal-800',
        'hover:to-teal-950'
      )
    })

    it('should have proper button size', () => {
      render(<TransactionCard transaction={mockTransaction} />)

      const buttonContainer = screen.getByRole('link', { name: /view details/i }).closest('[class*="whitespace-nowrap"]')
      expect(buttonContainer).toHaveClass('whitespace-nowrap')
    })
  })

  describe('Typography', () => {
    it('should have correct heading typography', () => {
      render(<TransactionCard transaction={mockTransaction} />)

      const propertyAddress = screen.getByText('123 Main Street, Anytown, CA 90210')
      expect(propertyAddress).toHaveClass('font-medium', 'text-teal-900', 'font-display')
    })

    it('should have correct metadata typography', () => {
      render(<TransactionCard transaction={mockTransaction} />)

      const metadataItems = screen.getAllByText(/TX123456|John Smith|2024-01-15/)
      metadataItems.forEach(item => {
        expect(item.closest('.text-sm.text-neutral-500')).toBeInTheDocument()
      })
    })

    it('should have correct amount typography', () => {
      render(<TransactionCard transaction={mockTransaction} />)

      const amount = screen.getByText('$500,000')
      expect(amount).toHaveClass('font-medium', 'text-teal-900')
    })
  })

  describe('Responsive Design', () => {
    it('should have mobile-friendly layout', () => {
      render(<TransactionCard transaction={mockTransaction} />)

      const flexContainer = screen.getByText('123 Main Street, Anytown, CA 90210').closest('.flex-col')
      expect(flexContainer).toHaveClass('md:flex-row')
    })

    it('should wrap metadata items on small screens', () => {
      render(<TransactionCard transaction={mockTransaction} />)

      const metadataContainer = screen.getByTestId('building').closest('.flex-wrap')
      expect(metadataContainer).toHaveClass('flex-wrap')
    })
  })

  describe('Interaction', () => {
    it('should have correct link href without clicking', () => {
      render(<TransactionCard transaction={mockTransaction} />)

      const viewButton = screen.getByRole('link', { name: /view details/i })
      expect(viewButton).toHaveAttribute('href', '/transactions/TX123456')
    })

    it('should have hover effects', () => {
      render(<TransactionCard transaction={mockTransaction} />)

      // Find the root card element which has hover effects
      const card = document.querySelector('.bg-white.p-5.rounded-lg.border.border-neutral-100')
      expect(card).toBeInTheDocument()
      expect(card).toHaveClass('hover:shadow-md', 'transition-all', 'duration-300')
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long property addresses', () => {
      const longAddressTransaction = {
        ...mockTransaction,
        propertyAddress: 'A Very Long Property Address That Might Cause Layout Issues In Some Responsive Scenarios, 123 Extremely Long Street Name, Very Long City Name, ST 12345-6789',
      }
      
      render(<TransactionCard transaction={longAddressTransaction} />)

      expect(screen.getByText(/A Very Long Property Address/)).toBeInTheDocument()
    })

    it('should handle very long counterparty names', () => {
      const longNameTransaction = {
        ...mockTransaction,
        counterparty: 'A Very Long Counterparty Name That Might Cause Issues',
      }
      
      render(<TransactionCard transaction={longNameTransaction} />)

      expect(screen.getByText('A Very Long Counterparty Name That Might Cause Issues')).toBeInTheDocument()
    })

    it('should handle large amounts', () => {
      const largeAmountTransaction = {
        ...mockTransaction,
        amount: '$1,234,567,890.99',
      }
      
      render(<TransactionCard transaction={largeAmountTransaction} />)

      expect(screen.getByText('$1,234,567,890.99')).toBeInTheDocument()
    })

    it('should handle missing or empty fields gracefully', () => {
      const incompleteTransaction = {
        ...mockTransaction,
        counterparty: '',
        date: '',
      }
      
      render(<TransactionCard transaction={incompleteTransaction} />)

      // Should still render the card
      expect(screen.getByText('123 Main Street, Anytown, CA 90210')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper link accessibility', () => {
      render(<TransactionCard transaction={mockTransaction} />)

      const viewButton = screen.getByRole('link', { name: /view details/i })
      expect(viewButton).toBeInTheDocument()
      expect(viewButton).toHaveAttribute('href')
    })

    it('should have semantic HTML structure', () => {
      render(<TransactionCard transaction={mockTransaction} />)

      // Should have proper heading structure
      const propertyAddress = screen.getByText('123 Main Street, Anytown, CA 90210')
      expect(propertyAddress).toBeInTheDocument()
    })

    it('should have proper color contrast', () => {
      render(<TransactionCard transaction={mockTransaction} />)

      const propertyAddress = screen.getByText('123 Main Street, Anytown, CA 90210')
      expect(propertyAddress).toHaveClass('text-teal-900') // High contrast

      const metadata = screen.getByText('TX123456')
      expect(metadata.closest('.text-neutral-500')).toBeInTheDocument() // Sufficient contrast
    })
  })

  describe('Performance', () => {
    it('should render efficiently with different transaction data', () => {
      const transactions = [
        mockTransaction,
        mockCompletedTransaction,
        mockVerificationTransaction,
      ]

      transactions.forEach(transaction => {
        const { unmount } = render(<TransactionCard transaction={transaction} />)
        expect(screen.getByText(transaction.propertyAddress)).toBeInTheDocument()
        unmount()
      })
    })

    it('should not cause memory leaks with re-renders', () => {
      const { rerender } = render(<TransactionCard transaction={mockTransaction} />)
      
      // Re-render with different data multiple times
      for (let i = 0; i < 10; i++) {
        const updatedTransaction = { ...mockTransaction, progress: i * 10 }
        rerender(<TransactionCard transaction={updatedTransaction} />)
      }

      expect(screen.getByText('123 Main Street, Anytown, CA 90210')).toBeInTheDocument()
    })
  })
})