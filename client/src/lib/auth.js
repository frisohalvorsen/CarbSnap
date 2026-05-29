const KEY = "carbsnap.accessCode";

export function getAccessCode() {
  return localStorage.getItem(KEY) || "";
}

export function setAccessCode(code) {
  localStorage.setItem(KEY, code);
}

export function clearAccessCode() {
  localStorage.removeItem(KEY);
}

export function authHeader() {
  return { "x-access-code": getAccessCode() };
}
