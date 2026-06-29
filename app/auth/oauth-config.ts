export const oauthProviders = {
  google: process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED === "true",
  microsoft: process.env.NEXT_PUBLIC_AUTH_MICROSOFT_ENABLED === "true",
} as const;
