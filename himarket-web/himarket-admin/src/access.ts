export const ADMIN_ACCESS_TOKEN_KEY = "access_token";

export function hasAdminAccess(
  readToken: (key: string) => string | null = key => {
    return localStorage.getItem(key);
  }
): boolean {
  return readToken(ADMIN_ACCESS_TOKEN_KEY) !== null;
}
