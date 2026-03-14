// M&H Wearables - Company Configuration

export const COMPANY = {
  name: "M&H Wearables GmbH",
  founded: "2015-03-01",
  taxId: "DE298374651",
  headquarterCity: "Munich",
  industry: "Retail - Wearable Technology & Fashion",
  currency: "EUR",
};

export const RETAIL_LOCATIONS = [
  { city: "Berlin", address: "Kurfürstendamm 45", postalCode: "10719", state: "Berlin", storeCode: "BER-01", openDate: "2016-06-15" },
  { city: "Munich", address: "Maximilianstraße 22", postalCode: "80539", state: "Bavaria", storeCode: "MUC-01", openDate: "2015-09-01" },
  { city: "Hamburg", address: "Mönckebergstraße 18", postalCode: "20095", state: "Hamburg", storeCode: "HAM-01", openDate: "2016-11-01" },
  { city: "Frankfurt", address: "Zeil 78", postalCode: "60313", state: "Hesse", storeCode: "FRA-01", openDate: "2017-03-15" },
  { city: "Cologne", address: "Schildergasse 32", postalCode: "50667", state: "North Rhine-Westphalia", storeCode: "CGN-01", openDate: "2017-08-01" },
  { city: "Stuttgart", address: "Königstraße 15", postalCode: "70173", state: "Baden-Württemberg", storeCode: "STR-01", openDate: "2018-01-15" },
  { city: "Düsseldorf", address: "Königsallee 60", postalCode: "40212", state: "North Rhine-Westphalia", storeCode: "DUS-01", openDate: "2018-05-01" },
  { city: "Dortmund", address: "Westenhellweg 44", postalCode: "44137", state: "North Rhine-Westphalia", storeCode: "DTM-01", openDate: "2018-09-15" },
  { city: "Leipzig", address: "Petersstraße 28", postalCode: "04109", state: "Saxony", storeCode: "LEJ-01", openDate: "2019-02-01" },
  { city: "Hannover", address: "Bahnhofstraße 10", postalCode: "30159", state: "Lower Saxony", storeCode: "HAJ-01", openDate: "2019-06-01" },
  { city: "Nuremberg", address: "Karolinenstraße 5", postalCode: "90402", state: "Bavaria", storeCode: "NUE-01", openDate: "2019-10-01" },
  { city: "Dresden", address: "Prager Straße 12", postalCode: "01069", state: "Saxony", storeCode: "DRS-01", openDate: "2020-02-01" },
  { city: "Bremen", address: "Obernstraße 33", postalCode: "28195", state: "Bremen", storeCode: "BRE-01", openDate: "2020-07-01" },
  { city: "Essen", address: "Kettwiger Straße 20", postalCode: "45127", state: "North Rhine-Westphalia", storeCode: "ESS-01", openDate: "2021-01-15" },
  { city: "Mannheim", address: "Planken O5", postalCode: "68161", state: "Baden-Württemberg", storeCode: "MHG-01", openDate: "2021-06-01" },
  { city: "Bonn", address: "Poststraße 8", postalCode: "53111", state: "North Rhine-Westphalia", storeCode: "BNO-01", openDate: "2022-03-01" },
  { city: "Augsburg", address: "Annastraße 14", postalCode: "86150", state: "Bavaria", storeCode: "AGB-01", openDate: "2022-09-01" },
  { city: "Wiesbaden", address: "Kirchgasse 25", postalCode: "65185", state: "Hesse", storeCode: "WIE-01", openDate: "2023-01-15" },
];

export const HEAD_OFFICE = {
  city: "Munich",
  address: "Leopoldstraße 120",
  postalCode: "80802",
  state: "Bavaria",
  locationCode: "HQ-MUC",
  employeeCount: 250,
};

export const STORE_EMPLOYEE_RANGE = { min: 8, max: 12 };

export const ERROR_RATE = 0.015; // 1.5%

// HQ Departments and their approximate headcounts
export const HQ_DEPARTMENTS = [
  { name: "Executive Management", headcount: 8 },
  { name: "Finance & Accounting", headcount: 25 },
  { name: "Human Resources", headcount: 18 },
  { name: "IT & Digital", headcount: 30 },
  { name: "Marketing & Brand", headcount: 22 },
  { name: "Product Development", headcount: 35 },
  { name: "Supply Chain & Logistics", headcount: 28 },
  { name: "Legal & Compliance", headcount: 12 },
  { name: "Sales & Business Development", headcount: 20 },
  { name: "Customer Service", headcount: 25 },
  { name: "Quality Assurance", headcount: 15 },
  { name: "Operations", headcount: 12 },
];

// Retail store departments
export const STORE_ROLES = [
  "Store Manager",
  "Assistant Manager",
  "Sales Associate",
  "Sales Associate",
  "Sales Associate",
  "Cashier",
  "Cashier",
  "Stock Associate",
  "Stock Associate",
  "Visual Merchandiser",
  "Customer Service Representative",
  "Part-Time Sales Associate",
];

// Product categories M&H Wearables sells
export const PRODUCT_CATEGORIES = [
  { category: "Smartwatches", avgPrice: 249.99, skuPrefix: "SW" },
  { category: "Fitness Trackers", avgPrice: 89.99, skuPrefix: "FT" },
  { category: "Smart Rings", avgPrice: 199.99, skuPrefix: "SR" },
  { category: "Smart Glasses", avgPrice: 349.99, skuPrefix: "SG" },
  { category: "Wearable Accessories", avgPrice: 39.99, skuPrefix: "WA" },
  { category: "Replacement Bands", avgPrice: 24.99, skuPrefix: "RB" },
  { category: "Charging Accessories", avgPrice: 29.99, skuPrefix: "CA" },
  { category: "Premium Collections", avgPrice: 499.99, skuPrefix: "PC" },
];

// Vendor / supplier names
export const VENDORS = [
  { name: "TechParts GmbH", country: "Germany", category: "Electronics Components" },
  { name: "SilkBand Manufacturing Co.", country: "China", category: "Watch Bands" },
  { name: "OptiGlass AG", country: "Switzerland", category: "Display Glass" },
  { name: "ChipWorks Taiwan Ltd.", country: "Taiwan", category: "Semiconductors" },
  { name: "PackRight Verpackungen", country: "Germany", category: "Packaging" },
  { name: "CleanTech Supplies GmbH", country: "Germany", category: "Facility Supplies" },
  { name: "SecureIT Solutions", country: "Germany", category: "IT Services" },
  { name: "LogiMove Transport", country: "Germany", category: "Logistics" },
  { name: "DesignHaus Berlin", country: "Germany", category: "Design Services" },
  { name: "QualityFirst Testing", country: "Germany", category: "QA Services" },
  { name: "Shenzhen Display Tech", country: "China", category: "OLED Displays" },
  { name: "BatteryPower Korea", country: "South Korea", category: "Batteries" },
];

// Date range for data generation
export const DATA_START_DATE = "2020-01-01";
export const DATA_END_DATE = "2025-12-31";

// German public holidays (approximate, some vary by state)
export const GERMAN_HOLIDAYS = [
  "01-01", // Neujahrstag
  "01-06", // Heilige Drei Könige (Bavaria)
  "05-01", // Tag der Arbeit
  "10-03", // Tag der Deutschen Einheit
  "12-25", // Weihnachtstag
  "12-26", // Zweiter Weihnachtstag
];
