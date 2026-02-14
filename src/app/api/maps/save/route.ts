import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatMapId, parseMapId } from '@/lib/mapId';

function createErrorResponse(error: string, status: number, details?: string) {
  return NextResponse.json(
    process.env.NODE_ENV === 'production' || !details
      ? { error }
      : { error, message: details },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    // Validate env
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL is not set in environment variables');
      return createErrorResponse('Database configuration missing', 500);
    }

    const body = await request.json();
    const { id, snapshot } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid map ID' },
        {
          status: 400,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    const numericId = parseMapId(id);
    if (!numericId) {
      return NextResponse.json(
        { error: 'Invalid map ID' },
        {
          status: 400,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    if (!snapshot || typeof snapshot !== 'string') {
      return NextResponse.json(
        { error: 'Invalid snapshot' },
        {
          status: 400,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    // Validate snapshot format
    try {
      Buffer.from(snapshot, 'base64');
    } catch {
      return NextResponse.json(
        { error: 'Invalid snapshot format' },
        {
          status: 400,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    // Always accept and merge - use last-write-wins strategy.
    // Upsert avoids save-time 404 when the map has not been created yet.
    const updated = await prisma.map.upsert({
      where: { id: numericId },
      create: {
        id: numericId,
        title: `Map ${formatMapId(numericId)}`,
        snapshot,
        version: 1,
      },
      update: {
        snapshot,
        version: { increment: 1 },
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        id: formatMapId(updated.id),
        version: updated.version,
        updatedAt: updated.updatedAt,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    
    console.error('=== API /maps/save POST Error ===');
    console.error('Message:', errorMsg);
    console.error('Stack:', errorStack);
    console.error('DATABASE_URL set:', !!process.env.DATABASE_URL);
    
    return createErrorResponse('Failed to save map', 500, errorMsg);
  }
}
