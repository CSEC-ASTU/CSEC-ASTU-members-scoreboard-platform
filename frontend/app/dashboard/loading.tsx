import { PageSkeletonWrapper, DashboardSkeleton } from "@/components/csec/skeletons"

export default function DashboardLoading() {
  return (
    <PageSkeletonWrapper>
      <DashboardSkeleton />
    </PageSkeletonWrapper>
  )
}
