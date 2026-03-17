export function getEmployeeDepartmentLabel(
  t: (key: string) => string,
  department: string,
) {
  const keyMap: Record<string, string> = {
    Dispecerat: "employees.departments.dispatch",
    Transport: "employees.departments.transport",
    Service: "employees.departments.service",
    Contabilitate: "employees.departments.accounting",
    Administrativ: "employees.departments.administrative",
  };

  return keyMap[department] ? t(keyMap[department]) : department;
}