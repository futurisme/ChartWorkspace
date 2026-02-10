import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as Y from 'yjs';

export async function POST(request: NextRequest) {
  try {
    // Validate env
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL is not set in environment variables');
      return NextResponse.json(
        { error: 'Database configuration missing' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { id, snapshot, version } = body;

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
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    
    console.error('=== API /maps/save POST Error ===');
    console.error('Message:', errorMsg);
    console.error('Stack:', errorStack);
    console.error('DATABASE_URL set:', !!process.env.DATABASE_URL);
    
    return NextResponse.json(
      { 
        error: 'Failed to save map',
        message: errorMsg,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
