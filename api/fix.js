export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { slides } = req.body;
  if (!slides || !Array.isArray(slides)) {
    return res.status(400).json({ error: 'Invalid slides data' });
  }

  const systemPrompt = `You are helping reformat PowerPoint slides to be cleaner and easier to read.

Your job is to rewrite each slide following these rules:
1. Keep the same general topic and meaning as the original slide
2. Write a clear, short title (max 8 words)
3. Write 2 to 3 bullet points, each around 6 to 10 words. Keep the language natural and close to the original — do not over-simplify
4. Pick one important word or phrase to highlight (the "highlight" field)
5. Suggest a background color that matches the tone or topic of the slide. Use soft, varied colors — not just white or dark blue. Examples: light teal, soft amber, pale green, warm cream, light lavender. Use hex codes.
6. Pick a title color and accent color that contrast well with the background. Keep it readable and visually appealing.
7. Add a short image description that fits the slide content

Return ONLY a valid JSON array. No markdown, no explanation, just raw JSON.
Format exactly like this:
[
  {
    "title": "Slide Title Here",
    "bullets": ["First point around six words", "Second point around six words", "Third point around six words"],
    "highlight": "important phrase",
    "imageDesc": "short description of a relevant image",
    "bgColor": "EAF4FB",
    "titleColor": "1A3C5E",
    "accentColor": "2E86C1",
    "bodyColor": "2C3E50"
  }
]`;

  const userMessage = `Rewrite these slides:\n\n${slides.map((s, i) => `--- Slide ${i+1} ---\n${s}`).join('\n\n')}`;

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
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    const parsed = JSON.parse(cleaned);
    return res.status(200).json({ slides: parsed });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
