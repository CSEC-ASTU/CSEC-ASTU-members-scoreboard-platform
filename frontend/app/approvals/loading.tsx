import { PageSkeletonWrapper, ApprovalsSkeleton } from "@/components/csec/skeletons"

export default function ApprovalsLoading() {
  return (
    <PageSkeletonWrapper>
      <ApprovalsSkeleton />
    </PageSkeletonWrapper>
  )
}
