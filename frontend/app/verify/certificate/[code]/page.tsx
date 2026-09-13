import { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Award, ShieldCheck, ArrowLeft, Globe } from "lucide-react"
import { VerifyCertificateClient } from "./verify-certificate-client"
import type { CertificatePublicVerify } from "@/lib/api/types"

interface Props {
  params: Promise<{ code: string }>
}

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, "") ||
  "http://localhost:8000"

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

export default async function CertificateVerifyPage({ params }: Props) {
  const { code } = await params
  const cert = await fetchCertificate(code)

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between selection:bg-purple-500/30">
      {/* Top Brand Bar */}
      <header className="border-b border-white/[0.08] bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-xs font-semibold text-zinc-300 hover:text-white transition-colors"
          >
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white shadow-sm">
              <Award className="w-3.5 h-3.5" />
            </div>
            <span>CSEC-ASTU Registry</span>
          </Link>
          <div className="flex items-center gap-2 text-[11px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Cryptographic Registry</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <VerifyCertificateClient cert={cert} queriedCode={code} />
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-6 text-center text-xs text-zinc-500">
        <p>
          Official Credential Verification Service · Computer Science and Engineering Club (CSEC), ASTU
        </p>
        <p className="mt-1 text-[11px] text-zinc-600">
          Powered by CSEC Cryptographic Key Integrity Protocol
        </p>
      </footer>
    </div>
  )
}
