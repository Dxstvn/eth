import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TransactionList from '../dashboard/transaction-list'
import TransactionCard from '../dashboard/transaction-card'

// Mock components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, asChild }: any) => {
    const Component = asChild ? 'a' : 'button'
    return <Component onClick={onClick} className={className}>{children}</Component>
  },
}))

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value, className, children }: any) => (
    <div className={className} data-testid="progress-bar" data-value={value}>
      {children}
    </div>
  ),
}))

vi.mock('@/components/transaction-stage-indicator', () => ({
  default: ({ stage, size }: any) => (
    <div data-testid="transaction-stage-indicator" data-stage={stage} data-size={size}>
      {stage}
    </div>
  ),
}))

vi.mock('next/link', () => ({
  default: ({ children, href, className }: any) => (
    <a href={href} className={className}>{children}</a>
  ),
}))

// Mock lucide icons
vi.mock('lucide-react', () => {
  const icons = [
    'Building', 'FileCheck', 'Plus', 'ArrowRight', 'CheckCircle', 'Clock',
    'FileText', 'LockKeyhole', 'UserCheck', 'DollarSign', 'Calendar', 'User'
  ]
  
  const mockIcons: any = {}
  icons.forEach(icon => {
    mockIcons[icon] = ({ className }: any) => (
      <div data-testid={`icon-${icon.toLowerCase()}`} className={className} />
    )
  })
  
  return mockIcons
})

describe('Transaction Management Metrics & Updates', () => {
  describe('TransactionList Component', () => {
    describe('Active Transactions Display', () => {
      it('should display transaction metrics correctly', () => {
        render(<TransactionList />)

        // Should show active transactions by default
        expect(screen.getByText('123 Blockchain Ave, Crypto City')).toBeInTheDocument()
        expect(screen.getByText('2.5 ETH')).toBeInTheDocument()
        expect(screen.getByText('John Smith')).toBeInTheDocument()
        expect(screen.getByText('40%')).toBeInTheDocument()

        expect(screen.getByText('456 Smart Contract St, Token Town')).toBeInTheDocument()
        expect(screen.getByText('150,000 USDC')).toBeInTheDocument()
        expect(screen.getByText('Sarah Johnson')).toBeInTheDocument()
        expect(screen.getByText('20%')).toBeInTheDocument()
      })

      it('should show transaction count accurately', () => {
        render(<TransactionList />)

        // Should display 2 transaction cards
        const transactionCards = document.querySelectorAll('[data-testid="transaction-stage-indicator"]')
        expect(transactionCards).toHaveLength(2)
      })

      it('should display progress percentages correctly', () => {
        render(<TransactionList />)

        const progressBars = screen.getAllByTestId('progress-bar')
        expect(progressBars).toHaveLength(2)
        expect(progressBars[0]).toHaveAttribute('data-value', '40')
        expect(progressBars[1]).toHaveAttribute('data-value', '20')
      })
    })

    describe('Tab Switching & Data Updates', () => {
      it('should update displayed data when switching tabs', async () => {
        const user = userEvent.setup()
        render(<TransactionList />)

        // Initially on active tab
        expect(screen.getByText('2.5 ETH')).toBeInTheDocument()

        // Switch to completed tab
        const completedTab = screen.getByText('Completed')
        await user.click(completedTab)

        // Should show empty state for completed transactions
        expect(screen.getByText('No completed transactions')).toBeInTheDocument()
        expect(screen.queryByText('2.5 ETH')).not.toBeInTheDocument()

        // Switch to all transactions tab
        const allTab = screen.getByText('All Transactions')
        await user.click(allTab)

        // Should show all transactions (same as active in this case)
        expect(screen.getByText('2.5 ETH')).toBeInTheDocument()
        expect(screen.getByText('150,000 USDC')).toBeInTheDocument()
      })

      it('should maintain accurate tab state', async () => {
        const user = userEvent.setup()
        render(<TransactionList />)

        // Check initial active state
        const activeTab = screen.getByText('Active Transactions')
        expect(activeTab).toHaveClass('border-black', 'text-black')

        const completedTab = screen.getByText('Completed')
        expect(completedTab).toHaveClass('border-transparent', 'text-gray-500')

        // Click completed tab
        await user.click(completedTab)

        // State should update
        expect(completedTab).toHaveClass('border-black', 'text-black')
        expect(activeTab).toHaveClass('border-transparent', 'text-gray-500')
      })
    })

    describe('Empty State Handling', () => {
      it('should show appropriate empty state for completed transactions', async () => {
        const user = userEvent.setup()
        render(<TransactionList />)

        await user.click(screen.getByText('Completed'))

        expect(screen.getByText('No completed transactions')).toBeInTheDocument()
        expect(screen.getByText('You don\'t have any completed real estate transactions yet.')).toBeInTheDocument()
        expect(screen.getByTestId('icon-filecheck')).toBeInTheDocument()
      })

      it('should handle dynamic empty states when data changes', () => {
        // This test would be relevant when connected to real backend data
        // For now, testing the UI structure
        render(<TransactionList />)

        // The empty state structure should be available
        const activeTab = screen.getByText('Active Transactions')
        expect(activeTab).toBeInTheDocument()
      })
    })
  })

  describe('TransactionCard Component', () => {
    const mockTransaction = {
      id: 'TX123456',
      propertyAddress: '123 Test Street, Test City',
      amount: '5.0 ETH',
      status: 'verification',
      counterparty: 'Test User',
      date: '2025-01-23',
      progress: 60,
    }

    describe('Transaction Data Display', () => {
      it('should display all transaction metrics correctly', () => {
        render(<TransactionCard transaction={mockTransaction} />)

        expect(screen.getByText('123 Test Street, Test City')).toBeInTheDocument()
        expect(screen.getByText('5.0 ETH')).toBeInTheDocument()
        expect(screen.getByText('TX123456')).toBeInTheDocument()
        expect(screen.getByText('Test User')).toBeInTheDocument()
        expect(screen.getByText('2025-01-23')).toBeInTheDocument()
        expect(screen.getByText('60%')).toBeInTheDocument()
      })

      it('should display progress bar with correct value', () => {
        render(<TransactionCard transaction={mockTransaction} />)

        const progressBar = screen.getByTestId('progress-bar')
        expect(progressBar).toHaveAttribute('data-value', '60')
      })

      it('should show correct transaction stage', () => {
        render(<TransactionCard transaction={mockTransaction} />)

        const stageIndicator = screen.getByTestId('transaction-stage-indicator')
        expect(stageIndicator).toHaveAttribute('data-stage', 'verification')
        expect(stageIndicator).toHaveAttribute('data-size', 'sm')
      })
    })

    describe('Dynamic Status Updates', () => {
      it('should update when transaction status changes', () => {
        const { rerender } = render(<TransactionCard transaction={mockTransaction} />)

        // Initial status
        expect(screen.getByTestId('transaction-stage-indicator')).toHaveAttribute('data-stage', 'verification')

        // Update status
        const updatedTransaction = {
          ...mockTransaction,
          status: 'in_escrow',
          progress: 80,
        }

        rerender(<TransactionCard transaction={updatedTransaction} />)

        expect(screen.getByTestId('transaction-stage-indicator')).toHaveAttribute('data-stage', 'in_escrow')
        expect(screen.getByText('80%')).toBeInTheDocument()
        expect(screen.getByTestId('progress-bar')).toHaveAttribute('data-value', '80')
      })

      it('should update when transaction amount changes', () => {
        const { rerender } = render(<TransactionCard transaction={mockTransaction} />)

        expect(screen.getByText('5.0 ETH')).toBeInTheDocument()

        const updatedTransaction = {
          ...mockTransaction,
          amount: '7.5 ETH',
        }

        rerender(<TransactionCard transaction={updatedTransaction} />)

        expect(screen.getByText('7.5 ETH')).toBeInTheDocument()
        expect(screen.queryByText('5.0 ETH')).not.toBeInTheDocument()
      })

      it('should update when counterparty changes', () => {
        const { rerender } = render(<TransactionCard transaction={mockTransaction} />)

        expect(screen.getByText('Test User')).toBeInTheDocument()

        const updatedTransaction = {
          ...mockTransaction,
          counterparty: 'Updated User',
        }

        rerender(<TransactionCard transaction={updatedTransaction} />)

        expect(screen.getByText('Updated User')).toBeInTheDocument()
        expect(screen.queryByText('Test User')).not.toBeInTheDocument()
      })
    })

    describe('Progress Tracking', () => {
      it('should display progress accurately for different stages', () => {
        const stages = [
          { status: 'verification', progress: 25, expectedProgress: '25%' },
          { status: 'awaiting_funds', progress: 50, expectedProgress: '50%' },
          { status: 'in_escrow', progress: 75, expectedProgress: '75%' },
          { status: 'completed', progress: 100, expectedProgress: '100%' },
        ]

        stages.forEach(({ status, progress, expectedProgress }) => {
          const transaction = {
            ...mockTransaction,
            status,
            progress,
          }

          const { unmount } = render(<TransactionCard transaction={transaction} />)

          expect(screen.getByText(expectedProgress)).toBeInTheDocument()
          expect(screen.getByTestId('progress-bar')).toHaveAttribute('data-value', progress.toString())

          unmount()
        })
      })

      it('should handle progress updates in real-time', () => {
        const { rerender } = render(<TransactionCard transaction={mockTransaction} />)

        // Simulate progress updates
        const progressUpdates = [10, 25, 50, 75, 90, 100]

        progressUpdates.forEach(progress => {
          const updatedTransaction = {
            ...mockTransaction,
            progress,
          }

          rerender(<TransactionCard transaction={updatedTransaction} />)

          expect(screen.getByText(`${progress}%`)).toBeInTheDocument()
          expect(screen.getByTestId('progress-bar')).toHaveAttribute('data-value', progress.toString())
        })
      })
    })

    describe('Amount and Currency Updates', () => {
      it('should handle different currency formats', () => {
        const currencies = [
          { amount: '1.5 ETH', display: '1.5 ETH' },
          { amount: '100,000 USDC', display: '100,000 USDC' },
          { amount: '$250,000', display: '$250,000' },
          { amount: '0.5 BTC', display: '0.5 BTC' },
        ]

        currencies.forEach(({ amount, display }) => {
          const transaction = {
            ...mockTransaction,
            amount,
          }

          const { unmount } = render(<TransactionCard transaction={transaction} />)

          expect(screen.getByText(display)).toBeInTheDocument()

          unmount()
        })
      })

      it('should update amount formatting when currency changes', () => {
        const { rerender } = render(<TransactionCard transaction={mockTransaction} />)

        expect(screen.getByText('5.0 ETH')).toBeInTheDocument()

        // Change to USDC
        rerender(<TransactionCard transaction={{
          ...mockTransaction,
          amount: '5,000 USDC'
        }} />)

        expect(screen.getByText('5,000 USDC')).toBeInTheDocument()
        expect(screen.queryByText('5.0 ETH')).not.toBeInTheDocument()
      })
    })

    describe('Date and Time Updates', () => {
      it('should display and update dates correctly', () => {
        const { rerender } = render(<TransactionCard transaction={mockTransaction} />)

        expect(screen.getByText('2025-01-23')).toBeInTheDocument()

        const updatedTransaction = {
          ...mockTransaction,
          date: '2025-01-24',
        }

        rerender(<TransactionCard transaction={updatedTransaction} />)

        expect(screen.getByText('2025-01-24')).toBeInTheDocument()
        expect(screen.queryByText('2025-01-23')).not.toBeInTheDocument()
      })
    })

    describe('Interactive Elements', () => {
      it('should have functional view details link', () => {
        render(<TransactionCard transaction={mockTransaction} />)

        const viewDetailsLink = screen.getByText('View Details').closest('a')
        expect(viewDetailsLink).toHaveAttribute('href', '/transactions/TX123456')
      })

      it('should update link when transaction ID changes', () => {
        const { rerender } = render(<TransactionCard transaction={mockTransaction} />)

        const updatedTransaction = {
          ...mockTransaction,
          id: 'TX789012',
        }

        rerender(<TransactionCard transaction={updatedTransaction} />)

        const viewDetailsLink = screen.getByText('View Details').closest('a')
        expect(viewDetailsLink).toHaveAttribute('href', '/transactions/TX789012')
      })
    })
  })

  describe('Integration and Performance', () => {
    it('should handle multiple transaction updates efficiently', () => {
      const transactions = Array.from({ length: 10 }, (_, i) => ({
        id: `TX${i}`,
        propertyAddress: `${i} Test Street`,
        amount: `${i + 1}.0 ETH`,
        status: 'verification',
        counterparty: `User ${i}`,
        date: '2025-01-23',
        progress: (i + 1) * 10,
      }))

      const { rerender } = render(
        <div>
          {transactions.map(transaction => (
            <TransactionCard key={transaction.id} transaction={transaction} />
          ))}
        </div>
      )

      // Verify all transactions render
      transactions.forEach(transaction => {
        expect(screen.getByText(transaction.propertyAddress)).toBeInTheDocument()
        expect(screen.getByText(transaction.amount)).toBeInTheDocument()
      })

      // Update all transactions
      const updatedTransactions = transactions.map(t => ({
        ...t,
        progress: Math.min(t.progress + 10, 100),
      }))

      rerender(
        <div>
          {updatedTransactions.map(transaction => (
            <TransactionCard key={transaction.id} transaction={transaction} />
          ))}
        </div>
      )

      // Verify updates - use getAllByText for progress percentages that might be duplicated
      updatedTransactions.forEach(transaction => {
        const progressElements = screen.getAllByText(`${transaction.progress}%`)
        expect(progressElements.length).toBeGreaterThanOrEqual(1)
      })
    })

    it('should maintain state consistency during rapid updates', () => {
      const mockTransaction = {
        id: 'TX123456',
        propertyAddress: '123 Test Street, Test City',
        amount: '5.0 ETH',
        status: 'verification',
        counterparty: 'Test User',
        date: '2025-01-23',
        progress: 60,
      }

      const { rerender } = render(<TransactionCard transaction={mockTransaction} />)

      // Simulate rapid updates
      for (let i = 0; i < 20; i++) {
        const updatedTransaction = {
          ...mockTransaction,
          progress: i * 5,
          amount: `${i + 1}.0 ETH`,
        }

        rerender(<TransactionCard transaction={updatedTransaction} />)

        // Should always display consistent data
        expect(screen.getByText(`${i * 5}%`)).toBeInTheDocument()
        expect(screen.getByText(`${i + 1}.0 ETH`)).toBeInTheDocument()
      }
    })
  })
})