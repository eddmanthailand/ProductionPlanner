import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on 401 (unauthorized)
      if (error?.message?.includes("401")) {
        return false;
      }
      return failureCount < 3;
    }
  });

  const isAuthenticated = !!user;

  return {
    user,
    isLoading,
    error,
    isAuthenticated,
  };
}
