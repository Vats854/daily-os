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
  const config = await getAppConfig();
  const redirectTo = config.appUrl || window.location.origin;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo
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
    .select("state, updated_at, revision")
    .eq("user_id", userId)
    .maybeSingle();

  if (error && /revision|42703|PGRST204/i.test(`${error.code || ""} ${error.message || ""}`)) {
    const legacy = await supabase.from("daily_os_states").select("state, updated_at").eq("user_id", userId).maybeSingle();
    if (legacy.error) throw legacy.error;
    return legacy.data ? { ...legacy.data, revision: null, legacy: true } : null;
  }
  if (error) throw error;
  return data || null;
}

function revisionFunctionUnavailable(error) {
  const text = `${error?.code || ""} ${error?.message || ""}`;
  return /PGRST202|could not find.*save_daily_os_state|function .*save_daily_os_state.* does not exist|schema cache/i.test(text);
}

export async function saveCloudState(state, expectedRevision = null) {
  const supabase = await getSupabaseClient();
  if (!supabase) return { skipped: true };

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const userId = sessionData.session?.user?.id;
  if (!userId) return { skipped: true };

  const rpcResult = await supabase.rpc("save_daily_os_state", {
    p_expected_revision: expectedRevision ?? 0,
    p_next_state: state
  });
  if (!rpcResult.error) {
    const row = Array.isArray(rpcResult.data) ? rpcResult.data[0] : rpcResult.data;
    return { skipped: false, legacy: false, revision: Number(row?.revision || 0), updatedAt: row?.updated_at || null };
  }
  if (!revisionFunctionUnavailable(rpcResult.error)) throw rpcResult.error;
  throw new Error("SYNC_UPGRADE_REQUIRED: save_daily_os_state RPC is unavailable");
}

function contentSchemaUnavailable(error) {
  const text = `${error?.code || ""} ${error?.message || ""}`;
  return /PGRST205|42P01|relation .* does not exist|schema cache/i.test(text);
}

async function getSignedInClient() {
  const supabase = await getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const userId = data.session?.user?.id;
  return userId ? { supabase, userId } : null;
}

export async function loadCloudNotes() {
  const auth = await getSignedInClient();
  if (!auth) return { available: false, folders: [], notes: [] };

  const [foldersResult, notesResult] = await Promise.all([
    auth.supabase
      .from("note_folders")
      .select("id, parent_id, title, icon, tone, position, created_at, updated_at")
      .order("position", { ascending: true })
      .order("created_at", { ascending: true }),
    auth.supabase
      .from("notes")
      .select("id, folder_id, title, body, tags, source_type, source_id, created_at, updated_at")
      .is("archived_at", null)
      .order("updated_at", { ascending: false })
  ]);

  const error = foldersResult.error || notesResult.error;
  if (error) {
    if (contentSchemaUnavailable(error)) return { available: false, folders: [], notes: [] };
    throw error;
  }

  return {
    available: true,
    folders: (foldersResult.data || []).map((folder) => ({
      id: folder.id,
      parentId: folder.parent_id || "",
      title: folder.title,
      icon: folder.icon,
      tone: folder.tone,
      position: folder.position,
      createdAt: folder.created_at,
      updatedAt: folder.updated_at
    })),
    notes: (notesResult.data || []).map((note) => ({
      id: note.id,
      folderId: note.folder_id || "",
      title: note.title,
      text: note.body,
      tags: note.tags || [],
      type: note.source_type || "manual",
      sourceId: note.source_id || "",
      createdAt: note.created_at,
      updatedAt: note.updated_at
    }))
  };
}

export async function saveCloudNotes(folders, notes) {
  const auth = await getSignedInClient();
  if (!auth) return { available: false, skipped: true };
  const now = new Date().toISOString();
  const folderRows = folders.map((folder, position) => ({
    id: folder.id,
    user_id: auth.userId,
    parent_id: folder.parentId || null,
    title: folder.title,
    icon: folder.icon || "notebook-pen",
    tone: folder.tone || "blue",
    position: Number.isFinite(Number(folder.position)) ? Number(folder.position) : position,
    updated_at: folder.updatedAt || now
  }));
  const noteRows = notes.map((note) => ({
    id: note.id,
    user_id: auth.userId,
    folder_id: note.folderId || null,
    title: note.title || "Без названия",
    body: note.text || "",
    tags: Array.isArray(note.tags) ? note.tags : [],
    source_type: note.type || "manual",
    source_id: note.sourceId || null,
    created_at: note.createdAt || now,
    updated_at: note.updatedAt || now
  }));

  const upsertFolders = folderRows.length
    ? await auth.supabase.from("note_folders").upsert(folderRows, { onConflict: "user_id,id" })
    : { error: null };
  if (upsertFolders.error) {
    if (contentSchemaUnavailable(upsertFolders.error)) return { available: false, skipped: true };
    throw upsertFolders.error;
  }

  const upsertNotes = noteRows.length
    ? await auth.supabase.from("notes").upsert(noteRows, { onConflict: "user_id,id" })
    : { error: null };
  if (upsertNotes.error) {
    if (contentSchemaUnavailable(upsertNotes.error)) return { available: false, skipped: true };
    throw upsertNotes.error;
  }

  const [remoteFolders, remoteNotes] = await Promise.all([
    auth.supabase.from("note_folders").select("id"),
    auth.supabase.from("notes").select("id").is("archived_at", null)
  ]);
  const readError = remoteFolders.error || remoteNotes.error;
  if (readError) throw readError;

  const folderIds = new Set(folderRows.map((item) => item.id));
  const noteIds = new Set(noteRows.map((item) => item.id));
  const staleNoteIds = (remoteNotes.data || []).map((item) => item.id).filter((id) => !noteIds.has(id));
  const staleFolderIds = (remoteFolders.data || []).map((item) => item.id).filter((id) => !folderIds.has(id));

  if (staleNoteIds.length) {
    const { error } = await auth.supabase.from("notes").delete().in("id", staleNoteIds);
    if (error) throw error;
  }
  if (staleFolderIds.length) {
    const { error } = await auth.supabase.from("note_folders").delete().in("id", staleFolderIds);
    if (error) throw error;
  }

  return { available: true, skipped: false };
}
