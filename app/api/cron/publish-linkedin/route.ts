import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // CRITICAL SAFETY CHECK: Check if LinkedIn posting is enabled
    const { data: settingData } = await supabaseAdmin
      .from('settings')
      .select('value')
      .eq('key', 'linkedin_posting_enabled')
      .single();

    if (!settingData || settingData.value !== 'true') {
      console.log('LinkedIn posting is disabled - skipping');
      return NextResponse.json({ 
        message: 'LinkedIn posting disabled', 
        enabled: false 
      });
    }

    // Check for failed posts first
    const { data: failed } = await supabaseAdmin
      .from('content_pieces')
      .select('*')
      .eq('type', 'linkedin')
      .eq('status', 'failed')
      .limit(1);

    if (failed && failed.length > 0) {
      return NextResponse.json({ 
        message: 'Skipped: Failed post exists',
        failedPost: failed[0].id 
      });
    }

    // Get next LinkedIn post to publish
    const { data: piece, error } = await supabaseAdmin
      .from('content_pieces')
      .select('*')
      .eq('type', 'linkedin')
      .eq('queue_position', 1)
      .eq('status', 'queued')
      .single();

    if (!piece) {
      return NextResponse.json({ message: 'No LinkedIn post to publish' });
    }

    // SAFETY: Double-check LinkedIn token exists
    if (!process.env.LINKEDIN_ACCESS_TOKEN) {
      console.error('LinkedIn access token missing');
      
      // Mark as failed
      await supabaseAdmin
        .from('content_pieces')
        .update({ 
          status: 'failed',
          error_message: 'LinkedIn access token missing'
        })
        .eq('id', piece.id);
      
      return NextResponse.json({ 
        error: 'LinkedIn configuration missing' 
      }, { status: 500 });
    }

    try {
      // Post to LinkedIn
      const linkedinResponse = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify({
          author: `urn:li:person:${process.env.LINKEDIN_PERSON_URN}`,
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: {
                text: piece.content
              },
              shareMediaCategory: 'NONE'
            }
          },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
          }
        })
      });

      if (!linkedinResponse.ok) {
        const errorData = await linkedinResponse.text();
        throw new Error(`LinkedIn API error: ${errorData}`);
      }

      const linkedinData = await linkedinResponse.json();

      // Mark as published
      await supabaseAdmin
        .from('content_pieces')
        .update({ 
          status: 'published',
          queue_position: null,
          published_at: new Date().toISOString(),
          external_id: linkedinData.id
        })
        .eq('id', piece.id);

      // Shift queue positions
      await supabaseAdmin.rpc('shift_queue_positions', {
        content_type: 'linkedin',
        from_position: 1
      });

      return NextResponse.json({ 
        success: true, 
        postId: linkedinData.id,
        contentId: piece.id 
      });

    } catch (postError: any) {
      // Mark as failed with error message
      await supabaseAdmin
        .from('content_pieces')
        .update({ 
          status: 'failed',
          error_message: postError.message
        })
        .eq('id', piece.id);
      
      throw postError;
    }

  } catch (error) {
    console.error('LinkedIn publish error:', error);
    return NextResponse.json({ 
      error: 'Failed to publish LinkedIn post' 
    }, { status: 500 });
  }
}