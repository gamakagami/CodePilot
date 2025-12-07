import { ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import Loader from "./Loader";

interface ProtectedRouteProps {
  children: ReactNode;
  type?: "1" | "2" | "3";
}

export default function ProtectedRoute({
  children,
  type = "1",
}: ProtectedRouteProps) {
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

  if (!isAuthenticated && type === "1") {
    return <Navigate to="/login" replace />;
  }

  if (isAuthenticated && type === "2") {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
