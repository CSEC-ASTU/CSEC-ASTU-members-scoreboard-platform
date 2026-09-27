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
 * Composites QR + CSEC logo + member name into a PNG blob.
 * Name sits under the logo inside the center white badge (preferred),
 * with a fallback name strip under the QR if the name is very long.
 */
export async function composeQrStickerPng(opts: {
  memberId: string
  memberName: string
  size?: number
}): Promise<Blob> {
  const size = opts.size ?? 600
  const verificationUrl = memberVerificationUrl(opts.memberId)
  const qrUrl = qrServerUrl(verificationUrl, size)
  const displayName = truncateStickerName(opts.memberName, 28)

  const [qrImg, logoImg] = await Promise.all([loadImage(qrUrl), loadImage("/csec_astu.svg")])

  const nameBand = 56
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

  // Center white badge: logo + name under logo
  const badgeW = Math.round(size * 0.3)
  const badgeH = Math.round(size * 0.28)
  const badgeX = (size - badgeW) / 2
  const badgeY = (size - badgeH) / 2
  const radius = Math.round(size * 0.027)

  ctx.fillStyle = "#ffffff"
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, radius)
  ctx.fill()
  ctx.strokeStyle = "#e4e4e7"
  ctx.lineWidth = Math.max(2, Math.round(size * 0.007))
  ctx.stroke()

  const logoW = Math.round(badgeW * 0.78)
  const logoH = Math.round(logoW * (39.57 / 54.4))
  const logoX = (size - logoW) / 2
  const logoY = badgeY + Math.round(badgeH * 0.1)
  ctx.drawImage(logoImg, logoX, logoY, logoW, logoH)

  // Name under logo inside the badge
  ctx.fillStyle = "#18181b"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  const fontSize = Math.max(11, Math.round(size * 0.028))
  ctx.font = `700 ${fontSize}px system-ui, -apple-system, Segoe UI, sans-serif`
  const nameY = logoY + logoH + Math.round((badgeY + badgeH - (logoY + logoH)) / 2) + 2
  ctx.fillText(displayName, size / 2, nameY, badgeW - 16)

  // Name strip under the full QR (always present for printed stickers)
  ctx.fillStyle = "#09090b"
  ctx.font = `700 ${Math.round(size * 0.038)}px system-ui, -apple-system, Segoe UI, sans-serif`
  ctx.fillText(opts.memberName.trim(), size / 2, size + nameBand / 2, size - 24)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error("Failed to generate PNG"))
      else resolve(blob)
    }, "image/png")
  })
}
