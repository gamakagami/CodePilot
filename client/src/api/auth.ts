import { useMutation } from "@tanstack/react-query";
import api from "./http";
import { useAuthStore } from "@/stores/authStore";
import { useNavigate } from "react-router-dom";

export const logout = async () => {
  const res = await api.post("/auth/auth/logout");
  return res.data;
};

export const useLogoutMutation = () => {
  const navigate = useNavigate();
  const { setAuthenticated } = useAuthStore();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      localStorage.removeItem("authToken");
      setAuthenticated(false);
      navigate("/login");
    },
    onError: (error) => {
      console.error("Logout failed:", error);
    },
  });
};
