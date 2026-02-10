import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as Y from 'yjs';

export async function POST(request: NextRequest) {
  try {
    const { id, snapshot, version } = await request.json();

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid map ID' },
        { status: 400 }
      );
    }

    if (!snapshot || typeof snapshot !== 'string') {
      return NextResponse.json(
        { error: 'Invalid snapshot' },
        { status: 400 }
      );
    }

    if (typeof version !== 'number' || version < 1) {
      return NextResponse.json(
        { error: 'Invalid version' },
        { status: 400 }
      );
    }

    // Get current map from database
    const currentMap = await prisma.map.findUnique({
      where: { id },
    });

    if (!currentMap) {
      return NextResponse.json(
        { error: 'Map not found' },
        { status: 404 }
      );
    }

    // Version conflict check (optimistic locking)
    if (currentMap.version !== version) {
      return NextResponse.json(
        {
          error: 'Version conflict',
          currentVersion: currentMap.version,
          submittedVersion: version,
        },
        { status: 409 }
      );
    }

    // Validate snapshot format
    try {
      Buffer.from(snapshot, 'base64');
    } catch {
      return NextResponse.json(
        { error: 'Invalid snapshot format' },
        { status: 400 }
      );
    }

    // Update map
    const updated = await prisma.map.update({
      where: { id },
      data: {
        snapshot,
        version: { increment: 1 },
      },
    });

    return NextResponse.json({
      id: updated.id,
      version: updated.version,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    console.error('Failed to save map:', error);
    return NextResponse.json(
      { error: 'Failed to save map' },
      { status: 500 }
    );
  }
}
