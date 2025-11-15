import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('settings')
      .select('value')
      .eq('key', 'blog_posting_enabled')
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    const enabled = data?.value === 'true' || false;
    return NextResponse.json({ enabled });
  } catch (error) {
    console.error('Error fetching blog status:', error);
    return NextResponse.json({ error: 'Failed to fetch blog status' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { enabled } = body;

    const { error } = await supabaseAdmin
      .from('settings')
      .upsert(
        { 
          key: 'blog_posting_enabled', 
          value: enabled.toString(),
          updated_at: new Date().toISOString()
        },
        { onConflict: 'key' }
      );

    if (error) throw error;

    return NextResponse.json({ success: true, enabled });
  } catch (error) {
    console.error('Error updating blog status:', error);
    return NextResponse.json({ error: 'Failed to update blog status' }, { status: 500 });
  }
}