import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createDocWithSnapshot, getCurrentSnapshot } from '@/lib/snapshot';
import { formatMapId } from '@/lib/mapId';

export async function GET(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'Database configuration missing' }, { status: 500 });
    }

    const query = request.nextUrl.searchParams.get('q')?.trim();
    const maps = await prisma.map.findMany({
      where: query
        ? {
            title: {
              contains: query,
              mode: 'insensitive',
            },
          }
        : undefined,
      orderBy: { updatedAt: 'desc' },
      take: 100,
      select: {
        id: true,
        title: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      maps: maps.map((map) => ({
        id: formatMapId(map.id),
        title: map.title,
        updatedAt: map.updatedAt,
      })),
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Failed to fetch maps', message: errorMsg }, { status: 500 });
  }
}

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
    const { title } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Create a fresh Yjs doc with initial state
    const doc = createDocWithSnapshot();
    doc.getText('title').insert(0, title.trim());
    
    const snapshot = getCurrentSnapshot(doc);

    // Store in database
    const map = await prisma.map.create({
      data: {
        title: title.trim(),
        snapshot: snapshot,
        version: 1,
      },
    });

    return NextResponse.json(
      { id: formatMapId(map.id), title: map.title },
      { status: 201 }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    
    console.error('=== API /maps POST Error ===');
    console.error('Message:', errorMsg);
    console.error('Stack:', errorStack);
    console.error('DATABASE_URL set:', !!process.env.DATABASE_URL);
    console.error('NODE_ENV:', process.env.NODE_ENV);
    
    return NextResponse.json(
      { 
        error: 'Failed to create map',
        message: errorMsg,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
