"use client"

import { useState, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  QrCode,
  Copy,
  CheckCircle2,
  Download,
  Printer,
  ShieldCheck,
  Laptop,
  Sparkles,
} from "lucide-react"

interface LaptopStickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: {
    id: string
    name: string
    email: string
    division: string
    secondaryDivision?: string | null
    joiningYear: number
    role: string
    profileImageUrl?: string | null
  }
}

export function LaptopStickerDialog({
  open,
  onOpenChange,
  member,
}: LaptopStickerDialogProps) {
  const [copied, setCopied] = useState(false)

  const PRODUCTION_BASE_URL = "https://csec-astu-members-platform.vercel.app"
  const verificationUrl = useMemo(() => {
    return `${PRODUCTION_BASE_URL}/members/${member.id}`
  }, [member.id])

  // ecc=H (High error correction ~30%) ensures the logo in the center doesn't impede scanning
  const qrImageUrl = useMemo(() => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(
      verificationUrl
    )}&margin=12&ecc=H`
  }, [verificationUrl])

  const stickerId = useMemo(() => {
    const cleanId = member.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase()
    return `CSEC-${member.joiningYear}-${cleanId}`
  }, [member.id, member.joiningYear])

  const handleCopyLink = () => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(verificationUrl)
      setCopied(true)
      toast.success("Verification link copied to clipboard")
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownloadQR = async () => {
    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(
        verificationUrl
      )}&margin=16&ecc=H`

      // 1. Load QR code image cleanly
      const qrImg = new Image()
      qrImg.crossOrigin = "anonymous"
      await new Promise<void>((resolve, reject) => {
        qrImg.onload = () => resolve()
        qrImg.onerror = () => reject(new Error("Failed to load QR image"))
        qrImg.src = qrUrl
      })

      // 2. Load CSEC ASTU SVG logo via Image object (avoids createImageBitmap SVG limitation)
      const logoImg = new Image()
      logoImg.crossOrigin = "anonymous"
      await new Promise<void>((resolve, reject) => {
        logoImg.onload = () => resolve()
        logoImg.onerror = () => reject(new Error("Failed to load SVG logo"))
        logoImg.src = "/csec_astu.svg"
      })

      // 3. Composite on canvas
      const canvas = document.createElement("canvas")
      canvas.width = 600
      canvas.height = 600
      const ctx = canvas.getContext("2d")

      if (!ctx) throw new Error("Canvas context unavailable")

      // Draw QR code
      ctx.drawImage(qrImg, 0, 0, 600, 600)

      // Center white badge background for logo
      const badgeW = 160
      const badgeH = 116
      const badgeX = (600 - badgeW) / 2
      const badgeY = (600 - badgeH) / 2
      const radius = 16

      ctx.fillStyle = "#ffffff"
      ctx.beginPath()
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, radius)
      } else {
        ctx.rect(badgeX, badgeY, badgeW, badgeH)
      }
      ctx.fill()
      ctx.strokeStyle = "#e4e4e7"
      ctx.lineWidth = 4
      ctx.stroke()

      // Center logo (54.4 / 39.57 aspect ratio)
      const logoW = 136
      const logoH = 99
      const logoX = (600 - logoW) / 2
      const logoY = (600 - logoH) / 2
      ctx.drawImage(logoImg, logoX, logoY, logoW, logoH)

      // 4. Download file
      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error("Failed to generate download file")
          return
        }
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `csec-qr-${member.name.toLowerCase().replace(/\s+/g, "-")}.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        toast.success("QR Sticker with CSEC ASTU logo downloaded!")
      }, "image/png")
    } catch (err) {
      console.error("Download error:", err)
      // Robust Fallback: direct download from QR endpoint
      try {
        const fallbackUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(
          verificationUrl
        )}&margin=16&ecc=H&format=png`
        const resp = await fetch(fallbackUrl)
        const blob = await resp.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `csec-qr-${member.name.toLowerCase().replace(/\s+/g, "-")}.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        toast.success("QR Sticker downloaded!")
      } catch {
        toast.error("Failed to download QR code")
      }
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 bg-zinc-950 border-zinc-800 text-zinc-100 shadow-2xl">
        <DialogHeader className="space-y-1 text-left">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-zinc-100 border border-zinc-700">
              <Laptop className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                Physical Laptop Sticker
                <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-[10px] uppercase font-mono">
                  Official Asset Pass
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                Print or download this QR sticker to attach to your laptop for lab security clearance.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Photorealistic Physical Sticker Card */}
        <div className="my-2 p-5 rounded-2xl border-2 border-dashed border-zinc-700/80 bg-zinc-900/90 relative overflow-hidden shadow-inner flex flex-col items-center text-center">
          {/* Subtle Cyber Accents */}
          <div className="absolute top-2 left-2 text-[9px] font-mono text-zinc-500 tracking-widest uppercase flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-emerald-400" />
            ASTU CSEC LAB
          </div>
          <div className="absolute top-2 right-2 text-[9px] font-mono text-zinc-500 tracking-wider">
            {stickerId}
          </div>

          <div className="mt-4 mb-2">
            <span className="text-[11px] font-bold tracking-wider text-zinc-300 uppercase">
              Physical Security Clearance
            </span>
          </div>

          {/* High Contrast QR Code Display with CSEC ASTU Logo in the Center */}
          <div className="p-3 bg-white rounded-xl shadow-lg border border-zinc-200 my-1 relative group inline-flex items-center justify-center">
            <img
              src={qrImageUrl}
              alt={`QR Code for ${member.name}`}
              className="w-48 h-48 object-contain"
            />
            {/* Center Logo Overlay (Enlarged and crisply centered) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="px-2 py-1.5 bg-white rounded-lg shadow-md border border-zinc-200/90 flex items-center justify-center">
                <img
                  src="/csec_astu.svg"
                  alt="CSEC ASTU"
                  className="w-[54px] h-[39px] object-contain"
                />
              </div>
            </div>
          </div>

          {/* Member Details on Sticker */}
          <div className="mt-3 space-y-1">
            <h4 className="text-base font-bold text-white tracking-tight">
              {member.name}
            </h4>
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              <span className="text-xs font-medium text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-700">
                {member.division}
              </span>
              {member.secondaryDivision && (
                <span className="text-xs font-medium text-zinc-400 bg-zinc-800/60 px-2 py-0.5 rounded-full border border-zinc-700/60">
                  {member.secondaryDivision}
                </span>
              )}
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-zinc-800/80 w-full text-center">
            <p className="text-[10px] text-zinc-400 font-mono flex items-center justify-center gap-1">
              <Sparkles className="h-3 w-3 text-violet-400" />
              Scan to verify lab membership &amp; hardware ownership
            </p>
          </div>
        </div>

        {/* Information Callout */}
        <div className="rounded-lg bg-zinc-900/60 border border-zinc-800/80 p-3 text-xs text-zinc-400 space-y-1">
          <p className="font-semibold text-zinc-200">How the security scan works:</p>
          <p className="text-[11px] leading-relaxed">
            When anyone scans this QR code in the lab, the platform will require them to authenticate as an active CSEC ASTU member before displaying your full verification card and photo.
          </p>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="border-zinc-800 hover:bg-zinc-800 text-zinc-200 text-xs flex-1"
          >
            {copied ? (
              <>
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-emerald-400" /> Copied!
              </>
            ) : (
              <>
                <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy Link
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadQR}
            className="border-zinc-800 hover:bg-zinc-800 text-zinc-200 text-xs flex-1"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" /> Save PNG
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handlePrint}
            className="bg-violet-600 hover:bg-violet-500 text-white text-xs flex-1"
          >
            <Printer className="mr-1.5 h-3.5 w-3.5" /> Print Sticker
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
