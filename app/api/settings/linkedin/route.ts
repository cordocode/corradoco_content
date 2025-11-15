import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase';

export async function GET() {
  try {
    // Get LinkedIn posting status from settings table
    const { data, error } = await supabaseAdmin
      .from('settings')
      .select('value')
      .eq('key', 'linkedin_posting_enabled')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    // Default to disabled if no setting exists
    const enabled = data?.value === 'true' || false;

    return NextResponse.json({ enabled });
  } catch (error) {
    console.error('Error fetching LinkedIn status:', error);
    return NextResponse.json({ error: 'Failed to fetch LinkedIn status' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { enabled } = body;

    // Upsert the setting
    const { error } = await supabaseAdmin
      .from('settings')
      .upsert(
        { 
          key: 'linkedin_posting_enabled', 
          value: enabled.toString(),
          updated_at: new Date().toISOString()
        },
        { onConflict: 'key' }
      );

    if (error) throw error;

    return NextResponse.json({ success: true, enabled });
  } catch (error) {
    console.error('Error updating LinkedIn status:', error);
    return NextResponse.json({ error: 'Failed to update LinkedIn status' }, { status: 500 });
  }
}