"use client";

import { useState, useEffect, useCallback } from "react";
import type { UserProfile } from "@/lib/ai/types";

// ── Types ──────────────────────────────────────────────────────────────────

export type MemberType = "male" | "female" | "child";

export interface FamilyMember {
  id: string;           // e.g. "me-1716800000000"
  type: MemberType;
  name?: string;
  // child-only
  childAge?: "2-5" | "6-12" | "13+";
  // profile answers (same shape as UserProfile for adults; simplified for kids)
  profile: Partial<UserProfile> & { [key: string]: string | undefined };
}

// ── Storage keys ───────────────────────────────────────────────────────────

const KEY_PROFILES = "bh_profiles";
const KEY_ACTIVE   = "bh_active_profile";
const KEY_LEGACY   = "bh_profile";        // single-profile fallback

// ── Helpers ────────────────────────────────────────────────────────────────

function readProfiles(): FamilyMember[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY_PROFILES);
    if (raw) return JSON.parse(raw) as FamilyMember[];
  } catch {}
  return [];
}

function readActiveId(): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(KEY_ACTIVE); } catch { return null; }
}

function readLegacyProfile(): Partial<UserProfile> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY_LEGACY);
    if (raw) return JSON.parse(raw) as Partial<UserProfile>;
  } catch {}
  return null;
}

function persistProfiles(members: FamilyMember[]) {
  localStorage.setItem(KEY_PROFILES, JSON.stringify(members));
}

function persistActiveId(id: string) {
  localStorage.setItem(KEY_ACTIVE, id);
}

function dispatchProfilesChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("bh-profiles-change"));
  }
}

// ── Hook ───────────────────────────────────────────────────────────────────

function initMembers(): FamilyMember[] {
  const stored = readProfiles();
  if (stored.length > 0) return stored;
  // Migrate legacy single-profile on first run
  const legacy = readLegacyProfile();
  if (legacy && legacy.diet) {
    const type: MemberType = legacy.sex === "female" ? "female" : "male";
    const migrated: FamilyMember = { id: `me-${Date.now()}`, type, name: legacy.name, profile: legacy };
    persistProfiles([migrated]);
    persistActiveId(migrated.id);
    return [migrated];
  }
  return [];
}

function initActiveId(members: FamilyMember[]): string | null {
  if (members.length === 0) return null;
  return readActiveId() ?? members[0].id;
}

export function useActiveProfile() {
  const [members, setMembers] = useState<FamilyMember[]>(() => {
    if (typeof window === "undefined") return [];
    return initMembers();
  });
  const [activeId, setActiveIdState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return initActiveId(initMembers());
  });

  // Sync across hook instances on the same page (e.g. sidebar + home page)
  useEffect(() => {
    function onProfilesChange() {
      const stored = readProfiles();
      if (stored.length > 0) {
        setMembers(stored);
        const aid = readActiveId() ?? stored[0].id;
        setActiveIdState(aid);
      } else {
        setMembers([]);
        setActiveIdState(null);
      }
    }
    window.addEventListener("bh-profiles-change", onProfilesChange);
    return () => window.removeEventListener("bh-profiles-change", onProfilesChange);
  }, []);

  // Active member derived from state
  const activeMember: FamilyMember | null =
    members.find((m) => m.id === activeId) ?? members[0] ?? null;

  // Active profile (the raw UserProfile object pages currently use)
  const activeProfile: Partial<UserProfile> | null = activeMember?.profile ?? null;

  // Switch active profile
  const switchProfile = useCallback((id: string) => {
    persistActiveId(id);
    setActiveIdState(id);
    // Keep bh_profile in sync so protocol page reads the switched member's data
    setMembers((prev) => {
      const member = prev.find((m) => m.id === id);
      if (member) localStorage.setItem(KEY_LEGACY, JSON.stringify(member.profile));
      return prev;
    });
  }, []);

  // Add a new family member
  const addMember = useCallback((member: FamilyMember) => {
    // Write to localStorage synchronously BEFORE dispatching the event so any
    // listener that immediately reads localStorage sees the updated data.
    const current = readProfiles();
    const next = [...current, member];
    persistProfiles(next);
    persistActiveId(member.id);
    localStorage.setItem(KEY_LEGACY, JSON.stringify(member.profile));
    setMembers(next);
    setActiveIdState(member.id);
    dispatchProfilesChange();
  }, []);

  // Update an existing member's profile data
  const updateMemberProfile = useCallback(
    (id: string, patch: Partial<FamilyMember["profile"]>) => {
      setMembers((prev) => {
        const next = prev.map((m) =>
          m.id === id ? { ...m, profile: { ...m.profile, ...patch } } : m,
        );
        persistProfiles(next);
        // Keep bh_profile in sync for pages that still read it directly
        const updated = next.find((m) => m.id === id);
        if (updated && id === activeId) {
          localStorage.setItem(KEY_LEGACY, JSON.stringify(updated.profile));
        }
        return next;
      });
    },
    [activeId],
  );

  // Remove a single family member
  const removeMember = useCallback((id: string) => {
    setMembers((prev) => {
      const next = prev.filter((m) => m.id !== id);
      if (next.length === 0) {
        localStorage.removeItem(KEY_PROFILES);
        localStorage.removeItem(KEY_ACTIVE);
        localStorage.removeItem(KEY_LEGACY);
        localStorage.removeItem("bh_onboarding_state");
        localStorage.removeItem("bh_theme");
      } else {
        persistProfiles(next);
        // If we removed the active member, switch to the first remaining
        if (id === activeId) {
          persistActiveId(next[0].id);
          setActiveIdState(next[0].id);
          localStorage.setItem(KEY_LEGACY, JSON.stringify(next[0].profile));
        }
      }
      return next;
    });
    dispatchProfilesChange();
  }, [activeId]);

  // Clear everything (logout / sign-out)
  const clearAllProfiles = useCallback(() => {
    localStorage.removeItem(KEY_PROFILES);
    localStorage.removeItem(KEY_ACTIVE);
    localStorage.removeItem(KEY_LEGACY);
    setMembers([]);
    setActiveIdState(null);
  }, []);

  return {
    members,
    activeMember,
    activeProfile,
    activeId,
    switchProfile,
    addMember,
    removeMember,
    updateMemberProfile,
    clearAllProfiles,
    hasMultipleProfiles: members.length > 1,
  };
}
