import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createDocWithSnapshot, getCurrentSnapshot } from '@/lib/snapshot';

export async function POST(request: NextRequest) {
  try {
    const { title } = await request.json();

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
      { id: map.id, title: map.title },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create map:', error);
    return NextResponse.json(
      { error: 'Failed to create map' },
      { status: 500 }
    );
  }
}
