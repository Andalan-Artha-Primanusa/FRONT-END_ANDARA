import { useEffect, useState } from "react";
import { useAuthStore } from "@/app/store/auth.store";
import { verifyToken } from "@/features/auth/api/auth.service";

export type AuthSessionStatus = "checking" | "authenticated" | "unauthenticated";

let verifiedToken: string | null = null;
let verifiedTokenResult: boolean | null = null;
let verificationPromise: Promise<boolean> | null = null;

const resetVerificationCache = (token: string | null) => {
  if (verifiedToken !== token) {
    verifiedToken = token;
    verifiedTokenResult = null;
    verificationPromise = null;
  }
};

export const useAuthSession = () => {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const [status, setStatus] = useState<AuthSessionStatus>(
    token ? "checking" : user ? "authenticated" : "unauthenticated"
  );

  useEffect(() => {
    let isActive = true;

    if (!token) {
      resetVerificationCache(null);
      setStatus(user ? "authenticated" : "unauthenticated");
      return () => {
        isActive = false;
      };
    }

    resetVerificationCache(token);

    if (verifiedToken === token && verifiedTokenResult !== null) {
      setStatus(verifiedTokenResult ? "authenticated" : "unauthenticated");
      return () => {
        isActive = false;
      };
    }

    setStatus("checking");

    void (async () => {
      try {
        if (!verificationPromise) {
          verificationPromise = verifyToken()
            .then(() => true)
            .catch(() => false);
        }

        const isTokenValid = await verificationPromise;

        if (verifiedToken === token) {
          verifiedTokenResult = isTokenValid;
        }

        if (isActive) {
          setStatus(isTokenValid ? "authenticated" : "unauthenticated");
        }
      } catch {
        if (isActive) {
          setStatus("unauthenticated");
        }
      } finally {
        verificationPromise = null;
      }
    })();

    return () => {
      isActive = false;
    };
  }, [token, user]);

  return status;
};
