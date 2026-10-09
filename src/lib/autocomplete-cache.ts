/**
 * Autocomplete and Smart Customer Directory
 * Automatically pulls real customer profiles from:
 * 1. Live Server API: /api/receipts (all saved database records like Nilesh Yadav, Rishab Yadav, Kishlay Yadav)
 * 2. Local Storage client receipts
 */

import { IReceipt } from '../types/receipt';
import { getClientReceipts } from './client-storage';

const CUSTOMERS_MAP_KEY = 'kruti_real_customers_v2';

export interface CustomerProfile {
  customerName: string;
  mobileNumber: string;
  lastVisit?: string;
  previousBrands?: string[];
  lastReceipt?: string;
  lastEstimatedCost?: number;
}

export interface AutocompleteCache {
  customerNames: string[];
  mobileNumbers: string[];
  brands: string[];
  models: string[];
  faults: string[];
}

const COMMON_BRANDS = [
  'Sony',
  'Samsung',
  'LG',
  'Mi (Xiaomi)',
  'OnePlus',
  'TCL',
  'Vu',
  'Panasonic',
  'Realme',
  'Haier',
  'Micromax',
  'Lloyd',
  'TOSHIBA',
  'Sansui',
  'BPL',
  'Onida',
  'Thomson',
  'Kodak',
  'Intex',
  'Videocon',
];

const COMMON_FAULTS = [
  'No Display / Black Screen',
  'Dead (No Power / Red light blinking)',
  'Sound OK, Screen Blank',
  'Horizontal / Vertical Lines on screen',
  'Display Double Image / Flickering',
  'HDMI Ports Not Working',
  'Restarting Repeatedly / Smart OS Hang',
  'Sound Not Working / Distorted',
  'Panel Water Damage / COF Issue',
  'Motherboard Repair',
  'Power Supply Board Problem',
  'Wifi Not Connecting / Remote Not Working',
];

let inMemoryProfiles: CustomerProfile[] = [];

/**
 * Sync profiles from server receipts into cache
 */
export async function syncCustomerProfilesFromServer(): Promise<CustomerProfile[]> {
  try {
    const res = await fetch('/api/receipts?limit=500');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.receipts)) {
        addReceiptsToCustomerProfiles(data.receipts);
      }
    }
  } catch {}
  return getSavedCustomerProfiles();
}

/**
 * Add a list of receipts to customer directory
 */
export function addReceiptsToCustomerProfiles(receipts: IReceipt[]) {
  if (!Array.isArray(receipts)) return;
  const current = getSavedCustomerProfiles();
  const map = new Map<string, CustomerProfile>();

  current.forEach((p) => {
    const key = p.mobileNumber.slice(-10);
    map.set(key, p);
  });

  receipts.forEach((r) => {
    const name = r.customerName?.trim();
    const mob = r.mobileNumber?.replace(/\D/g, '').slice(-10);
    if (name && mob && mob.length >= 10) {
      const existing = map.get(mob);
      const brands = r.tvs?.map((tv) => tv.brand).filter(Boolean) || [];

      if (existing) {
        existing.customerName = name;
        existing.previousBrands = Array.from(new Set([...(existing.previousBrands || []), ...brands]));
        if (!existing.lastReceipt || r.serialNumber > existing.lastReceipt) {
          existing.lastReceipt = r.serialNumber;
          existing.lastVisit = r.receivedDate || existing.lastVisit;
        }
      } else {
        map.set(mob, {
          customerName: name,
          mobileNumber: mob,
          lastVisit: r.receivedDate || (r as any).createdAt,
          lastReceipt: r.serialNumber,
          previousBrands: brands,
          lastEstimatedCost: r.tvs?.[0]?.estimatedCost,
        });
      }
    }
  });

  const merged = Array.from(map.values());
  inMemoryProfiles = merged;
  try {
    localStorage.setItem(CUSTOMERS_MAP_KEY, JSON.stringify(merged.slice(0, 500)));
  } catch {}
}

export function getSavedCustomerProfiles(): CustomerProfile[] {
  if (inMemoryProfiles.length > 0) return inMemoryProfiles;

  const map = new Map<string, CustomerProfile>();

  try {
    const raw = localStorage.getItem(CUSTOMERS_MAP_KEY);
    if (raw) {
      const list: CustomerProfile[] = JSON.parse(raw);
      if (Array.isArray(list)) {
        list.forEach((p) => {
          const mob = p.mobileNumber?.replace(/\D/g, '').slice(-10);
          if (mob && p.customerName) {
            map.set(mob, p);
          }
        });
      }
    }
  } catch {}

  try {
    const receipts = getClientReceipts();
    if (Array.isArray(receipts)) {
      receipts.forEach((r) => {
        const name = r.customerName?.trim();
        const mob = r.mobileNumber?.replace(/\D/g, '').slice(-10);
        if (name && mob && mob.length === 10) {
          const existing = map.get(mob);
          const brands = r.tvs?.map((tv) => tv.brand).filter(Boolean) || [];

          if (existing) {
            existing.customerName = name;
            existing.previousBrands = Array.from(new Set([...(existing.previousBrands || []), ...brands]));
            if (!existing.lastReceipt || r.serialNumber > existing.lastReceipt) {
              existing.lastReceipt = r.serialNumber;
              existing.lastVisit = r.receivedDate;
            }
          } else {
            map.set(mob, {
              customerName: name,
              mobileNumber: mob,
              lastVisit: r.receivedDate || (r as any).createdAt,
              lastReceipt: r.serialNumber,
              previousBrands: brands,
              lastEstimatedCost: r.tvs?.[0]?.estimatedCost,
            });
          }
        }
      });
    }
  } catch {}

  const result = Array.from(map.values());
  inMemoryProfiles = result;
  return result;
}

export function searchCustomerProfiles(query: string): CustomerProfile[] {
  const clean = query.trim().toLowerCase();
  if (!clean) return [];

  const profiles = getSavedCustomerProfiles();
  const digitOnly = clean.replace(/\D/g, '');

  return profiles
    .filter((p) => {
      const name = p.customerName.toLowerCase();
      const phone = p.mobileNumber;

      const nameMatch = name.includes(clean);
      const phoneMatch = digitOnly.length > 0 && phone.includes(digitOnly);
      return nameMatch || phoneMatch;
    })
    .sort((a, b) => {
      const aStarts = a.customerName.toLowerCase().startsWith(clean);
      const bStarts = b.customerName.toLowerCase().startsWith(clean);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return a.customerName.localeCompare(b.customerName);
    });
}

export function findCustomerByName(name: string): CustomerProfile | undefined {
  if (!name || name.trim().length < 2) return undefined;
  const profiles = getSavedCustomerProfiles();
  const search = name.trim().toLowerCase();
  return profiles.find((p) => p.customerName.trim().toLowerCase() === search);
}

export function findCustomerByMobile(mobile: string): CustomerProfile | undefined {
  if (!mobile) return undefined;
  const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
  if (cleanMobile.length < 5) return undefined;
  const profiles = getSavedCustomerProfiles();
  return profiles.find((p) => p.mobileNumber.replace(/\D/g, '').endsWith(cleanMobile));
}

export function saveAutocompleteEntry(entry: {
  customerName?: string;
  mobileNumber?: string;
  brand?: string;
  model?: string;
  fault?: string;
  receiptNumber?: string;
}) {
  if (typeof window === 'undefined') return;
  try {
    const cName = entry.customerName?.trim();
    const cMob = entry.mobileNumber?.replace(/\D/g, '').slice(-10);

    if (cName && cName.length >= 2 && cMob && cMob.length === 10) {
      const profiles = getSavedCustomerProfiles();
      const existingIdx = profiles.findIndex((p) => p.mobileNumber === cMob);

      const updatedProfile: CustomerProfile = {
        customerName: cName,
        mobileNumber: cMob,
        lastVisit: new Date().toISOString().split('T')[0],
        previousBrands: entry.brand ? [entry.brand] : [],
        lastReceipt: entry.receiptNumber,
      };

      if (existingIdx >= 0) {
        const prevBrands = profiles[existingIdx].previousBrands || [];
        const mergedBrands = entry.brand
          ? Array.from(new Set([entry.brand, ...prevBrands]))
          : prevBrands;

        profiles[existingIdx] = {
          ...profiles[existingIdx],
          customerName: cName,
          mobileNumber: cMob,
          lastVisit: updatedProfile.lastVisit,
          previousBrands: mergedBrands,
          lastReceipt: entry.receiptNumber || profiles[existingIdx].lastReceipt,
        };
      } else {
        profiles.unshift(updatedProfile);
      }

      inMemoryProfiles = profiles;
      localStorage.setItem(CUSTOMERS_MAP_KEY, JSON.stringify(profiles.slice(0, 500)));
    }
  } catch (e) {}
}

export function getAutocompleteCache(): AutocompleteCache {
  const profiles = getSavedCustomerProfiles();
  return {
    customerNames: profiles.map((p) => p.customerName),
    mobileNumbers: profiles.map((p) => p.mobileNumber),
    brands: COMMON_BRANDS,
    models: [],
    faults: COMMON_FAULTS,
  };
}