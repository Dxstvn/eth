"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Input } from './input'
import { cn } from '@/lib/utils'

interface MaskedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  mask: string
  value: string
  onChange: (value: string) => void
  maskChar?: string
  showMask?: boolean
  formatCharacters?: Record<string, RegExp>
}

/**
 * Masked input component for formatted input fields
 * Mask format:
 * - 9: numeric (0-9)
 * - a: alphabetic (a-zA-Z)
 * - *: alphanumeric (a-zA-Z0-9)
 * - Any other character is treated as a literal
 * 
 * Examples:
 * - Phone: (999) 999-9999
 * - SSN: 999-99-9999
 * - Date: 99/99/9999
 */
export function MaskedInput({
  mask,
  value = '',
  onChange,
  maskChar = '_',
  showMask = true,
  formatCharacters = {
    '9': /[0-9]/,
    'a': /[a-zA-Z]/,
    '*': /[a-zA-Z0-9]/
  },
  className,
  ...props
}: MaskedInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [displayValue, setDisplayValue] = useState('')
  const [cursorPosition, setCursorPosition] = useState(0)

  // Get the raw value without mask characters
  const getRawValue = (maskedValue: string): string => {
    let raw = ''
    for (let i = 0; i < maskedValue.length && i < mask.length; i++) {
      const maskChar = mask[i]
      if (formatCharacters[maskChar] && maskedValue[i] !== maskChar) {
        raw += maskedValue[i]
      }
    }
    return raw
  }

  // Apply mask to raw value
  const applyMask = (rawValue: string): string => {
    let masked = ''
    let rawIndex = 0

    for (let i = 0; i < mask.length; i++) {
      const maskChar = mask[i]
      
      if (formatCharacters[maskChar]) {
        if (rawIndex < rawValue.length) {
          const char = rawValue[rawIndex]
          if (formatCharacters[maskChar].test(char)) {
            masked += char
            rawIndex++
          } else {
            break
          }
        } else if (showMask) {
          masked += maskChar
        } else {
          break
        }
      } else {
        masked += maskChar
        if (rawIndex < rawValue.length && rawValue[rawIndex] === maskChar) {
          rawIndex++
        }
      }
    }

    return masked
  }

  // Get next cursor position
  const getNextCursorPosition = (pos: number, direction: 'forward' | 'backward' = 'forward'): number => {
    if (direction === 'forward') {
      for (let i = pos; i < mask.length; i++) {
        if (formatCharacters[mask[i]]) {
          return i
        }
      }
      return mask.length
    } else {
      for (let i = pos - 1; i >= 0; i--) {
        if (formatCharacters[mask[i]]) {
          return i + 1
        }
      }
      return 0
    }
  }

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    const oldValue = displayValue
    const oldCursor = e.target.selectionStart || 0

    // Determine if user is deleting
    const isDeleting = inputValue.length < oldValue.length

    let newRawValue = ''
    
    if (isDeleting) {
      // Handle deletion
      const deletedPos = oldCursor
      let rawPos = 0
      let maskPos = 0
      
      // Find which raw character was deleted
      while (maskPos < deletedPos && maskPos < mask.length) {
        if (formatCharacters[mask[maskPos]] && rawPos < value.length) {
          rawPos++
        }
        maskPos++
      }
      
      // Remove the character at rawPos
      newRawValue = value.slice(0, Math.max(0, rawPos - 1)) + value.slice(rawPos)
    } else {
      // Handle insertion
      const insertedChar = inputValue[oldCursor - 1] || ''
      let rawPos = 0
      let maskPos = 0
      
      // Find where to insert in raw value
      while (maskPos < oldCursor - 1 && maskPos < mask.length) {
        if (formatCharacters[mask[maskPos]] && rawPos < value.length) {
          rawPos++
        }
        maskPos++
      }
      
      // Skip to next valid position if needed
      while (maskPos < mask.length && !formatCharacters[mask[maskPos]]) {
        maskPos++
      }
      
      // Validate the character
      if (maskPos < mask.length && formatCharacters[mask[maskPos]]?.test(insertedChar)) {
        newRawValue = value.slice(0, rawPos) + insertedChar + value.slice(rawPos)
      } else {
        newRawValue = value
      }
    }

    // Update the value
    onChange(newRawValue)
    
    // Calculate new cursor position
    const newMaskedValue = applyMask(newRawValue)
    let newCursor = oldCursor
    
    if (!isDeleting && newRawValue !== value) {
      // Move cursor forward after insertion
      newCursor = getNextCursorPosition(oldCursor)
    } else if (isDeleting) {
      // Move cursor back after deletion
      newCursor = getNextCursorPosition(oldCursor, 'backward')
    }
    
    setCursorPosition(newCursor)
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const { key } = e
    const currentPos = inputRef.current?.selectionStart || 0

    if (key === 'ArrowLeft') {
      e.preventDefault()
      const newPos = getNextCursorPosition(currentPos, 'backward')
      inputRef.current?.setSelectionRange(newPos, newPos)
    } else if (key === 'ArrowRight') {
      e.preventDefault()
      const newPos = getNextCursorPosition(currentPos + 1, 'forward')
      inputRef.current?.setSelectionRange(newPos, newPos)
    }
  }

  // Update display value when value prop changes
  useEffect(() => {
    const masked = applyMask(value)
    setDisplayValue(masked)
  }, [value, mask])

  // Update cursor position after render
  useEffect(() => {
    if (inputRef.current && cursorPosition !== undefined) {
      inputRef.current.setSelectionRange(cursorPosition, cursorPosition)
    }
  }, [displayValue, cursorPosition])

  return (
    <Input
      ref={inputRef}
      value={displayValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      className={cn(className)}
      {...props}
    />
  )
}