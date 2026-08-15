import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

type Block = {
  id: string;
  title?: string;
  date?: string;
  endDate?: string;
  start?: string;
  end?: string;
  recurrence?: "none" | "daily" | "weekdays" | "weekly";
  reminderMinutes?: number | null;
  endReminderMinutes?: number | null;
};

const url = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const publicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
const privateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
const subject = Deno.env.get("VAPID_SUBJECT") || "mailto:daily-os@example.com";
const appUrl = Deno.env.get("APP_URL") || "/";
const supabase = createClient(url, serviceKey);
webpush.setVapidDetails(subject, publicKey, privateKey);

function zonedParts(date: Date, timeZone: string) {
  const values = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(date).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return { iso: `${values.year}-${values.month}-${values.day}`, time: `${values.hour}:${values.minute}` };
}

function occurs(block: Block, iso: string) {
  const base = block.date || iso;
  if (iso < base) return false;
  if (!block.recurrence || block.recurrence === "none") return iso >= base && iso <= (block.endDate || base);
  if (block.recurrence === "daily") return true;
  const weekday = new Date(`${iso}T12:00:00Z`).getUTCDay();
  if (block.recurrence === "weekdays") return weekday >= 1 && weekday <= 5;
  return block.recurrence === "weekly" && weekday === new Date(`${base}T12:00:00Z`).getUTCDay();
}

function dueNotifications(block: Block, now: Date, timeZone: string) {
  const zoned = zonedParts(now, timeZone);
  if (!block.id || !block.start || !block.end || !occurs(block, zoned.iso)) return [];
  const date = zoned.iso;
  const candidates = [
    { kind: "start", time: block.start, minutes: block.reminderMinutes, body: Number(block.reminderMinutes) === 0 ? `Пора начать · до ${block.end}` : `Начало в ${block.start} · до ${block.end}` },
    { kind: "end", time: block.end, minutes: block.endReminderMinutes, body: Number(block.endReminderMinutes) === 0 ? "Блок завершён · зафиксируй результат" : `Завершение в ${block.end}` }
  ];
  return candidates.flatMap((item) => {
    if (item.minutes === null || item.minutes === undefined) return [];
    const [hour, minute] = item.time.split(":").map(Number);
    const targetMinutes = hour * 60 + minute - Number(item.minutes);
    const currentMinutes = Number(zoned.time.slice(0, 2)) * 60 + Number(zoned.time.slice(3));
    if (targetMinutes !== currentMinutes) return [];
    return [{ blockId: block.id, key: `${block.id}-${date}-${item.kind}-${item.time}-${item.minutes}`, title: block.title || "Блок календаря", body: item.body }];
  });
}

Deno.serve(async (request) => {
  const cronSecret = Deno.env.get("CALENDAR_PUSH_CRON_SECRET") || "";
  const suppliedSecret = new URL(request.url).searchParams.get("token") || "";
  if (!cronSecret || suppliedSecret !== cronSecret) {
    return new Response("Unauthorized", { status: 401 });
  }
  const now = new Date();
  const { data: states, error } = await supabase.from("daily_os_states").select("user_id,state");
  if (error) return new Response(error.message, { status: 500 });
  let sent = 0;
  for (const row of states || []) {
    const blocks: Block[] = row.state?.dailyPlan?.timeBlocks || [];
    const timeZone = row.state?.settings?.notificationTimeZone || "UTC";
    const notices = blocks.flatMap((block) => dueNotifications(block, now, timeZone));
    if (!notices.length) continue;
    const { data: subscriptions } = await supabase.from("push_subscriptions").select("id,subscription").eq("user_id", row.user_id);
    for (const notice of notices) {
      const inserted = await supabase.from("calendar_notification_deliveries").insert({ delivery_key: notice.key, user_id: row.user_id });
      if (inserted.error) continue;
      for (const subscription of subscriptions || []) {
        try {
          await webpush.sendNotification(subscription.subscription, JSON.stringify({
            ...notice,
            tag: notice.key,
            url: `${appUrl}/?view=calendar&block=${encodeURIComponent(notice.blockId)}`
          }));
          sent += 1;
        } catch (pushError) {
          if ([404, 410].includes(Number((pushError as { statusCode?: number }).statusCode))) {
            await supabase.from("push_subscriptions").delete().eq("id", subscription.id);
          }
        }
      }
    }
  }
  return Response.json({ ok: true, sent });
});
