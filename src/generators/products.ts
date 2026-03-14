import { PRODUCT_CATEGORIES } from "../config.js";
import { genId, randomFloat, round2, SequentialCounter } from "../utils.js";
import type { Product } from "../types.js";

const counter = new SequentialCounter();

const PRODUCT_NAMES: Record<string, string[]> = {
  Smartwatches: [
    "M&H Pulse Pro", "M&H Pulse Lite", "M&H Chrono X", "M&H Chrono Sport",
    "M&H Urban Watch", "M&H Executive Time", "M&H FitWatch 3", "M&H FitWatch 5",
    "M&H Luxe Watch", "M&H Active Series",
  ],
  "Fitness Trackers": [
    "M&H FitBand Slim", "M&H FitBand Pro", "M&H StepTracker", "M&H RunMate",
    "M&H SwimTrack", "M&H CycleTrack", "M&H HealthBand", "M&H SportBand Mini",
  ],
  "Smart Rings": [
    "M&H RingSense", "M&H RingSense Pro", "M&H SleepRing", "M&H VitalRing",
    "M&H TitanRing", "M&H AuraRing",
  ],
  "Smart Glasses": [
    "M&H VisionFrame", "M&H VisionFrame Sport", "M&H AudioSpec", "M&H LightView",
    "M&H SmartShade", "M&H AR Lens Pro",
  ],
  "Wearable Accessories": [
    "M&H Earbuds Pro", "M&H Earbuds Lite", "M&H ClipSensor", "M&H TempPatch",
    "M&H PostureTag", "M&H UV Monitor", "M&H Hydration Tracker",
  ],
  "Replacement Bands": [
    "Silicone Band - Standard", "Silicone Band - Sport", "Leather Band - Classic",
    "Leather Band - Premium", "Metal Band - Steel", "Metal Band - Titanium",
    "Nylon Band - Woven", "Fabric Band - Stretch",
  ],
  "Charging Accessories": [
    "Wireless Charging Pad", "Dual Charger Station", "USB-C Cable 1m", "USB-C Cable 2m",
    "Portable Charger Case", "Car Charger Adapter", "Travel Charging Kit",
  ],
  "Premium Collections": [
    "M&H Signature Gold", "M&H Signature Platinum", "M&H Carbon Edition",
    "M&H Sapphire Series", "M&H Limited Artist Edition",
  ],
};

export function generateProducts(): Product[] {
  const products: Product[] = [];

  for (const cat of PRODUCT_CATEGORIES) {
    const names = PRODUCT_NAMES[cat.category] || [`${cat.category} Item`];

    for (const name of names) {
      const sku = counter.next(cat.skuPrefix, 4);
      const unitPrice = round2(cat.avgPrice * randomFloat(0.7, 1.4));
      const margin = randomFloat(0.35, 0.65);
      const costPrice = round2(unitPrice * (1 - margin));

      products.push({
        id: genId(),
        sku,
        name,
        category: cat.category,
        unitPrice,
        costPrice,
        isActive: Math.random() > 0.05, // 5% discontinued
      });
    }
  }

  return products;
}
