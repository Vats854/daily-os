export default function handler(_request, response) {
  const supabaseUrl = process.env.SUPABASE_URL || "";
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "";

  response.status(200).json({
    ok: true,
    appUrl: process.env.APP_URL || "",
    supabase: {
      enabled: Boolean(supabaseUrl && supabaseAnonKey),
      url: supabaseUrl,
      anonKey: supabaseAnonKey
    },
    auth: {
      provider: "github"
    }
  });
}
