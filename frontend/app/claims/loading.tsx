import { PageSkeletonWrapper, ClaimsSkeleton } from "@/components/csec/skeletons"

export default function ClaimsLoading() {
  return (
    <PageSkeletonWrapper>
      <ClaimsSkeleton />
    </PageSkeletonWrapper>
  )
}
