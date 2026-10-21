import { apiFetch } from "../client"
import type {
  CertificateCreateIn,
  CertificateOut,
  CertificatePublicVerify,
  Paginated,
} from "../types"

export const certificatesService = {
  verifyCertificate: async (code: string): Promise<CertificatePublicVerify> => {
    return apiFetch<CertificatePublicVerify>(`/certificates/verify/${encodeURIComponent(code)}`)
  },

  getMyCertificates: async (): Promise<CertificateOut[]> => {
    return apiFetch<CertificateOut[]>("/certificates/my")
  },

  listCertificates: async (params?: {
    page?: number
    page_size?: number
    division_id?: string
    academic_year?: number
    search?: string
    is_revoked?: boolean
  }): Promise<Paginated<CertificateOut>> => {
    return apiFetch<Paginated<CertificateOut>>("/certificates", { params })
  },

  createCertificates: async (data: CertificateCreateIn): Promise<CertificateOut[]> => {
    return apiFetch<CertificateOut[]>("/certificates", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  revokeCertificate: async (id: string, reason: string): Promise<CertificateOut> => {
    return apiFetch<CertificateOut>(`/certificates/${encodeURIComponent(id)}/revoke`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    })
  },

  uploadTemplateFile: async (file: File): Promise<{
    file_id: string
    google_slide_id?: string
    url: string
    drive_url: string
    google_slide_url?: string
    file_name: string
  }> => {
    const formData = new FormData()
    formData.append("file", file)
    return apiFetch<{
      file_id: string
      google_slide_id?: string
      url: string
      drive_url: string
      google_slide_url?: string
      file_name: string
    }>(
      "/certificates/templates/upload",
      {
        method: "POST",
        body: formData,
      }
    )
  },
}
