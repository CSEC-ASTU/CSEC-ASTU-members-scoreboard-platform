import { PageSkeletonWrapper, MemberDetailSkeleton } from "@/components/csec/skeletons"

export default function MemberDetailLoading() {
  return (
    <PageSkeletonWrapper>
      <MemberDetailSkeleton />
    </PageSkeletonWrapper>
  )
}
