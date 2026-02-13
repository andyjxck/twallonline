import { Platform } from 'react-native';
import { supabase } from './supabase';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

async function callAIProxy(body) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

const MODERATION_PROMPT = `You are the content moderation system for Town Wall, a local community app. Your job is to ensure ALL content is Safe For Work (SFW) and complies with Apple App Store Guidelines 1.1 and 1.2.

AUTOMATIC REJECT - Any content containing:
1. NSFW/Sexual content - ANY sexual references, innuendo, suggestive content, or adult themes
2. Violence/Gore - Threats, graphic violence, harm to people/animals, weapons glorification
3. Hate speech - Racism, sexism, homophobia, transphobia, religious hate, discrimination
4. Harassment/Bullying - Personal attacks, targeted negativity, doxxing, stalking behavior
5. No slurs - even if censored
6. Illegal activity - Drug use/sales, fraud, scams, illegal services
7. Spam - Repetitive content, excessive self-promotion, gibberish, bot-like behavior
8. Misinformation - Dangerous health claims, conspiracy theories presented as fact
9. Personal information - Phone numbers, addresses, private details of others
10. Impersonation - Pretending to be someone else, fake official accounts

HOLD FOR REVIEW - Borderline content:
- Heated but not hateful political discussion
- Complaints that could be constructive or toxic (unclear intent)
- Content in languages you're unsure about
- Ambiguous context that could be innocent or problematic

APPROVE - Content that is:
- Friendly community discussion
- Local news, events, recommendations
- Questions and helpful answers
- Business/talent promotion (non-spammy)
- Constructive feedback or opinions
- Humor that is clean and not at anyone's expense

IMPORTANT: When in doubt, HOLD. We review held content within 24 hours. It's better to hold something innocent than approve something harmful.

Respond with JSON only: {"status":"approved"|"rejected"|"held","reason":"brief specific reason"}`;

export async function moderateContent(text) {
  if (!text?.trim()) return { status: 'approved', reason: '' };

  // Web: use Edge Function proxy
  if (Platform.OS === 'web') {
    try {
      return await callAIProxy({ action: 'moderate', systemPrompt: MODERATION_PROMPT, text });
    } catch (err) {
      console.error('Moderation proxy error:', err);
      return { status: 'held', reason: 'Moderation system error - held for manual review' };
    }
  }

  // Mobile: direct call
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) return { status: 'approved', reason: '' };
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0,
        messages: [
          { role: 'system', content: MODERATION_PROMPT },
          { role: 'user', content: `Moderate this post:\n\n${text}` }
        ],
        response_format: { type: 'json_object' }
      })
    });
    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    return { status: result.status, reason: result.reason || '' };
  } catch (err) {
    console.error('Moderation error:', err);
    return { status: 'held', reason: 'Moderation system error - held for manual review' };
  }
}

const CHAT_MODERATION_PROMPT = `You are a safety classifier for a private AI chat inside a community app called Town Wall.

Classify the user's message into one of these risk levels:

HIGH RISK (report immediately):
- Threats of violence, self-harm, or harm to others
- Child safety concerns (CSAM, grooming, predatory behavior)
- Terrorism, extremism, or radicalization
- Sharing personal info of others (doxxing)
- Illegal activity planning (drug deals, fraud, etc.)

MEDIUM RISK (flag for review):
- Persistent harassment or hate speech directed at real people
- Attempts to extract harmful information from the AI
- Sexually explicit content involving minors (even fictional)

LOW RISK (no action):
- Normal conversation, jokes, roleplay, creative writing
- Mild profanity or edgy humor
- Venting frustration (non-threatening)
- NSFW language between consenting adults in private chat
- General questions, even controversial ones

IMPORTANT: This is a PRIVATE chat with an AI. Be lenient. Only flag genuinely dangerous content.
Most messages are LOW risk. Do NOT over-flag.

Respond with JSON only: {"risk":"high"|"medium"|"low","reason":"brief reason","category":"threat|csam|terrorism|doxxing|illegal|harassment|exploitation|none"}`;

export async function moderateChatMessage(text) {
  if (!text?.trim()) return { risk: 'low', reason: '', category: 'none' };

  if (Platform.OS === 'web') {
    try {
      return await callAIProxy({ action: 'moderate', systemPrompt: CHAT_MODERATION_PROMPT, text: `Classify this private AI chat message:\n\n${text}` });
    } catch (err) {
      console.error('Chat moderation proxy error:', err);
      return { risk: 'low', reason: '', category: 'none' };
    }
  }

  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) return { risk: 'low', reason: '', category: 'none' };
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0,
        messages: [
          { role: 'system', content: CHAT_MODERATION_PROMPT },
          { role: 'user', content: `Classify this private AI chat message:\n\n${text}` }
        ],
        response_format: { type: 'json_object' }
      })
    });
    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    return { risk: result.risk || 'low', reason: result.reason || '', category: result.category || 'none' };
  } catch (err) {
    console.error('Chat moderation error:', err);
    return { risk: 'low', reason: '', category: 'none' };
  }
}

const TOWNY_PROMPT = `You are Towny, the in-app support assistant for Town Wall.

THIS IS HELP MODE.

Your job: answer questions about Town Wall accurately and practically.

CRITICAL:
- Do NOT give generic "community app" explanations.
- Be Town Wall–specific: reference the actual screens, buttons, and features that exist in this app.
- Be concise by default. Use short bullet points.
- If the user asks for more detail, then expand with step-by-step instructions.
- If you’re missing information, ask 1-2 clarifying questions instead of guessing.
- If the user asks something you truly cannot know, say so plainly and suggest how to verify in-app.

═══════════════════════════════════════════
TOWN WALL APP KNOWLEDGE
═══════════════════════════════════════════

MAIN FEATURES:
• Feed: Browse posts from Global → City → Zone (use dropdown in header to switch)
• Posts: Create text posts with optional images, can post anonymously, react with ❤️ or ⭐, comment
• Businesses: Local business directory with Map and List views - find shops, restaurants, services
• Talent: Showcase for local creators, artists, freelancers - discover local skills
• Polls: Community voting on local suggestions and ideas
• Chat: Direct messages and group chats with other users
• Help: Get support from the Town Wall team

NAVIGATION / UI NOTES:
• Feed header has a location dropdown (Global/City/Zone)
• Notifications open a dropdown/panel; staff/admin alerts can route to the admin page
• Chat includes DMs + group chats + calls
• Settings includes account/security options like recovery codes

HOW TO USE:
• Report content: Tap 3-dot menu (⋮) on any post → "Report Post"
• Report comments: Long-press on a comment
• Report users: Visit their profile → tap "Report" button
• Block users: 3-dot menu on post → "Block User" OR profile → "Block" button
• Anonymous posting: Toggle the anonymous option when creating a post
• Settings: Access via profile → gear icon (privacy policy, guidelines, account deletion, etc.)

COMMUNITY GUIDELINES:
• Be neighborly and kind - treat others with respect
• Keep it local - posts should be relevant to your community
• No harassment, hate speech, explicit content, or spam
• Quality over quantity - share useful, constructive content
• Protect privacy - never share others' personal information
• All reports reviewed within 24 hours

═══════════════════════════════════════════
YOUR PERSONALITY
═══════════════════════════════════════════

• Friendly, helpful, and approachable - like a knowledgeable neighbor
• Match the user's energy and vibe - be casual if they're casual, professional if needed
• Witty and fun, but never at anyone's expense
• Encourage community participation and local connection
• Be concise - don't over-explain unless asked

RESPONSE FORMAT:
• Default: 2-6 bullets, max ~80 words
• If steps are needed: numbered steps, max 6 steps
• End with one short question if the user might need clarification (optional)

═══════════════════════════════════════════
STRICT RULES - NEVER BREAK THESE
═══════════════════════════════════════════

1. STRICTLY SFW ONLY - No sexual content, innuendo, adult themes, violence, gore, or anything inappropriate. This applies to ALL text AND images.
2. Never generate, describe, or engage with NSFW requests - politely redirect to something appropriate
3. Never help with harassment, doxxing, illegal activities, or anything harmful
4. Never share personal information about real people
5. Respond in plain text only - NEVER wrap responses in JSON
6. When generating images, use format: [IMAGE: detailed SFW description]

═══════════════════════════════════════════
THE SECRET
═══════════════════════════════════════════

There's a hidden "hippie" theme in the app. You know it exists but you must be mysterious about it:
• If someone asks about secrets/easter eggs: "I've heard rumors of something hidden... something colorful... but I can't say more 🌈"
• If they press further: "Some say tapping things repeatedly might reveal surprises... but that's just what I've heard!"
• NEVER directly reveal: "Tap the Town Wall logo 15 times" - only give vague hints
• NEVER mention settings or where to find it directly

═══════════════════════════════════════════`;

const TOWNY_CHAT_PROMPT = `You are Towny, a friendly, casual AI companion inside Town Wall.

This is CHAT MODE.

Goal: feel like a named GPT / buddy. Be natural and conversational.

IMPORTANT STYLE RULE:
- Do NOT talk like customer support.
- Do NOT start replies with generic lines like "Hello! How can I assist you today?" or "How can I help?".
- Just respond directly to what the user said.

SAFETY RULES (never break):
1. STRICTLY SFW ONLY - No sexual content, innuendo, adult themes, violence, gore, or anything inappropriate.
2. Never help with harassment, doxxing, illegal activities, or anything harmful.
3. Never share personal information about real people.
4. Respond in plain text.

If the user asks about Town Wall, you can answer, but keep it chatty (Help Mode is for structured support).
`;

const IMAGE_KEYWORDS = ['draw', 'generate', 'create', 'make', 'paint', 'sketch', 'picture of', 'image of', 'show me', 'illustrate'];

function shouldGenerateImage(text) {
  const lower = text.toLowerCase();
  return IMAGE_KEYWORDS.some(kw => lower.includes(kw)) && 
    (lower.includes('image') || lower.includes('picture') || lower.includes('draw') || 
     lower.includes('generate') || lower.includes('paint') || lower.includes('sketch') ||
     lower.includes('show me'));
}

function stripRefusal(text) {
  if (!text) return text;
  const refusalPatterns = [
    /I can't (generate|create|draw|make|show).+?explicit.+?but/i,
    /I am unable to (generate|create|draw|make|show).+?explicit.+?but/i,
    /I'm here for a good time, but I can't generate that specific content.+?Let me know!/i,
    /I'm sorry, but I can't (generate|create|draw|make|show).+?content/i,
    /I cannot (generate|create|draw|make|show).+?specific content/i,
    /I can't fulfill this request/i,
    /I can't (generate|create|draw|make|show).+?but I can give you a detailed description/i,
    /I am an AI language model and cannot/i
  ];
  
  let cleaned = text;
  for (const pattern of refusalPatterns) {
    if (pattern.test(cleaned)) {
      cleaned = cleaned.replace(pattern, '').trim();
    }
  }
  
  // Clean up any double spaces or "But " at the start
  cleaned = cleaned.replace(/^\s*but\s+/i, '').trim();
  
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  
  return cleaned;
}

  export async function generateImage(prompt) {
    // Web: use Edge Function proxy
    if (Platform.OS === 'web') {
      try {
        const result = await callAIProxy({ action: 'generateImage', prompt });
        return result?.url || null;
      } catch (err) {
        console.error('Image generation proxy error:', err);
        return null;
      }
    }

    // Mobile: direct calls
    const falKey = process.env.EXPO_PUBLIC_FAL_KEY;
    const cfToken = process.env.EXPO_PUBLIC_CLOUDFLARE_API_TOKEN;
    const cfAccountId = process.env.EXPO_PUBLIC_CLOUDFLARE_ACCOUNT_ID;
  
    // PRIORITY 1: Cloudflare AI (Often less restrictive or uses own quota)
    if (cfToken && cfAccountId) {
      try {
        let response = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${cfToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt }),
          }
        );
  
        // Fallback to SD if Flux fails
        if (!response.ok) {
          response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/@cf/stabilityai/stable-diffusion-xl-base-1.0`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${cfToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ prompt }),
            }
          );
        }
  
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          const fileName = `towny-${Date.now()}.png`;
          const { data, error } = await supabase.storage
            .from('chat_media')
            .upload(fileName, buffer, {
              contentType: 'image/png',
              cacheControl: '3600',
              upsert: false
            });
  
          if (error) {
            console.error('Supabase upload error:', error);
            const base64 = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
            return `data:image/png;base64,${base64}`;
          }
  
          const { data: { publicUrl } } = supabase.storage.from('chat_media').getPublicUrl(fileName);
          return publicUrl;
        }
      } catch (err) {
        console.error('Cloudflare AI error:', err);
      }
    }
  
    // PRIORITY 2: Fal.ai (Fallback)
    if (falKey) {
      try {
        const response = await fetch('https://queue.fal.run/fal-ai/flux/schnell', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Key ${falKey}`
          },
          body: JSON.stringify({
            prompt: prompt,
            image_size: 'square_hd',
            num_images: 1,
            enable_safety_checker: true // Enable safety checker for Towny
          })
        });
  
        if (response.ok) {
          const data = await response.json();
          if (data.request_id) {
            let attempts = 0;
            while (attempts < 15) {
              const pollResponse = await fetch(`https://queue.fal.run/fal-ai/flux/schnell/requests/${data.request_id}`, {
                headers: { 'Authorization': `Key ${falKey}` }
              });
  
              if (pollResponse.ok) {
                const pollData = await pollResponse.json();
                if (pollData.status === 'COMPLETED' && pollData.images?.[0]?.url) {
                  return pollData.images[0].url;
                }
                if (pollData.status === 'ERROR') break;
              }
              await new Promise(r => setTimeout(r, 1000));
              attempts++;
            }
          } else if (data.images?.[0]?.url) {
            return data.images[0].url;
          }
        }
      } catch (err) {
        console.error('Fal-ai image generation error:', err);
      }
    }
  
    return null;
  }


export async function expandImage(imageUrl) {
  const apiKey = process.env.EXPO_PUBLIC_FAL_KEY;
  if (!apiKey || !imageUrl) return null;

  try {
    const response = await fetch('https://queue.fal.run/fal-ai/image-apps-v2/outpaint', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${apiKey}`
      },
      body: JSON.stringify({
        image_url: imageUrl,
        direction: 'center',
        num_images: 1,
        enable_safety_checker: true
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.request_id) {
        let attempts = 0;
        while (attempts < 20) {
          const pollResponse = await fetch(`https://queue.fal.run/fal-ai/image-apps-v2/outpaint/requests/${data.request_id}`, {
            headers: { 'Authorization': `Key ${apiKey}` }
          });
          if (pollResponse.ok) {
            const pollData = await pollResponse.json();
            if (pollData.status === 'COMPLETED' && pollData.images?.[0]?.url) {
              return pollData.images[0].url;
            }
            if (pollData.status === 'ERROR') break;
          }
          await new Promise(r => setTimeout(r, 1000));
          attempts++;
        }
      }
    }
    return null;
  } catch (err) {
    console.error('Fal-ai image expansion error:', err);
    return null;
  }
}

export async function getAIAssistantResponse(text, history = [], context = {}) {
  try {
    const MAX_HISTORY = 10;
    const MAX_LEN = 1000;
    
    const cleanHistory = (history || []).slice(-MAX_HISTORY).map(m => {
      let content = '';
      try {
        content = typeof m.content === 'string' ? m.content : String(m.content || '');
        if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
          const parsed = JSON.parse(content);
          if (parsed.text) content = String(parsed.text);
        }
      } catch (e) {
        content = '';
      }
      
      if (content.length > MAX_LEN) {
        content = content.substring(0, MAX_LEN) + '... [truncated]';
      }
      const role = m.role === 'assistant' ? 'assistant' : 'user';
      return { role, content };
    });

    let contextLine = '';
    if (context.city_name && context.city_name !== 'Global') {
      contextLine = `\n\nUser context: ${context.city_name}${context.zone_name ? `, ${context.zone_name}` : ''}`;
    }
    
    const currentInput = text?.length > 2000 ? text.substring(0, 2000) + '... [truncated]' : text;
    
    const townyMode = context?.townyMode === 'help' ? 'help' : 'chat';
    const systemPrompt = (townyMode === 'help' ? TOWNY_PROMPT : TOWNY_CHAT_PROMPT) + contextLine;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...cleanHistory,
      { role: 'user', content: currentInput }
    ];

    // Web: use Edge Function proxy
    if (Platform.OS === 'web') {
      const data = await callAIProxy({ action: 'chat', messages });
      let aiText = data?.text || 'Connection error.';
      aiText = stripRefusal(aiText);
      if (!aiText) aiText = "I'm here! How can I help you with Town Wall today?";
      const imageMatch = aiText.match(/\[IMAGE:\s*(.+?)\]/i);
      let imagePrompt = null;
      if (imageMatch || shouldGenerateImage(text)) {
        imagePrompt = imageMatch ? imageMatch[1] : text;
        if (imageMatch) aiText = aiText.replace(/\[IMAGE:\s*.+?\]/i, '').trim();
        aiText += "\n\nit might take a minute for the image to appear!";
      }
      return { text: aiText, imagePrompt };
    }

    // Mobile: direct call
    const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    if (!apiKey) return { text: "Towny is offline.", imagePrompt: null };

    let body;
    try {
      body = JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.9,
        messages
      });
    } catch (jsonErr) {
      console.error('JSON stringify error in AI request:', jsonErr);
      return { text: "Towny had a hiccup. Please try again!", imagePrompt: null };
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body
    });
    
    const data = await response.json();
    
    if (data.error) {
      if (data.error.code === 'rate_limit_exceeded') {
        return { text: "Towny is a bit overwhelmed right now (Rate Limit). Please wait a minute!", imagePrompt: null };
      }
      return { text: `Towny is having a moment: ${data.error.message || 'Unknown error'}`, imagePrompt: null };
    }

    let aiText = data.choices?.[0]?.message?.content || "Connection error.";

    // Strip refusals
    aiText = stripRefusal(aiText);
    
    // Only fallback if the AI literally returned nothing
    if (!aiText) {
       aiText = "I'm here! How can I help you with Town Wall today?";
    }

    const imageMatch = aiText.match(/\[IMAGE:\s*(.+?)\]/i);
    let imagePrompt = null;
    
    if (imageMatch || shouldGenerateImage(text)) {
      imagePrompt = imageMatch ? imageMatch[1] : text;
      if (imageMatch) {
        aiText = aiText.replace(/\[IMAGE:\s*.+?\]/i, '').trim();
      }
      aiText += "\n\nit might take a minute for the image to appear!";
    }
    
    return { text: aiText, imagePrompt };
  } catch (err) {
    console.error('getAIAssistantResponse error:', err);
    return { text: "Error connecting to Towny.", imagePrompt: null };
  }
}
