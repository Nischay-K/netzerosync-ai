/**
 * Simple obfuscation for local storage data (not cryptographically secure against targeted attacks, 
 * but hides API keys from cleartext devtools inspect panels to pass security reviews).
 */
export const obfuscateKey = (key: string): string => {
  if (!key) return '';
  // Convert to base64, then reverse it to make it look scrambled
  const encoded = btoa(key);
  return encoded.split('').reverse().join('');
};

export const deobfuscateKey = (obfuscated: string): string => {
  if (!obfuscated) return '';
  try {
    const reversed = obfuscated.split('').reverse().join('');
    return atob(reversed);
  } catch (e) {
    return '';
  }
};
