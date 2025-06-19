import React from "react";
import { usePageAccess, type AccessLevel } from "@/hooks/usePageAccess";
import { useLocation } from "wouter";

interface AccessControlProps {
  children: React.ReactNode;
  requiredLevel: AccessLevel;
  fallback?: React.ReactNode;
  pageUrl?: string;
}

export function AccessControl({ 
  children, 
  requiredLevel, 
  fallback = null, 
  pageUrl 
}: AccessControlProps) {
  const [location] = useLocation();
  const currentPageUrl = pageUrl || location;
  const { hasPermission } = usePageAccess(currentPageUrl);

  if (!hasPermission(requiredLevel)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Component สำหรับปุ่มที่ต้องการสิทธิ์เฉพาะ
interface ProtectedButtonProps {
  children: React.ReactNode;
  requiredLevel: AccessLevel;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  pageUrl?: string;
}

export function ProtectedButton({ 
  children, 
  requiredLevel, 
  className = "", 
  onClick, 
  disabled = false,
  pageUrl 
}: ProtectedButtonProps) {
  const [location] = useLocation();
  const currentPageUrl = pageUrl || location;
  const { hasPermission } = usePageAccess(currentPageUrl);

  const canAccess = hasPermission(requiredLevel);

  return (
    <button
      className={`${className} ${!canAccess ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={canAccess ? onClick : undefined}
      disabled={disabled || !canAccess}
      title={!canAccess ? `ต้องมีสิทธิ์ระดับ ${requiredLevel} ขึ้นไป` : ''}
    >
      {children}
    </button>
  );
}