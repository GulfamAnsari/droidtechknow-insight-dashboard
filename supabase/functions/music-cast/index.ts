// Edge function: proxies music-cast reads/writes after verifying the caller's
// session against the app's existing auth endpoint. This lets us lock down the
// underlying tables (no direct client access) while preserving the feature.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.83.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-app-auth-token, x-app-user-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function verifyUser(req: Request): Promise<string | null> {
  const token = req.headers.get("x-app-auth-token");
  const claimedId = req.headers.get("x-app-user-id");
  if (!token || !claimedId) return null;
  try {
    const res = await fetch(
      "https://droidtechknow.com/admin/api/auth/google-auth.php?route=check-auth",
      {
        headers: {
          "X-Auth-Token": token,
          "Id": claimedId,
        },
      },
    );
    if (!res.ok) {
      console.warn("check-auth non-ok", res.status);
      return null;
    }
    const data = await res.json();
    if (data?.authenticated && String(data?.data?.id) === String(claimedId)) {
      return String(claimedId);
    }
    console.warn("check-auth mismatch", { authenticated: data?.authenticated, id: data?.data?.id, claimedId });
  } catch (e) {
    console.warn("check-auth error", e);
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const userId = await verifyUser(req);
    if (!userId) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, payload } = await req.json();
    let result: unknown = null;

    switch (action) {
      case "list_devices": {
        const cutoff = new Date(Date.now() - 60_000).toISOString();
        const { data, error } = await supabase
          .from("music_cast_devices")
          .select("device_id, device_name, user_agent, last_seen")
          .eq("user_id", userId)
          .gte("last_seen", cutoff);
        if (error) throw error;
        result = data;
        break;
      }
      case "upsert_device": {
        const { device_id, device_name, user_agent } = payload ?? {};
        if (!device_id || !device_name) throw new Error("missing device fields");
        const { error } = await supabase.from("music_cast_devices").upsert(
          {
            user_id: userId,
            device_id,
            device_name,
            user_agent: user_agent ?? null,
            last_seen: new Date().toISOString(),
          },
          { onConflict: "user_id,device_id" },
        );
        if (error) throw error;
        result = { ok: true };
        break;
      }
      case "delete_device": {
        const { device_id } = payload ?? {};
        if (!device_id) throw new Error("missing device_id");
        const { error } = await supabase
          .from("music_cast_devices")
          .delete()
          .eq("user_id", userId)
          .eq("device_id", device_id);
        if (error) throw error;
        result = { ok: true };
        break;
      }
      case "get_state": {
        const { data, error } = await supabase
          .from("music_cast_state")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();
        if (error) throw error;
        result = data;
        break;
      }
      case "upsert_state": {
        const patch = { ...(payload ?? {}), user_id: userId, updated_at: new Date().toISOString() };
        const { error } = await supabase
          .from("music_cast_state")
          .upsert(patch, { onConflict: "user_id" });
        if (error) throw error;
        result = { ok: true };
        break;
      }
      case "update_state": {
        const patch = { ...(payload ?? {}), updated_at: new Date().toISOString() };
        const { error } = await supabase
          .from("music_cast_state")
          .update(patch)
          .eq("user_id", userId);
        if (error) throw error;
        result = { ok: true };
        break;
      }
      default:
        return new Response(JSON.stringify({ error: "unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify({ data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("music-cast error", e);
    return new Response(JSON.stringify({ error: (e as Error).message ?? "server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
