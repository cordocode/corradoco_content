import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ideaId, linkedinCount, blogCount } = body;

    // Validate counts
    if (linkedinCount < 0 || linkedinCount > 3 || 
        blogCount < 0 || blogCount > 2 || 
        linkedinCount + blogCount > 5) {
      return NextResponse.json({ error: 'Invalid counts' }, { status: 400 });
    }

    // Get the idea
    const { data: idea, error: ideaError } = await supabaseAdmin
      .from('ideas')
      .select('*')
      .eq('id', ideaId)
      .single();

    if (ideaError || !idea) {
      throw new Error('Idea not found');
    }

    const systemPrompt = `You are a content generation assistant for Ben Corrado. Generate exactly ${linkedinCount} LinkedIn posts and ${blogCount} blog posts from this idea.

RULES:
- Blogs: 800-1200 words with compelling titles
- LinkedIn: 75-120 words with strong hooks
- Ensure variety in angles and perspectives across all pieces
- Return JSON array with type, title (if blog), and content for each piece

Return ONLY valid JSON array like:
[
  {"type": "linkedin", "content": "..."},
  {"type": "blog", "title": "...", "content": "..."}
]`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 5000,
      system: systemPrompt,
      messages: [{ role: 'user', content: idea.content }]
    });

    let contentText = response.content[0].type === 'text' ? response.content[0].text : '';
    
    // Strip markdown code blocks if Claude adds them
    contentText = contentText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const generatedPieces = JSON.parse(contentText);

    // Save to database
    const dbPieces = generatedPieces.map((piece: any) => ({
      idea_id: ideaId,
      type: piece.type,
      title: piece.title || null,
      content: piece.content,
      status: 'draft',
    }));

    const { data: savedPieces, error: saveError } = await supabaseAdmin
      .from('content_pieces')
      .insert(dbPieces)
      .select();

    if (saveError) throw saveError;

    // Update idea status
    await supabaseAdmin
      .from('ideas')
      .update({ status: 'drafted' })
      .eq('id', ideaId);

    return NextResponse.json(savedPieces);
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json({ error: 'Failed to generate content' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 59;