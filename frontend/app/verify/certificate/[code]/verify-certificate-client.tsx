"use client"

import { useState } from "react"
import Link from "next/link"
import {
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  Award,
  ExternalLink,
  Copy,
  Check,
  Calendar,
  Building2,
  ShieldCheck,
  FileText,
  Share2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import type { CertificatePublicVerify } from "@/lib/api/types"

interface Props {
  cert: CertificatePublicVerify | null
  queriedCode: string
}

export function VerifyCertificateClient({ cert, queriedCode }: Props) {
  const [copied, setCopied] = useState(false)

  const copyVerificationLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      toast.success("Verification link copied to clipboard")
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Case 1: Certificate Not Found
  if (!cert) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
          <AlertOctagon className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Credential Not Found</h2>
        <p className="text-sm text-zinc-400">
          No certificate matching code <span className="font-mono text-zinc-300 font-semibold">{queriedCode}</span> was found in the official registry.
        </p>
        <div className="pt-4">
          <Link href="/">
            <Button variant="outline" size="sm" className="border-zinc-800 text-zinc-300 hover:text-white">
              Return to Platform Home
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // LinkedIn Add to Profile URL construction
  const issueDateObj = new Date(cert.issued_at)
  const issueMonth = issueDateObj.getMonth() + 1
  const issueYear = cert.academic_year || issueDateObj.getFullYear()
  const linkedinUrl = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(
    cert.title
  )}&organizationName=${encodeURIComponent(
    "Computer Science and Engineering Club (CSEC) - ASTU"
  )}&issueYear=${issueYear}&issueMonth=${issueMonth}&certUrl=${encodeURIComponent(
    cert.verify_url
  )}&certId=${encodeURIComponent(cert.cert_code)}`

  return (
    <div className="space-y-6">
      {/* 1. Verification Status Banner */}
      {cert.is_revoked ? (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/25 flex items-start gap-3">
          <AlertOctagon className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <h3 className="font-bold text-red-300 text-sm">Credential Officially Revoked</h3>
            <p className="text-red-200/80">
              This certificate has been revoked by club leadership.
              {cert.revoked_reason && (
                <span className="block mt-1 font-medium italic text-red-300">
                  Reason: &ldquo;{cert.revoked_reason}&rdquo;
                </span>
              )}
            </p>
          </div>
        </div>
      ) : cert.is_valid ? (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-3 shadow-lg shadow-emerald-950/20">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-xs">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-emerald-300 text-sm">Officially Verified Credential</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Authentic
              </span>
            </div>
            <p className="text-emerald-200/80">
              This certificate is cryptographically verified via HMAC-SHA256 and confirmed by CSEC-ASTU Leadership.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-xs">
            <h3 className="font-bold text-amber-300 text-sm">Integrity Verification Warning</h3>
            <p className="text-amber-200/80">
              Cryptographic signature could not be verified against the official secret key.
            </p>
          </div>
        </div>
      )}

      {/* 2. Main Certificate Display Card */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.12] bg-[#101116] shadow-2xl p-6 sm:p-10 space-y-8">
        {/* Subtle Decorative Background Glows */}
        <div className="absolute -right-24 -top-24 w-72 h-72 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-24 -bottom-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Certificate Card Header */}
        <div className="relative text-center space-y-2 border-b border-white/[0.08] pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-xs font-semibold text-zinc-300 uppercase tracking-widest">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>CSEC-ASTU Certificate of Achievement</span>
          </div>
          <p className="text-xs text-zinc-400 tracking-wider uppercase font-medium">
            Computer Science and Engineering Club · Adama Science & Technology University
          </p>
        </div>

        {/* Recipient & Conferred Title */}
        <div className="relative text-center space-y-4 py-2">
          <span className="text-xs text-zinc-400 uppercase tracking-wider block">
            This official credential is conferred upon
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 via-white to-zinc-300">
            {cert.recipient_name}
          </h1>

          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-zinc-400">
            {cert.is_external ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                <Building2 className="w-3 h-3" />
                {cert.recipient_organization || "External Participant"}
              </span>
            ) : (
              <>
                {cert.recipient_student_id && (
                  <span className="font-mono bg-white/[0.06] px-2.5 py-0.5 rounded-md border border-white/10 text-zinc-300">
                    {cert.recipient_student_id}
                  </span>
                )}
                {cert.recipient_department && <span>· {cert.recipient_department}</span>}
              </>
            )}
            <span>· {cert.division_name}</span>
          </div>

          {/* Custom Attributes Badges (e.g. Rank, Team, Track) */}
          {cert.custom_attributes && Object.keys(cert.custom_attributes).length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              {Object.entries(cert.custom_attributes).map(([k, v]) => {
                if (k === "student_id" || k === "department" || k === "organization" || !v) return null
                return (
                  <span
                    key={k}
                    className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/25 text-violet-300 font-medium"
                  >
                    <span className="text-zinc-500 capitalize">{k.replace(/_/g, " ")}:</span>
                    <strong className="text-violet-200">{String(v)}</strong>
                  </span>
                )
              })}
            </div>
          )}

          <div className="max-w-xl mx-auto pt-2">
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1.5">
              <h2 className="text-base sm:text-lg font-bold text-amber-400">
                {cert.title}
              </h2>
              {cert.description && (
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {cert.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Metadata Details Grid */}
        <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-b border-white/[0.08] py-5 text-xs">
          <div>
            <span className="text-zinc-500 block text-[11px] uppercase tracking-wider">Academic Year</span>
            <span className="text-zinc-200 font-semibold">{cert.academic_year}</span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[11px] uppercase tracking-wider">Issued Date</span>
            <span className="text-zinc-200 font-semibold">
              {new Date(cert.issued_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[11px] uppercase tracking-wider">Issued By</span>
            <span className="text-zinc-200 font-semibold">{cert.issuer_name || "Club Executive"}</span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[11px] uppercase tracking-wider">Credential ID</span>
            <span className="font-mono text-[11px] text-zinc-300">{cert.cert_code}</span>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="relative flex flex-wrap items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={copyVerificationLink}
              className="h-8 text-xs border-white/10 hover:bg-white/[0.06] text-zinc-300 gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Link Copied" : "Copy Verification URL"}</span>
            </Button>

            {cert.drive_view_link && (
              <a href={cert.drive_view_link} target="_blank" rel="noopener noreferrer">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs border-white/10 hover:bg-white/[0.06] text-zinc-300 gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Download PDF</span>
                </Button>
              </a>
            )}
          </div>

          <a href={linkedinUrl} target="_blank" rel="noopener noreferrer">
            <Button
              size="sm"
              className="h-8 text-xs bg-[#0a66c2] hover:bg-[#084e96] text-white font-medium gap-1.5 shadow-md shadow-blue-900/20"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Add to LinkedIn</span>
            </Button>
          </a>
        </div>
      </div>
    </div>
  )
}
