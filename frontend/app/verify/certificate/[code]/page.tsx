import { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Award, ShieldCheck, ArrowLeft, Globe } from "lucide-react"
import { VerifyCertificateClient } from "./verify-certificate-client"
import type { CertificatePublicVerify } from "@/lib/api/types"
import { getBackendOrigin } from "@/lib/backend-url.mjs"

interface Props {
  params: Promise<{ code: string }>
}

const BACKEND_URL = getBackendOrigin()

async function fetchCertificate(code: string): Promise<CertificatePublicVerify | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/certificates/verify/${encodeURIComponent(code)}`, {
      cache: "no-store",
    })
    if (!res.ok) return null
    return await res.json()
  } catch (err) {
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params
  const cert = await fetchCertificate(code)

  if (!cert) {
    return {
      title: "Certificate Verification | CSEC-ASTU",
      description: "Cryptographic credential verification for CSEC-ASTU certifications.",
    }
  }

  const title = `${cert.recipient_name} · ${cert.title} | Verified Credential`
  const description = `Officially verified CSEC-ASTU certification conferred upon ${cert.recipient_name} for ${cert.title} (${cert.academic_year} Academic Year).`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      siteName: "CSEC ASTU Official Credential Registry",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  }
}

import Image from "next/image"

export default async function CertificateVerifyPage({ params }: Props) {
  const { code } = await params
  const cert = await fetchCertificate(code)

  return (
    <div className="relative min-h-screen w-full bg-[#0B0C0E] text-zinc-100 antialiased selection:bg-violet-500/30 selection:text-violet-200 flex flex-col justify-between">
      {/* ── Authentic Student Photo Backdrop (Cohesive with Hero, Login, & Verify) ── */}
      <div className="fixed inset-0 z-0 pointer-events-none select-none overflow-hidden opacity-40">
        <Image
          src="/images/hero-lecture.jpg?v=2"
          alt="CSEC ASTU Members"
          fill
          priority
          className="object-cover object-[center_60%] grayscale-[10%]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0C0E]/90 via-[#0B0C0E]/50 to-[#0B0C0E]/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B0C0E]/85 via-[#0B0C0E]/40 to-transparent" />
      </div>

      {/* ── Top Brand Bar ────────────────────────────────────────────── */}
      <header className="relative z-10 w-full border-b border-zinc-800/60 px-6 py-4 md:px-12 md:py-5 lg:px-16">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <Image
              src="/csec_astu.svg"
              alt="CSEC ASTU"
              width={26}
              height={18}
              className="h-5 w-auto invert opacity-90 transition-opacity group-hover:opacity-100"
            />
            <div className="flex flex-col">
              <span className="font-semibold text-sm tracking-tight text-zinc-100">
                CSEC ASTU
              </span>
              <span className="font-mono text-[10px] text-zinc-500 hidden sm:inline">
                Dept. of Computer Science &amp; Engineering
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/verify"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 text-xs font-mono text-zinc-300 hover:text-white hover:border-zinc-700 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Verify Another</span>
            </Link>

            <div className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 font-mono">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Official Registry</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Container ────────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <VerifyCertificateClient cert={cert} queriedCode={code} />
      </main>

      {/* ── Collegiate Minimal Footer ─────────────────────────────────── */}
      <footer className="relative z-10 w-full border-t border-zinc-800/60 px-6 py-5 text-center text-xs font-mono text-zinc-500">
        Dept. of Computer Science &amp; Engineering · Adama Science and Technology University · Adama, Ethiopia
      </footer>
    </div>
  )
}
