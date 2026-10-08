import { ChallengeDetailView } from '@/components/challenge/challenge-detail'

export default async function ChallengePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ChallengeDetailView id={id} />
}
