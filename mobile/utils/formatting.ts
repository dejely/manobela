/**
 * Format distance in meters to human-readable string
 */
export const formatDistanceMeters = (meters: number): string => {
  if (isNaN(meters) || meters < 0) return '0 m';

  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
};

/**
 * Format time in seconds to human-readable string
 */
export const formatTimeSeconds = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return '0 min';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes} min`;
};
