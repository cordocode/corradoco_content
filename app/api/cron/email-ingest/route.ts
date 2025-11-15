import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { supabaseAdmin } from '@/app/lib/supabase';

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground'
);

oauth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN,
});

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Search for emails with CONTENT in subject
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'subject:CONTENT is:unread from:(bcorrado33@gmail.com OR ben@reliant-pm.com OR ben@corradoco.com)',
      maxResults: 10,
    });

    const messages = response.data.messages || [];

    for (const message of messages) {
      const msg = await gmail.users.messages.get({
        userId: 'me',
        id: message.id!,
      });

      const headers = msg.data.payload?.headers || [];
      const fromHeader = headers.find(h => h.name === 'From');
      const from = fromHeader?.value || '';
      
      // Extract email content
      const parts = msg.data.payload?.parts || [];
      let content = '';
      
      for (const part of parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          content = Buffer.from(part.body.data, 'base64').toString('utf-8');
          break;
        }
      }

      if (content) {
        // Save to database
        await supabaseAdmin
          .from('ideas')
          .insert({
            content: content.trim(),
            source_email: from,
            status: 'new'
          });

        // Mark as read
        await gmail.users.messages.modify({
          userId: 'me',
          id: message.id!,
          requestBody: {
            removeLabelIds: ['UNREAD'],
          },
        });
      }
    }

    return NextResponse.json({ processed: messages.length });
  } catch (error) {
    console.error('Email ingest error:', error);
    return NextResponse.json({ error: 'Failed to ingest emails' }, { status: 500 });
  }
}