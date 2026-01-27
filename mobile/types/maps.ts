export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface MapLocation {
  coordinate: { latitude: number; longitude: number };
  displayName?: string;
}
