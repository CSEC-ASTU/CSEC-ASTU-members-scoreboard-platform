/** Shared helpers for CSEC laptop verification QR stickers. */

export const PRODUCTION_BASE_URL = "https://csec-astu-members-platform.vercel.app"

export function memberVerificationUrl(memberId: string): string {
  return `${PRODUCTION_BASE_URL}/members/${memberId}`
}

export function qrServerUrl(data: string, size = 320): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
    data
  )}&margin=12&ecc=H`
}

/**
 * Open a blank window to write a printable sticker sheet into.
 *
 * Do NOT pass "noopener" in the features string: with it, window.open() always
 * returns null, so the sheet can never be written and printing silently fails.
 * Instead we sever the back-reference ourselves once we have the handle.
 * Must be called synchronously from a click handler or pop-up blockers will block it.
 */
export function openPrintWindow(width: number, height: number): Window | null {
  const printWindow = window.open("", "_blank", `width=${width},height=${height}`)
  if (printWindow) printWindow.opener = null
  return printWindow
}

export function stickerIdFor(memberId: string, joiningYear: number | null | undefined): string {
  const cleanId = memberId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase()
  const year = joiningYear || new Date().getFullYear()
  return `CSEC-${year}-${cleanId}`
}

export function truncateStickerName(name: string, maxLen = 22): string {
  const trimmed = name.trim()
  if (trimmed.length <= maxLen) return trimmed
  return `${trimmed.slice(0, maxLen - 1).trimEnd()}…`
}

/** First name only, for the large label printed under the QR code. */
export function stickerFirstName(fullName: string, maxLen = 14): string {
  const first = fullName.trim().split(/\s+/)[0] || fullName.trim()
  return truncateStickerName(first, maxLen)
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`))
    img.src = src
  })
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, r)
    return
  }
  ctx.beginPath()
  ctx.rect(x, y, w, h)
}

/**
 * Composites QR + CSEC logo + the member's first name into a PNG blob.
 * The logo sits alone in the centre badge; the first name is printed large
 * in a band directly under the QR so it stays readable.
 */
export async function composeQrStickerPng(opts: {
  memberId: string
  memberName: string
  size?: number
}): Promise<Blob> {
  const size = opts.size ?? 600
  const verificationUrl = memberVerificationUrl(opts.memberId)
  const qrUrl = qrServerUrl(verificationUrl, size)
  const firstName = stickerFirstName(opts.memberName)

  const [qrImg, logoImg] = await Promise.all([loadImage(qrUrl), loadImage("/csec_astu.svg")])

  const nameBand = Math.round(size * 0.16)
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size + nameBand
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas context unavailable")

  // White page background
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // QR
  ctx.drawImage(qrImg, 0, 0, size, size)

  // Center white badge: logo only (keeps the QR easy to scan)
  const badgeW = Math.round(size * 0.28)
  const badgeH = Math.round(size * 0.22)
  const badgeX = (size - badgeW) / 2
  const badgeY = (size - badgeH) / 2
  const radius = Math.round(size * 0.027)

  ctx.fillStyle = "#ffffff"
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, radius)
  ctx.fill()
  ctx.strokeStyle = "#e4e4e7"
  ctx.lineWidth = Math.max(2, Math.round(size * 0.007))
  ctx.stroke()

  const logoW = Math.round(badgeW * 0.8)
  const logoH = Math.round(logoW * (39.57 / 54.4))
  const logoX = (size - logoW) / 2
  const logoY = badgeY + (badgeH - logoH) / 2
  ctx.drawImage(logoImg, logoX, logoY, logoW, logoH)

  // First name, large, directly under the QR
  ctx.fillStyle = "#09090b"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.font = `800 ${Math.round(size * 0.09)}px system-ui, -apple-system, Segoe UI, sans-serif`
  ctx.fillText(firstName, size / 2, size + nameBand / 2 - Math.round(size * 0.01), size - 32)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error("Failed to generate PNG"))
      else resolve(blob)
    }, "image/png")
  })
}
