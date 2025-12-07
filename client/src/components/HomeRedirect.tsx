import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import Loader from "./Loader";
import Landing from "@/pages/Landing";
import { useEffect, useState } from "react";

export default function HomeRedirect() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);
    return () => clearTimeout(timer);
  }, [checkAuth]);

  if (isLoading) return <Loader />;

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Landing />;
}

