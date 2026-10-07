import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const linkId = searchParams.get('linkId');
  const logs = store.getLogs(linkId);

  return NextResponse.json({
    success: true,
    logs
  });
}

export async function DELETE() {
  store.clearLogs();
  return NextResponse.json({
    success: true,
    message: 'Semua riwayat lokasi telah dibersihkan'
  });
}
