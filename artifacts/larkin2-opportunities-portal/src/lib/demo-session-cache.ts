import type { QueryClient, QueryKey } from "@tanstack/react-query";

export async function clearDemoSessionCache(
  queryClient: QueryClient,
  queryKey: QueryKey,
): Promise<void> {
  await queryClient.cancelQueries({ queryKey });
  queryClient.setQueryData(queryKey, null);
}