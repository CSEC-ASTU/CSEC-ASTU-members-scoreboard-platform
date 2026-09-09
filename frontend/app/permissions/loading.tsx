import { PageSkeletonWrapper, PermissionsSkeleton } from "@/components/csec/skeletons"

export default function PermissionsLoading() {
  return (
    <PageSkeletonWrapper>
      <PermissionsSkeleton />
    </PageSkeletonWrapper>
  )
}
