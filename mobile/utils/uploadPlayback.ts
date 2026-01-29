export const formatPlaybackTime = (durationMs: number | null) => {
  if (durationMs === null || Number.isNaN(durationMs)) return '--:--';
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const findNearestFrameIndex = <T extends { timestampSec: number }>(
  frames: T[],
  timeSec: number
) => {
  if (frames.length === 0) return null;

  if (timeSec <= frames[0].timestampSec) return 0;
  const lastIndex = frames.length - 1;
  if (timeSec >= frames[lastIndex].timestampSec) return lastIndex;

  let low = 0;
  let high = lastIndex;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const current = frames[mid].timestampSec;

    if (current === timeSec) return mid;
    if (current < timeSec) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const afterIndex = Math.min(lastIndex, Math.max(0, low));
  const beforeIndex = Math.min(lastIndex, Math.max(0, high));
  const afterDiff = Math.abs(frames[afterIndex].timestampSec - timeSec);
  const beforeDiff = Math.abs(timeSec - frames[beforeIndex].timestampSec);

  return afterDiff <= beforeDiff ? afterIndex : beforeIndex;
};
