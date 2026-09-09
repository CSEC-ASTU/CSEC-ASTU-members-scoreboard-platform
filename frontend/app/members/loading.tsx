import { PageSkeletonWrapper, MembersSkeleton } from "@/components/csec/skeletons"

export default function MembersLoading() {
  return (
    <PageSkeletonWrapper>
      <MembersSkeleton />
    </PageSkeletonWrapper>
  )
}
