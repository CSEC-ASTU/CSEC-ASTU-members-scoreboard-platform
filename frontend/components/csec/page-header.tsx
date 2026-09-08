import type { ReactNode } from "react"

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white text-balance">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 text-pretty">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}
