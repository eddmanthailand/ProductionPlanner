import { useQuery } from "@tanstack/react-query";
import type { Tenant } from "@/lib/auth";

export function useTenants() {
  return useQuery<Tenant[]>({
    queryKey: ["/api/tenants"],
    enabled: true
  });
}
