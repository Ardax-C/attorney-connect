// Generate a random encryption key
export async function generateEncryptionKey() {
  return await window.crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256
    },
    true,
    ['encrypt', 'decrypt']
  );
}

// Export key to string format for storage
export async function exportKey(key) {
  const exported = await window.crypto.subtle.exportKey('raw', key);
  return arrayBufferToBase64(exported);
}

// Import key from string format
export async function importKey(keyString) {
  const keyBuffer = base64ToArrayBuffer(keyString);
  return await window.crypto.subtle.importKey(
    'raw',
    keyBuffer,
    'AES-GCM',
    true,
    ['encrypt', 'decrypt']
  );
}

// Encrypt message
export async function encryptMessage(message, key) {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encodedMessage = new TextEncoder().encode(message);

  const encryptedData = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    encodedMessage
  );

  return {
    encrypted: arrayBufferToBase64(encryptedData),
    iv: arrayBufferToBase64(iv)
  };
}

// Decrypt message
export async function decryptMessage(encryptedData, key, iv) {
  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: base64ToArrayBuffer(iv)
    },
    key,
    base64ToArrayBuffer(encryptedData)
  );

  return new TextDecoder().decode(decrypted);
}

// Helper functions
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
} 