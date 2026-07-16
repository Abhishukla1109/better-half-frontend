const UTM_KEY = "bh_utm";

export interface StoredUTMs {
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  ref: string;
  dmId: string;
  influencerId: string;
}

export function captureUTMs(): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const utmSource = params.get("utm_source") ?? params.get("utmSource");
  if (!utmSource) return;
  const utm: StoredUTMs = {
    utmSource,
    utmMedium:    params.get("utm_medium")   ?? params.get("utmMedium")   ?? "",
    utmCampaign:  params.get("utm_campaign") ?? params.get("utmCampaign") ?? "",
    ref:          params.get("ref")          ?? "",
    dmId:         params.get("dmId")         ?? "",
    influencerId: params.get("influencerId") ?? "",
  };
  localStorage.setItem(UTM_KEY, JSON.stringify(utm));
}

export function getStoredUTMs(): StoredUTMs | null {
  try {
    return JSON.parse(localStorage.getItem(UTM_KEY) ?? "null") as StoredUTMs | null;
  } catch {
    return null;
  }
}
