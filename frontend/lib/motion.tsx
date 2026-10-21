"use client"

import { type ReactNode } from "react"
import {
  motion,
  type Variants,
  useScroll,
  useTransform,
  useSpring,
  type MotionValue,
} from "framer-motion"

/* ── Shared Spring Configs ─────────────────────────────────────────── */

/** Smooth, slightly underdamped spring for entrances. */
export const smoothSpring = { type: "spring" as const, stiffness: 80, damping: 20, mass: 0.8 }

/** Snappy spring for interactive elements. */
export const snappySpring = { type: "spring" as const, stiffness: 300, damping: 30, mass: 0.6 }

/** Gentle spring for parallax and background effects. */
export const gentleSpring = { type: "spring" as const, stiffness: 50, damping: 25, mass: 1.2 }

/* ── Shared Viewport Config ────────────────────────────────────────── */

export const defaultViewport = { once: true, margin: "-80px" as const }

/* ── Stagger Container Variants ────────────────────────────────────── */

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
}

export const staggerContainerSlow: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.15,
    },
  },
}

/* ── Child Item Variants ───────────────────────────────────────────── */

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: smoothSpring,
  },
}

export const fadeUpSmall: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { ...smoothSpring, stiffness: 100 },
  },
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] },
  },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: smoothSpring,
  },
}

export const slideFromLeft: Variants = {
  hidden: { opacity: 0, x: -32 },
  visible: {
    opacity: 1,
    x: 0,
    transition: smoothSpring,
  },
}

export const slideFromRight: Variants = {
  hidden: { opacity: 0, x: 32 },
  visible: {
    opacity: 1,
    x: 0,
    transition: smoothSpring,
  },
}

/* ── Reusable Animated Wrappers ────────────────────────────────────── */

interface AnimatedSectionProps {
  children: ReactNode
  className?: string
  delay?: number
}

/** Viewport-triggered fade-up section wrapper. */
export function AnimatedSection({ children, className, delay = 0 }: AnimatedSectionProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={defaultViewport}
      variants={{
        hidden: { opacity: 0, y: 32 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { ...smoothSpring, delay },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/** Viewport-triggered stagger container for lists/grids. */
export function StaggerGroup({
  children,
  className,
  slow = false,
}: {
  children: ReactNode
  className?: string
  slow?: boolean
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={defaultViewport}
      variants={slow ? staggerContainerSlow : staggerContainer}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ── Re-exports for convenience ────────────────────────────────────── */

export { motion, useScroll, useTransform, useSpring }
export type { Variants, MotionValue }
