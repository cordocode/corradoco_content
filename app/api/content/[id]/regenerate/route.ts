import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get the content piece and its idea
    const { data: piece, error: pieceError } = await supabaseAdmin
      .from('content_pieces')
      .select('*, ideas!inner(*)')
      .eq('id', id)
      .single();

    if (pieceError || !piece) throw new Error('Content not found');

    const systemPrompt = `You are revising content for Ben Corrado. Create a fresh version maintaining the core message but with new structure and approach.

ORIGINAL IDEA: ${piece.ideas.content}
TYPE: ${piece.type}

Generate a completely new version with different hook/angle. 
${piece.type === 'blog' ? 'Return JSON with title and content fields' : 'Return only the content text'}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 5000,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Current version: ${piece.content}` }]
    });

    let responseText = response.content[0].type === 'text' ? response.content[0].text : '';
    
    let updateData: any = { updated_at: new Date().toISOString() };
    
    if (piece.type === 'blog') {
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(responseText);
      updateData.title = parsed.title;
      updateData.content = parsed.content;
    } else {
      updateData.content = responseText;
    }

    const { data, error } = await supabaseAdmin
      .from('content_pieces')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Regeneration error:', error);
    return NextResponse.json({ error: 'Failed to regenerate' }, { status: 500 });
  }
}