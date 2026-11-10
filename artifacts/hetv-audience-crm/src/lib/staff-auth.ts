import { useEffect, useRef } from "react";
import { QueryCache, MutationCache, QueryClient, useQueryClient } from "@tanstack/react-query";
import {
  getGetStaffSessionQueryKey,
  useGetStaffSession,
  useLogoutStaff,
  type StaffSession,
} from "@workspace/api-client-react";

export const SIGNED_OUT: StaffSession = { authenticated: false, user: null };
const sessionKey = getGetStaffSessionQueryKey();

export function errorStatus(error: unknown): number | undefined {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === "number" ? status : undefined;
}

export function errorMessage(error: unknown): string | undefined {
  const data = (error as { data?: { error?: unknown } } | null)?.data;
  return typeof data?.error === "string" ? data.error : undefined;
}

function isSessionKey(key: readonly unknown[]) {
  return key[0] === sessionKey[0];
}

/** Query client that sends 401s back to sign-in and never retries auth failures. */
export function createStaffQueryClient(options: { staleTime?: number } = {}) {
  let client: QueryClient;
  const onUnauthorized = (error: unknown, key?: readonly unknown[]) => {
    if (errorStatus(error) !== 401 || (key && isSessionKey(key))) return;
    client.setQueryData(sessionKey, SIGNED_OUT);
  };
  client = new QueryClient({
    queryCache: new QueryCache({ onError: (error, query) => onUnauthorized(error, query.queryKey) }),
    mutationCache: new MutationCache({ onError: (error) => onUnauthorized(error) }),
    defaultOptions: {
      queries: {
        staleTime: options.staleTime,
        refetchOnWindowFocus: false,
        retry: (count, error) => {
          const status = errorStatus(error);
          if (status && status >= 400 && status < 500) return false;
          return count < 1;
        },
      },
    },
  });
  return client;
}

/** Current staff session, revalidated on mount and window focus. */
export function useStaffSession() {
  const query = useGetStaffSession({
    query: {
      queryKey: sessionKey,
      staleTime: 60_000,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      retry: false,
    },
  });
  const status = errorStatus(query.error);
  const session = status === 401 ? SIGNED_OUT : query.data;
  return {
    session,
    user: session?.authenticated ? session.user : null,
    isLoading: query.isLoading,
    isUnavailable: !session && query.isError,
    refetch: query.refetch,
  };
}

/** Drop every cached record when the signed-in identity changes. */
export function useIdentityCacheGuard(userId: string | null | undefined) {
  const client = useQueryClient();
  const previous = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (userId === undefined) return;
    if (previous.current !== undefined && previous.current !== userId) {
      // Keep active observers attached while discarding prior identity data.
      client.getMutationCache().clear();
      void client.resetQueries({ predicate: (query) => !isSessionKey(query.queryKey) });
    }
    previous.current = userId;
  }, [userId, client]);
}

/** Sign out server-side, then clear all cached data. Stays signed in if the server refuses. */
export function useStaffSignOut(onSignedOut: () => void) {
  const client = useQueryClient();
  const logout = useLogoutStaff();
  const onSignedOutRef = useRef(onSignedOut);
  onSignedOutRef.current = onSignedOut;
  const signOut = async () => {
    try {
      await logout.mutateAsync();
    } catch (error) {
      if (errorStatus(error) !== 401) return false;
    }
    client.clear();
    client.setQueryData(sessionKey, SIGNED_OUT);
    onSignedOutRef.current();
    return true;
  };
  return { signOut, isPending: logout.isPending, isError: logout.isError };
}

/** Called after a successful login: start from an empty cache with the fresh session. */
export function adoptStaffSession(client: QueryClient, session: StaffSession) {
  client.clear();
  client.setQueryData(sessionKey, session);
}

export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 128;

/** Reads #token=... from the fragment (pure; safe in render). */
export function readFragmentToken(): string | null {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return null;
  const token = new URLSearchParams(hash).get("token");
  return token && token.trim() ? token.trim() : null;
}

/** Removes the fragment from the current history entry so the token is not retained. */
export function clearFragment() {
  if (!window.location.hash) return;
  window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
}

export function describeLinkError(_error: unknown): { title: string; detail: string } {
  return { title: "This link is invalid or has expired.", detail: "Links work once and only for a limited time. Request a new reset link, or ask a super admin to send a new invitation." };
}
