/**
 * Utility to cache autocomplete suggestions & customer profiles in localStorage
 * for Customer Name, Mobile Number, Brand/Product, Fault/Complaint, and Model
 */

const STORAGE_KEY = 'kruti_autocomplete_cache_v2';
const CUSTOMERS_MAP_KEY = 'kruti_customer_profiles_v1';

export interface CustomerProfile {
  customerName: string;
  mobileNumber: string;
  lastVisit?: string;
  previousBrands?: string[];
}

export interface AutocompleteCache {
  customerNames: string[];
  mobileNumbers: string[];
  brands: string[];
  models: string[];
  faults: string[];
}

const DEFAULT_CACHE: AutocompleteCache = {
  customerNames: ['Raju', 'Rajvir', 'Ramesh', 'Rahul', 'Mahesh', 'Suresh', 'Amit'],
  mobileNumbers: ['7778833577'],
  brands: ['Samsung', 'LG', 'Sony', 'Mi / Xiaomi', 'OnePlus', 'TCL', 'Vu', 'Panasonic', 'Realme', 'Haier'],
  models: [],
  faults: [
    'No Display (Sound OK / Backlight issue)',
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
  ],
};

export function getAutocompleteCache(): AutocompleteCache {
  if (typeof window === 'undefined') return DEFAULT_CACHE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CACHE));
      return DEFAULT_CACHE;
    }
    const parsed = JSON.parse(raw);
    return {
      customerNames: Array.isArray(parsed.customerNames) ? parsed.customerNames : DEFAULT_CACHE.customerNames,
      mobileNumbers: Array.isArray(parsed.mobileNumbers) ? parsed.mobileNumbers : DEFAULT_CACHE.mobileNumbers,
      brands: Array.isArray(parsed.brands) ? parsed.brands : DEFAULT_CACHE.brands,
      models: Array.isArray(parsed.models) ? parsed.models : DEFAULT_CACHE.models,
      faults: Array.isArray(parsed.faults) ? parsed.faults : DEFAULT_CACHE.faults,
    };
  } catch (err) {
    return DEFAULT_CACHE;
  }
}

/**
 * Get saved customer profiles (name <-> mobile bidirectional auto-link)
 */
export function getSavedCustomerProfiles(): CustomerProfile[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOMERS_MAP_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/**
 * Lookup mobile number by customer name
 */
export function findCustomerByName(name: string): CustomerProfile | undefined {
  if (!name || name.trim().length < 2) return undefined;
  const profiles = getSavedCustomerProfiles();
  const search = name.trim().toLowerCase();
  return profiles.find((p) => p.customerName.trim().toLowerCase() === search);
}

/**
 * Lookup customer name by mobile number
 */
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
}) {
  if (typeof window === 'undefined') return;
  try {
    const current = getAutocompleteCache();

    const addUnique = (list: string[], val?: string) => {
      const clean = val?.trim();
      if (!clean || clean.length < 2) return list;
      const exists = list.some((item) => item.toLowerCase() === clean.toLowerCase());
      if (!exists) {
        return [clean, ...list].slice(0, 80);
      }
      return list;
    };

    const updated: AutocompleteCache = {
      customerNames: addUnique(current.customerNames, entry.customerName),
      mobileNumbers: addUnique(current.mobileNumbers, entry.mobileNumber),
      brands: addUnique(current.brands, entry.brand),
      models: addUnique(current.models, entry.model),
      faults: addUnique(current.faults, entry.fault),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Also persist customer profile relationship
    const cName = entry.customerName?.trim();
    const cMob = entry.mobileNumber?.replace(/\D/g, '').trim();

    if (cName && cMob && cMob.length === 10) {
      const profiles = getSavedCustomerProfiles();
      const existingIdx = profiles.findIndex(
        (p) =>
          p.mobileNumber === cMob ||
          p.customerName.toLowerCase() === cName.toLowerCase()
      );

      const updatedProfile: CustomerProfile = {
        customerName: cName,
        mobileNumber: cMob,
        lastVisit: new Date().toISOString(),
        previousBrands: entry.brand ? [entry.brand] : [],
      };

      if (existingIdx >= 0) {
        profiles[existingIdx] = {
          ...profiles[existingIdx],
          ...updatedProfile,
          previousBrands: Array.from(
            new Set([...(profiles[existingIdx].previousBrands || []), ...(entry.brand ? [entry.brand] : [])])
          ),
        };
      } else {
        profiles.unshift(updatedProfile);
      }

      localStorage.setItem(CUSTOMERS_MAP_KEY, JSON.stringify(profiles.slice(0, 150)));
    }
  } catch (e) {
    // ignore localstorage errors
  }
}