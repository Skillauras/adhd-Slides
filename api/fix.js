export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { slides } = req.body;
  if (!slides || !Array.isArray(slides)) {
    return res.status(400).json({ error: 'Invalid slides data' });
  }

  const systemPrompt = `You are helping reformat PowerPoint slides to be cleaner and easier to read while keeping all the important information.

Your job is to rewrite each slide following these rules:
1. Write a clear, descriptive title (max 8 words) that captures the main topic
2. Write exactly 3 bullet points. Each bullet point must be one clear, complete sentence. Aim for 10 to 16 words per bullet — long enough to make sense, short enough to read quickly. No fragments, no run-ons.
3. The 3 bullets together should fully cover the slide topic so someone can understand it without seeing the original
4. Keep facts and key terms accurate — do not remove important details or technical terms
5. Fix any grammar mistakes
6. Pick exactly one key term to highlight (the "highlight" field) — ideally 1 to 3 words that appear in at least one bullet. This same term will be highlighted bold wherever it appears across all bullets.
7. Suggest a soft background color hex (no # symbol) that fits the topic — vary it per slide. Examples: EAF4FB, FEF9E7, E9F7EF, F5EEF8, FDF2F8, FDFEFE
8. Pick a dark title color, a medium accent color, and a dark body color that all look good on that background.

Do NOT include imageDesc.

Return ONLY a valid JSON array. No markdown, no explanation, just raw JSON.
Format:
[
  {
    "title": "Slide Title Here",
    "bullets": [
      "First complete sentence that is clear and concise.",
      "Second complete sentence that adds another key point.",
      "Third complete sentence that rounds out the topic."
    ],
    "highlight": "key term",
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
