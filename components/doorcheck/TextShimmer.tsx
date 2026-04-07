"use client"

import { motion } from "motion/react"
import { useMemo } from "react"
import { cn } from "@/lib/utils"

export type TextShimmerProps = {
  children: React.ReactNode
  className?: string
  duration?: number
  spread?: number
}

export function TextShimmer({
  children,
  className,
  duration = 2.2,
  spread = 2,
}: TextShimmerProps) {
  const label = typeof children === "string" ? children : String(children)
  const dynamicSpread = useMemo(
    () => Math.max(label.length * spread, 24),
    [label, spread],
  )

  return (
    <motion.span
      className={cn(
        "relative inline-block bg-[length:250%_100%,auto] bg-clip-text text-transparent",
        "[--base-color:rgba(255,255,255,0.22)] [--base-gradient-color:#ffffff]",
        "[--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--base-gradient-color),#0000_calc(50%+var(--spread)))]",
        "[background-repeat:no-repeat,padding-box]",
        className,
      )}
      initial={{ backgroundPosition: "100% center" }}
      animate={{ backgroundPosition: "0% center" }}
      transition={{
        repeat: Infinity,
        duration,
        ease: "linear",
      }}
      style={
        {
          "--spread": `${dynamicSpread}px`,
          backgroundImage: `var(--bg), linear-gradient(var(--base-color), var(--base-color))`,
        } as React.CSSProperties
      }
    >
      {children}
    </motion.span>
  )
}
