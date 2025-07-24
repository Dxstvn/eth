import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TransactionStageIndicator from '../transaction-stage-indicator'
import TransactionTimeline from '../transaction-timeline'
import TransactionParties from '../transaction-parties'

// Mock lucide icons
vi.mock('lucide-react', () => {
  const icons = [
    'CheckCircle', 'FileText', 'LockKeyhole', 'UserCheck', 'DollarSign', 
    'AlertCircle', 'Eye', 'ListChecks', 'Clock', 'User', 'Building'
  ]
  
  const mockIcons: any = {}
  icons.forEach(icon => {
    mockIcons[icon] = ({ className }: any) => (
      <div data-testid={`icon-${icon.toLowerCase()}`} className={className} />
    )
  })
  
  return mockIcons
})

describe('Transaction Components', () => {
  describe('TransactionStageIndicator', () => {
    describe('Basic Rendering', () => {
      it('should render with default props', () => {
        render(<TransactionStageIndicator stage="verification" />)
        
        expect(screen.getByText('Verification')).toBeInTheDocument()
        expect(screen.getByTestId('icon-usercheck')).toBeInTheDocument()
      })

      it('should render without label when showLabel is false', () => {
        render(<TransactionStageIndicator stage="verification" showLabel={false} />)
        
        expect(screen.queryByText('Verification')).not.toBeInTheDocument()
        expect(screen.getByTestId('icon-usercheck')).toBeInTheDocument()
      })

      it('should accept custom className', () => {
        render(
          <TransactionStageIndicator 
            stage="verification" 
            className="custom-class" 
          />
        )
        
        const container = screen.getByText('Verification').parentElement
        expect(container).toHaveClass('custom-class')
      })
    })

    describe('Stage Variations', () => {
      const stages: Array<{ stage: any, label: string, icon: string, colorClass: string }> = [
        { stage: 'verification', label: 'Verification', icon: 'usercheck', colorClass: 'bg-blue-50' },
        { stage: 'awaiting_funds', label: 'Awaiting Funds', icon: 'dollarsign', colorClass: 'bg-amber-50' },
        { stage: 'in_escrow', label: 'In Escrow', icon: 'lockkeyhole', colorClass: 'bg-purple-50' },
        { stage: 'pending_approval', label: 'Pending Approval', icon: 'filetext', colorClass: 'bg-orange-50' },
        { stage: 'completed', label: 'Completed', icon: 'checkcircle', colorClass: 'bg-green-50' },
        { stage: 'cancelled', label: 'Cancelled', icon: 'alertcircle', colorClass: 'bg-red-50' },
        { stage: 'disputed', label: 'Disputed', icon: 'alertcircle', colorClass: 'bg-red-50' },
        { stage: 'pending_buyer_review', label: 'Pending Buyer Review', icon: 'eye', colorClass: 'bg-indigo-50' },
        { stage: 'pending_conditions', label: 'Pending Conditions', icon: 'listchecks', colorClass: 'bg-cyan-50' },
        { stage: 'awaiting_seller_confirmation', label: 'Awaiting Seller Confirmation', icon: 'usercheck', colorClass: 'bg-emerald-50' },
      ]

      stages.forEach(({ stage, label, icon, colorClass }) => {
        it(`should render ${stage} stage correctly`, () => {
          render(<TransactionStageIndicator stage={stage} />)
          
          expect(screen.getByText(label)).toBeInTheDocument()
          expect(screen.getByTestId(`icon-${icon}`)).toBeInTheDocument()
          
          const container = screen.getByText(label).parentElement
          expect(container).toHaveClass(colorClass)
        })
      })

      it('should handle unknown stage gracefully', () => {
        render(<TransactionStageIndicator stage="unknown" as any />)
        
        // Should default to verification
        expect(screen.getByText('Verification')).toBeInTheDocument()
      })
    })

    describe('Size Variations', () => {
      it('should render small size correctly', () => {
        render(<TransactionStageIndicator stage="verification" size="sm" />)
        
        const container = screen.getByText('Verification').parentElement
        expect(container).toHaveClass('text-xs', 'py-0.5', 'px-1.5')
        
        const icon = screen.getByTestId('icon-usercheck')
        expect(icon).toHaveClass('h-3', 'w-3', 'mr-0.5')
      })

      it('should render medium size correctly', () => {
        render(<TransactionStageIndicator stage="verification" size="md" />)
        
        const container = screen.getByText('Verification').parentElement
        expect(container).toHaveClass('text-sm', 'py-1', 'px-2')
        
        const icon = screen.getByTestId('icon-usercheck')
        expect(icon).toHaveClass('h-4', 'w-4', 'mr-1')
      })

      it('should render large size correctly', () => {
        render(<TransactionStageIndicator stage="verification" size="lg" />)
        
        const container = screen.getByText('Verification').parentElement
        expect(container).toHaveClass('text-base', 'py-1.5', 'px-3')
        
        const icon = screen.getByTestId('icon-usercheck')
        expect(icon).toHaveClass('h-5', 'w-5', 'mr-1.5')
      })
    })

    describe('Styling', () => {
      it('should have correct base styling', () => {
        render(<TransactionStageIndicator stage="verification" />)
        
        const container = screen.getByText('Verification').parentElement
        expect(container).toHaveClass('inline-flex', 'items-center', 'rounded-full', 'border')
      })

      it('should have correct color styling for each stage', () => {
        render(<TransactionStageIndicator stage="completed" />)
        
        const container = screen.getByText('Completed').parentElement
        expect(container).toHaveClass('bg-green-50', 'text-green-700', 'border-green-200')
      })
    })

    describe('Accessibility', () => {
      it('should have proper semantic structure', () => {
        render(<TransactionStageIndicator stage="verification" />)
        
        const container = screen.getByText('Verification').parentElement
        expect(container).toBeInTheDocument()
      })

      it('should maintain readability without label', () => {
        render(<TransactionStageIndicator stage="verification" showLabel={false} />)
        
        // Icon should still be present for visual indication
        expect(screen.getByTestId('icon-usercheck')).toBeInTheDocument()
      })
    })
  })

  describe('TransactionTimeline', () => {
    describe('Basic Rendering', () => {
      it('should render timeline with all events', () => {
        render(<TransactionTimeline />)
        
        expect(screen.getByText('Transaction Created')).toBeInTheDocument()
        expect(screen.getByText('Verification Process')).toBeInTheDocument()
        expect(screen.getByText('Awaiting Funds')).toBeInTheDocument()
        expect(screen.getByText('In Escrow')).toBeInTheDocument()
        expect(screen.getByText('Transaction Complete')).toBeInTheDocument()
      })

      it('should render event descriptions', () => {
        render(<TransactionTimeline />)
        
        expect(screen.getByText('Transaction was initiated by John Smith')).toBeInTheDocument()
        expect(screen.getByText('Identity verification in progress')).toBeInTheDocument()
        expect(screen.getByText('Waiting for funds to be deposited into escrow')).toBeInTheDocument()
        expect(screen.getByText('Funds held in secure escrow')).toBeInTheDocument()
        expect(screen.getByText('Funds released to recipient')).toBeInTheDocument()
      })

      it('should render timeline structure', () => {
        render(<TransactionTimeline />)
        
        // Check for timeline line
        const timelineLine = document.querySelector('.absolute.left-4.top-0.bottom-0.w-0\\.5.bg-gray-200')
        expect(timelineLine).toBeInTheDocument()
      })
    })

    describe('Event Status', () => {
      it('should render completed events with check icon', () => {
        render(<TransactionTimeline />)
        
        const checkIcons = screen.getAllByTestId('icon-checkcircle')
        expect(checkIcons.length).toBeGreaterThan(0)
      })

      it('should render pending events with clock icon', () => {
        render(<TransactionTimeline />)
        
        const clockIcons = screen.getAllByTestId('icon-clock')
        expect(clockIcons.length).toBeGreaterThan(0)
      })

      it('should show date and time for completed events', () => {
        render(<TransactionTimeline />)
        
        // Check for date/time elements that contain the text
        const dateTimeElements = screen.getAllByText(/April 15, 2023|10:30 AM|11:45 AM/)
        expect(dateTimeElements.length).toBeGreaterThan(0)
      })

      it('should not show date/time for pending events', () => {
        render(<TransactionTimeline />)
        
        // Pending events should not show date/time information
        const pendingEvents = ['Awaiting Funds', 'In Escrow', 'Transaction Complete']
        pendingEvents.forEach(eventTitle => {
          const eventElement = screen.getByText(eventTitle)
          const eventContainer = eventElement.closest('.relative.pl-10')
          // Should not have date/time paragraph for pending events
          const dateTimeElement = eventContainer?.querySelector('.text-xs.text-gray-400.mt-2')
          expect(dateTimeElement).not.toBeInTheDocument()
        })
      })
    })

    describe('Styling', () => {
      it('should have correct status colors', () => {
        render(<TransactionTimeline />)
        
        // Completed status
        const completedIcons = document.querySelectorAll('.bg-green-100.text-green-600')
        expect(completedIcons.length).toBeGreaterThan(0)
        
        // In progress status
        const inProgressIcons = document.querySelectorAll('.bg-blue-100.text-blue-600')
        expect(inProgressIcons.length).toBeGreaterThan(0)
        
        // Pending status
        const pendingIcons = document.querySelectorAll('.bg-gray-100.text-gray-400')
        expect(pendingIcons.length).toBeGreaterThan(0)
      })

      it('should have proper spacing between events', () => {
        render(<TransactionTimeline />)
        
        const eventContainer = document.querySelector('.space-y-8')
        expect(eventContainer).toBeInTheDocument()
      })

      it('should have proper left padding for events', () => {
        render(<TransactionTimeline />)
        
        const events = document.querySelectorAll('.relative.pl-10')
        expect(events.length).toBe(5) // 5 timeline events
      })
    })

    describe('Typography', () => {
      it('should have correct title styling', () => {
        render(<TransactionTimeline />)
        
        const title = screen.getByText('Transaction Created')
        expect(title).toHaveClass('font-medium')
      })

      it('should have correct description styling', () => {
        render(<TransactionTimeline />)
        
        const description = screen.getByText('Transaction was initiated by John Smith')
        expect(description).toHaveClass('text-sm', 'text-gray-500', 'mt-1')
      })

      it('should have correct date/time styling', () => {
        render(<TransactionTimeline />)
        
        const dateTime = screen.getByText(/April 15, 2023.*10:30 AM/)
        expect(dateTime).toHaveClass('text-xs', 'text-gray-400', 'mt-2')
      })
    })
  })

  describe('TransactionParties', () => {
    describe('Basic Rendering', () => {
      it('should render all parties', () => {
        render(<TransactionParties />)
        
        expect(screen.getByText('John Smith')).toBeInTheDocument()
        expect(screen.getByText('Acme Real Estate LLC')).toBeInTheDocument()
        expect(screen.getByText('Secure Escrow Services')).toBeInTheDocument()
      })

      it('should render party roles', () => {
        render(<TransactionParties />)
        
        expect(screen.getByText('Buyer')).toBeInTheDocument()
        expect(screen.getByText('Seller')).toBeInTheDocument()
        expect(screen.getByText('Escrow Agent')).toBeInTheDocument()
      })

      it('should render party emails', () => {
        render(<TransactionParties />)
        
        expect(screen.getByText('john.smith@example.com')).toBeInTheDocument()
        expect(screen.getByText('contact@acmerealestate.com')).toBeInTheDocument()
        expect(screen.getByText('escrow@secureescrow.com')).toBeInTheDocument()
      })
    })

    describe('Party Types', () => {
      it('should render correct icons for party types', () => {
        render(<TransactionParties />)
        
        // Individual icon
        const userIcons = screen.getAllByTestId('icon-user')
        expect(userIcons).toHaveLength(1)
        
        // Company icons
        const buildingIcons = screen.getAllByTestId('icon-building')
        expect(buildingIcons).toHaveLength(2)
      })

      it('should have correct styling for individual parties', () => {
        render(<TransactionParties />)
        
        const individualIcon = screen.getByTestId('icon-user').parentElement
        expect(individualIcon).toHaveClass('bg-blue-50', 'text-blue-600')
      })

      it('should have correct styling for company parties', () => {
        render(<TransactionParties />)
        
        const companyIcons = screen.getAllByTestId('icon-building')
        companyIcons.forEach(icon => {
          expect(icon.parentElement).toHaveClass('bg-purple-50', 'text-purple-600')
        })
      })
    })

    describe('Layout and Styling', () => {
      it('should have proper spacing between parties', () => {
        render(<TransactionParties />)
        
        const container = screen.getByText('John Smith').closest('.space-y-4')
        expect(container).toBeInTheDocument()
      })

      it('should have proper layout for each party', () => {
        render(<TransactionParties />)
        
        const partyContainers = document.querySelectorAll('.flex.items-start.space-x-3')
        expect(partyContainers).toHaveLength(3)
      })

      it('should have rounded icon containers', () => {
        render(<TransactionParties />)
        
        const iconContainers = document.querySelectorAll('.p-2.rounded-full')
        expect(iconContainers).toHaveLength(3)
      })
    })

    describe('Typography', () => {
      it('should have correct name styling', () => {
        render(<TransactionParties />)
        
        const name = screen.getByText('John Smith')
        expect(name).toHaveClass('font-medium')
      })

      it('should have correct role styling', () => {
        render(<TransactionParties />)
        
        const role = screen.getByText('Buyer')
        expect(role).toHaveClass('text-sm', 'text-gray-500')
      })

      it('should have correct email styling', () => {
        render(<TransactionParties />)
        
        const email = screen.getByText('john.smith@example.com')
        expect(email).toHaveClass('text-xs', 'text-gray-400', 'mt-1')
      })
    })

    describe('Accessibility', () => {
      it('should have proper semantic structure for party list', () => {
        render(<TransactionParties />)
        
        const parties = screen.getAllByText(/John Smith|Acme Real Estate LLC|Secure Escrow Services/)
        expect(parties).toHaveLength(3)
      })

      it('should group party information logically', () => {
        render(<TransactionParties />)
        
        // Each party should have name, role, and email grouped together
        const johnSmithContainer = screen.getByText('John Smith').parentElement
        expect(johnSmithContainer).toContainElement(screen.getByText('Buyer'))
        expect(johnSmithContainer).toContainElement(screen.getByText('john.smith@example.com'))
      })
    })
  })

  describe('Integration Tests', () => {
    it('should render multiple transaction components together', () => {
      render(
        <div>
          <TransactionStageIndicator stage="in_escrow" />
          <TransactionTimeline />
          <TransactionParties />
        </div>
      )
      
      // Check that components don't conflict - use getAllByText for text that appears in multiple components
      const inEscrowElements = screen.getAllByText('In Escrow')
      expect(inEscrowElements.length).toBe(2) // Should appear in both StageIndicator and Timeline
      expect(screen.getByText('Transaction Created')).toBeInTheDocument()
      expect(screen.getByText('John Smith')).toBeInTheDocument()
    })

    it('should maintain consistent styling across components', () => {
      render(
        <div>
          <TransactionStageIndicator stage="verification" />
          <TransactionParties />
        </div>
      )
      
      // Both use similar icon styling
      const allIcons = screen.getAllByTestId(/icon-/)
      expect(allIcons.length).toBeGreaterThan(1)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty or missing data gracefully', () => {
      // Components use hardcoded data, so they should always render
      render(<TransactionTimeline />)
      render(<TransactionParties />)
      
      expect(screen.getAllByText(/Transaction|John Smith/).length).toBeGreaterThan(0)
    })

    it('should handle very long text content', () => {
      // Test TransactionStageIndicator with long stage names
      render(<TransactionStageIndicator stage="awaiting_seller_confirmation" />)
      
      expect(screen.getByText('Awaiting Seller Confirmation')).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('should render efficiently with multiple stage indicators', () => {
      const stages: any[] = ['verification', 'in_escrow', 'completed', 'disputed']
      
      render(
        <div>
          {stages.map((stage, index) => (
            <TransactionStageIndicator key={index} stage={stage} />
          ))}
        </div>
      )
      
      expect(screen.getByText('Verification')).toBeInTheDocument()
      expect(screen.getByText('In Escrow')).toBeInTheDocument()
      expect(screen.getByText('Completed')).toBeInTheDocument()
      expect(screen.getByText('Disputed')).toBeInTheDocument()
    })

    it('should handle rapid re-renders', () => {
      const { rerender } = render(<TransactionStageIndicator stage="verification" />)
      
      // Re-render with different stages
      rerender(<TransactionStageIndicator stage="in_escrow" />)
      expect(screen.getByText('In Escrow')).toBeInTheDocument()
      
      rerender(<TransactionStageIndicator stage="completed" />)
      expect(screen.getByText('Completed')).toBeInTheDocument()
    })
  })
})