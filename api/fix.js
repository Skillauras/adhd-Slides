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
2. Write exactly 3 bullet points. Each bullet point must be a complete sentence or complete thought — minimum 8 words, ideally 10 to 14 words. Do not write fragments or single phrases. Every bullet must fully communicate its idea on its own.
3. Make sure the 3 bullets together tell the full story of the slide. Someone should be able to read just the bullets and understand the concept completely.
4. Keep the original meaning and facts — do not oversimplify or remove important details
5. Use plain, clear language — avoid jargon but keep technical terms if they are important
6. Pick one key word or short phrase to highlight (the "highlight" field) — this should be the most important term on the slide
7. Suggest a background color that fits the topic. Use soft, varied colors — light teal, soft amber, pale green, warm cream, light lavender, sky blue. Use hex codes without the # symbol.
8. Pick a title color and accent color that look good on that background and are easy to read.

Do NOT include any image descriptions or imageDesc field.

Return ONLY a valid JSON array. No markdown, no explanation, just raw JSON.
Format exactly like this:
[
  {
    "title": "Slide Title Here",
    "bullets": [
      "First complete sentence that fully explains the first point here.",
      "Second complete sentence that fully explains the second point here.",
      "Third complete sentence that fully explains the third point here."
    ],
    "highlight": "important term",
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
