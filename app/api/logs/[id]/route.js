import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function DELETE(request, { params }) {
  const { id } = await params;
  store.deleteLog(id);
  return NextResponse.json({
    success: true,
    message: 'Log berhasil dihapus'
  });
}
