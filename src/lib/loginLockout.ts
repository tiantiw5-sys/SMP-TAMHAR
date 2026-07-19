const FAIL_THRESHOLD = 3;
const LOCKOUT_DURATIONS_SEC = [30, 60, 120, 300, 600] as const;

interface LockoutRecord {
  failCount: number;
  lockoutLevel: number;
  lockedUntil: number;
}

function storageKey(loginId: string): string {
  return `smptamhar_login_lockout_${loginId.trim().toLowerCase()}`;
}

function readRecord(loginId: string): LockoutRecord {
  try {
    const raw = localStorage.getItem(storageKey(loginId));
    if (!raw) return { failCount: 0, lockoutLevel: 0, lockedUntil: 0 };
    return JSON.parse(raw) as LockoutRecord;
  } catch {
    return { failCount: 0, lockoutLevel: 0, lockedUntil: 0 };
  }
}

function writeRecord(loginId: string, record: LockoutRecord): void {
  localStorage.setItem(storageKey(loginId), JSON.stringify(record));
}

export function getLockoutRemainingSeconds(loginId: string): number {
  if (!loginId.trim()) return 0;
  const remaining = Math.ceil((readRecord(loginId).lockedUntil - Date.now()) / 1000);
  return remaining > 0 ? remaining : 0;
}

/** Catat satu percobaan login gagal. Mengembalikan durasi kunci baru dalam
 * detik kalau percobaan ini yang memicu lockout, atau 0 kalau belum. */
export function recordFailedAttempt(loginId: string): number {
  const record = readRecord(loginId);
  record.failCount += 1;

  let lockedSeconds = 0;
  if (record.failCount >= FAIL_THRESHOLD) {
    const duration = LOCKOUT_DURATIONS_SEC[Math.min(record.lockoutLevel, LOCKOUT_DURATIONS_SEC.length - 1)];
    record.lockedUntil = Date.now() + duration * 1000;
    record.lockoutLevel += 1;
    record.failCount = 0;
    lockedSeconds = duration;
  }

  writeRecord(loginId, record);
  return lockedSeconds;
}

export function clearLockout(loginId: string): void {
  localStorage.removeItem(storageKey(loginId));
}

export function formatLockoutCountdown(seconds: number): string {
  if (seconds < 60) return `${seconds} detik`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest === 0 ? `${minutes} menit` : `${minutes} menit ${rest} detik`;
}
