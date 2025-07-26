/**
 * @fileoverview Unit tests for ReputationGate access control
 * @module tests/reputation/ReputationGate.test
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ReputationGate } from '@/components/reputation/ReputationGate';
import { useReputation } from '@/hooks/useReputation';
import type { ReputationLevel } from '@/components/reputation/ReputationBadge';

// Mock the useReputation hook
vi.mock('@/hooks/useReputation', () => ({
  useReputation: vi.fn()
}));

describe('ReputationGate', () => {
  const mockUseReputation = useReputation as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Access Control', () => {
    it('should render children when reputation meets minimum score', () => {
      mockUseReputation.mockReturnValue({
        score: 75,
        level: 'gold',
        loading: false
      });

      render(
        <ReputationGate minScore={50}>
          <div>Protected Content</div>
        </ReputationGate>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should not render children when reputation below minimum score', () => {
      mockUseReputation.mockReturnValue({
        score: 25,
        level: 'bronze',
        loading: false
      });

      render(
        <ReputationGate minScore={50}>
          <div>Protected Content</div>
        </ReputationGate>
      );

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      expect(screen.getByText(/insufficient reputation/i)).toBeInTheDocument();
    });

    it('should render children when reputation meets minimum level', () => {
      mockUseReputation.mockReturnValue({
        score: 65,
        level: 'gold',
        loading: false
      });

      render(
        <ReputationGate minLevel="silver">
          <div>Protected Content</div>
        </ReputationGate>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should not render children when reputation below minimum level', () => {
      mockUseReputation.mockReturnValue({
        score: 25,
        level: 'bronze',
        loading: false
      });

      render(
        <ReputationGate minLevel="gold">
          <div>Protected Content</div>
        </ReputationGate>
      );

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should enforce both score and level requirements', () => {
      mockUseReputation.mockReturnValue({
        score: 45, // Below required score
        level: 'silver', // Meets level requirement
        loading: false
      });

      render(
        <ReputationGate minScore={50} minLevel="silver">
          <div>Protected Content</div>
        </ReputationGate>
      );

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should require verification when specified', () => {
      mockUseReputation.mockReturnValue({
        score: 75,
        level: 'gold',
        verified: false,
        loading: false
      });

      render(
        <ReputationGate minScore={50} requireVerified={true}>
          <div>Protected Content</div>
        </ReputationGate>
      );

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      expect(screen.getByText(/verification required/i)).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loading state while fetching reputation', () => {
      mockUseReputation.mockReturnValue({
        score: 0,
        level: 'unverified',
        loading: true
      });

      render(
        <ReputationGate minScore={50}>
          <div>Protected Content</div>
        </ReputationGate>
      );

      expect(screen.getByText(/checking reputation/i)).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should use custom loading component when provided', () => {
      mockUseReputation.mockReturnValue({
        score: 0,
        level: 'unverified',
        loading: true
      });

      render(
        <ReputationGate 
          minScore={50}
          loadingComponent={<div>Custom Loading</div>}
        >
          <div>Protected Content</div>
        </ReputationGate>
      );

      expect(screen.getByText('Custom Loading')).toBeInTheDocument();
    });
  });

  describe('Fallback Components', () => {
    it('should show default fallback when access denied', () => {
      mockUseReputation.mockReturnValue({
        score: 25,
        level: 'bronze',
        loading: false
      });

      render(
        <ReputationGate minScore={50}>
          <div>Protected Content</div>
        </ReputationGate>
      );

      expect(screen.getByText(/insufficient reputation/i)).toBeInTheDocument();
      expect(screen.getByText(/required: 50/i)).toBeInTheDocument();
      expect(screen.getByText(/your score: 25/i)).toBeInTheDocument();
    });

    it('should use custom fallback component when provided', () => {
      mockUseReputation.mockReturnValue({
        score: 25,
        level: 'bronze',
        loading: false
      });

      render(
        <ReputationGate 
          minScore={50}
          fallbackComponent={<div>Custom Fallback</div>}
        >
          <div>Protected Content</div>
        </ReputationGate>
      );

      expect(screen.getByText('Custom Fallback')).toBeInTheDocument();
    });

    it('should pass context to fallback component', () => {
      mockUseReputation.mockReturnValue({
        score: 25,
        level: 'bronze',
        loading: false
      });

      const FallbackWithContext = ({ currentScore, requiredScore }: any) => (
        <div>Need {requiredScore - currentScore} more points</div>
      );

      render(
        <ReputationGate 
          minScore={50}
          fallbackComponent={<FallbackWithContext />}
        >
          <div>Protected Content</div>
        </ReputationGate>
      );

      expect(screen.getByText('Need 25 more points')).toBeInTheDocument();
    });
  });

  describe('Level Hierarchy', () => {
    const levelHierarchy: ReputationLevel[] = [
      'unverified',
      'bronze',
      'silver',
      'gold',
      'platinum'
    ];

    it('should correctly compare reputation levels', () => {
      levelHierarchy.forEach((currentLevel, currentIndex) => {
        mockUseReputation.mockReturnValue({
          score: 50,
          level: currentLevel,
          loading: false
        });

        levelHierarchy.forEach((requiredLevel, requiredIndex) => {
          const { rerender } = render(
            <ReputationGate minLevel={requiredLevel}>
              <div>Protected Content</div>
            </ReputationGate>
          );

          if (currentIndex >= requiredIndex) {
            expect(screen.getByText('Protected Content')).toBeInTheDocument();
          } else {
            expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
          }

          rerender(<div />); // Clean up for next iteration
        });
      });
    });
  });

  describe('Callback Functions', () => {
    it('should call onAccessGranted when access is granted', () => {
      const onAccessGranted = vi.fn();
      
      mockUseReputation.mockReturnValue({
        score: 75,
        level: 'gold',
        loading: false
      });

      render(
        <ReputationGate minScore={50} onAccessGranted={onAccessGranted}>
          <div>Protected Content</div>
        </ReputationGate>
      );

      expect(onAccessGranted).toHaveBeenCalledWith({
        score: 75,
        level: 'gold',
        loading: false
      });
    });

    it('should call onAccessDenied when access is denied', () => {
      const onAccessDenied = vi.fn();
      
      mockUseReputation.mockReturnValue({
        score: 25,
        level: 'bronze',
        loading: false
      });

      render(
        <ReputationGate minScore={50} onAccessDenied={onAccessDenied}>
          <div>Protected Content</div>
        </ReputationGate>
      );

      expect(onAccessDenied).toHaveBeenCalledWith({
        score: 25,
        level: 'bronze',
        loading: false
      });
    });

    it('should not call callbacks during loading', () => {
      const onAccessGranted = vi.fn();
      const onAccessDenied = vi.fn();
      
      mockUseReputation.mockReturnValue({
        score: 0,
        level: 'unverified',
        loading: true
      });

      render(
        <ReputationGate 
          minScore={50} 
          onAccessGranted={onAccessGranted}
          onAccessDenied={onAccessDenied}
        >
          <div>Protected Content</div>
        </ReputationGate>
      );

      expect(onAccessGranted).not.toHaveBeenCalled();
      expect(onAccessDenied).not.toHaveBeenCalled();
    });
  });

  describe('Dynamic Updates', () => {
    it('should respond to reputation changes', async () => {
      mockUseReputation.mockReturnValue({
        score: 25,
        level: 'bronze',
        loading: false
      });

      const { rerender } = render(
        <ReputationGate minScore={50}>
          <div>Protected Content</div>
        </ReputationGate>
      );

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();

      // Simulate reputation increase
      mockUseReputation.mockReturnValue({
        score: 75,
        level: 'gold',
        loading: false
      });

      rerender(
        <ReputationGate minScore={50}>
          <div>Protected Content</div>
        </ReputationGate>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });

    it('should handle reputation decrease', async () => {
      mockUseReputation.mockReturnValue({
        score: 75,
        level: 'gold',
        loading: false
      });

      const { rerender } = render(
        <ReputationGate minScore={50}>
          <div>Protected Content</div>
        </ReputationGate>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();

      // Simulate reputation decrease
      mockUseReputation.mockReturnValue({
        score: 25,
        level: 'bronze',
        loading: false
      });

      rerender(
        <ReputationGate minScore={50}>
          <div>Protected Content</div>
        </ReputationGate>
      );

      await waitFor(() => {
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined reputation data', () => {
      mockUseReputation.mockReturnValue({
        score: undefined,
        level: undefined,
        loading: false
      });

      render(
        <ReputationGate minScore={50}>
          <div>Protected Content</div>
        </ReputationGate>
      );

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      expect(screen.getByText(/unable to verify reputation/i)).toBeInTheDocument();
    });

    it('should handle error states', () => {
      mockUseReputation.mockReturnValue({
        score: 0,
        level: 'unverified',
        loading: false,
        error: new Error('Failed to fetch reputation')
      });

      render(
        <ReputationGate minScore={50}>
          <div>Protected Content</div>
        </ReputationGate>
      );

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      expect(screen.getByText(/error loading reputation/i)).toBeInTheDocument();
    });

    it('should handle boundary score values', () => {
      mockUseReputation.mockReturnValue({
        score: 50, // Exactly at boundary
        level: 'silver',
        loading: false
      });

      render(
        <ReputationGate minScore={50}>
          <div>Protected Content</div>
        </ReputationGate>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should render without any requirements', () => {
      mockUseReputation.mockReturnValue({
        score: 0,
        level: 'unverified',
        loading: false
      });

      render(
        <ReputationGate>
          <div>Protected Content</div>
        </ReputationGate>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  describe('Multiple Gates', () => {
    it('should handle nested reputation gates', () => {
      mockUseReputation.mockReturnValue({
        score: 60,
        level: 'silver',
        loading: false
      });

      render(
        <ReputationGate minScore={50}>
          <div>Outer Content</div>
          <ReputationGate minScore={70}>
            <div>Inner Content</div>
          </ReputationGate>
        </ReputationGate>
      );

      expect(screen.getByText('Outer Content')).toBeInTheDocument();
      expect(screen.queryByText('Inner Content')).not.toBeInTheDocument();
    });

    it('should handle parallel reputation gates', () => {
      mockUseReputation.mockReturnValue({
        score: 60,
        level: 'silver',
        loading: false
      });

      render(
        <>
          <ReputationGate minScore={50}>
            <div>Content 1</div>
          </ReputationGate>
          <ReputationGate minScore={70}>
            <div>Content 2</div>
          </ReputationGate>
        </>
      );

      expect(screen.getByText('Content 1')).toBeInTheDocument();
      expect(screen.queryByText('Content 2')).not.toBeInTheDocument();
    });
  });
});