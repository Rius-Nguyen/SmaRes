import { redirect } from 'next/navigation';

interface QrRedirectPageProps {
  searchParams: Promise<{ tableId?: string; table?: string }>;
}

export const dynamic = 'force-dynamic';

export default async function QrRedirectPage({ searchParams }: QrRedirectPageProps) {
  const params = await searchParams;
  const rawTable = (params.table ?? params.tableId ?? '').trim().toUpperCase();
  if (rawTable) {
    redirect(`/staff/qr?table=${encodeURIComponent(rawTable)}`);
  }
  redirect('/staff/qr');
}
