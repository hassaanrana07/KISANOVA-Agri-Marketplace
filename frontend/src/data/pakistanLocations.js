/**
 * Pakistan Administrative Location Hierarchy & Agro Coordinates Dataset
 * Province / Region -> District -> Tehsil / Town / City -> Representative Chaks / Localities
 */

import locationData from '../../../backend/src/data/pakistanLocations.json';

export const PAKISTAN_PROVINCES = locationData.provinces;

export const getDistrictsByProvince = (provinceName) => {
  if (!provinceName) return [];
  const prov = PAKISTAN_PROVINCES.find(
    (p) => p.name.toLowerCase() === provinceName.toLowerCase() || p.id.toLowerCase() === provinceName.toLowerCase()
  );
  return prov ? prov.districts : [];
};

export const getTehsilsByDistrict = (provinceName, districtName) => {
  const districts = getDistrictsByProvince(provinceName);
  const dist = districts.find((d) => d.name.toLowerCase() === districtName?.toLowerCase());
  return dist ? dist.tehsils : [];
};

export const getTehsilCenter = (provinceName, districtName, tehsilName) => {
  const tehsils = getTehsilsByDistrict(provinceName, districtName);
  const tehsil = tehsils.find((t) => t.name.toLowerCase() === tehsilName?.toLowerCase());
  return tehsil ? tehsil.center : null;
};

export const getSampleLocalities = (provinceName, districtName, tehsilName) => {
  const tehsils = getTehsilsByDistrict(provinceName, districtName);
  const tehsil = tehsils.find((t) => t.name.toLowerCase() === tehsilName?.toLowerCase());
  return tehsil?.sampleLocalities || [];
};

export const PAKISTAN_MAJOR_MANDIS = [
  { name: 'Lahore Badami Bagh Mandi', city: 'Lahore', province: 'Punjab', lat: 31.5975, lng: 74.3218, type: 'Fruits & Vegetables' },
  { name: 'Faisalabad Ghalla Mandi', city: 'Faisalabad', province: 'Punjab', lat: 31.4187, lng: 73.0791, type: 'Grains & Cereals' },
  { name: 'Multan Grain & Cotton Mandi', city: 'Multan', province: 'Punjab', lat: 30.1984, lng: 71.4687, type: 'Grains & Cotton' },
  { name: 'Sahiwal Ghalla Mandi', city: 'Sahiwal', province: 'Punjab', lat: 30.6682, lng: 73.1114, type: 'Dairy, Maize & Wheat' },
  { name: 'Sargodha Citrus & Grain Mandi', city: 'Sargodha', province: 'Punjab', lat: 32.0836, lng: 72.6711, type: 'Citrus (Kinnow) & Wheat' },
  { name: 'Okara Potato & Grain Mandi', city: 'Okara', province: 'Punjab', lat: 30.8081, lng: 73.4458, type: 'Potatoes, Maize & Wheat' },
  { name: 'Rahim Yar Khan Cotton & Sugar Mandi', city: 'Rahim Yar Khan', province: 'Punjab', lat: 28.4212, lng: 70.2989, type: 'Cotton & Sugarcane' },
  { name: 'Khanewal Cotton & Seed Mandi', city: 'Khanewal', province: 'Punjab', lat: 30.3017, lng: 71.9321, type: 'Cotton & Seeds' },
  { name: 'Hyderabad Wholesale Grain Market', city: 'Hyderabad', province: 'Sindh', lat: 25.3960, lng: 68.3578, type: 'Wheat, Rice & Chili' },
  { name: 'Sukkur Dates & Grain Wholesale Mandi', city: 'Sukkur', province: 'Sindh', lat: 27.7052, lng: 68.8574, type: 'Dates & Grains' },
  { name: 'Peshawar Chamkani Wholesale Mandi', city: 'Peshawar', province: 'Khyber Pakhtunkhwa', lat: 34.0151, lng: 71.5249, type: 'Vegetables & Fruits' },
  { name: 'Mardan Tobacco & Cane Market', city: 'Mardan', province: 'Khyber Pakhtunkhwa', lat: 34.1989, lng: 72.0404, type: 'Tobacco & Gur' },
  { name: 'Quetta Hazar Ganji Mandi', city: 'Quetta', province: 'Balochistan', lat: 30.1798, lng: 66.9750, type: 'Apples, Dry Fruits & Grapes' }
];

export default PAKISTAN_PROVINCES;
