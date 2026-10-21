"use client"

import type React from "react"
import { useRef } from "react"

interface MagneticButtonProps {
  children: React.ReactNode
  className?: string
  variant?: "primary" | "secondary" | "ghost"
  size?: "default" | "lg"
  onClick?: () => void
  type?: "button" | "submit" | "reset"
  disabled?: boolean
}

export function MagneticButton({
  children,
  className = "",
  variant = "primary",
  size = "default",
  onClick,
  type = "button",
  disabled = false,
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const positionRef = useRef({ x: 0, y: 0 })
  const rafRef = useRef<number | undefined>(undefined)

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!ref.current || disabled) return

    const rect = ref.current.getBoundingClientRect()
    const x = e.clientX - rect.left - rect.width / 2
    const y = e.clientY - rect.top - rect.height / 2

    positionRef.current = { x: x * 0.15, y: y * 0.15 }

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      if (ref.current) {
        ref.current.style.transform = `translate3d(${positionRef.current.x}px, ${positionRef.current.y}px, 0)`
      }
    })
  }

  const handleMouseLeave = () => {
    positionRef.current = { x: 0, y: 0 }
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      if (ref.current) {
        ref.current.style.transform = "translate3d(0px, 0px, 0)"
      }
    })
  }

  const variants = {
    primary:
      "bg-violet-600 text-white hover:bg-violet-500 shadow-lg shadow-violet-500/25 hover:scale-[1.02] active:scale-[0.98]",
    secondary:
      "bg-white/[0.05] text-zinc-100 hover:bg-white/[0.09] backdrop-blur-xl border border-white/10 hover:border-white/20",
    ghost: "bg-transparent text-zinc-300 hover:text-white hover:bg-white/[0.05] backdrop-blur-sm",
  }

  const sizes = {
    default: "px-6 py-2.5 text-sm",
    lg: "px-8 py-3.5 text-base",
  }

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`
        relative overflow-hidden rounded-full font-medium
        transition-all duration-300 ease-out will-change-transform
        ${variants[variant]}
        ${sizes[size]}
        ${disabled ? "cursor-not-allowed opacity-50 pointer-events-none" : ""}
        ${className}
      `}
      style={{
        transform: "translate3d(0px, 0px, 0)",
        contain: "layout style paint",
      }}
    >
      <span className="relative z-10">{children}</span>
    </button>
  )
}
