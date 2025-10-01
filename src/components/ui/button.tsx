import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_1px_2px_rgba(0,0,0,0.05),0_4px_8px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.05)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.08),0_8px_16px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.05)] hover:translate-y-[-1px] active:translate-y-[0px] active:shadow-[0_1px_2px_rgba(0,0,0,0.05),0_2px_4px_rgba(0,0,0,0.06)]",
        destructive:
          "bg-destructive text-white shadow-[0_1px_2px_rgba(0,0,0,0.05),0_4px_8px_rgba(220,38,38,0.15),0_0_0_1px_rgba(220,38,38,0.1)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.08),0_8px_16px_rgba(220,38,38,0.2),0_0_0_1px_rgba(220,38,38,0.1)] hover:translate-y-[-1px] active:translate-y-[0px] focus-visible:ring-destructive/20",
        outline:
          "border bg-background shadow-[0_1px_2px_rgba(0,0,0,0.03),0_2px_4px_rgba(0,0,0,0.05),0_0_0_1px_rgba(0,0,0,0.05)] hover:bg-accent hover:text-accent-foreground hover:shadow-[0_2px_4px_rgba(0,0,0,0.05),0_4px_8px_rgba(0,0,0,0.08)] hover:translate-y-[-1px] active:translate-y-[0px]",
        secondary:
          "bg-secondary text-secondary-foreground shadow-[0_1px_2px_rgba(0,0,0,0.03),0_3px_6px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.04)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.05),0_6px_12px_rgba(0,0,0,0.1)] hover:translate-y-[-1px] active:translate-y-[0px]",
        ghost:
          "hover:bg-accent hover:text-accent-foreground hover:shadow-[0_1px_2px_rgba(0,0,0,0.03),0_2px_4px_rgba(0,0,0,0.04)]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }