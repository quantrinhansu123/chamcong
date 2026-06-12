import { useEffect, useMemo, useState } from 'react';
import { getActiveProductsWithLocations } from '../lib/productService';
import { getSupabaseConfigError } from '../lib/supabase';
import type { CheckInProductSelection, ProductWithLocations } from '../types';

export function useProductCheckIn() {
  const [products, setProducts] = useState<ProductWithLocations[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');

  useEffect(() => {
    if (getSupabaseConfigError()) {
      setLoading(false);
      return;
    }

    getActiveProductsWithLocations()
      .then((rows) => {
        setProducts(rows);
        if (rows.length === 1) {
          setSelectedProductId(rows[0].id);
          if (rows[0].locations.length === 1) {
            setSelectedLocationId(rows[0].locations[0].id);
          }
        }
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const handleProductChange = (productId: string) => {
    setSelectedProductId(productId);
    const product = products.find((p) => p.id === productId);
    if (product?.locations.length === 1) {
      setSelectedLocationId(product.locations[0].id);
    } else {
      setSelectedLocationId('');
    }
  };

  const selection = useMemo((): CheckInProductSelection | null => {
    const product = products.find((p) => p.id === selectedProductId);
    const location = product?.locations.find((l) => l.id === selectedLocationId);
    if (!product || !location) return null;
    return {
      productId: product.id,
      productLocationId: location.id,
      productName: product.name,
      locationName: location.name,
    };
  }, [products, selectedProductId, selectedLocationId]);

  return {
    products,
    loading,
    selectedProductId,
    selectedLocationId,
    handleProductChange,
    setSelectedLocationId,
    selection,
    canCheckIn: Boolean(selection) && products.length > 0,
  };
}
