import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contentId } = body;

    // Get the piece
    const { data: piece, error: pieceError } = await supabaseAdmin
      .from('content_pieces')
      .select('*')
      .eq('id', contentId)
      .single();

    if (pieceError || !piece) throw new Error('Content not found');

    // Get max position for this type
    const { data: maxPos } = await supabaseAdmin
      .from('content_pieces')
      .select('queue_position')
      .eq('type', piece.type)
      .eq('status', 'queued')
      .order('queue_position', { ascending: false })
      .limit(1)
      .single();

    const newPosition = (maxPos?.queue_position || 0) + 1;

    const { data, error } = await supabaseAdmin
      .from('content_pieces')
      .update({ 
        queue_position: newPosition,
        status: 'queued'
      })
      .eq('id', contentId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error adding to queue:', error);
    return NextResponse.json({ error: 'Failed to add to queue' }, { status: 500 });
  }
}