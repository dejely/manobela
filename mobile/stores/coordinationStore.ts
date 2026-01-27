import { create } from 'zustand';

interface CoordinationState {
  // Track if monitoring should start (triggered by navigation)
  shouldStartMonitoring: boolean;
  // Track if navigation should start (triggered by monitoring)
  shouldStartNavigation: boolean;
  // Flag to prevent infinite loops
  isCoordinating: boolean;

  // Actions
  requestMonitoringStart: () => void;
  requestNavigationStart: () => void;
  clearMonitoringRequest: () => void;
  clearNavigationRequest: () => void;
  setCoordinating: (isCoordinating: boolean) => void;
}

export const useCoordinationStore = create<CoordinationState>((set) => ({
  shouldStartMonitoring: false,
  shouldStartNavigation: false,
  isCoordinating: false,

  requestMonitoringStart: () => set({ shouldStartMonitoring: true }),
  requestNavigationStart: () => set({ shouldStartNavigation: true }),
  clearMonitoringRequest: () => set({ shouldStartMonitoring: false }),
  clearNavigationRequest: () => set({ shouldStartNavigation: false }),
  setCoordinating: (isCoordinating: boolean) => set({ isCoordinating }),
}));
