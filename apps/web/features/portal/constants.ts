export const PORTAL_TOKEN_STORAGE_KEY = "multica_portal_guest_token";
export const PORTAL_SUMMARY_MARKER = "[TÓM TẮT DỰ ÁN]";
export const PORTAL_SUMMARY_END_MARKER = "[/TÓM TẮT DỰ ÁN]";
// 1s while a reply is in flight: each poll also carries the streamed partial
// text, so this is the cadence at which the guest sees the reply grow.
export const PORTAL_POLL_ACTIVE_MS = 1000;
export const PORTAL_POLL_IDLE_MS = 5000;
