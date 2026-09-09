import { PageSkeletonWrapper, TasksSkeleton } from "@/components/csec/skeletons"

export default function TasksLoading() {
  return (
    <PageSkeletonWrapper>
      <TasksSkeleton />
    </PageSkeletonWrapper>
  )
}
