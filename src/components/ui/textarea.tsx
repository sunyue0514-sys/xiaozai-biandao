import * as React from "react"

import { cn } from "@/lib/utils"

// 苹果风格文本域组件
// 特点：大圆角、清晰聚焦态

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input placeholder:text-muted-foreground flex field-sizing-content min-h-24 w-full rounded-xl border bg-transparent px-4 py-3 text-base transition-all duration-200 outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none",
        "hover:border-primary/30",
        "focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20",
        "aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/20",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
