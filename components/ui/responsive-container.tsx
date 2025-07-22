"use client"

import { cn } from "@/lib/utils"
import { forwardRef } from "react"

interface ResponsiveContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "narrow" | "wide" | "full"
  padding?: "none" | "sm" | "default" | "lg"
}

/**
 * ResponsiveContainer component following ClearHold design principles
 * 
 * Implements the 12-column grid system with proper breakpoints:
 * - sm: 640px (Large phones)
 * - md: 768px (Tablets)  
 * - lg: 1024px (Laptops)
 * - xl: 1280px (Desktops)
 * - 2xl: 1536px (Large screens)
 */
const ResponsiveContainer = forwardRef<HTMLDivElement, ResponsiveContainerProps>(
  ({ className, variant = "default", padding = "default", children, ...props }, ref) => {
    const containerClasses = cn(
      // Base container styles
      "w-full mx-auto",
      
      // Container width variants
      {
        "max-w-7xl": variant === "default", // 1280px max width (ClearHold standard)
        "max-w-4xl": variant === "narrow",  // 896px for forms and focused content
        "max-w-none": variant === "wide",   // Full width with padding
        "": variant === "full"              // Completely full width
      },
      
      // Padding variants
      {
        "": padding === "none",
        "px-4 md:px-6": padding === "sm",
        "px-4 md:px-6 py-6 sm:py-10": padding === "default", // ClearHold standard
        "px-6 md:px-8 py-8 sm:py-12": padding === "lg"
      },
      
      className
    )
    
    return (
      <div ref={ref} className={containerClasses} {...props}>
        {children}
      </div>
    )
  }
)

ResponsiveContainer.displayName = "ResponsiveContainer"

/**
 * Grid component for responsive layouts
 */
interface ResponsiveGridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: 1 | 2 | 3 | 4 | 6 | 12
  gap?: "none" | "sm" | "default" | "lg"
  responsive?: boolean
}

const ResponsiveGrid = forwardRef<HTMLDivElement, ResponsiveGridProps>(
  ({ className, cols = 1, gap = "default", responsive = true, children, ...props }, ref) => {
    const gridClasses = cn(
      "grid",
      
      // Responsive grid columns (mobile-first)
      {
        // Single column layouts
        "grid-cols-1": cols === 1,
        
        // Two column layouts
        "grid-cols-1 md:grid-cols-2": cols === 2 && responsive,
        "grid-cols-2": cols === 2 && !responsive,
        
        // Three column layouts  
        "grid-cols-1 md:grid-cols-2 lg:grid-cols-3": cols === 3 && responsive,
        "grid-cols-3": cols === 3 && !responsive,
        
        // Four column layouts
        "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4": cols === 4 && responsive,
        "grid-cols-4": cols === 4 && !responsive,
        
        // Six column layouts
        "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6": cols === 6 && responsive,
        "grid-cols-6": cols === 6 && !responsive,
        
        // Twelve column layouts
        "grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12": cols === 12 && responsive,
        "grid-cols-12": cols === 12 && !responsive
      },
      
      // Gap variants
      {
        "gap-0": gap === "none",
        "gap-2 md:gap-3": gap === "sm",
        "gap-4 md:gap-6": gap === "default", // ClearHold standard
        "gap-6 md:gap-8": gap === "lg"
      },
      
      className
    )
    
    return (
      <div ref={ref} className={gridClasses} {...props}>
        {children}
      </div>
    )
  }
)

ResponsiveGrid.displayName = "ResponsiveGrid"

/**
 * Responsive stack component for vertical layouts
 */
interface ResponsiveStackProps extends React.HTMLAttributes<HTMLDivElement> {
  gap?: "none" | "sm" | "default" | "lg" | "xl"
  align?: "start" | "center" | "end" | "stretch"
}

const ResponsiveStack = forwardRef<HTMLDivElement, ResponsiveStackProps>(
  ({ className, gap = "default", align = "stretch", children, ...props }, ref) => {
    const stackClasses = cn(
      "flex flex-col",
      
      // Alignment
      {
        "items-start": align === "start",
        "items-center": align === "center", 
        "items-end": align === "end",
        "items-stretch": align === "stretch"
      },
      
      // Gap variants (responsive)
      {
        "gap-0": gap === "none",
        "gap-2 md:gap-3": gap === "sm",
        "gap-4 md:gap-6": gap === "default",
        "gap-6 md:gap-8": gap === "lg",
        "gap-8 md:gap-12": gap === "xl"
      },
      
      className
    )
    
    return (
      <div ref={ref} className={stackClasses} {...props}>
        {children}
      </div>
    )
  }
)

ResponsiveStack.displayName = "ResponsiveStack"

/**
 * Responsive flexbox component
 */
interface ResponsiveFlexProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: "row" | "col" | "row-reverse" | "col-reverse"
  wrap?: boolean
  justify?: "start" | "center" | "end" | "between" | "around" | "evenly"
  align?: "start" | "center" | "end" | "stretch" | "baseline"
  gap?: "none" | "sm" | "default" | "lg"
  responsive?: boolean
}

const ResponsiveFlex = forwardRef<HTMLDivElement, ResponsiveFlexProps>(
  ({ 
    className, 
    direction = "row", 
    wrap = false, 
    justify = "start", 
    align = "stretch", 
    gap = "default",
    responsive = true,
    children, 
    ...props 
  }, ref) => {
    const flexClasses = cn(
      "flex",
      
      // Direction (responsive by default)
      {
        "flex-col sm:flex-row": direction === "row" && responsive,
        "flex-row": direction === "row" && !responsive,
        "flex-col": direction === "col",
        "flex-col-reverse sm:flex-row-reverse": direction === "row-reverse" && responsive,
        "flex-row-reverse": direction === "row-reverse" && !responsive,
        "flex-col-reverse": direction === "col-reverse"
      },
      
      // Wrap
      {
        "flex-wrap": wrap
      },
      
      // Justify content
      {
        "justify-start": justify === "start",
        "justify-center": justify === "center",
        "justify-end": justify === "end", 
        "justify-between": justify === "between",
        "justify-around": justify === "around",
        "justify-evenly": justify === "evenly"
      },
      
      // Align items
      {
        "items-start": align === "start",
        "items-center": align === "center",
        "items-end": align === "end",
        "items-stretch": align === "stretch",
        "items-baseline": align === "baseline"
      },
      
      // Gap
      {
        "gap-0": gap === "none",
        "gap-2 md:gap-3": gap === "sm", 
        "gap-4 md:gap-6": gap === "default",
        "gap-6 md:gap-8": gap === "lg"
      },
      
      className
    )
    
    return (
      <div ref={ref} className={flexClasses} {...props}>
        {children}
      </div>
    )
  }
)

ResponsiveFlex.displayName = "ResponsiveFlex"

export { ResponsiveContainer, ResponsiveGrid, ResponsiveStack, ResponsiveFlex }