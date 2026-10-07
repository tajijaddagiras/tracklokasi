import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function GET(request, { params }) {
  const { id } = await params;
  const link = store.getLinkById(id);
  if (!link) {
    return NextResponse.json({ success: false, message: 'Link tidak ditemukan' }, { status: 404 });
  }
  return NextResponse.json({ success: true, link });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  store.deleteLink(id);
  return NextResponse.json({ success: true, message: 'Link berhasil dihapus' });
}
