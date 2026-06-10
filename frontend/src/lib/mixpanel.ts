// Central Mixpanel utility.
// All tracking goes through here — never call mixpanel directly elsewhere.
// This means: if we swap analytics tools later, only this file changes.

import mixpanel from "mixpanel-browser";

const TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN ?? "";
let ready = false;

export function initMixpanel() {
  // typeof window === "undefined" means we're on the server (Next.js renders
  // pages server-side first). Mixpanel is browser-only, so we skip it there.
  if (typeof window === "undefined" || !TOKEN || ready) return;
  mixpanel.init(TOKEN, {
    track_pageview: false, // we track page views manually so we control the data
    persistence: "localStorage", // remembers the user across sessions
  });
  ready = true;
}

// track() is the one function you'll call everywhere in the app.
// event = what happened, e.g. "PDP Viewed"
// properties = extra context, e.g. { brand: "Man Matters", price: 499 }
export function track(event: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined" || !ready) return;
  try {
    mixpanel.track(event, properties);
  } catch {
    // Analytics should NEVER break the app — silently swallow errors
  }
}

// identify() links all future events to a specific user.
// Call this once after login so Mixpanel can show you per-user journeys.
export function identifyUser(userId: string, traits?: Record<string, unknown>) {
  if (typeof window === "undefined" || !ready) return;
  try {
    mixpanel.identify(userId);
    if (traits) mixpanel.people.set(traits);
  } catch {}
}

// reset() forgets who the user is — call this on logout.
export function resetUser() {
  if (typeof window === "undefined" || !ready) return;
  try {
    mixpanel.reset();
  } catch {}
}
