import { PageSkeletonWrapper, LeaderboardSkeleton } from "@/components/csec/skeletons"

export default function LeaderboardLoading() {
  return (
    <PageSkeletonWrapper>
      <LeaderboardSkeleton />
    </PageSkeletonWrapper>
  )
}
