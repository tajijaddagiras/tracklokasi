import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function POST(request, { params }) {
  const { id } = await params;
  const clicks = store.incrementClick(id);
  return NextResponse.json({
    success: true,
    clicks
  });
}
