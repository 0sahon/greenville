// Supabase Edge Function: generate-mcq
// Calls OpenRouter API (Gemini 2.5 Flash) to generate MCQ questions from pasted content.
// Deploy via: Supabase Dashboard → Edge Functions → New Function → name: "generate-mcq"
// Add secret: OPENROUTER_API_KEY in Dashboard → Settings → Edge Functions → Secrets

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const { content, count = 10, marks = 1 } = await req.json();
    if (!content?.trim()) throw new Error('Content is required');

    const apiKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!apiKey) throw new Error('OPENROUTER_API_KEY secret not set');

    const prompt = `You are a Nigerian primary school CBT question generator (Montessori-aligned).
Generate exactly ${count} multiple-choice questions from the content below.
Each question must have exactly 4 options (A, B, C, D). Only one is correct.
Return ONLY a valid JSON array — no markdown fences, no explanation, no extra text.

Required JSON format:
[
  {
    "question_text": "...",
    "option_a": "...",
    "option_b": "...",
    "option_c": "...",
    "option_d": "...",
    "correct_option": "a",
    "marks": ${marks}
  }
]
"correct_option" must be a single lowercase letter: a, b, c, or d.

Content:
${content.slice(0, 6000)}`;

    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://www.greenvillemontessorischools.ng/';
    const siteTitle = Deno.env.get('SITE_TITLE') ?? 'Greenville Montessori Schools CBT';

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': siteUrl,
        'X-Title': siteTitle,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-preview:free',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4096,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenRouter API error: ${err}`);
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content || '';

    // Extract JSON array even if model wraps with markdown fences
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('Could not parse JSON from model response');

    const questions = JSON.parse(match[0]);

    return new Response(JSON.stringify({ questions }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }),
      { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  }
});
