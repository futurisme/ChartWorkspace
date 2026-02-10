import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid map ID' },
        { status: 400 }
      );
    }

    const map = await prisma.map.findUnique({
      where: { id },
    });

    if (!map) {
      return NextResponse.json(
        { error: 'Map not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: map.id,
      title: map.title,
      snapshot: map.snapshot,
      version: map.version,
      updatedAt: map.updatedAt,
    });
  } catch (error) {
    console.error('Failed to fetch map:', error);
    return NextResponse.json(
      { error: 'Failed to fetch map' },
      { status: 500 }
    );
  }
}
