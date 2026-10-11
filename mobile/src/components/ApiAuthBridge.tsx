import { useLayoutEffect, type ReactNode } from "react";
import { useAuth } from "@clerk/clerk-expo";
import { bindSession } from "../api/sessionToken";

export function ApiAuthBridge({ children }: { children: ReactNode }) {
  const { userId, sessionId, getToken } = useAuth();
  useLayoutEffect(() => {
    bindSession(userId, sessionId, getToken);
  }, [userId, sessionId, getToken]);
  useLayoutEffect(() => () => bindSession(null, null, null), []);
  // Remount learner state/audio only when the account changes, not token refresh.
  return <>{userId ? <LearnerBoundary key={userId}>{children}</LearnerBoundary> : children}</>;
}
function LearnerBoundary({ children }: { children: ReactNode }) { return <>{children}</>; }
