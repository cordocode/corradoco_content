import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { itemId, newPosition, type } = body;

    // Validate inputs
    if (!itemId || !newPosition || !type || newPosition < 1) {
      return NextResponse.json({ 
        error: 'Invalid parameters' 
      }, { status: 400 });
    }

    // Get the current item
    const { data: currentItem, error: fetchError } = await supabaseAdmin
      .from('content_pieces')
      .select('*')
      .eq('id', itemId)
      .eq('type', type)
      .single();

    if (fetchError || !currentItem) {
      return NextResponse.json({ 
        error: 'Item not found' 
      }, { status: 404 });
    }

    const oldPosition = currentItem.queue_position;

    // If position hasn't changed, do nothing
    if (oldPosition === newPosition) {
      return NextResponse.json({ success: true, message: 'No change needed' });
    }

    // Get all items in the queue for this type
    const { data: allItems, error: allItemsError } = await supabaseAdmin
      .from('content_pieces')
      .select('*')
      .eq('type', type)
      .eq('status', 'queued')
      .not('queue_position', 'is', null)
      .order('queue_position', { ascending: true });

    if (allItemsError) throw allItemsError;

    // Calculate the new positions for all affected items
    const updates: any[] = [];

    if (oldPosition === null) {
      // Item is being added to queue at newPosition
      // Shift all items at newPosition and after down by 1
      allItems?.forEach(item => {
        if (item.queue_position >= newPosition) {
          updates.push(
            supabaseAdmin
              .from('content_pieces')
              .update({ 
                queue_position: item.queue_position + 1,
                updated_at: new Date().toISOString()
              })
              .eq('id', item.id)
          );
        }
      });
    } else if (newPosition < oldPosition) {
      // Moving up in queue
      // Shift items between newPosition and oldPosition down by 1
      allItems?.forEach(item => {
        if (item.queue_position >= newPosition && item.queue_position < oldPosition) {
          updates.push(
            supabaseAdmin
              .from('content_pieces')
              .update({ 
                queue_position: item.queue_position + 1,
                updated_at: new Date().toISOString()
              })
              .eq('id', item.id)
          );
        }
      });
    } else {
      // Moving down in queue
      // Shift items between oldPosition and newPosition up by 1
      allItems?.forEach(item => {
        if (item.queue_position > oldPosition && item.queue_position <= newPosition) {
          updates.push(
            supabaseAdmin
              .from('content_pieces')
              .update({ 
                queue_position: item.queue_position - 1,
                updated_at: new Date().toISOString()
              })
              .eq('id', item.id)
          );
        }
      });
    }

    // Execute all position updates
    await Promise.all(updates);

    // Update the moved item's position
    const { error: updateError } = await supabaseAdmin
      .from('content_pieces')
      .update({ 
        queue_position: newPosition,
        status: 'queued', // Ensure it's queued if it wasn't already
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId);

    if (updateError) throw updateError;

    // Fetch the updated queue
    const { data: updatedQueue, error: queueError } = await supabaseAdmin
      .from('content_pieces')
      .select('*')
      .eq('type', type)
      .eq('status', 'queued')
      .order('queue_position', { ascending: true });

    if (queueError) throw queueError;

    return NextResponse.json({ 
      success: true,
      queue: updatedQueue 
    });
  } catch (error) {
    console.error('Error reordering queue:', error);
    return NextResponse.json({ 
      error: 'Failed to reorder queue' 
    }, { status: 500 });
  }
}