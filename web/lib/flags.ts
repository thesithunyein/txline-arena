// Country ISO 3166-1 alpha-2 codes for flagcdn.com images.
// Windows Chrome often fails to render flag emojis — use PNG flags instead.

const CODE_MAP: Record<string, string> = {
  Brazil: 'br',
  Norway: 'no',
  Mexico: 'mx',
  England: 'gb-eng',
  Portugal: 'pt',
  Spain: 'es',
  USA: 'us',
  'United States': 'us',
  Belgium: 'be',
  Argentina: 'ar',
  Egypt: 'eg',
  Switzerland: 'ch',
  Colombia: 'co',
  France: 'fr',
  Germany: 'de',
  Morocco: 'ma',
  Japan: 'jp',
  Netherlands: 'nl',
  Italy: 'it',
  Croatia: 'hr',
  Uruguay: 'uy',
  Australia: 'au',
  Vietnam: 'vn',
  Myanmar: 'mm',
  'South Korea': 'kr',
  Korea: 'kr',
  Ghana: 'gh',
  Senegal: 'sn',
  Tunisia: 'tn',
  Canada: 'ca',
  Poland: 'pl',
  Denmark: 'dk',
  Serbia: 'rs',
  Wales: 'gb-wls',
  Iran: 'ir',
  'Saudi Arabia': 'sa',
  Saudi: 'sa',
  Ecuador: 'ec',
  Qatar: 'qa',
  Cameroon: 'cm',
  'Costa Rica': 'cr',
  Costa: 'cr',
};

export function getCountryCode(teamName: string): string | null {
  if (!teamName) return null;
  const key = teamName.trim();
  if (CODE_MAP[key]) return CODE_MAP[key];
  for (const [k, v] of Object.entries(CODE_MAP)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return null;
}

/** @deprecated Prefer <Flag /> component — emoji flags break on Windows Chrome */
export function getFlag(teamName: string): string {
  const code = getCountryCode(teamName);
  if (!code) return '🏳️';
  // Keep emoji fallback for any leftover string usages
  const emoji: Record<string, string> = {
    br: '🇧🇷', no: '🇳🇴', mx: '🇲🇽', 'gb-eng': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', pt: '🇵🇹', es: '🇪🇸',
    us: '🇺🇸', be: '🇧🇪', ar: '🇦🇷', eg: '🇪🇬', ch: '🇨🇭', co: '🇨🇴',
    fr: '🇫🇷', de: '🇩🇪', ma: '🇲🇦', jp: '🇯🇵', nl: '🇳🇱', it: '🇮🇹',
    hr: '🇭🇷', uy: '🇺🇾', au: '🇦🇺', vn: '🇻🇳', mm: '🇲🇲', kr: '🇰🇷',
    gh: '🇬🇭', sn: '🇸🇳', tn: '🇹🇳', ca: '🇨🇦', pl: '🇵🇱', dk: '🇩🇰',
    rs: '🇷🇸', 'gb-wls': '🏴󠁧󠁢󠁷󠁬󠁳󠁿', ir: '🇮🇷', sa: '🇸🇦', ec: '🇪🇨', qa: '🇶🇦',
    cm: '🇨🇲', cr: '🇨🇷',
  };
  return emoji[code] || '🏳️';
}

export function getMatchFlags(home: string, away: string): { home: string; away: string } {
  return { home: getFlag(home), away: getFlag(away) };
}

export function flagImageUrl(teamName: string, width = 20): string | null {
  const code = getCountryCode(teamName);
  if (!code) return null;
  return `https://flagcdn.com/w${width}/${code}.png`;
}
