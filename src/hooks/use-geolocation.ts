"use client";

import { useState, useCallback } from "react";

interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface GeolocationState {
  position: GeoPosition | null;
  error: string | null;
  isLoading: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    position: null,
    error: null,
    isLoading: false,
  });

  const getPosition = useCallback((): Promise<GeoPosition> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const error = "Geolocation is not supported";
        setState({ position: null, error, isLoading: false });
        reject(new Error(error));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const position: GeoPosition = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
          setState({ position, error: null, isLoading: false });
          resolve(position);
        },
        (err) => {
          const error = err.message;
          setState({ position: null, error, isLoading: false });
          reject(new Error(error));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }, []);

  return { ...state, getPosition };
}
