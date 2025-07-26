/**
 * @fileoverview Unit tests for ReputationBadge component
 * @module tests/reputation/ReputationBadge.test
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReputationBadge, ReputationIndicator, ReputationStars } from '@/components/reputation/ReputationBadge';
import type { ReputationLevel } from '@/components/reputation/ReputationBadge';

describe('ReputationBadge', () => {
  const defaultProps = {
    score: 75,
    level: 'gold' as ReputationLevel,
    verified: true
  };

  describe('Rendering', () => {
    it('should render with correct level styling', () => {
      const { container } = render(<ReputationBadge {...defaultProps} />);
      
      const badge = container.querySelector('[class*="bg-yellow-50"]');
      expect(badge).toBeInTheDocument();
      expect(screen.getByText('Gold')).toBeInTheDocument();
    });

    it('should display score when showScore is true', () => {
      render(<ReputationBadge {...defaultProps} showScore={true} />);
      
      expect(screen.getByText('75')).toBeInTheDocument();
    });

    it('should hide score when showScore is false', () => {
      render(<ReputationBadge {...defaultProps} showScore={false} />);
      
      expect(screen.queryByText('75')).not.toBeInTheDocument();
    });

    it('should show verified checkmark when verified', () => {
      const { container } = render(<ReputationBadge {...defaultProps} verified={true} />);
      
      const checkmark = container.querySelector('[class*="fill-green-500"]');
      expect(checkmark).toBeInTheDocument();
    });

    it('should not show checkmark when not verified', () => {
      const { container } = render(<ReputationBadge {...defaultProps} verified={false} />);
      
      const checkmark = container.querySelector('[class*="fill-green-500"]');
      expect(checkmark).not.toBeInTheDocument();
    });

    it('should render all reputation levels correctly', () => {
      const levels: ReputationLevel[] = ['unverified', 'bronze', 'silver', 'gold', 'platinum'];
      
      levels.forEach(level => {
        const { rerender } = render(<ReputationBadge score={50} level={level} />);
        
        const expectedLabel = level.charAt(0).toUpperCase() + level.slice(1);
        expect(screen.getByText(expectedLabel)).toBeInTheDocument();
        
        rerender(<div />); // Clean up for next iteration
      });
    });
  });

  describe('Sizes', () => {
    it('should render small size correctly', () => {
      const { container } = render(<ReputationBadge {...defaultProps} size="sm" />);
      
      const badge = container.querySelector('[class*="h-8"]');
      expect(badge).toBeInTheDocument();
    });

    it('should render medium size correctly', () => {
      const { container } = render(<ReputationBadge {...defaultProps} size="md" />);
      
      const badge = container.querySelector('[class*="h-10"]');
      expect(badge).toBeInTheDocument();
    });

    it('should render large size correctly', () => {
      const { container } = render(<ReputationBadge {...defaultProps} size="lg" />);
      
      const badge = container.querySelector('[class*="h-12"]');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Interactivity', () => {
    it('should call onClick when clicked', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();
      
      render(<ReputationBadge {...defaultProps} onClick={handleClick} />);
      
      const badge = screen.getByText('Gold').closest('div');
      await user.click(badge!);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should show tooltip on hover when interactive', async () => {
      const user = userEvent.setup();
      
      render(<ReputationBadge {...defaultProps} interactive={true} />);
      
      const badge = screen.getByText('Gold').closest('div');
      await user.hover(badge!);
      
      // Wait for tooltip to appear
      const tooltip = await screen.findByText('Gold Member');
      expect(tooltip).toBeInTheDocument();
      expect(screen.getByText('Reputation Score: 75/100')).toBeInTheDocument();
    });

    it('should not show tooltip when not interactive', async () => {
      const user = userEvent.setup();
      
      render(<ReputationBadge {...defaultProps} interactive={false} />);
      
      const badge = screen.getByText('Gold').closest('div');
      await user.hover(badge!);
      
      // Tooltip should not appear
      expect(screen.queryByText('Gold Member')).not.toBeInTheDocument();
    });

    it('should show hover effects when interactive', () => {
      const { container } = render(<ReputationBadge {...defaultProps} interactive={true} />);
      
      const badge = container.querySelector('[class*="hover:shadow-md"]');
      expect(badge).toBeInTheDocument();
    });

    it('should not show hover effects when not interactive', () => {
      const { container } = render(<ReputationBadge {...defaultProps} interactive={false} />);
      
      const badge = container.querySelector('[class*="hover:shadow-md"]');
      expect(badge).not.toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <ReputationBadge {...defaultProps} className="custom-class" />
      );
      
      const badge = container.querySelector('.custom-class');
      expect(badge).toBeInTheDocument();
    });

    it('should maintain level colors with custom styling', () => {
      const { container } = render(
        <ReputationBadge {...defaultProps} level="platinum" className="custom-class" />
      );
      
      const badge = container.querySelector('[class*="bg-purple-50"]');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('custom-class');
    });
  });
});

describe('ReputationIndicator', () => {
  it('should render compact indicator', () => {
    render(<ReputationIndicator score={85} level="gold" />);
    
    expect(screen.getByText('85')).toBeInTheDocument();
  });

  it('should show correct gradient for level', () => {
    const { container } = render(<ReputationIndicator score={85} level="platinum" />);
    
    const indicator = container.querySelector('[class*="from-purple-400"]');
    expect(indicator).toBeInTheDocument();
  });

  it('should show tooltip on hover', async () => {
    const user = userEvent.setup();
    
    render(<ReputationIndicator score={60} level="silver" />);
    
    const indicator = screen.getByText('60').closest('div');
    await user.hover(indicator!);
    
    const tooltip = await screen.findByText(/Silver • Score: 60\/100/);
    expect(tooltip).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ReputationIndicator score={50} level="bronze" className="inline-block" />
    );
    
    const indicator = container.querySelector('.inline-block');
    expect(indicator).toBeInTheDocument();
  });
});

describe('ReputationStars', () => {
  it('should render correct number of filled stars', () => {
    const { container } = render(<ReputationStars score={80} />);
    
    const filledStars = container.querySelectorAll('[class*="fill-yellow-400"]');
    expect(filledStars).toHaveLength(4); // 80/100 * 5 = 4 stars
  });

  it('should render 5 total stars', () => {
    const { container } = render(<ReputationStars score={50} />);
    
    const allStars = container.querySelectorAll('svg');
    expect(allStars).toHaveLength(5);
  });

  it('should handle edge cases correctly', () => {
    // Score 0
    const { container: container0 } = render(<ReputationStars score={0} />);
    const filledStars0 = container0.querySelectorAll('[class*="fill-yellow-400"]');
    expect(filledStars0).toHaveLength(0);

    // Score 100
    const { container: container100 } = render(<ReputationStars score={100} />);
    const filledStars100 = container100.querySelectorAll('[class*="fill-yellow-400"]');
    expect(filledStars100).toHaveLength(5);
  });

  it('should render different sizes correctly', () => {
    const { container: containerSm } = render(<ReputationStars score={60} size="sm" />);
    const starSm = containerSm.querySelector('[class*="h-3"]');
    expect(starSm).toBeInTheDocument();

    const { container: containerLg } = render(<ReputationStars score={60} size="lg" />);
    const starLg = containerLg.querySelector('[class*="h-5"]');
    expect(starLg).toBeInTheDocument();
  });

  it('should round scores correctly', () => {
    // Score 69 should round to 3 stars (69/100 * 5 = 3.45 -> 3)
    const { container: container69 } = render(<ReputationStars score={69} />);
    const filledStars69 = container69.querySelectorAll('[class*="fill-yellow-400"]');
    expect(filledStars69).toHaveLength(3);

    // Score 70 should round to 4 stars (70/100 * 5 = 3.5 -> 4)
    const { container: container70 } = render(<ReputationStars score={70} />);
    const filledStars70 = container70.querySelectorAll('[class*="fill-yellow-400"]');
    expect(filledStars70).toHaveLength(4);
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ReputationStars score={80} className="my-custom-stars" />
    );
    
    const starsContainer = container.querySelector('.my-custom-stars');
    expect(starsContainer).toBeInTheDocument();
  });
});

describe('ReputationBadge - Accessibility', () => {
  it('should have appropriate ARIA attributes', () => {
    render(<ReputationBadge {...defaultProps} />);
    
    // Check for tooltip trigger accessibility
    const trigger = screen.getByText('Gold').closest('div');
    expect(trigger).toHaveAttribute('data-state');
  });

  it('should be keyboard navigable', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    render(<ReputationBadge {...defaultProps} onClick={handleClick} />);
    
    // Tab to focus the badge
    await user.tab();
    
    // Press Enter to click
    await user.keyboard('{Enter}');
    
    expect(handleClick).toHaveBeenCalled();
  });

  it('should announce verification status to screen readers', () => {
    render(<ReputationBadge {...defaultProps} verified={true} />);
    
    // Tooltip content includes verification status
    const badge = screen.getByText('Gold').closest('div');
    fireEvent.mouseEnter(badge!);
    
    expect(screen.getByText('✓ Verified Identity')).toBeInTheDocument();
  });
});

describe('ReputationBadge - Edge Cases', () => {
  it('should handle invalid scores gracefully', () => {
    // Negative score
    render(<ReputationBadge score={-10} level="bronze" />);
    expect(screen.getByText('-10')).toBeInTheDocument();

    // Score > 100
    render(<ReputationBadge score={150} level="platinum" />);
    expect(screen.getByText('150')).toBeInTheDocument();
  });

  it('should handle missing props with defaults', () => {
    render(<ReputationBadge score={50} level="silver" />);
    
    // Should render with default props
    expect(screen.getByText('Silver')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument(); // showScore defaults to true
  });

  it('should handle rapid hover/unhover', async () => {
    const user = userEvent.setup();
    
    render(<ReputationBadge {...defaultProps} />);
    
    const badge = screen.getByText('Gold').closest('div');
    
    // Rapid hover/unhover
    for (let i = 0; i < 5; i++) {
      await user.hover(badge!);
      await user.unhover(badge!);
    }
    
    // Should not cause errors or memory leaks
    expect(badge).toBeInTheDocument();
  });
});