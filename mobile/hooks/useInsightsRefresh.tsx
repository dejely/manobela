import React, { createContext, useContext, useState } from 'react';

const InsightRefreshContext = createContext({ tick: 0, refresh: () => {} });

export function InsightRefreshProvider({ children }: { children: React.ReactNode }) {
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  return (
    <InsightRefreshContext.Provider value={{ tick, refresh }}>
      {children}
    </InsightRefreshContext.Provider>
  );
}

export const useInsightRefresh = () => useContext(InsightRefreshContext);
