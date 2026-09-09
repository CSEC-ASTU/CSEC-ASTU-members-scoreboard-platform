import { PageSkeletonWrapper, AdminSkeleton } from "@/components/csec/skeletons"

export default function AdminLoading() {
  return (
    <PageSkeletonWrapper>
      <AdminSkeleton />
    </PageSkeletonWrapper>
  )
}
