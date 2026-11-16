// Secure token generator & decrypter for Shop Terminal activation
// Uses Base64URL + salted obfuscation for URL safety and multi-tenant security

const SECRET_SALT = 'PrintDrop_SecureTerminal_Key_2026_#9871';

export function encodeShopToken(shopSlug: string): string {
  try {
    const payload = JSON.stringify({
      slug: shopSlug,
      iat: Date.now(),
      v: 1,
    });
    // XOR with secret salt
    let encrypted = '';
    for (let i = 0; i < payload.length; i++) {
      const charCode = payload.charCodeAt(i) ^ SECRET_SALT.charCodeAt(i % SECRET_SALT.length);
      encrypted += String.fromCharCode(charCode);
    }
    // Encode to base64url
    const base64 = btoa(encrypted)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    return 't_' + base64;
  } catch {
    return '';
  }
}

export function decodeShopToken(token: string): string | null {
  try {
    if (!token) return null;
    let clean = token.trim();
    if (clean.startsWith('t_')) {
      clean = clean.slice(2);
    }
    // Restore base64
    let base64 = clean.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const decryptedRaw = atob(base64);
    let payloadStr = '';
    for (let i = 0; i < decryptedRaw.length; i++) {
      const charCode = decryptedRaw.charCodeAt(i) ^ SECRET_SALT.charCodeAt(i % SECRET_SALT.length);
      payloadStr += String.fromCharCode(charCode);
    }
    const parsed = JSON.parse(payloadStr);
    if (parsed && typeof parsed.slug === 'string') {
      return parsed.slug;
    }
    return null;
  } catch {
    return null;
  }
}
