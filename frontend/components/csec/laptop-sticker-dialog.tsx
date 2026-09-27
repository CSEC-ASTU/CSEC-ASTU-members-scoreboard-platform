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
import {
  composeQrStickerPng,
  memberVerificationUrl,
  qrServerUrl,
  stickerIdFor,
  truncateStickerName,
} from "@/lib/qr-sticker"

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
  const [downloading, setDownloading] = useState(false)

  const verificationUrl = useMemo(() => memberVerificationUrl(member.id), [member.id])

  // ecc=H (High error correction ~30%) ensures the logo + name in the center don't impede scanning
  const qrImageUrl = useMemo(() => qrServerUrl(verificationUrl, 320), [verificationUrl])

  const stickerId = useMemo(
    () => stickerIdFor(member.id, member.joiningYear),
    [member.id, member.joiningYear],
  )

  const centerName = useMemo(() => truncateStickerName(member.name, 18), [member.name])

  const handleCopyLink = () => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(verificationUrl)
      setCopied(true)
      toast.success("Verification link copied to clipboard")
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownloadQR = async () => {
    setDownloading(true)
    try {
      const blob = await composeQrStickerPng({
        memberId: member.id,
        memberName: member.name,
        size: 600,
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `csec-qr-${member.name.toLowerCase().replace(/\s+/g, "-")}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      toast.success("QR sticker with name & CSEC ASTU logo downloaded!")
    } catch (err) {
      console.error("Download error:", err)
      try {
        const fallbackUrl = `${qrServerUrl(verificationUrl, 600)}&format=png`
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
        toast.success("QR sticker downloaded!")
      } catch {
        toast.error("Failed to download QR code")
      }
    } finally {
      setDownloading(false)
    }
  }

  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=480,height=720")
    if (!printWindow) {
      toast.error("Allow pop-ups to print the sticker")
      return
    }

    const safeName = member.name.replace(/</g, "&lt;").replace(/>/g, "&gt;")
    const safeDivision = member.division.replace(/</g, "&lt;").replace(/>/g, "&gt;")
    const safeCenterName = centerName.replace(/</g, "&lt;").replace(/>/g, "&gt;")

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>CSEC QR — ${safeName}</title>
  <style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, Segoe UI, sans-serif;
      display: flex;
      justify-content: center;
      padding: 16px;
      color: #09090b;
    }
    .sticker {
      width: 72mm;
      border: 1.5px dashed #a1a1aa;
      border-radius: 10px;
      padding: 10px 12px 14px;
      text-align: center;
      page-break-inside: avoid;
    }
    .meta {
      display: flex;
      justify-content: space-between;
      font-size: 8px;
      font-family: ui-monospace, monospace;
      color: #52525b;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 6px;
    }
    .title {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .qr-wrap {
      position: relative;
      display: inline-flex;
      background: #fff;
      padding: 6px;
      border: 1px solid #e4e4e7;
      border-radius: 8px;
    }
    .qr-wrap img.qr { width: 48mm; height: 48mm; display: block; }
    .center-badge {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }
    .center-badge > div {
      background: #fff;
      border: 1px solid #e4e4e7;
      border-radius: 6px;
      padding: 4px 6px 5px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      box-shadow: 0 1px 2px rgb(0 0 0 / 8%);
      max-width: 38%;
    }
    .center-badge img { width: 18mm; height: auto; display: block; }
    .center-badge span {
      font-size: 7px;
      font-weight: 700;
      line-height: 1.15;
      text-align: center;
      max-width: 100%;
      word-break: break-word;
    }
    .name {
      margin-top: 8px;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    .division {
      margin-top: 3px;
      font-size: 10px;
      color: #3f3f46;
    }
    .hint {
      margin-top: 8px;
      padding-top: 6px;
      border-top: 1px solid #e4e4e7;
      font-size: 8px;
      color: #71717a;
      font-family: ui-monospace, monospace;
    }
  </style>
</head>
<body>
  <div class="sticker">
    <div class="meta"><span>ASTU CSEC LAB</span><span>${stickerId}</span></div>
    <div class="title">Physical Security Clearance</div>
    <div class="qr-wrap">
      <img class="qr" src="${qrImageUrl}" alt="QR" />
      <div class="center-badge">
        <div>
          <img src="${window.location.origin}/csec_astu.svg" alt="CSEC ASTU" />
          <span>${safeCenterName}</span>
        </div>
      </div>
    </div>
    <div class="name">${safeName}</div>
    <div class="division">${safeDivision}</div>
    <div class="hint">Scan to verify lab membership</div>
  </div>
  <script>
    window.onload = function () {
      setTimeout(function () { window.print(); }, 350);
    };
  </script>
</body>
</html>`)
    printWindow.document.close()
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

        <div className="my-2 p-5 rounded-2xl border-2 border-dashed border-zinc-700/80 bg-zinc-900/90 relative overflow-hidden shadow-inner flex flex-col items-center text-center">
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

          {/* QR with CSEC logo + member name under the logo */}
          <div className="p-3 bg-white rounded-xl shadow-lg border border-zinc-200 my-1 relative group inline-flex items-center justify-center">
            <img
              src={qrImageUrl}
              alt={`QR Code for ${member.name}`}
              className="w-48 h-48 object-contain"
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="px-2.5 pt-1.5 pb-2 bg-white rounded-lg shadow-md border border-zinc-200/90 flex flex-col items-center justify-center gap-0.5 max-w-[42%]">
                <img
                  src="/csec_astu.svg"
                  alt="CSEC ASTU"
                  className="w-[48px] h-[35px] object-contain"
                />
                <span className="text-[8px] font-bold leading-tight text-zinc-900 text-center tracking-tight">
                  {centerName}
                </span>
              </div>
            </div>
          </div>

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
            disabled={downloading}
            className="border-zinc-800 hover:bg-zinc-800 text-zinc-200 text-xs flex-1"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            {downloading ? "Saving…" : "Save PNG"}
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
