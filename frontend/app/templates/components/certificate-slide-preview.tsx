"use client"

import React from "react"
import { Award, QrCode } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CertificateTemplate } from "../types"

interface CertificateSlidePreviewProps {
  template: CertificateTemplate
  className?: string
  recipientName?: string
  showPlaceholderTags?: boolean
}

export function CertificateSlidePreview({
  template,
  className,
  recipientName,
  showPlaceholderTags = true,
}: CertificateSlidePreviewProps) {
  const accent = template.accentColor || "#d97706"

  return (
    <div
      className={cn(
        "relative w-full aspect-[16/10] sm:aspect-[16/9] bg-white text-zinc-900 rounded-md overflow-hidden shadow-sm select-none border border-zinc-200/90",
        className
      )}
      style={{
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.08)",
      }}
    >
      {/* ── Outer Delicate Certificate Border ────────────────────────────── */}
      <div
        className="absolute inset-2 sm:inset-2.5 rounded-sm border pointer-events-none"
        style={{ borderColor: `${accent}40` }}
      />
      <div
        className="absolute inset-3 sm:inset-3.5 rounded-sm border-2 pointer-events-none"
        style={{ borderColor: `${accent}99` }}
      />

      {/* ── Corner Flourishes (Tech Geometric Accents) ───────────────────── */}
      <div
        className="absolute top-4 left-4 w-3.5 h-3.5 border-t-2 border-l-2 pointer-events-none"
        style={{ borderColor: accent }}
      />
      <div
        className="absolute top-4 right-4 w-3.5 h-3.5 border-t-2 border-r-2 pointer-events-none"
        style={{ borderColor: accent }}
      />
      <div
        className="absolute bottom-4 left-4 w-3.5 h-3.5 border-b-2 border-l-2 pointer-events-none"
        style={{ borderColor: accent }}
      />
      <div
        className="absolute bottom-4 right-4 w-3.5 h-3.5 border-b-2 border-r-2 pointer-events-none"
        style={{ borderColor: accent }}
      />

      {/* ── Subtle Guilloche / Geometric Background Lattice ─────────────── */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(${accent} 1px, transparent 1px)`,
          backgroundSize: "12px 12px",
        }}
      />

      {/* ── Certificate Document Content Body ───────────────────────────── */}
      <div className="relative h-full w-full p-5 sm:p-7 flex flex-col justify-between items-center text-center">
        {/* Top Header & Crest */}
        <div className="space-y-1 sm:space-y-1.5 flex flex-col items-center">
          <div className="flex items-center gap-1.5">
            <div
              className="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-white text-[9px] sm:text-[10px] font-bold shadow-xs"
              style={{ backgroundColor: accent }}
            >
              <Award className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            </div>
            <span className="text-[8px] sm:text-[10px] font-bold tracking-[0.2em] text-zinc-600 uppercase">
              CSEC ASTU · Adama Science & Technology University
            </span>
          </div>

          <div className="space-y-0.5">
            <h3
              className="text-[11px] sm:text-[14px] font-extrabold uppercase tracking-widest text-zinc-900"
              style={{ letterSpacing: "0.15em" }}
            >
              Certificate of Achievement
            </h3>
            <p className="text-[7.5px] sm:text-[9px] font-medium text-zinc-500 uppercase tracking-wider">
              {template.division} · {template.category} Track
            </p>
          </div>
        </div>

        {/* Centerpiece: Recipient & Citation */}
        <div className="my-auto py-1 sm:py-2 space-y-1.5 max-w-[85%]">
          <span className="text-[7.5px] sm:text-[9px] text-zinc-400 uppercase tracking-wider block font-medium">
            This credential is proudly conferred upon
          </span>

          {/* Student Name */}
          <div className="py-0.5">
            <span
              className="text-[12px] sm:text-[16px] font-serif font-bold text-zinc-900 tracking-tight block truncate"
              style={{ color: "#0f172a" }}
            >
              {recipientName || (showPlaceholderTags ? "{{STUDENT_NAME}}" : "Student Recipient Name")}
            </span>
            <div
              className="h-[1px] w-28 sm:w-36 mx-auto mt-0.5"
              style={{ backgroundColor: `${accent}60` }}
            />
          </div>

          {/* Title & Citation */}
          <p className="text-[8px] sm:text-[10px] font-semibold text-zinc-800 line-clamp-1">
            {template.title}
          </p>
          <p className="text-[6.5px] sm:text-[8px] text-zinc-500 line-clamp-2 leading-relaxed px-2 font-light">
            {template.description}
          </p>
        </div>

        {/* Footer: Signatures, Seal & QR Code */}
        <div className="w-full grid grid-cols-4 items-end pt-1 sm:pt-2 border-t border-zinc-100">
          {/* Signatory 1 */}
          <div className="text-left space-y-0.5 col-span-1">
            <div className="h-4 sm:h-5 w-14 sm:w-16 flex items-end">
              <svg className="w-full h-3 text-zinc-700" viewBox="0 0 100 20">
                <path
                  d="M 5 15 Q 25 5 45 15 T 85 10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="w-14 sm:w-18 h-px bg-zinc-300" />
            <span className="text-[6px] sm:text-[7.5px] font-semibold text-zinc-700 block truncate leading-tight">
              {template.signatoryLeftName}
            </span>
            <span className="text-[5.5px] sm:text-[6.5px] text-zinc-400 block truncate leading-none">
              {template.signatoryLeftTitle}
            </span>
          </div>

          {/* Official Foil Seal Stamp */}
          <div className="flex flex-col items-center justify-center col-span-2">
            <div
              className="w-7 h-7 sm:w-9 sm:h-9 rounded-full border-2 flex items-center justify-center text-center p-0.5 shadow-xs"
              style={{
                borderColor: accent,
                background: `radial-gradient(circle, #ffffff 40%, ${accent}15 100%)`,
              }}
            >
              <div
                className="w-5 h-5 sm:w-7 sm:h-7 rounded-full border border-dashed flex flex-col items-center justify-center"
                style={{ borderColor: accent }}
              >
                <span
                  className="text-[4.5px] sm:text-[6px] font-black uppercase tracking-tighter"
                  style={{ color: accent }}
                >
                  CSEC
                </span>
                <span className="text-[3.5px] sm:text-[4.5px] font-bold text-zinc-600">
                  OFFICIAL
                </span>
              </div>
            </div>
          </div>

          {/* QR Code Placeholder Box */}
          <div className="flex flex-col items-end text-right col-span-1">
            <div
              className="w-6 h-6 sm:w-8 sm:h-8 rounded bg-zinc-50 border flex flex-col items-center justify-center p-0.5"
              style={{ borderColor: `${accent}50` }}
              title="QR Code for Cryptographic Verification"
            >
              <QrCode className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-zinc-700" />
            </div>
            <span className="text-[5px] sm:text-[6.5px] font-mono text-zinc-400 mt-0.5 leading-none">
              {showPlaceholderTags ? "{{QR_CODE}}" : "CSEC-2026-DEV"}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
