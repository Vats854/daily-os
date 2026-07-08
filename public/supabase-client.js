import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

let configPromise = null;
let clientPromise = null;

export async function getAppConfig() {
  if (!configPromise) {
    configPromise = fetch("/api/config", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Config unavailable");
        return response.json();
      })
      .catch(() => ({
        ok: false,
        supabase: { enabled: false, url: "", anonKey: "" },
        auth: { provider: "github" }
      }));
  }
  return configPromise;
}

export async function getSupabaseClient() {
  const config = await getAppConfig();
  if (!config.supabase?.enabled) return null;

  if (!clientPromise) {
    clientPromise = Promise.resolve(createClient(config.supabase.url, config.supabase.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }));
  }

  return clientPromise;
}

export async function getAuthSession() {
  const supabase = await getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session || null;
}

export async function signInWithGithub() {
  const supabase = await getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: window.location.origin
    }
  });
  if (error) throw error;
}

export async function signOut() {
  const supabase = await getSupabaseClient();
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function onAuthStateChange(handler) {
  const supabase = await getSupabaseClient();
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => handler(session || null));
  return () => data.subscription.unsubscribe();
}

export async function loadCloudState() {
  const supabase = await getSupabaseClient();
  if (!supabase) return null;

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const userId = sessionData.session?.user?.id;
  if (!userId) return null;

  const { data, error } = await supabase
    .from("daily_os_states")
    .select("state, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

export async function saveCloudState(state) {
  const supabase = await getSupabaseClient();
  if (!supabase) return { skipped: true };

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const userId = sessionData.session?.user?.id;
  if (!userId) return { skipped: true };

  const { error } = await supabase
    .from("daily_os_states")
    .upsert({
      user_id: userId,
      state,
      updated_at: new Date().toISOString()
    }, {
      onConflict: "user_id"
    });

  if (error) throw error;
  return { skipped: false };
}
