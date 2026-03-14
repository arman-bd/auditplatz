import { RETAIL_LOCATIONS, HEAD_OFFICE, COMPANY } from "../config.js";
import { genId } from "../utils.js";
import type { Location } from "../types.js";

export function generateLocations(): Location[] {
  const locations: Location[] = [];

  // Head office
  locations.push({
    id: genId(),
    code: HEAD_OFFICE.locationCode,
    type: "headquarters",
    name: `${COMPANY.name} - Headquarters`,
    city: HEAD_OFFICE.city,
    address: HEAD_OFFICE.address,
    postalCode: HEAD_OFFICE.postalCode,
    state: HEAD_OFFICE.state,
    openDate: COMPANY.founded,
    isActive: true,
  });

  // Retail stores
  for (const store of RETAIL_LOCATIONS) {
    locations.push({
      id: genId(),
      code: store.storeCode,
      type: "retail_store",
      name: `${COMPANY.name} - ${store.city}`,
      city: store.city,
      address: store.address,
      postalCode: store.postalCode,
      state: store.state,
      openDate: store.openDate,
      isActive: true,
    });
  }

  return locations;
}
