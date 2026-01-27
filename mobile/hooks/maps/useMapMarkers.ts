import { useMemo } from 'react';
import { MapLocation } from '@/types/maps';

export const useMapMarkers = (
  startLocation: MapLocation | null,
  destinationLocation: MapLocation | null
) => {
  return useMemo(() => {
    const markersArray = [];

    if (startLocation) {
      markersArray.push({
        id: 'start-location',
        coordinate: {
          latitude: startLocation.coordinate.latitude,
          longitude: startLocation.coordinate.longitude,
        },
        title: 'Start Location',
        description: startLocation.displayName || 'Current Location',
      });
    }

    if (destinationLocation) {
      markersArray.push({
        id: 'destination-location',
        coordinate: {
          latitude: destinationLocation.coordinate.latitude,
          longitude: destinationLocation.coordinate.longitude,
        },
        title: destinationLocation.displayName || 'Destination',
        description: destinationLocation.displayName || 'Destination Location',
      });
    }

    return markersArray;
  }, [startLocation, destinationLocation]);
};
