export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { image, mediaType } = req.body;
  if (!image || !mediaType) return res.status(400).json({ error: 'Missing image or mediaType' });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured on server' });
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
          { type: 'text', text: 'Extract receipt details and respond ONLY with JSON: {"vendor":"store name","amount":0.00,"description":"purchase description","category":"food|transport|shopping|bills|health|entertainment|other","date":"YYYY-MM-DD or null"}. Use the grand total for amount. Return ONLY the JSON object.' }
        ]}]
      })
    });
    const data = await response.json();
    if (data.error) return res.status(502).json({ error: data.error.message });
    const result = JSON.parse(data.content[0].text.trim().replace(/```json|```/g, ''));
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: 'Scan failed: ' + err.message });
  }
}
