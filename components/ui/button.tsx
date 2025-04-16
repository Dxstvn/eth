import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-teal-800 to-teal-900 text-white hover:shadow-md hover:text-gold-300",
        primary: "!bg-teal-900 !text-white hover:!text-gold-300 shadow-md transition-all duration-200",
        destructive: "bg-gradient-to-r from-red-600 to-red-700 text-white hover:shadow-md",
        outline: "border-2 border-teal-200 bg-transparent text-teal-700 hover:bg-teal-50 hover:text-teal-800",
        secondary: "bg-gradient-to-r from-gold-400 to-gold-500 text-teal-900 hover:shadow-md",
        ghost: "bg-transparent text-teal-700 hover:bg-teal-50 hover:text-teal-900",
        link: "text-teal-900 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-md px-8 py-3 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const baseClass = variant === "primary" ? "btn-primary" : ""
    return <Comp className={cn(buttonVariants({ variant, size }), baseClass, className)} ref={ref} {...props} />
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
