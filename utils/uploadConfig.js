/**
 * Centralised upload config — every place that needs an upload size limit or
 * a long-request timeout reads from here, never hardcodes a value.
 *
 * Env vars (with defaults):
 *   PDF_UPLOAD_MAX_SIZE_MB  — max PDF size in megabytes (default 50)
 *   EXPRESS_BODY_LIMIT      — body-parser limit string (default derived from PDF_UPLOAD_MAX_SIZE_MB)
 *   REQUEST_TIMEOUT_MS      — server-side request timeout for long endpoints (default 600000)
 */

const DEFAULT_MAX_MB = 50;
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

const parsePositiveInt = (raw, fallback) => {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const PDF_UPLOAD_MAX_SIZE_MB = parsePositiveInt(
  process.env.PDF_UPLOAD_MAX_SIZE_MB,
  DEFAULT_MAX_MB
);
const PDF_UPLOAD_MAX_SIZE_BYTES = PDF_UPLOAD_MAX_SIZE_MB * 1024 * 1024;

// Body-parser limit — accept any string the `bytes` package understands.
// Fall back to '<N>mb' derived from PDF_UPLOAD_MAX_SIZE_MB so the two stay in sync by default.
const EXPRESS_BODY_LIMIT =
  process.env.EXPRESS_BODY_LIMIT && process.env.EXPRESS_BODY_LIMIT.trim()
    ? process.env.EXPRESS_BODY_LIMIT.trim()
    : `${PDF_UPLOAD_MAX_SIZE_MB}mb`;

const VIDEO_UPLOAD_MAX_SIZE_MB = parsePositiveInt(process.env.VIDEO_UPLOAD_MAX_SIZE_MB, 500);
const VIDEO_UPLOAD_MAX_SIZE_BYTES = VIDEO_UPLOAD_MAX_SIZE_MB * 1024 * 1024;

const AUDIO_UPLOAD_MAX_SIZE_MB = parsePositiveInt(process.env.AUDIO_UPLOAD_MAX_SIZE_MB, 100);
const AUDIO_UPLOAD_MAX_SIZE_BYTES = AUDIO_UPLOAD_MAX_SIZE_MB * 1024 * 1024;

const REQUEST_TIMEOUT_MS = parsePositiveInt(
  process.env.REQUEST_TIMEOUT_MS,
  DEFAULT_TIMEOUT_MS
);

module.exports = {
  PDF_UPLOAD_MAX_SIZE_MB,
  PDF_UPLOAD_MAX_SIZE_BYTES,
  EXPRESS_BODY_LIMIT,
  REQUEST_TIMEOUT_MS,
  VIDEO_UPLOAD_MAX_SIZE_MB,
  VIDEO_UPLOAD_MAX_SIZE_BYTES,
  AUDIO_UPLOAD_MAX_SIZE_MB,
  AUDIO_UPLOAD_MAX_SIZE_BYTES,
};
