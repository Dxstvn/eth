import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-teal-500 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // ClearHold Primary - Deep Teal with Gold hover
        default: "bg-teal-900 text-white rounded-lg hover:text-gold-500 hover:shadow-md active:scale-98 focus-visible:ring-teal-500",
        
        // ClearHold Secondary - White with darker Teal border for better contrast
        secondary: "bg-white text-teal-800 border-2 border-teal-300 rounded-lg hover:bg-teal-50 hover:border-teal-400 active:scale-98 focus-visible:ring-teal-500",
        
        // ClearHold Tertiary - Darker text for better contrast
        tertiary: "bg-transparent text-teal-800 rounded-lg hover:text-teal-900 hover:bg-teal-50 active:scale-98 focus-visible:ring-teal-500",
        
        // Destructive - Red for dangerous actions
        destructive: "bg-red-600 text-white rounded-lg hover:bg-red-700 active:scale-98 focus-visible:ring-red-500",
        
        // Outline - Better contrast with darker border and text
        outline: "border-2 border-gray-400 bg-white text-gray-800 rounded-lg hover:bg-gray-50 hover:border-gray-500 active:scale-98 focus-visible:ring-gray-500",
        
        // Ghost - Better contrast with darker text
        ghost: "bg-transparent text-gray-800 rounded-lg hover:bg-gray-100 active:scale-98 focus-visible:ring-gray-500",
        
        // Link - Better contrast with darker text
        link: "text-teal-800 underline-offset-4 hover:underline hover:text-teal-900 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 rounded",
      },
      size: {
        sm: "h-8 px-3 text-sm rounded-md",
        default: "h-10 px-4 py-2 text-sm rounded-lg",
        lg: "h-12 px-6 py-3 text-base rounded-lg",
        icon: "h-10 w-10 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
