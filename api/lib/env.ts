import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

function optional(name: string): string | undefined {
  return process.env[name] || undefined;
}

export const env = {
  appId: required("APP_ID"),
  appSecret: required("APP_SECRET"),
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: required("DATABASE_URL"),
  // AI configuration
  moonshotApiKey: optional("MOONSHOT_API_KEY"),
  kimiAuthUrl: process.env.KIMI_AUTH_URL || process.env.VITE_KIMI_AUTH_URL || "https://kimi-auth.moonshot.cn",
  aiModel: process.env.AI_MODEL || "kimi-k2.5",
  visionModel: process.env.VISION_MODEL || "moonshot-v1-8k-vision-preview",
};
