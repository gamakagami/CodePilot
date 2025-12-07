import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";

export const useAuth = () => {
  const { isAuthenticated, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return { isAuthenticated };
};
