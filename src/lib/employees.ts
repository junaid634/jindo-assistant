import { loadEmployeesFile } from './config';

export type Employee = {
  id: string;
  name: string;
  mondayUserId: string;
  mondayName: string;
  phone: string;
  role?: string;
};

let cache: Employee[] | null = null;

export function getEmployees(): Employee[] {
  if (cache) return cache;
  const raw = loadEmployeesFile() as Employee[];
  cache = Array.isArray(raw) ? raw : [];
  return cache;
}

export function findEmployee(query: string): Employee | undefined {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;
  const list = getEmployees();
  return (
    list.find((e) => e.name.toLowerCase() === q) ||
    list.find((e) => e.name.toLowerCase().startsWith(q)) ||
    list.find((e) => e.name.toLowerCase().includes(q)) ||
    list.find((e) => e.id.toLowerCase() === q)
  );
}

export function resetEmployeeCache() {
  cache = null;
}
