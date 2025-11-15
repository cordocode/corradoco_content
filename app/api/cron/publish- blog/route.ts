import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if blog posting is enabled
    const { data: settingData } = await supabaseAdmin
      .from('settings')
      .select('value')
      .eq('key', 'blog_posting_enabled')
      .single();

    if (!settingData || settingData.value !== 'true') {
      console.log('Blog posting is disabled - skipping');
      return NextResponse.json({ 
        message: 'Blog posting disabled', 
        enabled: false 
      });
    }

    // Check for failed posts first
    const { data: failed } = await supabaseAdmin
      .from('content_pieces')
      .select('*')
      .eq('type', 'blog')
      .eq('status', 'failed')
      .limit(1);

    if (failed && failed.length > 0) {
      return NextResponse.json({ message: 'Skipped: Failed post exists' });
    }

    // Get next blog to publish
    const { data: piece, error } = await supabaseAdmin
      .from('content_pieces')
      .select('*')
      .eq('type', 'blog')
      .eq('queue_position', 1)
      .eq('status', 'queued')
      .single();

    if (!piece) {
      return NextResponse.json({ message: 'No blog to publish' });
    }

    // Generate slug
    const baseSlug = piece.title
      ?.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'untitled';
    
    let slug = baseSlug;
    let counter = 1;
    
    // Check for duplicate slugs
    while (true) {
      const { data: existing } = await supabaseAdmin
        .from('blog_posts')
        .select('id')
        .eq('slug', slug)
        .single();
      
      if (!existing) break;
      slug = `${baseSlug}-${++counter}`;
    }

    // Insert into blog_posts
    const { error: insertError } = await supabaseAdmin
      .from('blog_posts')
      .insert({
        title: piece.title,
        slug,
        content: piece.content,
        excerpt: piece.content.substring(0, 200),
        published: true,
        published_at: new Date().toISOString(),
      });

    if (insertError) {
      // Mark as failed
      await supabaseAdmin
        .from('content_pieces')
        .update({ status: 'failed' })
        .eq('id', piece.id);
      
      throw insertError;
    }

    // Mark as published
    await supabaseAdmin
      .from('content_pieces')
      .update({ 
        status: 'published',
        queue_position: null
      })
      .eq('id', piece.id);

    // Shift queue
    await supabaseAdmin.rpc('shift_queue_positions', {
      content_type: 'blog',
      from_position: 1
    });

    return NextResponse.json({ success: true, slug });
  } catch (error) {
    console.error('Blog publish error:', error);
    return NextResponse.json({ error: 'Failed to publish blog' }, { status: 500 });
  }
}