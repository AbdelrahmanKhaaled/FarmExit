const ARABIC_INDIC_ZERO = 0x0660;
const EXTENDED_ARABIC_INDIC_ZERO = 0x06f0;
const EGYPT_MOBILE = /^\+201[0125]\d{8}$/;

function toAsciiDigits(input: string): string {
  return input.replace(/[\u0660-\u0669\u06f0-\u06f9]/g, (ch) => {
    const code = ch.charCodeAt(0);
    return String(code >= EXTENDED_ARABIC_INDIC_ZERO ? code - EXTENDED_ARABIC_INDIC_ZERO : code - ARABIC_INDIC_ZERO);
  });
}

/** Mirrors api phone-number normalization for client-side hints (server validates again). */
export function normalizeMobile(input: string): string | null {
  const compact = toAsciiDigits(input.trim()).replace(/[\s().-]/g, '');
  if (!/^\+?\d+$/.test(compact)) return null;

  let e164: string;
  if (compact.startsWith('+')) e164 = compact;
  else if (compact.startsWith('00')) e164 = `+${compact.slice(2)}`;
  else if (compact.startsWith('0')) e164 = `+20${compact.slice(1)}`;
  else if (compact.startsWith('20') && compact.length === 12) e164 = `+${compact}`;
  else e164 = `+20${compact}`;

  return EGYPT_MOBILE.test(e164) ? e164 : null;
}

export function isValidEgyptianMobile(mobileE164: string): boolean {
  return EGYPT_MOBILE.test(mobileE164);
}

/** Display national part for OTP step (e.g. 01012345678). */
export function formatMobileDisplay(mobileE164: string): string {
  if (mobileE164.startsWith('+20')) return `0${mobileE164.slice(3)}`;
  return mobileE164;
}
