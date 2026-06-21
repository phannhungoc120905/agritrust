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
    return btoa(binString);
  } catch (e) {
    console.error('Failed to encode meeting params:', e);
    return btoa(unescape(encodeURIComponent(JSON.stringify(params))));
  }
}

export function decodeMeetingParams(p: string): MeetingParams | null {
  try {
    const binString = atob(p);
    const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0)!);
    const jsonStr = new TextDecoder().decode(bytes);
    return JSON.parse(jsonStr);
  } catch (e) {
    try {
      const jsonStr = decodeURIComponent(escape(atob(p)));
      return JSON.parse(jsonStr);
    } catch (err) {
      console.error('Failed to decode meeting params:', err);
      return null;
    }
  }
}
