import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('content_pieces')
      .select('*')
      .eq('status', 'queued')
      .not('queue_position', 'is', null)
      .order('queue_position', { ascending: true });

    if (error) throw error;

    const linkedin = data?.filter(item => item.type === 'linkedin') || [];
    const blog = data?.filter(item => item.type === 'blog') || [];

    return NextResponse.json({ linkedin, blog });
  } catch (error) {
    console.error('Error fetching queue:', error);
    return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 });
  }
}