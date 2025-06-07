import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTenants } from "@/hooks/use-tenant";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Building, ChevronDown } from "lucide-react";

export default function TenantSelector() {
  const { tenant, updateTenant } = useAuth();
  const { data: tenants, isLoading } = useTenants();

  if (isLoading || !tenant) {
    return (
      <div className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 flex items-center space-x-2">
        <Building className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between bg-gray-50 hover:bg-gray-100 border-gray-300"
        >
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-medium">
                {tenant.name.substring(0, 2).toUpperCase()}
              </span>
            </div>
            <span className="font-medium text-sm truncate">{tenant.name}</span>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        {tenants?.map((t) => (
          <DropdownMenuItem
            key={t.id}
            onClick={() => updateTenant(t)}
            className={`flex items-center space-x-2 p-3 ${
              t.id === tenant.id ? "bg-blue-50" : ""
            }`}
          >
            <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-medium">
                {t.name.substring(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">{t.name}</p>
              <p className="text-xs text-gray-500">{t.plan}</p>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
