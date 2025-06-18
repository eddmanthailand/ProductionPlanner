import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    refetchOnWindowFocus: true,
    staleTime: 30000, // 30 seconds
  });

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user && !error,
  };
}