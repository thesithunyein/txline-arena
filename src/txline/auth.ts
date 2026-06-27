import axios from 'axios';
import nacl from 'tweetnacl';
import { Buffer } from 'buffer';

const TXLINE_BASE_URL = process.env.TXLINE_BASE_URL || 'https://txline.txodds.com';

let cachedJwt: string | null = null;
let cachedApiToken: string | null = null;
let jwtExpiry: number = 0;

export async function getGuestJwt(): Promise<string> {
  if (cachedJwt && Date.now() < jwtExpiry) {
    return cachedJwt;
  }

  const response = await axios.post(`${TXLINE_BASE_URL}/auth/guest/start`);
  cachedJwt = response.data.token as string;
  jwtExpiry = Date.now() + 50 * 60 * 1000; // 50 min cache (assume 60 min expiry)

  return cachedJwt;
}

export async function activateApiToken(
  txSig: string,
  walletSecretKey: Uint8Array,
  selectedLeagues: number[] = []
): Promise<string> {
  if (cachedApiToken) {
    return cachedApiToken;
  }

  const jwt = await getGuestJwt() as string;

  const messageString = `${txSig}:${selectedLeagues.join(',')}:${jwt}`;
  const message = new TextEncoder().encode(messageString);
  const signatureBytes = nacl.sign.detached(message, walletSecretKey);
  const walletSignature = Buffer.from(signatureBytes).toString('base64');

  const activationResponse = await axios.post(
    `${TXLINE_BASE_URL}/api/token/activate`,
    {
      txSig,
      walletSignature,
      leagues: selectedLeagues,
    },
    { headers: { Authorization: `Bearer ${jwt}` } }
  );

  cachedApiToken = (activationResponse.data.token || activationResponse.data) as string;
  return cachedApiToken;
}

export function setApiToken(token: string): void {
  cachedApiToken = token;
}

export function getApiToken(): string | null {
  return cachedApiToken;
}

export function clearAuthCache(): void {
  cachedJwt = null;
  cachedApiToken = null;
  jwtExpiry = 0;
}
