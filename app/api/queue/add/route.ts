import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contentIds } = body;

    // Get all pieces
    const { data: pieces, error: fetchError } = await supabaseAdmin
      .from('content_pieces')
      .select('*')
      .in('id', contentIds);

    if (fetchError) throw fetchError;

    // Get max positions for each type
    const { data: maxPositions } = await supabaseAdmin
      .from('content_pieces')
      .select('type, queue_position')
      .eq('status', 'queued')
      .not('queue_position', 'is', null);

    const maxLinkedIn = Math.max(0, ...maxPositions?.filter(p => p.type === 'linkedin').map(p => p.queue_position) || [0]);
    const maxBlog = Math.max(0, ...maxPositions?.filter(p => p.type === 'blog').map(p => p.queue_position) || [0]);

    let linkedInPos = maxLinkedIn;
    let blogPos = maxBlog;

    // Update each piece with queue position
    const updates = pieces?.map(piece => {
      const position = piece.type === 'linkedin' ? ++linkedInPos : ++blogPos;
      return supabaseAdmin
        .from('content_pieces')
        .update({ 
          queue_position: position,
          status: 'queued'
        })
        .eq('id', piece.id);
    }) || [];

    await Promise.all(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding to queue:', error);
    return NextResponse.json({ error: 'Failed to add to queue' }, { status: 500 });
  }
}