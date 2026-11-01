import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://csec-community.vercel.app"

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/events", "/events/explore", "/leaderboard", "/verify", "/share"],
        disallow: [
          "/api/",
          "/admin",
          "/admin/",
          "/approvals",
          "/approvals/",
          "/attendance",
          "/attendance/",
          "/claims",
          "/claims/",
          "/dashboard",
          "/dashboard/",
          "/permissions",
          "/permissions/",
          "/profile",
          "/profile/",
          "/profile-requests",
          "/profile-requests/",
          "/tasks",
          "/tasks/",
          "/templates",
          "/templates/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}

