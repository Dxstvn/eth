import { describe, it, expect } from 'vitest'
import {
  mockDeals,
  getMockDeals,
  getMockDocuments,
} from '../mock-data'

describe('mock-data', () => {
  describe('mockDeals', () => {
    it('should have valid mock deals', () => {
      expect(mockDeals).toHaveLength(2)
      
      mockDeals.forEach(deal => {
        expect(deal).toHaveProperty('id')
        expect(deal).toHaveProperty('propertyAddress')
        expect(deal).toHaveProperty('participants')
        expect(deal).toHaveProperty('documents')
        
        expect(typeof deal.id).toBe('string')
        expect(typeof deal.propertyAddress).toBe('string')
        expect(Array.isArray(deal.participants)).toBe(true)
        expect(Array.isArray(deal.documents)).toBe(true)
      })
    })

    it('should have valid document structure in deals', () => {
      mockDeals.forEach(deal => {
        deal.documents.forEach(document => {
          expect(document).toHaveProperty('name')
          expect(document).toHaveProperty('cid')
          expect(document).toHaveProperty('encryptionKey')
          expect(document).toHaveProperty('uploadedBy')
          expect(document).toHaveProperty('uploadedAt')
          expect(document).toHaveProperty('size')
          expect(document).toHaveProperty('type')
          expect(document).toHaveProperty('status')
          expect(document).toHaveProperty('dealId')
          
          expect(typeof document.name).toBe('string')
          expect(typeof document.cid).toBe('string')
          expect(typeof document.encryptionKey).toBe('string')
          expect(typeof document.uploadedBy).toBe('string')
          expect(typeof document.size).toBe('string')
          expect(typeof document.type).toBe('string')
          expect(typeof document.status).toBe('string')
          expect(typeof document.dealId).toBe('string')
        })
      })
    })

    it('should have consistent deal IDs between deals and documents', () => {
      mockDeals.forEach(deal => {
        deal.documents.forEach(document => {
          expect(document.dealId).toBe(deal.id)
        })
      })
    })
  })

  describe('getMockDeals', () => {
    it('should return the same data as mockDeals', () => {
      const deals = getMockDeals()
      expect(deals).toEqual(mockDeals)
    })

    it('should return an array', () => {
      const deals = getMockDeals()
      expect(Array.isArray(deals)).toBe(true)
    })
  })

  describe('getMockDocuments', () => {
    it('should return flattened documents from all deals', () => {
      const documents = getMockDocuments()
      
      // Calculate expected total documents
      const expectedTotal = mockDeals.reduce((sum, deal) => sum + deal.documents.length, 0)
      expect(documents).toHaveLength(expectedTotal)
    })

    it('should include dealId in each document', () => {
      const documents = getMockDocuments()
      
      documents.forEach(document => {
        expect(document).toHaveProperty('dealId')
        expect(typeof document.dealId).toBe('string')
        
        // Verify the dealId exists in mockDeals
        const dealExists = mockDeals.some(deal => deal.id === document.dealId)
        expect(dealExists).toBe(true)
      })
    })

    it('should maintain all document properties', () => {
      const documents = getMockDocuments()
      
      documents.forEach(document => {
        expect(document).toHaveProperty('name')
        expect(document).toHaveProperty('cid')
        expect(document).toHaveProperty('encryptionKey')
        expect(document).toHaveProperty('uploadedBy')
        expect(document).toHaveProperty('uploadedAt')
        expect(document).toHaveProperty('size')
        expect(document).toHaveProperty('type')
        expect(document).toHaveProperty('status')
        expect(document).toHaveProperty('dealId')
      })
    })
  })

  describe('data quality', () => {
    it('should have realistic property addresses', () => {
      mockDeals.forEach(deal => {
        const hasStreetType = deal.propertyAddress.includes('St') || 
                              deal.propertyAddress.includes('Ave') || 
                              deal.propertyAddress.includes('Rd') || 
                              deal.propertyAddress.includes('Blvd')
        expect(hasStreetType).toBe(true)
        expect(deal.propertyAddress.length).toBeGreaterThan(10)
      })
    })

    it('should have valid document types', () => {
      const documents = getMockDocuments()
      const validTypes = ['PDF', 'DOC', 'DOCX', 'JPG', 'PNG']
      
      documents.forEach(document => {
        expect(validTypes).toContain(document.type)
      })
    })

    it('should have valid document statuses', () => {
      const documents = getMockDocuments()
      const validStatuses = ['signed', 'pending', 'draft', 'verified', 'rejected']
      
      documents.forEach(document => {
        expect(validStatuses).toContain(document.status)
      })
    })

    it('should have realistic file sizes', () => {
      const documents = getMockDocuments()
      
      documents.forEach(document => {
        expect(document.size).toMatch(/^\d+(\.\d+)?\s+(KB|MB|GB)$/)
      })
    })

    it('should have unique deal IDs', () => {
      const dealIds = mockDeals.map(deal => deal.id)
      const uniqueIds = new Set(dealIds)
      
      expect(uniqueIds.size).toBe(dealIds.length)
    })

    it('should have non-empty participants arrays', () => {
      mockDeals.forEach(deal => {
        expect(deal.participants.length).toBeGreaterThan(0)
        
        deal.participants.forEach(participant => {
          expect(typeof participant).toBe('string')
          expect(participant.length).toBeGreaterThan(0)
        })
      })
    })
  })
})