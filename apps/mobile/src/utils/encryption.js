import 'react-native-get-random-values';
import { ec as EC } from 'elliptic';
import CryptoJS from 'crypto-js';
import { Buffer } from 'buffer';
import { getRandomBytes } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { supabase } from './supabase';

const ec = new EC('secp256k1');
const E2E_PREFIX = 'E2E:';

// Helper to convert Uint8Array to Hex
const bytesToHex = (bytes) => Buffer.from(bytes).toString('hex');
// Helper to convert Hex to Uint8Array
const hexToBytes = (hex) => new Uint8Array(Buffer.from(hex, 'hex'));

export async function generateKeyPair() {
  const key = ec.genKeyPair();
  const privateKey = key.getPrivate('hex');
  const publicKey = key.getPublic(true, 'hex'); // compressed
  return { publicKey, privateKey };
}

export async function storeKeyPair(userId, keyPair) {
  await SecureStore.setItemAsync(`e2e_private_${userId}`, keyPair.privateKey);
  await SecureStore.setItemAsync(`e2e_public_${userId}`, keyPair.publicKey);
}

export async function loadKeyPair(userId) {
  const privateKey = await SecureStore.getItemAsync(`e2e_private_${userId}`);
  const publicKey = await SecureStore.getItemAsync(`e2e_public_${userId}`);
  return privateKey && publicKey ? { privateKey, publicKey } : null;
}

export async function deleteKeyPair(userId) {
  await SecureStore.deleteItemAsync(`e2e_private_${userId}`);
  await SecureStore.deleteItemAsync(`e2e_public_${userId}`);
}

export async function getOrCreateKeyPair(userId) {
  let keyPair = await loadKeyPair(userId);
  if (!keyPair) {
    keyPair = await generateKeyPair();
    await storeKeyPair(userId, keyPair);
    
    await supabase
      .from('ruser_keys')
      .upsert({ 
        user_id: userId, 
        public_key: keyPair.publicKey,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
    
    await supabase
      .from('rusers')
      .update({ has_e2ee: true, public_key: keyPair.publicKey })
      .eq('id', userId);
  }
  return keyPair;
}

export async function getPublicKeyForUser(userId) {
  const { data } = await supabase
    .from('ruser_keys')
    .select('public_key')
    .eq('user_id', userId)
    .single();
  
  if (data?.public_key) return data.public_key;
  
  const { data: user } = await supabase
    .from('rusers')
    .select('public_key')
    .eq('id', userId)
    .single();
  
  return user?.public_key || null;
}

function deriveSharedSecret(privateKey, peerPublicKey) {
  try {
    const priv = ec.keyFromPrivate(privateKey, 'hex');
    const pub = ec.keyFromPublic(peerPublicKey, 'hex');
    const shared = priv.derive(pub.getPublic());
    const sharedHex = shared.toString(16, 64);
    
    // Simple HKDF-like derivation using SHA256
    // We use the shared secret to derive a 256-bit AES key
    return CryptoJS.SHA256(sharedHex).toString();
  } catch (error) {
    console.error('Error deriving shared secret:', error);
    return null;
  }
}

// AES-CBC + HMAC-SHA256 (Authenticated Encryption)
export async function encryptMessage(message, senderPrivateKey, recipientPublicKey) {
  try {
    if (!senderPrivateKey || !recipientPublicKey) return message;

    const sharedKey = deriveSharedSecret(senderPrivateKey, recipientPublicKey);
    if (!sharedKey) return message;

    const ivBytes = await getRandomBytes(16);
    const iv = CryptoJS.enc.Hex.parse(bytesToHex(ivBytes));
    
    const encrypted = CryptoJS.AES.encrypt(message, CryptoJS.enc.Hex.parse(sharedKey), {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    const ciphertext = encrypted.toString();
    
    // HMAC for authentication
    const hmac = CryptoJS.HmacSHA256(iv.toString() + ciphertext, sharedKey).toString();
    
    const payload = {
      ct: ciphertext,
      iv: iv.toString(),
      mac: hmac
    };
    
    return E2E_PREFIX + Buffer.from(JSON.stringify(payload)).toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    return message;
  }
}

export async function decryptMessage(encryptedText, recipientPrivateKey, senderPublicKey) {
  try {
    if (!encryptedText || !encryptedText.startsWith(E2E_PREFIX)) return encryptedText;
    
    if (!recipientPrivateKey || !senderPublicKey) {
      return '[Encrypted message - keys unavailable]';
    }

    const payload = JSON.parse(Buffer.from(encryptedText.slice(E2E_PREFIX.length), 'base64').toString());
    const sharedKey = deriveSharedSecret(recipientPrivateKey, senderPublicKey);
    if (!sharedKey) return '[Decryption failed]';

    // Verify HMAC
    const expectedMac = CryptoJS.HmacSHA256(payload.iv + payload.ct, sharedKey).toString();
    if (payload.mac !== expectedMac) {
      console.error('MAC verification failed - key mismatch');
      return '[Message encrypted with different keys]';
    }

    const decrypted = CryptoJS.AES.decrypt(payload.ct, CryptoJS.enc.Hex.parse(sharedKey), {
      iv: CryptoJS.enc.Hex.parse(payload.iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption error:', error);
    return '[Decryption failed]';
  }
}

export function isEncrypted(text) {
  return text && text.startsWith(E2E_PREFIX);
}

export async function encryptForChat(message, myUserId, otherUserId) {
  try {
    const myKeyPair = await getOrCreateKeyPair(myUserId);
    const otherPublicKey = await getPublicKeyForUser(otherUserId);
    if (!otherPublicKey) return message;
    return await encryptMessage(message, myKeyPair.privateKey, otherPublicKey);
  } catch (error) {
    console.error('encryptForChat error:', error);
    return message;
  }
}

export async function decryptForChat(encryptedText, myUserId, senderUserId) {
  try {
    if (!isEncrypted(encryptedText)) return encryptedText;
    const myKeyPair = await loadKeyPair(myUserId);
    if (!myKeyPair) return '[Cannot decrypt - no keys]';
    const senderPublicKey = await getPublicKeyForUser(senderUserId);
    if (!senderPublicKey) return '[Cannot decrypt - sender key missing]';
    return await decryptMessage(encryptedText, myKeyPair.privateKey, senderPublicKey);
  } catch (error) {
    console.error('decryptForChat error:', error);
    return '[Decryption failed]';
  }
}

async function generateGroupKey() {
  const keyBytes = await getRandomBytes(32);
  return bytesToHex(keyBytes);
}

async function encryptKeyForUser(groupKey, myPrivateKey, recipientPublicKey) {
  const sharedSecret = deriveSharedSecret(myPrivateKey, recipientPublicKey);
  if (!sharedSecret) return null;
  
  const ivBytes = await getRandomBytes(16);
  const iv = CryptoJS.enc.Hex.parse(bytesToHex(ivBytes));
  const encrypted = CryptoJS.AES.encrypt(groupKey, CryptoJS.enc.Hex.parse(sharedSecret), {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  
  const ciphertext = encrypted.toString();
  const hmac = CryptoJS.HmacSHA256(iv.toString() + ciphertext, sharedSecret).toString();

  return {
    encrypted_key: ciphertext,
    nonce: iv.toString(),
    mac: hmac
  };
}

async function decryptGroupKey(encryptedKey, nonce, myPrivateKey, creatorPublicKey, mac) {
  try {
    const sharedSecret = deriveSharedSecret(myPrivateKey, creatorPublicKey);
    if (!sharedSecret) return null;
    
    const expectedMac = CryptoJS.HmacSHA256(nonce + encryptedKey, sharedSecret).toString();
    if (mac && mac !== expectedMac) return null;

    const decrypted = CryptoJS.AES.decrypt(encryptedKey, CryptoJS.enc.Hex.parse(sharedSecret), {
      iv: CryptoJS.enc.Hex.parse(nonce),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('decryptGroupKey error:', error);
    return null;
  }
}

export async function encryptForGroup(message, myUserId, groupId) {
  try {
    const { data: myGroupKey } = await supabase
      .from('rgroup_keys')
      .select('encrypted_key, nonce, created_by, mac')
      .eq('chat_id', groupId)
      .eq('user_id', myUserId)
      .single();

    let groupKey;
    
    if (myGroupKey) {
      const myKeyPair = await loadKeyPair(myUserId);
      if (!myKeyPair) return message;
      
      const creatorPublicKey = await getPublicKeyForUser(myGroupKey.created_by);
      if (!creatorPublicKey) return message;
      
      groupKey = await decryptGroupKey(
        myGroupKey.encrypted_key, 
        myGroupKey.nonce, 
        myKeyPair.privateKey, 
        creatorPublicKey,
        myGroupKey.mac
      );
    } else {
      groupKey = await generateGroupKey();
      await distributeGroupKey(groupId, groupKey, myUserId);
    }

    if (!groupKey) return message;
    return await encryptWithGroupKey(message, groupKey);
  } catch (error) {
    console.error('encryptForGroup error:', error);
    return message;
  }
}

async function distributeGroupKey(groupId, groupKey, creatorUserId) {
  try {
    const myKeyPair = await loadKeyPair(creatorUserId);
    if (!myKeyPair) return;
    
    const { data: members } = await supabase
      .from('rchat_members')
      .select('user_id')
      .eq('chat_id', groupId);
    
    if (!members) return;
    
    for (const member of members) {
      const memberPublicKey = await getPublicKeyForUser(member.user_id);
      if (!memberPublicKey) continue;
      
      const encrypted = await encryptKeyForUser(groupKey, myKeyPair.privateKey, memberPublicKey);
      if (!encrypted) continue;
      
      await supabase.from('rgroup_keys').upsert({
        chat_id: groupId,
        user_id: member.user_id,
        encrypted_key: encrypted.encrypted_key,
        nonce: encrypted.nonce,
        mac: encrypted.mac,
        created_by: creatorUserId
      }, { onConflict: 'chat_id,user_id' });
    }
  } catch (error) {
    console.error('distributeGroupKey error:', error);
  }
}

export async function decryptForGroup(encryptedText, groupId, myUserId) {
  try {
    if (!isEncrypted(encryptedText)) return encryptedText;

    const { data: myGroupKey } = await supabase
      .from('rgroup_keys')
      .select('encrypted_key, nonce, created_by, mac')
      .eq('chat_id', groupId)
      .eq('user_id', myUserId)
      .single();

    if (!myGroupKey) return '[Cannot decrypt - no group key]';

    const myKeyPair = await loadKeyPair(myUserId);
    if (!myKeyPair) return '[Cannot decrypt - no keys]';

    const creatorPublicKey = await getPublicKeyForUser(myGroupKey.created_by);
    if (!creatorPublicKey) return '[Cannot decrypt - creator key missing]';

    const groupKey = await decryptGroupKey(
      myGroupKey.encrypted_key, 
      myGroupKey.nonce, 
      myKeyPair.privateKey, 
      creatorPublicKey,
      myGroupKey.mac
    );

    if (!groupKey) return '[Decryption failed]';
    return await decryptWithGroupKey(encryptedText, groupKey);
  } catch (error) {
    console.error('decryptForGroup error:', error);
    return '[Decryption failed]';
  }
}

async function encryptWithGroupKey(message, groupKey) {
  try {
    const ivBytes = await getRandomBytes(16);
    const iv = CryptoJS.enc.Hex.parse(bytesToHex(ivBytes));
    const sharedKey = CryptoJS.SHA256(groupKey).toString();
    
    const encrypted = CryptoJS.AES.encrypt(message, CryptoJS.enc.Hex.parse(sharedKey), {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    const ciphertext = encrypted.toString();
    const hmac = CryptoJS.HmacSHA256(iv.toString() + ciphertext, sharedKey).toString();
    
    const payload = {
      ct: ciphertext,
      iv: iv.toString(),
      mac: hmac
    };
    
    return E2E_PREFIX + Buffer.from(JSON.stringify(payload)).toString('base64');
  } catch (error) {
    console.error('Group encryption error:', error);
    return message;
  }
}

async function decryptWithGroupKey(encryptedText, groupKey) {
  try {
    const payload = JSON.parse(Buffer.from(encryptedText.slice(E2E_PREFIX.length), 'base64').toString());
    const sharedKey = CryptoJS.SHA256(groupKey).toString();
    
    const expectedMac = CryptoJS.HmacSHA256(payload.iv + payload.ct, sharedKey).toString();
    if (payload.mac !== expectedMac) return '[Decryption failed]';

    const decrypted = CryptoJS.AES.decrypt(payload.ct, CryptoJS.enc.Hex.parse(sharedKey), {
      iv: CryptoJS.enc.Hex.parse(payload.iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Group decryption error:', error);
    return '[Decryption failed]';
  }
}
