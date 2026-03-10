export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // Supabase
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? "",
  supabaseDbUrl: process.env.SUPABASE_DB_URL ?? "",
  // S3 (for independent storage)
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
  s3Region: process.env.S3_REGION ?? "us-east-1",
  s3Bucket: process.env.S3_BUCKET ?? "",
  s3Endpoint: process.env.S3_ENDPOINT ?? "",
  // App
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
};

export function validateEnv() {
  const isProd = process.env.NODE_ENV === "production";
  const required = [
    "DATABASE_URL",
    "JWT_SECRET",
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    const msg = `Missing required environment variables: ${missing.join(", ")}`;
    if (isProd) {
      throw new Error(msg);
    } else {
      console.warn(`[Env] WARNING: ${msg}`);
    }
  }
}
