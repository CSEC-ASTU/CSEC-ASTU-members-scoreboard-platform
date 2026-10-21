"use client"

import { useState } from "react"
import { GraduationCap, Briefcase, Sparkles, Check, Share2, ArrowUpRight } from "lucide-react"
import type { AlumniItem } from "@/lib/api"

interface AlumniCardProps {
  alumni: AlumniItem
}

export function AlumniCard({ alumni }: AlumniCardProps) {
  const [copied, setCopied] = useState(false)
  const [imgError, setImgError] = useState(false)

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const url = alumni.profile_url || (typeof window !== "undefined" ? window.location.href : "")
    if (!url) return
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      // ignore
    }
  }

  // Initials fallback
  const initials = alumni.full_name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <div className="relative w-full rounded-2xl border border-zinc-800/90 bg-[#121316] p-5 sm:p-6 shadow-2xl backdrop-blur-xl transition-all duration-200 select-none cursor-pointer">
      <div className="flex flex-col-reverse sm:flex-row items-start sm:items-center justify-between gap-5 sm:gap-6">
        {/* Left Column: Identity, Narrative & Actions */}
        <div className="flex-1 min-w-0 space-y-3.5">
          {/* Top Metadata Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {alumni.division_name && (
              <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-0.5 text-[11px] font-mono font-medium text-violet-300">
                {alumni.division_name}
              </span>
            )}

            {alumni.graduation_year && (
              <div className="inline-flex items-center gap-1 rounded-full border border-zinc-800 bg-zinc-900/90 px-2.5 py-0.5 text-[11px] font-mono text-zinc-400">
                <GraduationCap className="w-3 h-3 text-violet-400" />
                <span>Class of {alumni.graduation_year}</span>
              </div>
            )}
          </div>

          {/* Primary Hero: Name & Role */}
          <div>
            <h3 className="text-base sm:text-lg font-bold tracking-tight text-white leading-tight">
              {alumni.full_name}
            </h3>
            <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-violet-400">
              <Briefcase className="w-3.5 h-3.5 shrink-0 text-violet-400" />
              <span className="truncate">{alumni.current_role}</span>
            </div>
          </div>

          {/* Narrative / Description: Compact, clean body copy */}
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-normal line-clamp-4">
            {alumni.description}
          </p>

          {/* Action Row */}
          <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-3">
            {alumni.profile_url ? (
              <a
                href={alumni.profile_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 hover:border-zinc-500 hover:text-white px-3.5 py-1.5 text-xs font-medium text-zinc-200 transition-colors shadow-sm"
              >
                <span>View Profile</span>
                <ArrowUpRight className="w-3 h-3 text-zinc-400" />
              </a>
            ) : (
              <span className="text-[11px] font-mono text-zinc-500">
                Verified CSEC ASTU Alumni
              </span>
            )}

            {alumni.profile_url && (
              <button
                type="button"
                onClick={handleShare}
                title="Copy profile link"
                className="flex items-center justify-center h-7 w-7 rounded-full border border-zinc-800 bg-zinc-900 hover:border-zinc-600 hover:text-white text-zinc-400 transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Share2 className="w-3 h-3" />}
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Compact Circular Portrait */}
        <div className="relative shrink-0 mx-auto sm:mx-0">
          <div className="relative h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28 rounded-full overflow-hidden border-2 border-violet-500/30 shadow-xl ring-2 ring-zinc-900/90 bg-zinc-900">
            {alumni.photo_url && !imgError ? (
              <img
                src={alumni.photo_url}
                alt={alumni.full_name}
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                onError={() => setImgError(true)}
                className="h-full w-full object-cover object-center pointer-events-none"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center p-2 text-center bg-gradient-to-br from-violet-900/30 via-zinc-900 to-zinc-950">
                <div className="text-xl sm:text-2xl font-bold text-violet-300">
                  {initials || <Sparkles className="w-6 h-6 text-violet-400" />}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
