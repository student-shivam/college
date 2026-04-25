export function toUiError(err) {
  const httpMessage = err?.response?.data?.message;
  if (httpMessage) return { title: "Request failed", detail: httpMessage };

  if (err?.isNetworkError) {
    return {
      title: "Network error",
      detail: "Couldn’t reach the backend API from the browser.",
      hint: "Start backend on port 5000 (and disable VPN/proxy browser extensions if any)."
    };
  }

  // Axios sometimes sets `message: "Network Error"` without `isNetworkError` when there is no response.
  if (!err?.response && String(err?.message || "").toLowerCase().includes("network")) {
    return {
      title: "Network error",
      detail: "Couldn’t reach the backend API from the browser.",
      hint: "Start backend on port 5000 (and disable VPN/proxy browser extensions if any)."
    };
  }

  return {
    title: "Something went wrong",
    detail: err?.message || "Unknown error"
  };
}

