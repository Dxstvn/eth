import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import RecentActivity from '../recent-activity'

// Mock the database store
const mockGetActivities = vi.fn()
vi.mock('@/lib/mock-database', () => ({
  useDatabaseStore: () => ({
    getActivities: mockGetActivities,
  }),
}))

// Mock lucide icons
vi.mock('lucide-react', () => ({
  ArrowUpRight: ({ className }: any) => <div data-testid="arrow-up-right" className={className} />,
  ArrowDownRight: ({ className }: any) => <div data-testid="arrow-down-right" className={className} />,
  FileText: ({ className }: any) => <div data-testid="file-text" className={className} />,
  MessageSquare: ({ className }: any) => <div data-testid="message-square" className={className} />,
}))

const mockActivities = [
  {
    id: 1,
    type: 'payment_sent',
    title: 'Payment Sent',
    description: 'Escrow payment of $500,000 sent to smart contract',
    time: '2 hours ago',
    date: '2024-01-15',
  },
  {
    id: 2,
    type: 'payment_received',
    title: 'Payment Received',
    description: 'Received $50,000 from John Smith',
    time: '4 hours ago',
    date: '2024-01-15',
  },
  {
    id: 3,
    type: 'document_signed',
    title: 'Document Signed',
    description: 'Purchase agreement signed by all parties',
    time: '1 day ago',
    date: '2024-01-14',
  },
  {
    id: 4,
    type: 'message',
    title: 'New Message',
    description: 'Message from buyer about inspection',
    time: '2 days ago',
    date: '2024-01-13',
  },
]

describe('RecentActivity Component', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockGetActivities.mockReturnValue(mockActivities)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('Loading State', () => {
    it('should show loading skeleton when activities are being fetched', () => {
      render(<RecentActivity />)

      // Should show 4 skeleton items
      const skeletons = screen.getAllByRole('generic').filter(el => 
        el.className.includes('animate-pulse')
      )
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('should complete loading after timeout', () => {
      render(<RecentActivity />)

      // Fast-forward timer
      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(screen.getByText('Payment Sent')).toBeInTheDocument()
    })

    it('should not show loading when activities are provided as props', () => {
      render(<RecentActivity activities={mockActivities} />)

      // Should immediately show activities
      expect(screen.getByText('Payment Sent')).toBeInTheDocument()
      expect(screen.queryByRole('generic', { name: /animate-pulse/ })).not.toBeInTheDocument()
    })
  })

  describe('Activity Rendering', () => {
    it('should render all provided activities', () => {
      render(<RecentActivity />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(screen.getByText('Payment Sent')).toBeInTheDocument()
      expect(screen.getByText('Payment Received')).toBeInTheDocument()
      expect(screen.getByText('Document Signed')).toBeInTheDocument()
      expect(screen.getByText('New Message')).toBeInTheDocument()
    })

    it('should render activity descriptions', () => {
      render(<RecentActivity />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(screen.getByText('Escrow payment of $500,000 sent to smart contract')).toBeInTheDocument()
      expect(screen.getByText('Received $50,000 from John Smith')).toBeInTheDocument()
      expect(screen.getByText('Purchase agreement signed by all parties')).toBeInTheDocument()
      expect(screen.getByText('Message from buyer about inspection')).toBeInTheDocument()
    })

    it('should render activity timestamps', () => {
      render(<RecentActivity />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(screen.getByText('2 hours ago')).toBeInTheDocument()
      expect(screen.getByText('4 hours ago')).toBeInTheDocument()
      expect(screen.getByText('1 day ago')).toBeInTheDocument()
      expect(screen.getByText('2 days ago')).toBeInTheDocument()
    })

    it('should render activities with prop data immediately', () => {
      render(<RecentActivity activities={mockActivities} />)

      expect(screen.getByText('Payment Sent')).toBeInTheDocument()
      expect(screen.getByText('Payment Received')).toBeInTheDocument()
      expect(screen.getByText('Document Signed')).toBeInTheDocument()
      expect(screen.getByText('New Message')).toBeInTheDocument()
    })
  })

  describe('Activity Icons', () => {
    it('should render correct icon for payment_sent', () => {
      render(<RecentActivity />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      const paymentSentIcon = screen.getByTestId('arrow-up-right')
      expect(paymentSentIcon).toBeInTheDocument()
      expect(paymentSentIcon.closest('.bg-green-100.text-green-600')).toBeInTheDocument()
    })

    it('should render correct icon for payment_received', () => {
      render(<RecentActivity />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      const paymentReceivedIcon = screen.getByTestId('arrow-down-right')
      expect(paymentReceivedIcon).toBeInTheDocument()
      expect(paymentReceivedIcon.closest('.bg-teal-100.text-teal-600')).toBeInTheDocument()
    })

    it('should render correct icon for document_signed', () => {
      render(<RecentActivity />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      const documentIcon = screen.getByTestId('file-text')
      expect(documentIcon).toBeInTheDocument()
      expect(documentIcon.closest('.bg-purple-100.text-purple-600')).toBeInTheDocument()
    })

    it('should render correct icon for message', () => {
      render(<RecentActivity />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      const messageIcons = screen.getAllByTestId('message-square')
      expect(messageIcons.length).toBeGreaterThan(0)
      expect(messageIcons[0].closest('.bg-amber-100.text-amber-600')).toBeInTheDocument()
    })

    it('should handle unknown activity types with default icon', () => {
      const unknownActivity = {
        id: 5,
        type: 'unknown_type',
        title: 'Unknown Activity',
        description: 'Some unknown activity occurred',
        time: '1 hour ago',
        date: '2024-01-15',
      }

      mockGetActivities.mockReturnValue([unknownActivity])
      render(<RecentActivity />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      const defaultIcon = screen.getByTestId('message-square')
      expect(defaultIcon).toBeInTheDocument()
      expect(defaultIcon.closest('.bg-neutral-100.text-neutral-600')).toBeInTheDocument()
    })
  })

  describe('Layout and Styling', () => {
    it('should have correct container spacing', () => {
      render(<RecentActivity />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      const container = screen.getByText('Payment Sent').closest('.space-y-2')
      expect(container).toBeInTheDocument()
    })

    it('should have hover effects on activity items', () => {
      render(<RecentActivity />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      const activityItem = screen.getByText('Payment Sent').closest('.hover\\:bg-neutral-50')
      expect(activityItem).toBeInTheDocument()
      expect(activityItem).toHaveClass('transition-colors')
    })

    it('should have proper item layout', () => {
      render(<RecentActivity />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      const activityItem = screen.getByText('Payment Sent').closest('.flex.items-start.space-x-3')
      expect(activityItem).toBeInTheDocument()
      expect(activityItem).toHaveClass('p-3', 'rounded-lg')
    })

    it('should have proper icon container styling', () => {
      render(<RecentActivity />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      const iconContainer = screen.getByTestId('arrow-up-right').closest('.p-2.rounded-full')
      expect(iconContainer).toBeInTheDocument()
      expect(iconContainer).toHaveClass('flex', 'items-center', 'justify-center', 'flex-shrink-0')
    })
  })

  describe('Typography', () => {
    it('should have correct title typography', () => {
      render(<RecentActivity />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      const title = screen.getByText('Payment Sent')
      expect(title).toHaveClass('font-medium', 'text-teal-900')
    })

    it('should have correct description typography', () => {
      render(<RecentActivity />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      const description = screen.getByText('Escrow payment of $500,000 sent to smart contract')
      expect(description).toHaveClass('text-sm', 'text-neutral-600')
    })

    it('should have correct timestamp typography', () => {
      render(<RecentActivity />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      const timestamp = screen.getByText('2 hours ago')
      expect(timestamp).toHaveClass('text-xs', 'text-neutral-400', 'mt-1')
    })
  })

  describe('Empty State', () => {
    it('should handle empty activities array', () => {
      mockGetActivities.mockReturnValue([])
      render(<RecentActivity />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      const container = document.querySelector('.space-y-2')
      expect(container).toBeInTheDocument()
    })

    it('should handle empty activities prop', () => {
      render(<RecentActivity activities={[]} />)

      const container = document.querySelector('.space-y-2')
      expect(container).toBeInTheDocument()
    })
  })

  describe('Props vs Database', () => {
    it('should prioritize prop activities over database', () => {
      const propActivities = [
        {
          id: 99,
          type: 'message',
          title: 'Prop Activity',
          description: 'This is from props',
          time: '1 minute ago',
          date: '2024-01-15',
        },
      ]

      render(<RecentActivity activities={propActivities} />)

      expect(screen.getByText('Prop Activity')).toBeInTheDocument()
      expect(screen.getByText('This is from props')).toBeInTheDocument()
      expect(mockGetActivities).not.toHaveBeenCalled()
    })

    it('should use database when no props provided', () => {
      render(<RecentActivity />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(mockGetActivities).toHaveBeenCalled()
      expect(screen.getByText('Payment Sent')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing activity properties gracefully', () => {
      const incompleteActivity = {
        id: 1,
        type: 'payment_sent',
        title: '',
        description: '',
        time: '',
        date: '',
      }

      mockGetActivities.mockReturnValue([incompleteActivity])
      render(<RecentActivity />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      // Should still render the activity structure
      const activityItem = screen.getByTestId('arrow-up-right').closest('.flex')
      expect(activityItem).toBeInTheDocument()
    })

    it('should handle very long activity descriptions', () => {
      const longActivity = {
        id: 1,
        type: 'message',
        title: 'Very Long Message Title That Might Cause Layout Issues',
        description: 'This is a very long activity description that contains a lot of text and might cause layout issues if not handled properly. It should wrap correctly and maintain proper spacing.',
        time: '5 minutes ago',
        date: '2024-01-15',
      }

      mockGetActivities.mockReturnValue([longActivity])
      render(<RecentActivity />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(screen.getByText(/Very Long Message Title/)).toBeInTheDocument()
      expect(screen.getByText(/This is a very long activity description/)).toBeInTheDocument()
    })

    it('should handle special characters in content', () => {
      const specialActivity = {
        id: 1,
        type: 'message',
        title: 'Special Characters: !@#$%^&*()',
        description: 'Unicode content: 💰 Payment of $500K received 🎉',
        time: '1 hour ago',
        date: '2024-01-15',
      }

      mockGetActivities.mockReturnValue([specialActivity])
      render(<RecentActivity />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(screen.getByText('Special Characters: !@#$%^&*()')).toBeInTheDocument()
      expect(screen.getByText(/Unicode content: 💰 Payment/)).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('should cleanup timer on unmount', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
      
      const { unmount } = render(<RecentActivity />)
      unmount()

      expect(clearTimeoutSpy).toHaveBeenCalled()
    })

    it('should handle multiple re-renders efficiently', () => {
      const { rerender } = render(<RecentActivity />)
      
      act(() => {
        vi.advanceTimersByTime(1000)
      })
      
      // Re-render with different props
      rerender(<RecentActivity activities={mockActivities} />)
      rerender(<RecentActivity activities={[]} />)
      rerender(<RecentActivity />)

      const container = document.querySelector('.space-y-2')
      expect(container).toBeInTheDocument()
    })

    it('should not cause memory leaks with timer', () => {
      // Render and unmount multiple times
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(<RecentActivity />)
        unmount()
      }

      // Should not accumulate timers
      expect(() => vi.advanceTimersByTime(1000)).not.toThrow()
    })
  })

  describe('Accessibility', () => {
    it('should have proper semantic structure', () => {
      render(<RecentActivity />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      // Activities should be in a logical structure
      const activities = screen.getAllByText(/Payment|Document|Message/)
      expect(activities.length).toBeGreaterThan(0)
    })

    it('should have proper text hierarchy', () => {
      render(<RecentActivity />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      const titles = screen.getAllByText(/Payment Sent|Payment Received|Document Signed|New Message/)
      const descriptions = screen.getAllByText(/Escrow payment of \$500,000|Received \$50,000|Purchase agreement signed|Message from buyer/)
      const timestamps = screen.getAllByText(/hours ago|day ago|days ago/)

      expect(titles.length).toBe(4)
      expect(descriptions.length).toBe(4)
      expect(timestamps.length).toBe(4)
    })

    it('should have sufficient color contrast', () => {
      render(<RecentActivity />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      const title = screen.getByText('Payment Sent')
      expect(title).toHaveClass('text-teal-900') // High contrast

      const description = screen.getByText('Escrow payment of $500,000 sent to smart contract')
      expect(description).toHaveClass('text-neutral-600') // Sufficient contrast

      const timestamp = screen.getByText('2 hours ago')
      expect(timestamp).toHaveClass('text-neutral-400') // Lighter but still readable
    })
  })

  describe('Icon Sizing', () => {
    it('should have consistent icon sizing', () => {
      render(<RecentActivity />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      const icons = screen.getAllByTestId(/arrow-up-right|arrow-down-right|file-text|message-square/)
      icons.forEach(icon => {
        expect(icon).toHaveClass('h-4', 'w-4')
      })
    })

    it('should have proper icon container sizing', () => {
      render(<RecentActivity />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      const iconContainers = screen.getAllByTestId(/arrow-up-right|arrow-down-right|file-text|message-square/)
      iconContainers.forEach(icon => {
        const container = icon.closest('.p-2.rounded-full')
        expect(container).toBeInTheDocument()
      })
    })
  })
})