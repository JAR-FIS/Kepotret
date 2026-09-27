import { GuestEntryFlow } from '@/features/guest/components/guest-entry-flow';

export default async function GuestEntryPage({ params }: { params: Promise<{ linkId: string }> }) {
  const { linkId } = await params;
  return <GuestEntryFlow linkId={linkId} />;
}
