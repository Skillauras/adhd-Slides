export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { slides } = req.body;

  if (!slides || !Array.isArray(slides)) {
    return res.status(400).json({ error: 'Invalid slides data' });
  }

  const systemPrompt = `You are an expert at redesigning presentation slides for people with ADHD.

Your job is to take raw slide content and restructure it following these strict rules:

1. ONE main point per slide — if a slide has multiple points, split it into multiple slides
2. Simplify all text — short, clear phrases only. Remove long complicated sentences.
3. Bold the single most important word or phrase on each slide
4. Use calm, simple language — no jargon, no dense paragraphs
5. Keep a clear, predictable structure: Title slide then Topic slides then Summary slide
6. Space content out — never more than 3-4 bullet points on a slide
7. Each slide must have: a short title (max 6 words) and 1-3 bullet points (max 8 words each)
8. Add a short image description for each slide that matches the content

Return ONLY a valid JSON array. No markdown, no explanation, just raw JSON.

Format exactly like this:
[
  {
    "title": "Short Slide Title",
    "bullets": ["Point one", "Point two"],
    "highlight": "most important word or phrase",
    "imageDesc": "simple image that represents this slide"
  }
]`;

  const userMessage = `Here are the slides to rewrite:\n\n${slides.map((s, i) => `--- Slide ${i+1} ---\n${s}`).join('\n\n')}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 4000,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ]
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(500).json({ error: err.error?.message || 'Groq API error' });
    }

    const data = await response.json();
    const raw = data.choices[0].message.content.trim();
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

    const parsed = JSON.parse(cleaned);
    return res.status(200).json({ slides: parsed });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
