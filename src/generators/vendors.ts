import { faker } from "@faker-js/faker/locale/de";
import { VENDORS } from "../config.js";
import { genId } from "../utils.js";

export interface VendorRecord {
  id: string;
  name: string;
  country: string;
  category: string;
  contactEmail: string;
  contactPhone: string;
  taxId: string;
  isActive: boolean;
}

export function generateVendors(): VendorRecord[] {
  return VENDORS.map((v) => ({
    id: genId(),
    name: v.name,
    country: v.country,
    category: v.category,
    contactEmail: `contact@${v.name.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
    contactPhone: faker.phone.number(),
    taxId: v.country === "Germany" ? `DE${faker.string.numeric(9)}` : faker.string.numeric(12),
    isActive: true,
  }));
}
