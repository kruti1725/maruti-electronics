const STORAGE_KEY = 'kruti_autocomplete_cache_v1';

export interface AutocompleteCache {
  customerNames: string[];
  mobileNumbers: string[];
  brands: string[];
  models: string[];
  faults: string[];
}

const DEFAULT_CACHE: AutocompleteCache = {
  customerNames: ['Raju Bhai', 'Rajesh Patel', 'Ramesh Sharma', 'Sweta Desai'],
  mobileNumbers: ['7778833577', '9825012345'],
  brands: ['Samsung', 'LG', 'Sony', 'Mi / Xiaomi', 'OnePlus', 'TCL', 'Realme'],
  models: ['LED 32', 'Smart 43 UHD', 'Android 55 4K'],
  faults: ['No Display', 'Backlight Problem', 'Sound OK No Picture', 'Dead / No Power', 'HDMI Not Working']
};

export function getAutocompleteCache(): AutocompleteCache {
  if (typeof window === 'undefined') return DEFAULT_CACHE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CACHE;
    const parsed = JSON.parse(raw);
    return {
      customerNames: Array.from(new Set([...(parsed.customerNames || []), ...DEFAULT_CACHE.customerNames])),
      mobileNumbers: Array.from(new Set([...(parsed.mobileNumbers || []), ...DEFAULT_CACHE.mobileNumbers])),
      brands: Array.from(new Set([...(parsed.brands || []), ...DEFAULT_CACHE.brands])),
      models: Array.from(new Set([...(parsed.models || []), ...DEFAULT_CACHE.models])),
      faults: Array.from(new Set([...(parsed.faults || []), ...DEFAULT_CACHE.faults])),
    };
  } catch {
    return DEFAULT_CACHE;
  }
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
    const cleanAdd = (list: string[], val?: string) => {
      const trimmed = (val || '').trim();
      if (!trimmed || trimmed.length < 2) return list;
      const lowerList = list.map(x => x.toLowerCase());
      if (!lowerList.includes(trimmed.toLowerCase())) {
        return [trimmed, ...list].slice(0, 50);
      }
      return list;
    };

    const updated: AutocompleteCache = {
      customerNames: cleanAdd(current.customerNames, entry.customerName),
      mobileNumbers: cleanAdd(current.mobileNumbers, entry.mobileNumber),
      brands: cleanAdd(current.brands, entry.brand),
      models: cleanAdd(current.models, entry.model),
      faults: cleanAdd(current.faults, entry.fault),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save autocomplete cache', err);
  }
}