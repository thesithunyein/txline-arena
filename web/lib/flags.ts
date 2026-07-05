const FLAG_MAP: Record<string, string> = {
  Brazil: '🇧🇷',
  Norway: '🇳🇴',
  Mexico: '🇲🇽',
  England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  Portugal: '🇵🇹',
  Spain: '🇪🇸',
  USA: '🇺🇸',
  'United States': '🇺🇸',
  Belgium: '🇧🇪',
  Argentina: '🇦🇷',
  Egypt: '🇪🇬',
  Switzerland: '🇨🇭',
  Colombia: '🇨🇴',
  France: '🇫🇷',
  Germany: '🇩🇪',
  Morocco: '🇲🇦',
  Japan: '🇯🇵',
  Netherlands: '🇳🇱',
  Italy: '🇮🇹',
  Croatia: '🇭🇷',
  Uruguay: '🇺🇾',
  Australia: '🇦🇺',
  Vietnam: '🇻🇳',
  Myanmar: '🇲🇲',
  South: '🇰🇷',
  Korea: '🇰🇷',
  Ghana: '🇬🇭',
  Senegal: '🇸🇳',
  Tunisia: '🇹🇳',
  Canada: '🇨🇦',
  Poland: '🇵🇱',
  Denmark: '🇩🇰',
  Serbia: '🇷🇸',
  Wales: '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  Iran: '🇮🇷',
  Saudi: '🇸🇦',
 Arabia: '🇸🇦',
  Ecuador: '🇪🇨',
  Qatar: '🇶🇦',
  Cameroon: '🇨🇲',
  Costa: '🇨🇷',
 Rica: '🇨🇷',
};

export function getFlag(teamName: string): string {
  if (!teamName) return '🏳️';
  const key = teamName.trim();
  if (FLAG_MAP[key]) return FLAG_MAP[key];
  for (const [k, v] of Object.entries(FLAG_MAP)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return '🏳️';
}

export function getMatchFlags(home: string, away: string): { home: string; away: string } {
  return { home: getFlag(home), away: getFlag(away) };
}
