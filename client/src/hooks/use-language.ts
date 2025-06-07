import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";

type Language = "th" | "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  th: {
    // Header & Navigation
    "app.title": "ProductionPro",
    "app.subtitle": "ระบบวางแผนการผลิตและบัญชี",
    "nav.dashboard": "แดชบอร์ด",
    "nav.production": "วางแผนการผลิต",
    "nav.accounting": "ระบบบัญชี",
    "nav.inventory": "สินค้าคงคลัง",
    "nav.reports": "รายงาน",
    "nav.users": "จัดการผู้ใช้",
    "nav.logout": "ออกจากระบบ",
    
    // Dashboard
    "dashboard.title": "แดชบอร์ด",
    "dashboard.welcome": "ยินดีต้อนรับ",
    "dashboard.revenue": "รายได้",
    "dashboard.growth": "เติบโต",
    "dashboard.expenses": "ค่าใช้จ่าย",
    "dashboard.profit": "กำไรสุทธิ",
    "dashboard.pending_orders": "ออเดอร์รอดำเนินการ",
    "dashboard.active_users": "ผู้ใช้งานระบบ",
    "dashboard.low_stock": "สินค้าใกล้หมด",
    "dashboard.inventory_value": "มูลค่าสินค้าคงคลัง",
    "dashboard.production_schedule": "แผนการผลิต",
    "dashboard.financial_summary": "สรุปทางการเงิน",
    "dashboard.recent_activities": "กิจกรรมล่าสุด",
    "dashboard.view_all": "ดูทั้งหมด",
    
    // Login
    "login.title": "เข้าสู่ระบบ",
    "login.subtitle": "เข้าสู่ระบบเพื่อจัดการการผลิตและบัญชี",
    "login.username": "ชื่อผู้ใช้",
    "login.password": "รหัสผ่าน",
    "login.button": "เข้าสู่ระบบ",
    "login.loading": "กำลังเข้าสู่ระบบ...",
    
    // Common
    "common.loading": "กำลังโหลด...",
    "common.save": "บันทึก",
    "common.cancel": "ยกเลิก",
    "common.edit": "แก้ไข",
    "common.delete": "ลบ",
    "common.add": "เพิ่ม",
    "common.search": "ค้นหา",
    "common.status": "สถานะ",
    "common.date": "วันที่",
    "common.amount": "จำนวน",
    "common.description": "รายละเอียด",
  },
  en: {
    // Header & Navigation
    "app.title": "ProductionPro",
    "app.subtitle": "Production Planning & Accounting System",
    "nav.dashboard": "Dashboard",
    "nav.production": "Production Planning",
    "nav.accounting": "Accounting",
    "nav.inventory": "Inventory",
    "nav.reports": "Reports",
    "nav.users": "User Management",
    "nav.logout": "Logout",
    
    // Dashboard
    "dashboard.title": "Dashboard",
    "dashboard.welcome": "Welcome",
    "dashboard.revenue": "Revenue",
    "dashboard.growth": "Growth",
    "dashboard.expenses": "Expenses",
    "dashboard.profit": "Net Profit",
    "dashboard.pending_orders": "Pending Orders",
    "dashboard.active_users": "Active Users",
    "dashboard.low_stock": "Low Stock Items",
    "dashboard.inventory_value": "Inventory Value",
    "dashboard.production_schedule": "Production Schedule",
    "dashboard.financial_summary": "Financial Summary",
    "dashboard.recent_activities": "Recent Activities",
    "dashboard.view_all": "View All",
    
    // Login
    "login.title": "Sign In",
    "login.subtitle": "Sign in to manage production and accounting",
    "login.username": "Username",
    "login.password": "Password",
    "login.button": "Sign In",
    "login.loading": "Signing in...",
    
    // Common
    "common.loading": "Loading...",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.edit": "Edit",
    "common.delete": "Delete",
    "common.add": "Add",
    "common.search": "Search",
    "common.status": "Status",
    "common.date": "Date",
    "common.amount": "Amount",
    "common.description": "Description",
  }
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem("language");
    return (saved as Language) || "th";
  });

  useEffect(() => {
    localStorage.setItem("language", language);
  }, [language]);

  const t = useCallback((key: string): string => {
    return translations[language][key as keyof typeof translations[typeof language]] || key;
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    t
  }), [language, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}