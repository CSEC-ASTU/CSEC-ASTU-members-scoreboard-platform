export type TemplateCategory =
  | "All"
  | "Academic"
  | "Competition"
  | "Workshop"
  | "Training"
  | "Achievement"
  | "Participation"
  | "Leadership"

export type SortOption = "latest" | "popular" | "a-z"

export interface CertificateTemplate {
  id: string
  title: string
  subtitle: string
  category: Exclude<TemplateCategory, "All">
  division: string
  divisionSlug: string
  accentColor: string
  secondaryColor: string
  description: string
  downloadsCount: number
  isFeatured?: boolean
  isCustomImported?: boolean
  fileName: string
  importedAt?: string
  signatoryLeftTitle: string
  signatoryLeftName: string
  signatoryRightTitle: string
  signatoryRightName: string
  paperStyle?: "classic-gold" | "cyber-neon" | "academic-navy" | "clean-monochrome" | "royal-emerald"
}
