export function toUiErrorMessage(err) {
  if (err?.isNetworkError || !err?.response) {
    return "Service is currently unavailable. Please try again.";
  }

  const status = Number(err?.response?.status);
  const apiMessage = err?.response?.data?.message || err?.response?.data?.detail;

  if (status === 401) return apiMessage || "Unauthorized. Please sign in again.";
  if (status === 403) return apiMessage || "You don't have permission to do that.";
  if (status === 404) return apiMessage || "Not found.";

  return apiMessage || err?.message || "Request failed.";
}

