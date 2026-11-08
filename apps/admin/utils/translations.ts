import { Database } from "@/database.types";

type Role = Database["public"]["Enums"]["role"];

/**
 * Translates role enum values to Japanese
 * @param role The role enum value to translate
 * @returns The Japanese translation of the role
 */
export function translateRoleToJapanese(role: Role | null | undefined): string {
  if (!role) return "未設定";
  
  const translations: Record<Role, string> = {
    "admin": "管理者",
    "manager": "マネージャー",
    "appUser": "ユーザー"
  };
  
  return translations[role] || role;
}

/**
 * Gets all available roles with their Japanese translations
 * @returns An array of objects containing the role value and its Japanese translation
 */
export function getAvailableRoles(): { value: Role; label: string }[] {
  return [
    { value: "admin", label: "管理者" },
    { value: "manager", label: "マネージャー" },
    { value: "appUser", label: "ユーザー" }
  ];
}
