"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Input } from './input'
import { cn } from '@/lib/utils'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from './command'
import { Popover, PopoverContent, PopoverTrigger } from './popover'
import { Check, MapPin } from 'lucide-react'

interface AddressAutocompleteProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string
  onChange: (value: string) => void
  onAddressSelect?: (address: AddressDetails) => void
  country?: string
  debounceMs?: number
}

interface AddressDetails {
  formatted: string
  street: string
  city: string
  state: string
  postalCode: string
  country: string
}

interface AddressSuggestion {
  id: string
  description: string
  details?: AddressDetails
}

// Mock address suggestions - in production, this would call a geocoding API
const mockSearchAddresses = async (query: string, country?: string): Promise<AddressSuggestion[]> => {
  if (query.length < 3) return []
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300))
  
  // Mock suggestions based on query
  const suggestions: AddressSuggestion[] = [
    {
      id: '1',
      description: '123 Main Street, New York, NY 10001',
      details: {
        formatted: '123 Main Street, New York, NY 10001',
        street: '123 Main Street',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'United States'
      }
    },
    {
      id: '2',
      description: '456 Park Avenue, New York, NY 10022',
      details: {
        formatted: '456 Park Avenue, New York, NY 10022',
        street: '456 Park Avenue',
        city: 'New York',
        state: 'NY',
        postalCode: '10022',
        country: 'United States'
      }
    },
    {
      id: '3',
      description: '789 Broadway, New York, NY 10003',
      details: {
        formatted: '789 Broadway, New York, NY 10003',
        street: '789 Broadway',
        city: 'New York',
        state: 'NY',
        postalCode: '10003',
        country: 'United States'
      }
    }
  ]
  
  // Filter based on query
  return suggestions.filter(s => 
    s.description.toLowerCase().includes(query.toLowerCase())
  )
}

export function AddressAutocomplete({
  value,
  onChange,
  onAddressSelect,
  country,
  debounceMs = 300,
  className,
  ...props
}: AddressAutocompleteProps) {
  const [open, setOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const debounceRef = useRef<NodeJS.Timeout>()

  // Search for addresses
  const searchAddresses = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([])
      return
    }

    setLoading(true)
    try {
      const results = await mockSearchAddresses(query, country)
      setSuggestions(results)
    } catch (error) {
      console.error('Error searching addresses:', error)
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }

  // Handle input change with debounce
  const handleInputChange = (newValue: string) => {
    onChange(newValue)
    setSelectedId(null)
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    
    debounceRef.current = setTimeout(() => {
      searchAddresses(newValue)
    }, debounceMs)
  }

  // Handle address selection
  const handleAddressSelect = (suggestion: AddressSuggestion) => {
    onChange(suggestion.description)
    setSelectedId(suggestion.id)
    setOpen(false)
    
    if (onAddressSelect && suggestion.details) {
      onAddressSelect(suggestion.details)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Input
            value={value}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => setOpen(true)}
            className={cn('pr-10', className)}
            {...props}
          />
          <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          {loading && (
            <div className="p-4 text-center text-sm text-gray-500">
              Searching addresses...
            </div>
          )}
          {!loading && suggestions.length === 0 && value.length >= 3 && (
            <CommandEmpty>No addresses found.</CommandEmpty>
          )}
          {!loading && suggestions.length > 0 && (
            <CommandGroup>
              {suggestions.map((suggestion) => (
                <CommandItem
                  key={suggestion.id}
                  value={suggestion.description}
                  onSelect={() => handleAddressSelect(suggestion)}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedId === suggestion.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex-1">
                    <div className="text-sm">{suggestion.description}</div>
                    {suggestion.details && (
                      <div className="text-xs text-gray-500">
                        {suggestion.details.city}, {suggestion.details.state}
                      </div>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {value.length < 3 && (
            <div className="p-4 text-center text-sm text-gray-500">
              Type at least 3 characters to search
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  )
}