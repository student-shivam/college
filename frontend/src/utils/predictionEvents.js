export const predictionEvents = {
  created: "pm_prediction_created"
};

const BUMP_KEY = "pm_prediction_bump";

export function broadcastPredictionCreated(payload) {
  try {
    window.dispatchEvent(new CustomEvent(predictionEvents.created, { detail: payload || null }));
  } catch (_err) {
    // ignore
  }

  // Cross-tab sync: triggers `storage` listeners in other tabs.
  try {
    localStorage.setItem(BUMP_KEY, String(Date.now()));
  } catch (_err) {
    // ignore
  }
}

export function isPredictionBumpKey(key) {
  return key === BUMP_KEY;
}

