import { faker } from "@faker-js/faker/locale/de";
import {
  HEAD_OFFICE,
  HQ_DEPARTMENTS,
  STORE_EMPLOYEE_RANGE,
  STORE_ROLES,
  DATA_START_DATE,
} from "../config.js";
import {
  genId,
  randomInt,
  generateGermanIBAN,
  generateGermanTaxId,
  generateSocialSecurityNumber,
  SequentialCounter,
  shouldInjectError,
  pick,
} from "../utils.js";
import type { Employee, Location } from "../types.js";

const counter = new SequentialCounter();

// Salary ranges by role type (annual, EUR)
const SALARY_RANGES: Record<string, [number, number]> = {
  "Executive Management": [120000, 250000],
  "Finance & Accounting": [45000, 85000],
  "Human Resources": [42000, 75000],
  "IT & Digital": [50000, 95000],
  "Marketing & Brand": [40000, 78000],
  "Product Development": [48000, 92000],
  "Supply Chain & Logistics": [38000, 72000],
  "Legal & Compliance": [55000, 100000],
  "Sales & Business Development": [42000, 80000],
  "Customer Service": [32000, 55000],
  "Quality Assurance": [40000, 70000],
  Operations: [38000, 68000],
  // Store roles
  "Store Manager": [48000, 62000],
  "Assistant Manager": [38000, 48000],
  "Sales Associate": [28000, 36000],
  Cashier: [26000, 32000],
  "Stock Associate": [26000, 32000],
  "Visual Merchandiser": [30000, 40000],
  "Customer Service Representative": [28000, 35000],
  "Part-Time Sales Associate": [14000, 20000],
};

const HQ_JOB_TITLES: Record<string, string[]> = {
  "Executive Management": ["CEO", "CFO", "COO", "CTO", "VP of Strategy", "VP of Operations", "Chief of Staff", "Executive Assistant"],
  "Finance & Accounting": ["Finance Director", "Senior Accountant", "Accountant", "Financial Analyst", "Accounts Payable Specialist", "Accounts Receivable Specialist", "Payroll Manager", "Tax Specialist", "Budget Analyst", "Controller"],
  "Human Resources": ["HR Director", "HR Manager", "Recruiter", "HR Business Partner", "Compensation Analyst", "Training Coordinator", "HR Generalist", "Benefits Administrator"],
  "IT & Digital": ["IT Director", "Software Engineer", "Senior Developer", "DevOps Engineer", "Data Analyst", "IT Support Specialist", "System Administrator", "Cybersecurity Analyst", "UX Designer", "Database Administrator"],
  "Marketing & Brand": ["Marketing Director", "Brand Manager", "Digital Marketing Specialist", "Content Creator", "Social Media Manager", "Marketing Analyst", "PR Specialist", "Graphic Designer"],
  "Product Development": ["VP of Product", "Product Manager", "Senior Product Designer", "Product Designer", "Hardware Engineer", "Firmware Engineer", "R&D Specialist", "Prototype Technician", "Product Analyst"],
  "Supply Chain & Logistics": ["Supply Chain Director", "Procurement Manager", "Logistics Coordinator", "Warehouse Manager", "Inventory Analyst", "Purchasing Agent", "Shipping Coordinator"],
  "Legal & Compliance": ["General Counsel", "Senior Legal Counsel", "Compliance Officer", "Paralegal", "Contract Specialist", "Data Protection Officer"],
  "Sales & Business Development": ["Sales Director", "Business Development Manager", "Account Executive", "Sales Analyst", "Key Account Manager", "Sales Operations Coordinator"],
  "Customer Service": ["Customer Service Manager", "Customer Service Lead", "Customer Service Agent", "Returns Specialist", "Complaint Resolution Specialist"],
  "Quality Assurance": ["QA Director", "QA Engineer", "QA Analyst", "Test Engineer", "Quality Inspector"],
  Operations: ["Operations Director", "Facilities Manager", "Office Manager", "Administrative Assistant", "Receptionist"],
};

function generateEmployee(
  locationId: string,
  department: string,
  jobTitle: string,
  employmentType: "full_time" | "part_time" | "contractor",
  hireDate: string,
  managerId: string | null,
  isGhostEmployee: boolean = false
): Employee {
  const salaryRange = SALARY_RANGES[department] || SALARY_RANGES[jobTitle] || [30000, 50000];
  let salary = randomInt(salaryRange[0], salaryRange[1]);

  if (employmentType === "part_time") {
    salary = Math.round(salary * 0.5);
  }

  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const empNumber = counter.next("MH");

  // Ghost employees are terminated but may still appear on payroll (error)
  const isActive = !isGhostEmployee;
  const terminationDate = isGhostEmployee
    ? faker.date.between({ from: hireDate, to: "2025-06-30" }).toISOString().split("T")[0]
    : null;

  return {
    id: genId(),
    employeeNumber: empNumber,
    firstName,
    lastName,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@mh-wearables.de`,
    phone: faker.phone.number(),
    dateOfBirth: faker.date
      .between({ from: "1965-01-01", to: "2002-12-31" })
      .toISOString()
      .split("T")[0],
    hireDate,
    terminationDate,
    locationId,
    department,
    jobTitle,
    employmentType,
    annualSalary: salary,
    bankIban: generateGermanIBAN(),
    taxId: generateGermanTaxId(),
    socialSecurityNumber: generateSocialSecurityNumber(),
    managerId,
    isActive,
  };
}

export function generateEmployees(locations: Location[]): Employee[] {
  const employees: Employee[] = [];
  const hq = locations.find((l) => l.type === "headquarters")!;
  const stores = locations.filter((l) => l.type === "retail_store");

  // ─── HQ Employees ───
  for (const dept of HQ_DEPARTMENTS) {
    const titles = HQ_JOB_TITLES[dept.name] || ["Specialist"];
    let managerId: string | null = null;

    for (let i = 0; i < dept.headcount; i++) {
      const title = titles[Math.min(i, titles.length - 1)];
      const isManager = i === 0;
      const hireDate = faker.date
        .between({ from: "2015-03-01", to: "2024-06-01" })
        .toISOString()
        .split("T")[0];

      const emp = generateEmployee(
        hq.id,
        dept.name,
        title,
        "full_time",
        hireDate,
        isManager ? null : managerId
      );

      if (isManager) managerId = emp.id;
      employees.push(emp);
    }
  }

  // ─── Store Employees ───
  for (const store of stores) {
    const numEmployees = randomInt(STORE_EMPLOYEE_RANGE.min, STORE_EMPLOYEE_RANGE.max);
    let storeManagerId: string | null = null;

    for (let i = 0; i < numEmployees; i++) {
      const role = STORE_ROLES[Math.min(i, STORE_ROLES.length - 1)];
      const isPartTime = role === "Part-Time Sales Associate";
      const hireDate = faker.date
        .between({ from: store.openDate, to: "2025-01-01" })
        .toISOString()
        .split("T")[0];

      const emp = generateEmployee(
        store.id,
        "Retail",
        role,
        isPartTime ? "part_time" : "full_time",
        hireDate,
        i === 0 ? null : storeManagerId
      );

      if (i === 0) storeManagerId = emp.id;
      employees.push(emp);
    }
  }

  // ─── Ghost Employees (error injection) ───
  // ~1.5% of total employees will be ghost employees (terminated but still on payroll)
  const ghostCount = Math.max(1, Math.round(employees.length * 0.005));
  for (let i = 0; i < ghostCount; i++) {
    const location = pick(locations);
    const emp = generateEmployee(
      location.id,
      location.type === "headquarters" ? pick(HQ_DEPARTMENTS).name : "Retail",
      "Sales Associate",
      "full_time",
      faker.date.between({ from: "2018-01-01", to: "2023-01-01" }).toISOString().split("T")[0],
      null,
      true // ghost employee
    );
    employees.push(emp);
  }

  return employees;
}
