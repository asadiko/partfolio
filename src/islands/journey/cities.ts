import type { City } from './types';

export interface CityInfo {
  label: string;
  country: string;
  lat: number;
  lon: number;
  major: boolean;
}

export const cities: Record<City, CityInfo> = {
  tashkent: { country: 'Uzbekistan', label: 'Tashkent', lat: 41.3, lon: 69.24, major: true },
  riga: { country: 'Latvia', label: 'Riga', lat: 56.95, lon: 24.11, major: true },
  munich: { country: 'Germany', label: 'Munich', lat: 48.14, lon: 11.58, major: true },
  helsinki: { country: 'Finland', label: 'Helsinki', lat: 60.17, lon: 24.94, major: false },
  'st-gallen': { country: 'Switzerland', label: 'St. Gallen', lat: 47.42, lon: 9.37, major: false },
};

export const route: readonly City[] = ['tashkent', 'riga', 'munich'];

export const hubOf: Record<City, City> = {
  tashkent: 'tashkent',
  riga: 'riga',
  munich: 'munich',
  helsinki: 'riga',
  'st-gallen': 'munich',
};
