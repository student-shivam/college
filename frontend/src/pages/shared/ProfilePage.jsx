import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import { backend } from "../../services/backend";
import { toast } from "../../utils/toastBus";
import { toUiErrorMessage } from "../../utils/toUiErrorMessage";
import { toServiceUrl } from "../../utils/serviceRoot";

function getInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = parts[0]?.[0] || "A";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (first + last).toUpperCase();
}

export default function ProfilePage({ scope = "USER" }) {
  const { user, refreshProfile } = useAuth();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const initials = useMemo(() => getInitials(user?.name), [user?.name]);
  const avatarSrc = useMemo(() => toServiceUrl(user?.avatarUrl), [user?.avatarUrl]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return () => {};
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pickFile(next) {
    if (!next) return;
    if (!String(next.type || "").startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    if (next.size > 3 * 1024 * 1024) {
      toast.error("Image too large. Max 3MB.");
      return;
    }
    setFile(next);
  }

  async function upload() {
    if (!file) {
      toast.error("Please choose an image first.");
      return;
    }
    setBusy(true);
    try {
      await backend.uploadMyAvatar(file);
      await refreshProfile();
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      toast.success("Profile image updated.");
    } catch (err) {
      toast.error(toUiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!user?.avatarUrl) return;
    setBusy(true);
    try {
      await backend.removeMyAvatar();
      await refreshProfile();
      toast.success("Profile image removed.");
    } catch (err) {
      toast.error(toUiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-kicker">{scope}</div>
          <h1>My Profile</h1>
          <p className="muted">Update your profile image.</p>
        </div>
      </div>

      <section className="panel">
        <div className="profile-card">
          <div className="profile-avatar" aria-label="Profile image">
            {previewUrl ? (
              <img src={previewUrl} alt="Selected profile" />
            ) : avatarSrc ? (
              <img src={avatarSrc} alt="Profile" />
            ) : (
              <span className="profile-initials">{initials}</span>
            )}
          </div>

          <div className="profile-meta">
            <div className="profile-name">{user?.name || "-"}</div>
            <div className="profile-sub">{user?.email || "-"}</div>
            <div className="profile-sub">Role: {String(user?.role || "").toUpperCase()}</div>

            <div className="profile-actions">
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="profile-file"
                onChange={(e) => pickFile(e.target.files?.[0])}
                disabled={busy}
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={() => inputRef.current?.click()}
                disabled={busy}
              >
                Choose Image
              </button>
              <button type="button" onClick={upload} disabled={busy || !file}>
                {busy ? "Please wait..." : "Upload"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={remove}
                disabled={busy || !user?.avatarUrl}
                title={!user?.avatarUrl ? "No profile image to remove" : "Remove profile image"}
              >
                Remove
              </button>
            </div>

            <div className="profile-help muted">
              Supported: JPG/PNG/WebP, up to 3MB.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

