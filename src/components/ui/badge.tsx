import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// 苹果风格徽章/标签组件
// 特点：柔和圆角、适中字重

const badgeVariants = cva(
  "inline-flex items-center justify-center border px-2.5 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        // 主色徽章 - 苹果蓝
        default:
          "border-transparent bg-primary text-white rounded-lg",
        // 次要徽章 - 灰色背景
        secondary:
          "border-transparent bg-secondary text-secondary-foreground rounded-lg",
        // 危险徽章 - 苹果红
        destructive:
          "border-transparent bg-destructive text-white rounded-lg",
        // 描边徽章
        outline:
          "text-foreground border-border rounded-lg",
        // 成功徽章
        success:
          "border-transparent bg-success text-white rounded-lg",
        // 警告徽章
        warning:
          "border-transparent bg-warning text-white rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
