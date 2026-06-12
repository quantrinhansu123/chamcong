import { supabase } from './supabase';
import type { Product, ProductLocation, ProductWithLocations } from '../types';

function mapProduct(row: Product): Product {
  return row;
}

function mapLocation(row: ProductLocation): ProductLocation {
  return {
    ...row,
    lat: Number(row.lat),
    lng: Number(row.lng),
    radius_m: Number(row.radius_m),
  };
}

export async function getActiveProductsWithLocations(): Promise<ProductWithLocations[]> {
  if (!supabase) {
    throw new Error('Chưa cấu hình Supabase.');
  }

  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (productsError) throw productsError;
  if (!products?.length) return [];

  const { data: locations, error: locationsError } = await supabase
    .from('product_locations')
    .select('*')
    .eq('is_active', true)
    .in('product_id', products.map((p) => p.id))
    .order('name', { ascending: true });

  if (locationsError) throw locationsError;

  const locationMap = new Map<string, ProductLocation[]>();
  (locations || []).forEach((row) => {
    const mapped = mapLocation(row as ProductLocation);
    const list = locationMap.get(mapped.product_id) || [];
    list.push(mapped);
    locationMap.set(mapped.product_id, list);
  });

  return products
    .map((row) => ({
      ...mapProduct(row as Product),
      locations: locationMap.get(row.id) || [],
    }))
    .filter((product) => product.locations.length > 0);
}

export async function getAllProductsWithLocations(): Promise<ProductWithLocations[]> {
  if (!supabase) {
    throw new Error('Chưa cấu hình Supabase.');
  }

  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('*')
    .order('name', { ascending: true });

  if (productsError) throw productsError;
  if (!products?.length) return [];

  const { data: locations, error: locationsError } = await supabase
    .from('product_locations')
    .select('*')
    .in('product_id', products.map((p) => p.id))
    .order('name', { ascending: true });

  if (locationsError) throw locationsError;

  const locationMap = new Map<string, ProductLocation[]>();
  (locations || []).forEach((row) => {
    const mapped = mapLocation(row as ProductLocation);
    const list = locationMap.get(mapped.product_id) || [];
    list.push(mapped);
    locationMap.set(mapped.product_id, list);
  });

  return products.map((row) => ({
    ...mapProduct(row as Product),
    locations: locationMap.get(row.id) || [],
  }));
}

export async function createProduct(input: { name: string; code?: string }) {
  if (!supabase) {
    throw new Error('Chưa cấu hình Supabase.');
  }

  const name = input.name.trim();
  if (!name) {
    throw new Error('Vui lòng nhập tên sản phẩm.');
  }

  const { data, error } = await supabase
    .from('products')
    .insert({
      name,
      code: input.code?.trim() || null,
      is_active: true,
    })
    .select('*')
    .single();

  if (error) throw error;
  return mapProduct(data as Product);
}

export async function createProductLocation(input: {
  productId: string;
  name: string;
  lat: number;
  lng: number;
  radiusM?: number;
}) {
  if (!supabase) {
    throw new Error('Chưa cấu hình Supabase.');
  }

  const name = input.name.trim();
  if (!name) {
    throw new Error('Vui lòng nhập tên vị trí.');
  }

  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) {
    throw new Error('Vui lòng nhập tọa độ GPS hợp lệ.');
  }

  const { data, error } = await supabase
    .from('product_locations')
    .insert({
      product_id: input.productId,
      name,
      lat: input.lat,
      lng: input.lng,
      radius_m: Math.max(50, input.radiusM ?? 200),
      is_active: true,
    })
    .select('*')
    .single();

  if (error) throw error;
  return mapLocation(data as ProductLocation);
}

export async function createProductWithLocation(input: {
  productName: string;
  productCode?: string;
  locationName: string;
  lat: number;
  lng: number;
  radiusM?: number;
}) {
  const product = await createProduct({ name: input.productName, code: input.productCode });
  const location = await createProductLocation({
    productId: product.id,
    name: input.locationName,
    lat: input.lat,
    lng: input.lng,
    radiusM: input.radiusM,
  });

  return { product, location };
}
