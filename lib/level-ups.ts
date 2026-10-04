/**
 * Level-up records. Stars are written from many places (task approval in SQL,
 * badges, family quests, weekly responsibility), so instead of hooking each one
 * we reconcile lazily: whenever a child's level is shown, any level reached but
 * not yet recorded gets a child_level_ups row (and with it a pending gift).
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { newlyReachedLevels } from "@/lib/levels";

export async function syncLevelUps(childId: string, lifetimeStars: number): Promise<number[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("child_level_ups")
    .select("level")
    .eq("child_id", childId)
    .order("level", { ascending: false })
    .limit(1);
  if (error) throw error;
  const levels = newlyReachedLevels(data?.[0]?.level ?? 1, lifetimeStars);
  if (!levels.length) return [];
  const { error: insErr } = await db
    .from("child_level_ups")
    .upsert(levels.map((level) => ({ child_id: childId, level })), { onConflict: "child_id,level", ignoreDuplicates: true });
  if (insErr) throw insErr;
  return levels;
}

export interface PendingLevelGift {
  id: string;
  child_id: string;
  level: number;
  reached_at: string;
}

/** Level-ups whose gift has not been given yet, oldest first. */
export async function pendingLevelGifts(childIds: string[]): Promise<PendingLevelGift[]> {
  if (!childIds.length) return [];
  const db = createAdminClient();
  const { data, error } = await db
    .from("child_level_ups")
    .select("id, child_id, level, reached_at")
    .in("child_id", childIds)
    .is("gifted_at", null)
    .order("reached_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
