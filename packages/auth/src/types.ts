export interface BasicAuthConfig {
  credentials: Record<string, string>;
  realm?: string;
}

export interface BearerAuthConfig {
  tokens: string[];
  realm?: string;
}

export interface ApiKeyAuthConfig {
  apiKeys: string[];
  header?: string;
}
