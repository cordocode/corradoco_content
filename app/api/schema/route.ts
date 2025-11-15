import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase';

export async function GET() {
  try {
    let output = `# Supabase Schema Documentation\nGenerated: ${new Date().toISOString()}\n\n---\n\n`;

    // List of tables we know exist (or will check)
    const tablesToCheck = [
      'ideas',
      'content_pieces', 
      'generation_sessions',
      'blog_posts',
      'settings'
    ];

    output += `## Tables\n\n`;

    for (const tableName of tablesToCheck) {
      try {
        // Get a sample row to see structure
        const { data: sample, error } = await supabaseAdmin
          .from(tableName)
          .select('*')
          .limit(1);

        if (error) {
          output += `### ❌ ${tableName}\n**Error**: Table might not exist or has permissions issue\n\n`;
          continue;
        }

        // Get row count
        const { count } = await supabaseAdmin
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        output += `### ✅ ${tableName}\n\n`;
        output += `**Row count**: ${count || 0}\n\n`;

        if (sample && sample.length > 0) {
          const sampleRow = sample[0];
          output += `**Columns** (inferred from data):\n\n`;
          output += `| Column | Sample Value | Type |\n`;
          output += `|--------|--------------|------|\n`;

          for (const [key, value] of Object.entries(sampleRow)) {
            const type = value === null ? 'null' : typeof value;
            const sampleValue = value === null ? 'NULL' : String(value).substring(0, 50);
            output += `| ${key} | ${sampleValue} | ${type} |\n`;
          }

          output += `\n**Sample row**:\n\`\`\`json\n${JSON.stringify(sampleRow, null, 2)}\n\`\`\`\n\n`;
        } else {
          output += `*Table is empty - cannot infer structure*\n\n`;
        }

        // Try to get all rows (limited) to understand the data better
        const { data: allRows } = await supabaseAdmin
          .from(tableName)
          .select('*')
          .limit(5);

        if (allRows && allRows.length > 0) {
          output += `**Sample data** (first ${allRows.length} rows):\n\`\`\`json\n${JSON.stringify(allRows, null, 2)}\n\`\`\`\n\n`;
        }

        output += `---\n\n`;

      } catch (tableError) {
        output += `### ❌ ${tableName}\n**Error**: ${tableError}\n\n`;
      }
    }

    // Add some metadata
    output += `## Connection Info\n\n`;
    output += `- Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}\n`;
    output += `- Using Service Key: ${process.env.SUPABASE_SERVICE_KEY ? '✅ Yes' : '❌ No'}\n\n`;

    // Return as plain text markdown
    return new NextResponse(output, {
      headers: {
        'Content-Type': 'text/markdown',
        'Content-Disposition': 'attachment; filename="schema-documentation.md"'
      }
    });

  } catch (error) {
    console.error('Schema documentation error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate schema documentation',
      details: error 
    }, { status: 500 });
  }
}