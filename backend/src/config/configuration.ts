export interface OllamaConfig {
  baseUrl: string;
  model: string;
  timeoutMs: number;
}

export interface AiConfig {
  provider: 'ollama' | 'groq' | 'openai';
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutMs: number;
}

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  cookieSecure: boolean;
  pin: string;
  quickAccess: boolean;
}

export interface AppConfig {
  port: number;
  databaseUrl: string;
  ollama: OllamaConfig;
  ai: AiConfig;
  auth: AuthConfig;
}

export const configuration = (): AppConfig => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/mst_tengapal?schema=public',
  ollama: {
    baseUrl: (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(
      /\/+$/,
      '',
    ),
    model: process.env.OLLAMA_MODEL || 'qwen3:4b',
    timeoutMs: parseInt(process.env.OLLAMA_TIMEOUT_MS ?? '30000', 10),
  },
  ai: {
    provider:
      (process.env.AI_PROVIDER as 'ollama' | 'groq' | 'openai') ||
      (process.env.GROQ_API_KEY
        ? 'groq'
        : process.env.OPENAI_API_KEY
          ? 'openai'
          : 'ollama'),
    apiKey:
      process.env.GROQ_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.AI_API_KEY ||
      '',
    baseUrl:
      process.env.AI_BASE_URL ||
      (process.env.GROQ_API_KEY
        ? 'https://api.groq.com/openai/v1'
        : (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(
            /\/+$/,
            '',
          )),
    model:
      process.env.AI_MODEL ||
      (process.env.GROQ_API_KEY
        ? 'qwen/qwen3.8-27b'
        : process.env.OLLAMA_MODEL || 'qwen3:4b'),
    timeoutMs: parseInt(
      process.env.AI_TIMEOUT_MS ?? process.env.OLLAMA_TIMEOUT_MS ?? '30000',
      10,
    ),
  },
  auth: {
    jwtSecret:
      process.env.JWT_SECRET ||
      'mst-tengapal-dev-secret-do-not-use-in-prod-2026',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '90d',
    cookieSecure:
      process.env.COOKIE_SECURE === 'true' ||
      process.env.NODE_ENV === 'production',
    pin: process.env.APP_PIN || '1234',
    quickAccess: process.env.QUICK_ACCESS_ENABLED !== 'false',
  },
});

export default configuration;
