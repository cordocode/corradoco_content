import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get the failed piece
    const { data: piece, error: fetchError } = await supabaseAdmin
      .from('content_pieces')
      .select('*')
      .eq('id', id)
      .eq('status', 'failed')
      .single();

    if (fetchError || !piece) {
      return NextResponse.json({ 
        error: 'Failed content not found' 
      }, { status: 404 });
    }

    // Get the current max position for this type
    const { data: maxPos } = await supabaseAdmin
      .from('content_pieces')
      .select('queue_position')
      .eq('type', piece.type)
      .eq('status', 'queued')
      .order('queue_position', { ascending: false })
      .limit(1)
      .single();

    const newPosition = (maxPos?.queue_position || 0) + 1;

    // Reset status to queued and assign new position
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('content_pieces')
      .update({ 
        status: 'queued',
        queue_position: newPosition,
        error_message: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ 
      success: true,
      data: updated,
      message: 'Content added back to queue' 
    });
  } catch (error) {
    console.error('Error retrying content:', error);
    return NextResponse.json({ 
      error: 'Failed to retry content' 
    }, { status: 500 });
  }
}