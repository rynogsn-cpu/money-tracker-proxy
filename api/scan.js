export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image, mediaType } = req.body;

  if (!image || !mediaType) {
    return res.status(400).json({ error: 'Missing image or mediaType' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured on server' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: image }
            },
            {
              type: 'text',
              text: `You are a receipt/invoice scanner. Extract the following from this receipt or invoice image and respond ONLY with a valid JSON object, no markdown, no explanation:
{
  "vendor": "store or business name",
  "amount": 0.00,
  "description": "brief description of purchase",
  "category": "one of: food, transport, shopping, bills, health, entertainment, other",
  "date": "YYYY-MM-DD or null if not visible"
}
Rules:
- amount must be the TOTAL amount paid (a number, no currency symbols)
- If multiple totals are visible, use the final/grand total
- vendor should be the store name as printed on the receipt
- category must be exactly one of the options listed
- If you cannot read the receipt clearly, still return your best guess
- Return ONLY the JSON object, nothing else`
            }
          ]
        }]
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(502).json({ error: data.error.message });
    }

    const text = data.content[0].text.trim();
    const clean = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);

    return res.status(200).json(result);

  } catch (err) {
    return res.status(500).json({ error: 'Scan failed: ' + err.message });
  }
}
