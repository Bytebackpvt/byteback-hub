import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Offline-safe defaults: keep last-good data on screen when the
        // device drops connection (Capacitor + browser flaky networks).
        staleTime: 30_000,
        gcTime: 1000 * 60 * 60 * 24, // 24h
        networkMode: "offlineFirst",
        retry: 2,
      },
      mutations: {
        networkMode: "offlineFirst",
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
