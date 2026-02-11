const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const CLOUDFLARE_API_TOKEN = Deno.env.get('CLOUDFLARE_API_TOKEN');
    const CLOUDFLARE_ACCOUNT_ID = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    const FAL_KEY = Deno.env.get('FAL_KEY');

    const { action, ...params } = await req.json();

    // ── MODERATE ──
    if (action === 'moderate') {
      if (!OPENAI_API_KEY) {
        return json({ status: 'approved', reason: 'No moderation key' });
      }
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0,
          messages: [
            { role: 'system', content: params.systemPrompt },
            { role: 'user', content: `Moderate this post:\n\n${params.text}` },
          ],
          response_format: { type: 'json_object' },
        }),
      });
      const data = await response.json();
      const result = JSON.parse(data.choices[0].message.content);
      return json({ status: result.status, reason: result.reason || '' });
    }

    // ── CHAT (Towny AI) ──
    if (action === 'chat') {
      if (!OPENAI_API_KEY) {
        return json({ text: 'Towny is offline.', imagePrompt: null });
      }
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.9,
          messages: params.messages,
        }),
      });
      const data = await response.json();
      if (data.error) {
        return json({ text: data.error.code === 'rate_limit_exceeded'
          ? 'Towny is a bit overwhelmed right now. Please wait a minute!'
          : `Towny is having a moment: ${data.error.message || 'Unknown error'}`,
          imagePrompt: null });
      }
      const aiText = data.choices?.[0]?.message?.content || 'Connection error.';
      return json({ text: aiText, imagePrompt: null });
    }

    // ── IMAGE GENERATION ──
    if (action === 'generateImage') {
      const prompt = params.prompt;

      // Try Cloudflare first
      if (CLOUDFLARE_API_TOKEN && CLOUDFLARE_ACCOUNT_ID) {
        try {
          let response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
            {
              method: 'POST',
              headers: { Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt }),
            }
          );
          if (!response.ok) {
            response = await fetch(
              `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/stabilityai/stable-diffusion-xl-base-1.0`,
              {
                method: 'POST',
                headers: { Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
              }
            );
          }
          if (response.ok) {
            const buffer = await response.arrayBuffer();
            const base64 = btoa(new Uint8Array(buffer).reduce((d, b) => d + String.fromCharCode(b), ''));
            return json({ url: `data:image/png;base64,${base64}` });
          }
        } catch (err) {
          console.error('Cloudflare AI error:', err);
        }
      }

      // Fallback to Fal.ai
      if (FAL_KEY) {
        try {
          const response = await fetch('https://queue.fal.run/fal-ai/flux/schnell', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Key ${FAL_KEY}` },
            body: JSON.stringify({ prompt, image_size: 'square_hd', num_images: 1, enable_safety_checker: true }),
          });
          if (response.ok) {
            const data = await response.json();
            if (data.request_id) {
              let attempts = 0;
              while (attempts < 15) {
                const poll = await fetch(`https://queue.fal.run/fal-ai/flux/schnell/requests/${data.request_id}`, {
                  headers: { Authorization: `Key ${FAL_KEY}` },
                });
                if (poll.ok) {
                  const pd = await poll.json();
                  if (pd.status === 'COMPLETED' && pd.images?.[0]?.url) return json({ url: pd.images[0].url });
                  if (pd.status === 'ERROR') break;
                }
                await new Promise((r) => setTimeout(r, 1000));
                attempts++;
              }
            } else if (data.images?.[0]?.url) {
              return json({ url: data.images[0].url });
            }
          }
        } catch (err) {
          console.error('Fal.ai error:', err);
        }
      }

      return json({ url: null });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  } catch (error) {
    console.error('[ai-proxy] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

function json(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  });
}
