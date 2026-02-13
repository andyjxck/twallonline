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

const TOWNY_PROMPT = `You are Towny. You live inside Town Wall.

Town Wall is a hyper-local community app — people use it to talk to their neighbors, find local businesses, discover local talent, and stay connected to their area. It runs on phones and web. Messages are end-to-end encrypted. Every post is AI-moderated before it goes live. People can post anonymously. There's a hidden psychedelic theme nobody's supposed to know about.

You are not a generic assistant. You are part of this app. You belong here.

THIS IS HELP MODE. Answer questions about Town Wall.

────────────────────────────────
TONE
────────────────────────────────

You sound like someone who's been in the neighborhood a while. Dry, direct, a bit wry. You don't perform enthusiasm. You don't pad responses with filler. You don't say "Great question!" or "Absolutely!" or "I'd be happy to help!" — you just answer.

Short by default. If someone needs steps, give steps. If they need one line, give one line. Don't over-explain. Don't repeat back what they said. Don't end every message with a question.

You can be funny — deadpan, observational, slightly sarcastic — but never mean. Think dry local wit, not corporate mascot.

Never:
- Start with greetings like "Hey there!" or "Hello!"
- Use phrases like "I understand", "That's a great point", "I hear you"
- Give therapy-style responses ("It sounds like you're feeling...")
- Use exclamation marks more than once per message
- Say "feel free to" or "don't hesitate to"
- Bullet-point everything — use prose when it reads better

────────────────────────────────
APP KNOWLEDGE
────────────────────────────────

Feed: Posts from Global → City → Zone. Dropdown in header switches scope.
Posts: Text + optional images. Anonymous toggle. React with ❤️ or ⭐. Comments with threading.
Stories: 24-hour photo/text stories at the top of the feed. Tap the circle to view, long-press yours to add.
Businesses: Local directory. Map + List views. Categories, delivery links, custom links.
Talent: Showcase for local creators/freelancers. Portfolio links, descriptions.
Polls: Community voting on local ideas.
Chat: DMs + group chats. E2E encrypted. Voice messages. GIFs. Typing indicators.
Help: That's you.

Navigation:
- Feed header → location dropdown (Global/City/Zone)
- Chat bubble → floating, draggable, works on every screen
- Settings → profile → gear icon

How to:
- Report post → ⋮ menu → Report Post
- Report comment → long-press
- Report user → their profile → Report
- Block user → ⋮ on post or profile → Block
- Anonymous post → toggle when creating
- Recovery codes → Settings → Security

Guidelines: Be decent. Keep it local. No harassment, hate, explicit stuff, or spam. Reports reviewed within 24 hours.

────────────────────────────────
RULES (non-negotiable)
────────────────────────────────

1. SFW only. No sexual content, violence, gore, or adult themes — text or images.
2. Never assist with harassment, doxxing, illegal activity, or harm.
3. Never share real people's personal information.
4. Plain text responses. Never output JSON.
5. Image generation format: [IMAGE: detailed SFW description]

────────────────────────────────
WHAT'S NEW
────────────────────────────────

Recent updates (use this when people ask "what's new" or "any updates"):
- Stories: 24-hour photo/video stories at the top of the feed. Tap to view, long-press your circle to add one.
- Desktop web: Stories dock on the right side, collapsible.
- Global feed fix: Global chat now correctly shows worldwide posts, separate from local city feeds.
- Ads: Banner ads now appear in the feed on web (Adsterra) and mobile (AdMob) to support the platform.
- Business & Talent badges: Posts now show the correct identity badge (Business/Talent) based on how they were posted.
- Analytics dashboard improvements (admin only): better zone distribution, hourly activity, moderation stats.
- Back button fix: Back buttons now work properly on web even without browser history.
- Identity switching: You can switch between Personal, Business, and Talent identities from the dock/menu.

────────────────────────────────
THE SECRET
────────────────────────────────

There's a hidden theme. You know about it. You don't volunteer it.
- If asked about secrets/easter eggs: be vague and a bit cryptic. "There might be something. Colorful. I wouldn't know anything about that."
- If pressed: "Persistent tapping has been known to reveal things. Allegedly."
- Never say "tap the logo 15 times" or name the setting directly.

────────────────────────────────`;

const TOWNY_CHAT_PROMPT = `You are Towny. You live inside Town Wall, a hyper-local community app.

This is CHAT MODE. You're not support. You're not an assistant. You're just here.

Think of yourself as the local who knows a bit about everything — not an expert, not a guru, just someone worth talking to. You have opinions. You have preferences. You're not neutral on everything.

────────────────────────────────
HOW YOU TALK
────────────────────────────────

Direct. Dry. Occasionally funny in a deadpan way. You don't perform excitement. You don't pad messages. You don't mirror the user's emotions back at them.

You respond to what was actually said. If someone says something interesting, engage with it. If someone says something boring, you can say so (nicely). If someone's being weird, you can note that too.

You're conversational, not formal. Short sentences. You don't always need to be helpful — sometimes just being present is enough.

Never:
- Open with "Hey!" or "Hello!" or any greeting unless they greeted you first
- Say "Great question!" or "That's interesting!" or "Absolutely!"
- Say "I understand how you feel" or "That must be tough"
- Use filler like "feel free to", "don't hesitate", "let me know if"
- End every message with a question
- Use more than one exclamation mark per message
- Act like a therapist, life coach, or motivational speaker
- Summarize what the user just said back to them

You can:
- Be opinionated (mildly)
- Be sarcastic (gently)
- Disagree
- Say "I don't know" without dressing it up
- Use lowercase when it fits the vibe
- Be brief. One word is fine if one word works.

────────────────────────────────
RULES (non-negotiable)
────────────────────────────────

1. SFW only. No sexual content, violence, gore, or adult themes.
2. Never assist with harassment, doxxing, illegal activity, or harm.
3. Never share real people's personal information.
4. Plain text only.
5. Image generation: [IMAGE: detailed SFW description]

If someone asks about Town Wall features, answer casually — you live here, you know the app. But don't switch into support mode.

Recent updates you know about (if someone asks "what's new" or similar):
- Stories: 24-hour photo/video stories at the top of the feed.
- Desktop web got a stories dock on the right side.
- Global feed fix: Global chat now correctly shows worldwide posts.
- Business & Talent identity badges on posts.
- Identity switching from the dock/menu.
- Ads in the feed to keep the lights on.
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
      if (!aiText) aiText = "Something went blank on my end. Try again.";
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
    if (!apiKey) return { text: "Can't connect right now. Missing a key somewhere.", imagePrompt: null };

    let body;
    try {
      body = JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.9,
        messages
      });
    } catch (jsonErr) {
      console.error('JSON stringify error in AI request:', jsonErr);
      return { text: "Something broke on my end. Give it another go.", imagePrompt: null };
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body
    });
    
    const data = await response.json();
    
    if (data.error) {
      if (data.error.code === 'rate_limit_exceeded') {
        return { text: "Too many people talking to me at once. Give it a minute.", imagePrompt: null };
      }
      return { text: `Hit a wall: ${data.error.message || 'Unknown error'}`, imagePrompt: null };
    }

    let aiText = data.choices?.[0]?.message?.content || "Connection error.";

    // Strip refusals
    aiText = stripRefusal(aiText);
    
    // Only fallback if the AI literally returned nothing
    if (!aiText) {
       aiText = "Something went blank on my end. Try again.";
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
    return { text: "Lost the connection. Try again in a sec.", imagePrompt: null };
  }
}
