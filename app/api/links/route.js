import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function GET() {
  return NextResponse.json({
    success: true,
    links: store.getLinks()
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const newLink = store.createLink(body);
    return NextResponse.json({
      success: true,
      link: newLink
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Invalid data' }, { status: 400 });
  }
}
