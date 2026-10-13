const ARABIC_INDIC_ZERO = 0x0660;
const EXTENDED_ARABIC_INDIC_ZERO = 0x06f0;

/** Egyptian mobile numbers: +20 1[0125] followed by 8 digits. */
const EGYPT_MOBILE = /^\+201[0125]\d{8}$/;
/** Generic E.164 for other countries: + and 8..15 digits, no leading zero in the country code. */
const E164 = /^\+[1-9]\d{7,14}$/;

function toAsciiDigits(input: string): string {
  return input.replace(/[\u0660-\u0669\u06f0-\u06f9]/g, (ch) => {
    const code = ch.charCodeAt(0);
    return String(code >= EXTENDED_ARABIC_INDIC_ZERO ? code - EXTENDED_ARABIC_INDIC_ZERO : code - ARABIC_INDIC_ZERO);
  });
}

/**
 * Normalises a user-entered mobile number to E.164. Egypt (+20) is the default country:
 * `01012345678`, `1012345678`, `+20 101 234 5678`, `0020 10 1234 5678` and Arabic-Indic digits all become
 * `+201012345678`. Numbers with another explicit `+` country code are accepted as generic E.164.
 * Returns `null` when the input is not a valid mobile number.
 */
export function normalizeMobile(input: string): string | null {
  const compact = toAsciiDigits(input.trim()).replace(/[\s().-]/g, '');
  if (!/^\+?\d+$/.test(compact)) return null;

  let e164: string;
  if (compact.startsWith('+')) e164 = compact;
  else if (compact.startsWith('00')) e164 = `+${compact.slice(2)}`;
  else if (compact.startsWith('0')) e164 = `+20${compact.slice(1)}`;
  else if (compact.startsWith('20') && compact.length === 12) e164 = `+${compact}`;
  else e164 = `+20${compact}`;

  if (e164.startsWith('+20')) return EGYPT_MOBILE.test(e164) ? e164 : null;
  return E164.test(e164) ? e164 : null;
}
