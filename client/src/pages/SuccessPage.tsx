import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

export default function SuccessPage() {
  const navigate = useNavigate();
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      localStorage.setItem("authToken", token);
      setAuthenticated(true);
      window.history.replaceState({}, "", "/auth/success");
      navigate("/dashboard");
    }
  }, [navigate, setAuthenticated]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">Success</h1>
        <p className="mb-4 text-xl text-muted-foreground">
          Redirecting to the dashboard shortly.
        </p>
      </div>
    </div>
  );
}
