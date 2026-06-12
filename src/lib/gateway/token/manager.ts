import { QQ_AUTH_URL } from "../constants";

export async function fetchAccessToken(
  appId: string,
  secret: string,
): Promise<{ accessToken: string; expiresIn: number }> {
  const res = await fetch(QQ_AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ appId, clientSecret: secret }),
  });
  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number | string;
  };
  if (!data.access_token) {
    throw new Error(`invalid credentials: ${JSON.stringify(data)}`);
  }
  const expiresIn =
    typeof data.expires_in === "string"
      ? parseInt(data.expires_in, 10)
      : (data.expires_in ?? 7200);
  return { accessToken: data.access_token, expiresIn };
}

export class TokenManager {
  private accessToken = "";
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly appId: string,
    private readonly secret: string,
    private readonly onToken?: (token: string) => void,
  ) {}

  token(): string {
    return this.accessToken;
  }

  setInitialToken(token: string, expiresIn: number): void {
    this.accessToken = token;
    this.onToken?.(token);
    this.scheduleRefresh(expiresIn);
  }

  private scheduleRefresh(expiresIn: number): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    let ms = Math.floor(expiresIn * 0.8 * 1000);
    if (ms < 60_000) ms = 60_000;
    this.refreshTimer = setTimeout(() => void this.refresh(), ms);
  }

  private async refresh(): Promise<void> {
    try {
      const { accessToken, expiresIn } = await fetchAccessToken(
        this.appId,
        this.secret,
      );
      this.accessToken = accessToken;
      this.onToken?.(accessToken);
      this.scheduleRefresh(expiresIn);
    } catch (err) {
      console.error(`[auth] bot=${this.appId} refresh error:`, err);
      this.refreshTimer = setTimeout(() => void this.refresh(), 30_000);
    }
  }

  dispose(): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
  }
}
