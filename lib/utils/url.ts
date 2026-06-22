/**
 * UTF-8 Safe Base64 Encoding & Decoding for URL Parameters
 */

export interface MeetingParams {
  channel: string;
  scenario: string;
  product: string;
  partner: string;
}

export function encodeMeetingParams(params: MeetingParams): string {
  try {
    const jsonStr = JSON.stringify(params);
    const bytes = new TextEncoder().encode(jsonStr);
    const binString = String.fromCodePoint(...bytes);
    const b64 = btoa(binString);
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (e) {
    console.error('Failed to encode meeting params:', e);
    const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(params))));
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
}

export function decodeMeetingParams(p: string): MeetingParams | null {
  try {
    let b64 = p.replace(/-/g, '+').replace(/_/g, '/').replace(/ /g, '+');
    while (b64.length % 4) {
      b64 += '=';
    }
    const binString = atob(b64);
    const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0)!);
    const jsonStr = new TextDecoder().decode(bytes);
    return JSON.parse(jsonStr);
  } catch (e) {
    try {
      let b64 = p.replace(/-/g, '+').replace(/_/g, '/').replace(/ /g, '+');
      while (b64.length % 4) {
        b64 += '=';
      }
      const jsonStr = decodeURIComponent(escape(atob(b64)));
      return JSON.parse(jsonStr);
    } catch (err) {
      console.error('Failed to decode meeting params:', err);
      return null;
    }
  }
}
