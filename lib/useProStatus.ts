import { useState, useEffect } from 'react';
import Purchases, { CustomerInfo } from 'react-native-purchases';

export function useProStatus() {
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function check() {
      try {
        const info: CustomerInfo = await Purchases.getCustomerInfo();
        setIsPro(info.entitlements.active['pro'] !== undefined);
      } catch (e) {
        setIsPro(false);
      } finally {
        setLoading(false);
      }
    }

    check();

    Purchases.addCustomerInfoUpdateListener((info) => {
      setIsPro(info.entitlements.active['pro'] !== undefined);
    });
  }, []);

  return { isPro, loading };
}