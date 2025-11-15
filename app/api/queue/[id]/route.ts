import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get the piece to delete
    const { data: piece, error: fetchError } = await supabaseAdmin
      .from('content_pieces')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !piece) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    const currentPosition = piece.queue_position;
    const contentType = piece.type;

    // Remove from queue (set status back to draft and clear position)
    const { error: updateError } = await supabaseAdmin
      .from('content_pieces')
      .update({ 
        status: 'draft',
        queue_position: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // If it had a position, shift all items after it
    if (currentPosition !== null) {
      // Get all items after this position
      const { data: itemsToShift, error: shiftFetchError } = await supabaseAdmin
        .from('content_pieces')
        .select('*')
        .eq('type', contentType)
        .eq('status', 'queued')
        .gt('queue_position', currentPosition)
        .order('queue_position', { ascending: true });

      if (shiftFetchError) throw shiftFetchError;

      // Update each item's position
      if (itemsToShift && itemsToShift.length > 0) {
        const updates = itemsToShift.map(item => 
          supabaseAdmin
            .from('content_pieces')
            .update({ 
              queue_position: item.queue_position - 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.id)
        );

        await Promise.all(updates);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Item removed from queue' 
    });
  } catch (error) {
    console.error('Error removing from queue:', error);
    return NextResponse.json({ 
      error: 'Failed to remove from queue' 
    }, { status: 500 });
  }
}