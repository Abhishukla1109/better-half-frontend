"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, Check, Trash2, LogOut } from "lucide-react";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import type { FamilyMember } from "@/hooks/useActiveProfile";
import { supabase } from "@/lib/supabase/client";

function memberEmoji(m: FamilyMember): string {
  if (m.type === "child") return "🧒";
  if (m.type === "female") return "👩";
  return "👤";
}

function memberSubtitle(m: FamilyMember): string {
  if (m.type === "child") return m.childAge ? `Kids · ${m.childAge} yrs` : "Kids profile";
  if (m.type === "female") return "Women's protocol";
  return "Men's protocol";
}

function memberDisplayName(m: FamilyMember): string {
  if (m.name) return m.name;
  if (m.type === "child") return "Your child";
  if (m.type === "female") return "Your partner";
  return "You";
}

export default function ProfileSidebar() {
  const [open, setOpen] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const { members, activeId, switchProfile, removeMember } = useActiveProfile();
  const router = useRouter();

  useEffect(() => {
    function onOpen() { setOpen(true); }
    window.addEventListener("bh-profile-sidebar-open", onOpen);
    return () => window.removeEventListener("bh-profile-sidebar-open", onOpen);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setConfirmingDeleteId(null); setOpen(false); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  const handleSwitch = (member: FamilyMember) => {
    switchProfile(member.id);
    localStorage.setItem("bh_theme", member.type);
    window.dispatchEvent(new Event("bh-theme-change"));
    setOpen(false);
    // Stay on the current section; only swap between home variants
    const cur = window.location.pathname;
    const isHome = cur === "/protocol" || cur === "/kids" || cur.startsWith("/kids/");
    window.location.href = isHome
      ? (member.type === "child" ? "/kids" : "/protocol")
      : cur;
  };

  const handleDelete = (id: string) => {
    setConfirmingDeleteId(null);
    removeMember(id);
    if (members.length <= 1) {
      setOpen(false);
      window.location.href = "/home";
    }
  };

  const handleAdd = () => {
    setOpen(false);
    localStorage.setItem("bh_add_mode", "1");
    window.location.href = "/home";
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    [
      "bh_auth", "bh_profile", "bh_profiles", "bh_active_profile",
      "bh_onboarding_state", "bh_protocol_visits", "bh_today_answers",
      "bh_theme", "bh_add_mode", "bh_protocol_built",
    ].forEach((k) => localStorage.removeItem(k));
    window.location.replace("/");
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/25 backdrop-blur-[2px]"
        onClick={() => { setConfirmingDeleteId(null); setOpen(false); }}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 bottom-0 z-[61] w-[300px] max-w-[88vw] bg-surface flex flex-col shadow-2xl animate-slide-in-right">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-outline-variant/10">
          <div>
            <p className="font-extrabold text-[15px] text-on-surface font-[family-name:var(--font-manrope)]">
              My profiles
            </p>
            <p className="text-[11px] text-on-surface-variant/50 mt-0.5">Tap to switch</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 rounded-full hover:bg-surface-container-low flex items-center justify-center cursor-pointer transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-on-surface-variant" />
          </button>
        </div>

        {/* Member list */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          {members.length === 0 && (
            <p className="text-sm text-on-surface-variant/50 text-center py-8">No profiles yet</p>
          )}

          {members.map((member) => {
            const isActive = member.id === activeId;
            const isConfirming = confirmingDeleteId === member.id;

            return (
              <div key={member.id}>
                <div
                  className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all ${
                    isActive
                      ? "bg-primary-container/10 border border-primary-container/25"
                      : "border border-transparent hover:bg-surface-container-low"
                  }`}
                >
                  {/* Avatar + name — clickable to switch */}
                  <button
                    onClick={() => { setConfirmingDeleteId(null); handleSwitch(member); }}
                    className="flex items-center gap-3.5 flex-1 min-w-0 text-left cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-[22px] shrink-0 border border-outline-variant/10">
                      {memberEmoji(member)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-on-surface truncate">
                        {memberDisplayName(member)}
                      </p>
                      <p className="text-[11px] text-on-surface-variant/50 mt-0.5">
                        {memberSubtitle(member)}
                      </p>
                    </div>
                  </button>

                  {/* Active checkmark + trash icon */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isActive && (
                      <div className="w-5 h-5 rounded-full bg-primary-container flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" strokeWidth={2.5} />
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmingDeleteId(isConfirming ? null : member.id);
                      }}
                      className={`w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
                        isConfirming ? "bg-error/10 text-error" : "hover:bg-surface-container text-on-surface-variant/35 hover:text-error/60"
                      }`}
                      aria-label="Delete profile"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Inline confirmation */}
                {isConfirming && (
                  <div className="flex items-center justify-between px-4 py-2.5 mx-0.5 mb-1 rounded-xl bg-error/8 border border-error/15 animate-fade-in-up">
                    <p className="text-[12px] text-error font-medium">Delete {memberDisplayName(member)}?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmingDeleteId(null)}
                        className="text-[11px] font-semibold text-on-surface-variant/50 hover:text-on-surface-variant transition-colors cursor-pointer px-2 py-1"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDelete(member.id)}
                        className="text-[11px] font-bold text-white bg-error px-3 py-1 rounded-lg cursor-pointer hover:bg-error/90 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add member + Sign out */}
        <div className="px-4 pb-8 pt-3 border-t border-outline-variant/10 space-y-2">
          <button
            onClick={handleAdd}
            className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl border border-primary-container/25 bg-primary-container/8 hover:bg-primary-container/15 transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full border border-primary-container/30 flex items-center justify-center shrink-0">
              <Plus className="w-4 h-4 text-primary-container" />
            </div>
            <span className="text-sm font-bold text-primary-container">Add a family member</span>
          </button>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl border border-outline-variant/10 hover:bg-surface-container-low transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0">
              <LogOut className="w-4 h-4 text-on-surface-variant/50" />
            </div>
            <span className="text-sm font-semibold text-on-surface-variant/60">Sign out</span>
          </button>
        </div>

      </div>
    </>
  );
}
