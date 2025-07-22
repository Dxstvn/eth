"use client"

import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"
import { forwardRef } from "react"

// Button variants using CVA for type safety
const buttonVariants = cva(
  "inline-flex items-center justify-center font-medium transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary: "bg-teal-900 text-white hover:text-gold-500 hover:shadow-md focus:ring-teal-500 active:scale-98",
        secondary: "bg-white text-teal-900 border border-teal-200 hover:bg-teal-50 hover:border-teal-300 focus:ring-teal-500 active:scale-98",
        tertiary: "bg-transparent text-teal-700 hover:text-gold-600 hover:bg-teal-50 focus:ring-teal-500 active:scale-98",
        danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 active:scale-98",
        ghost: "bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500",
        outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-500"
      },
      size: {
        sm: "h-8 px-3 text-sm rounded-md",
        default: "h-10 px-4 py-2 text-sm rounded-lg",
        lg: "h-12 px-6 py-3 text-base rounded-lg",
        icon: "h-10 w-10 rounded-lg"
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "default"
    }
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

// Card variants
const cardVariants = cva(
  "rounded-lg transition-shadow duration-200",
  {
    variants: {
      variant: {
        default: "bg-white border border-gray-200 shadow-soft hover:shadow-card",
        interactive: "bg-white border border-gray-200 shadow-soft hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] cursor-pointer transition-all duration-200",
        gradient: "bg-gradient-to-br from-teal-50 to-blue-50 border border-teal-100",
        elevated: "bg-white shadow-lg border-0"
      },
      padding: {
        none: "",
        sm: "p-4",
        default: "p-6", 
        lg: "p-8"
      }
    },
    defaultVariants: {
      variant: "default",
      padding: "default"
    }
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, ...props }, ref) => {
    return (
      <div
        className={cn(cardVariants({ variant, padding, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Card.displayName = "Card"

// Status Badge variants
const badgeVariants = cva(
  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
  {
    variants: {
      variant: {
        success: "bg-green-100 text-green-800 border-green-200",
        warning: "bg-amber-100 text-amber-800 border-amber-200", 
        error: "bg-red-100 text-red-800 border-red-200",
        info: "bg-blue-100 text-blue-800 border-blue-200",
        pending: "bg-amber-100 text-amber-800 border-amber-200",
        approved: "bg-green-100 text-green-800 border-green-200",
        neutral: "bg-gray-100 text-gray-800 border-gray-200",
        primary: "bg-teal-100 text-teal-800 border-teal-200"
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        default: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm"
      }
    },
    defaultVariants: {
      variant: "neutral",
      size: "default"
    }
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <span
        className={cn(badgeVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Badge.displayName = "Badge"

// Typography components
export const Typography = {
  H1: forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
    ({ className, ...props }, ref) => (
      <h1
        ref={ref}
        className={cn(
          "text-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight text-gray-900",
          className
        )}
        {...props}
      />
    )
  ),

  H2: forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
    ({ className, ...props }, ref) => (
      <h2
        ref={ref}
        className={cn(
          "text-display text-3xl md:text-4xl font-bold tracking-tight leading-tight text-gray-900",
          className
        )}
        {...props}
      />
    )
  ),

  H3: forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
    ({ className, ...props }, ref) => (
      <h3
        ref={ref}
        className={cn(
          "text-display text-2xl md:text-3xl font-semibold tracking-tight leading-snug text-gray-900",
          className
        )}
        {...props}
      />
    )
  ),

  H4: forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
    ({ className, ...props }, ref) => (
      <h4
        ref={ref}
        className={cn(
          "text-display text-xl md:text-2xl font-semibold tracking-tight leading-snug text-gray-900",
          className
        )}
        {...props}
      />
    )
  ),

  Body: forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
    ({ className, ...props }, ref) => (
      <p
        ref={ref}
        className={cn(
          "text-body text-base leading-relaxed text-gray-700",
          className
        )}
        {...props}
      />
    )
  ),

  Small: forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
    ({ className, ...props }, ref) => (
      <p
        ref={ref}
        className={cn(
          "text-body text-sm leading-relaxed text-gray-600",
          className
        )}
        {...props}
      />
    )
  ),

  Stats: forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
    ({ className, ...props }, ref) => (
      <p
        ref={ref}
        className={cn(
          "text-display text-4xl font-bold text-teal-900",
          className
        )}
        {...props}
      />
    )
  ),

  Label: forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
    ({ className, ...props }, ref) => (
      <label
        ref={ref}
        className={cn(
          "text-body text-xs font-medium text-gray-700 uppercase tracking-wide",
          className
        )}
        {...props}
      />
    )
  )
}

// Enhanced Skeleton loaders with ClearHold design
export const Skeleton = {
  Text: ({ className, lines = 1, ...props }: React.HTMLAttributes<HTMLDivElement> & { lines?: number }) => (
    <div className={cn("space-y-2", className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-pulse",
            i === lines - 1 && lines > 1 ? "w-3/4" : "w-full"
          )}
        />
      ))}
    </div>
  ),

  Avatar: ({ className, size = "default", ...props }: React.HTMLAttributes<HTMLDivElement> & { size?: "sm" | "default" | "lg" }) => {
    const sizeClasses = {
      sm: "h-8 w-8",
      default: "h-10 w-10", 
      lg: "h-16 w-16"
    }
    return (
      <div
        className={cn("bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full animate-pulse", sizeClasses[size], className)}
        {...props}
      />
    )
  },

  Card: ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div
      className={cn("bg-white border border-gray-200 rounded-lg p-6 animate-pulse shadow-soft", className)}
      {...props}
    >
      <div className="space-y-4">
        <div className="h-6 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded w-1/2" />
        <div className="space-y-2">
          <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded" />
          <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded w-3/4" />
        </div>
      </div>
    </div>
  ),

  Button: ({ className, size = "default", ...props }: React.HTMLAttributes<HTMLDivElement> & { size?: "sm" | "default" | "lg" }) => {
    const sizeClasses = {
      sm: "h-8 w-20",
      default: "h-10 w-24",
      lg: "h-12 w-32"
    }
    return (
      <div
        className={cn("bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-lg animate-pulse", sizeClasses[size], className)}
        {...props}
      />
    )
  },

  Table: ({ rows = 3, columns = 4, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { rows?: number; columns?: number }) => (
    <div className={cn("space-y-4", className)} {...props}>
      {/* Table Header */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <div key={`header-${i}`} className="h-4 bg-gradient-to-r from-gray-300 via-gray-400 to-gray-300 rounded animate-pulse" />
        ))}
      </div>
      {/* Table Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={`cell-${rowIndex}-${colIndex}`} className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  ),

  Form: ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn("space-y-6", className)} {...props}>
      <div className="space-y-2">
        <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded w-24" />
        <div className="h-10 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded" />
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded w-32" />
        <div className="h-10 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded" />
      </div>
      <div className="flex justify-end space-x-3">
        <div className="h-10 w-24 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-lg" />
        <div className="h-10 w-32 bg-gradient-to-r from-teal-200 via-teal-300 to-teal-200 rounded-lg" />
      </div>
    </div>
  )
}

// Export everything
export { Button, Card, Badge, buttonVariants, cardVariants, badgeVariants }