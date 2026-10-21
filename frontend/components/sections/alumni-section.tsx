"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence, type PanInfo } from "framer-motion"
import { Award, Sparkles, Touchpad } from "lucide-react"
import { AlumniCard } from "./alumni-card"
import { alumniService, type AlumniItem } from "@/lib/api"
import { useReveal } from "@/hooks/use-reveal"

export function AlumniSection() {
  const { ref, isVisible } = useReveal(0.1)
  const [alumni, setAlumni] = useState<AlumniItem[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [dragDirection, setDragDirection] = useState<"left" | "right">("right")

  useEffect(() => {
    async function fetchAlumni() {
      try {
        const data = await alumniService.listAlumni({ featured_only: true, limit: 12 })
        setAlumni(data || [])
      } catch {
        setAlumni([])
      } finally {
        setLoading(false)
      }
    }
    fetchAlumni()
  }, [])

  const count = alumni.length

  // Bring next card to front
  const handleNext = () => {
    if (count <= 1) return
    setDragDirection("right")
    setCurrentIndex((prev) => (prev + 1) % count)
  }

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 40
    if (info.offset.x < -threshold) {
      setDragDirection("left")
      setCurrentIndex((prev) => (prev + 1) % count)
    } else if (info.offset.x > threshold) {
      setDragDirection("right")
      setCurrentIndex((prev) => (prev + 1) % count)
    }
  }

  // Hide section completely if no alumni in DB
  if (!loading && count === 0) {
    return null
  }

  const currentCard = count > 0 ? alumni[currentIndex % count] : null
  const secondCard = count > 1 ? alumni[(currentIndex + 1) % count] : null
  const thirdCard = count > 2 ? alumni[(currentIndex + 2) % count] : null

  return (
    <section
      id="alumni"
      ref={ref}
      className="relative w-full border-t border-zinc-800/80 bg-[#0B0C0E] px-6 py-20 md:px-12 md:py-24 overflow-hidden"
    >
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[350px] w-[500px] rounded-full bg-violet-600/5 blur-3xl" />

      <div className="mx-auto max-w-xl relative z-10">
        {/* Section Header (Centered & Compact) */}
        <div
          className={`mb-10 text-center transition-all duration-700 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
        >
          <div className="mb-2 inline-flex items-center gap-1.5 text-xs font-mono font-medium text-violet-400">
            <Award className="h-3.5 w-3.5" />
            <span>HONORABLE ALUMNI</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">
            Where CSEC builders engineer next.
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
            Spotlighting verified CSEC ASTU alumni shaping tech across industry and research.
          </p>
        </div>

        {/* Stack Viewport Area (Compact, Real Deck Layout) */}
        {loading ? (
          <div className="w-full h-56 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 animate-pulse" />
        ) : count > 0 && currentCard ? (
          <div className="relative w-full flex flex-col items-center">
            {/* The Physical Card Stack Deck */}
            <div className="relative w-full min-h-[260px] sm:min-h-[240px] flex items-center justify-center">
              {/* Layer 3: Deepest card silhouette */}
              {thirdCard && (
                <div
                  aria-hidden="true"
                  className="absolute inset-0 rounded-2xl border border-zinc-800/40 bg-[#0D0E11] select-none pointer-events-none transition-transform duration-300 shadow-lg"
                  style={{
                    transform: "translateY(20px) scale(0.92) rotate(-1.5deg)",
                    opacity: 0.35,
                    zIndex: 1,
                  }}
                />
              )}

              {/* Layer 2: Middle card layer peeking out */}
              {secondCard && (
                <div
                  aria-hidden="true"
                  className="absolute inset-0 rounded-2xl border border-zinc-800/60 bg-[#0F1013] select-none pointer-events-none transition-transform duration-300 shadow-xl"
                  style={{
                    transform: "translateY(10px) scale(0.96) rotate(1deg)",
                    opacity: 0.7,
                    zIndex: 2,
                  }}
                />
              )}

              {/* Layer 1: Top active card (Tap or swipe to bring next image) */}
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={currentCard.id}
                  drag={count > 1 ? "x" : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.6}
                  onDragEnd={handleDragEnd}
                  onClick={count > 1 ? handleNext : undefined}
                  initial={{
                    scale: 0.96,
                    y: 10,
                    opacity: 0.8,
                  }}
                  animate={{
                    scale: 1,
                    y: 0,
                    opacity: 1,
                    x: 0,
                    rotate: 0,
                  }}
                  exit={{
                    x: dragDirection === "right" ? 280 : -280,
                    rotate: dragDirection === "right" ? 10 : -10,
                    opacity: 0,
                    transition: { duration: 0.22, ease: "easeOut" },
                  }}
                  whileHover={count > 1 ? { scale: 1.01 } : undefined}
                  whileTap={count > 1 ? { scale: 0.98 } : undefined}
                  transition={{
                    type: "spring",
                    stiffness: 350,
                    damping: 26,
                  }}
                  className={`relative w-full z-10 ${count > 1 ? "cursor-pointer active:cursor-grabbing" : ""}`}
                >
                  <AlumniCard alumni={currentCard} />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Tap to cycle micro-hint & dot indicators */}
            {count > 1 && (
              <div className="mt-8 flex flex-col items-center gap-2 select-none">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-zinc-500">
                  <Touchpad className="h-3 w-3 text-violet-400" />
                  <span>Tap card or swipe to reveal next</span>
                </span>

                <div className="flex items-center gap-1.5 mt-1">
                  {alumni.map((item, idx) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-1.5 transition-all rounded-full cursor-pointer ${
                        idx === currentIndex
                          ? "w-6 bg-violet-500"
                          : "w-1.5 bg-zinc-800 hover:bg-zinc-700"
                      }`}
                      aria-label={`Show alumni ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  )
}
