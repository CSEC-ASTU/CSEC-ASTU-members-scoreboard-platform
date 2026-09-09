import { PageSkeletonWrapper, ProfileSkeleton } from "@/components/csec/skeletons"

export default function ProfileLoading() {
  return (
    <PageSkeletonWrapper>
      <ProfileSkeleton />
    </PageSkeletonWrapper>
  )
}
