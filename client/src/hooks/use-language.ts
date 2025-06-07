import { useState, useEffect, useCallback } from "react";

type Language = "th" | "en";

const translations = {
  th: {
    "nav.dashboard": "แดชบอร์ด",
    "nav.production": "วางแผนการผลิต",
    "nav.accounting": "ระบบบัญชี",
    "nav.inventory": "สินค้าคงคลัง",
    "nav.reports": "รายงาน",
    "nav.users": "จัดการผู้ใช้",
    "nav.logout": "ออกจากระบบ",
    "dashboard.title": "แดชบอร์ด",
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
    "login.title": "เข้าสู่ระบบ",
    "login.subtitle": "เข้าสู่ระบบเพื่อจัดการการผลิตและบัญชี",
    "login.username": "ชื่อผู้ใช้",
    "login.password": "รหัสผ่าน",
    "login.button": "เข้าสู่ระบบ",
    "common.loading": "กำลังโหลด...",
  },
  en: {
    "nav.dashboard": "Dashboard",
    "nav.production": "Production Planning",
    "nav.accounting": "Accounting",
    "nav.inventory": "Inventory",
    "nav.reports": "Reports",
    "nav.users": "User Management",
    "nav.logout": "Logout",
    "dashboard.title": "Dashboard",
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
    "login.title": "Sign In",
    "login.subtitle": "Sign in to manage production and accounting",
    "login.username": "Username",
    "login.password": "Password",
    "login.button": "Sign In",
    "common.loading": "Loading...",
  }
};

let currentLanguage: Language = "th";

export function useLanguage() {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("language");
    currentLanguage = (saved as Language) || "th";
    return currentLanguage;
  });

  const setLanguage = useCallback((newLanguage: Language) => {
    currentLanguage = newLanguage;
    localStorage.setItem("language", newLanguage);
    setLanguageState(newLanguage);
  }, []);

  const t = useCallback((key: string): string => {
    return translations[language][key as keyof typeof translations[typeof language]] || key;
  }, [language]);

  return {
    language,
    setLanguage,
    t
  };
}