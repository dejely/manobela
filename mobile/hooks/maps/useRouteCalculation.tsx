import { useState, useCallback } from 'react';
import { useOSRMRouting, type OSMViewRef, type Route } from 'expo-osm-sdk';
import { Coordinate } from '@/types/maps';

interface UseRouteCalculationReturn {
  route: Route | null;
  isCalculating: boolean;
  error: string | null;
  calculateRoute: (
    start: Coordinate,
    destination: Coordinate,
    mapRef: React.RefObject<OSMViewRef | null>
  ) => Promise<void>;
  clearRoute: () => void;
}

export function useRouteCalculation({
  mapRef,
}: {
  mapRef: React.RefObject<OSMViewRef | null>;
}): UseRouteCalculationReturn {
  const routing = useOSRMRouting();
  const [route, setRoute] = useState<Route | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateRoute = useCallback(
    async (
      start: Coordinate,
      destination: Coordinate,
      mapRef: React.RefObject<OSMViewRef | null>
    ) => {
      if (!mapRef.current) {
        setError('Map reference not available');
        return;
      }

      setIsCalculating(true);
      setError(null);

      try {
        // Type assertion: we've already checked mapRef.current is not null above
        const nonNullMapRef = mapRef as React.RefObject<OSMViewRef>;

        // Calculate and display route with car/driving profile
        const calculatedRoute = await routing.calculateAndDisplayRoute(
          start,
          destination,
          nonNullMapRef,
          {
            profile: 'driving',
            routeStyle: {
              color: '#E76A6A', // light red
              width: 4,
              opacity: 0.6,
            },
          }
        );

        if (calculatedRoute) {
          setRoute(calculatedRoute);
          // Auto-fit the route in view
          await routing.fitRouteInView(calculatedRoute, nonNullMapRef, 50);
        } else {
          setError('No route found');
        }
      } catch (err: any) {
        console.error('Route calculation error:', err);
        setError(err.message || 'Failed to calculate route');
        setRoute(null);
      } finally {
        setIsCalculating(false);
      }
    },
    [routing]
  );

  const clearRoute = useCallback(() => {
    setRoute(null);
    setError(null);

    if (mapRef.current) {
      routing.clearRoute(mapRef as React.RefObject<OSMViewRef>);
    }
  }, [mapRef, routing]);

  return {
    route,
    isCalculating,
    error,
    calculateRoute,
    clearRoute,
  };
}
