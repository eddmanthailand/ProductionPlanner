import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    refetchOnWindowFocus: true,
    staleTime: 30000, // 30 seconds
    queryFn: async () => {
      const res = await fetch("/api/auth/user", {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (res.status === 401) {
        return null; // Return null for unauthorized instead of throwing
      }
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      return res.json();
    }
  });

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user && !error,
  };
}