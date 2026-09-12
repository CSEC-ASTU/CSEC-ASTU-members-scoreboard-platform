import { AttendanceSkeleton, PageSkeletonWrapper } from "@/components/csec/skeletons"

export default function Loading() {
  return (
    <PageSkeletonWrapper>
      <AttendanceSkeleton />
    </PageSkeletonWrapper>
  )
}
