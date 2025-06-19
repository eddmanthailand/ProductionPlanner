import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    refetchOnWindowFocus: true,
    staleTime: 0,
    queryFn: async () => {
      const res = await fetch("/api/auth/user", {
        credentials: 'include',
        cache: 'no-cache',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        }
      });
      
      if (res.status === 401) {
        return null;
      }
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const userData = await res.json();
      console.log("User data received from API:", userData);
      return userData;
    }
  });

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user && !error,
  };
}