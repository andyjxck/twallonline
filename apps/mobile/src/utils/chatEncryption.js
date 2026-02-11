/**
 * Simple symmetric encryption for Towny chat-mode messages.
 * Uses a per-user key derived from their user ID + a static salt.
 * This is NOT military-grade crypto — it's a privacy layer so admins
 * can't casually read chat-mode messages in the DB.
 *
 * Messages are Base64-encoded after XOR with the derived key.
 * Encrypted messages are prefixed with [E] so we can detect them.
 */

const SALT = 'tw_chat_v1_';
const PREFIX = '[E]';

function deriveKey(userId) {
  const raw = `${SALT}${userId}`;
  const key = [];
  for (let i = 0; i < raw.length; i++) {
    key.push(raw.charCodeAt(i));
  }
  return key;
}

function xorCipher(text, key) {
  const result = [];
  for (let i = 0; i < text.length; i++) {
    result.push(text.charCodeAt(i) ^ key[i % key.length]);
  }
  return result;
}

function toBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(b64) {
  const binary = atob(b64);
  const bytes = [];
  for (let i = 0; i < binary.length; i++) {
    bytes.push(binary.charCodeAt(i));
  }
  return bytes;
}

export function encryptMessage(text, userId) {
  if (!text || !userId) return text;
  try {
    const key = deriveKey(userId);
    const encrypted = xorCipher(text, key);
    return `${PREFIX}${toBase64(encrypted)}`;
  } catch (e) {
    console.error('Encryption error:', e);
    return text;
  }
}

export function decryptMessage(text, userId) {
  if (!text || !userId || !isEncrypted(text)) return text;
  try {
    const payload = text.slice(PREFIX.length);
    const key = deriveKey(userId);
    const bytes = fromBase64(payload);
    const decrypted = [];
    for (let i = 0; i < bytes.length; i++) {
      decrypted.push(String.fromCharCode(bytes[i] ^ key[i % key.length]));
    }
    return decrypted.join('');
  } catch (e) {
    console.error('Decryption error:', e);
    return '[Unable to decrypt message]';
  }
}

export function isEncrypted(text) {
  return typeof text === 'string' && text.startsWith(PREFIX);
}
