import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "rounded-lg bg-[#E5E7EB] text-[#374151] font-semibold shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5),0_2px_4px_0_rgba(0,0,0,0.15),0_4px_8px_0_rgba(0,0,0,0.1)] hover:bg-[#D1D5DB] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5),0_1px_2px_0_rgba(0,0,0,0.2),0_2px_4px_0_rgba(0,0,0,0.15)] active:shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.15),0_1px_2px_0_rgba(0,0,0,0.1)] active:translate-y-[1px]",
        destructive:
          "rounded-lg bg-destructive text-white font-semibold shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_2px_4px_0_rgba(220,38,38,0.15),0_4px_8px_0_rgba(220,38,38,0.1)] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_1px_2px_0_rgba(220,38,38,0.2),0_2px_4px_0_rgba(220,38,38,0.15)] active:shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.2)] active:translate-y-[1px]",
        outline:
          "rounded-lg border border-[#D1D5DB] bg-background shadow-[0_1px_3px_0_rgba(0,0,0,0.1)] hover:bg-accent hover:text-accent-foreground hover:border-[#9CA3AF] active:shadow-[inset_0_1px_2px_0_rgba(0,0,0,0.1)] active:translate-y-[1px]",
        secondary:
          "rounded-lg bg-secondary text-secondary-foreground font-semibold shadow-[inset_0_1px_0_0_rgba(255,255,255,0.7),0_2px_4px_0_rgba(0,0,0,0.1)] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.7),0_1px_2px_0_rgba(0,0,0,0.15)] active:shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.1)] active:translate-y-[1px]",
        ghost:
          "rounded-md hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2.5 has-[>svg]:px-4",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-11 rounded-lg px-7 has-[>svg]:px-5",
        icon: "size-9 rounded-lg",
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