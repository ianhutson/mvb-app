import { useState, useEffect, useCallback } from 'react';
import Purchases, { CustomerInfo } from 'react-native-purchases';

export function useProStatus() {
  const [isPro, setIsPro] = useState(false);
  const [isMonthly, setIsMonthly] = useState(false);
  const [loading, setLoading] = useState(true);

  const check = useCallback(async () => {
    try {
      const info: CustomerInfo = await Purchases.getCustomerInfo();
      const proEntitlement = info.entitlements.active['pro'];
      setIsPro(proEntitlement !== undefined);
      if (proEntitlement) {
        const productId = proEntitlement.productIdentifier ?? '';
        setIsMonthly(productId.includes('monthly'));
      } else {
        setIsMonthly(false);
      }
    } catch (e) {
      setIsPro(false);
      setIsMonthly(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    check();

    const listener = (info: CustomerInfo) => {
      const proEntitlement = info.entitlements.active['pro'];
      setIsPro(proEntitlement !== undefined);
      if (proEntitlement) {
        const productId = proEntitlement.productIdentifier ?? '';
        setIsMonthly(productId.includes('monthly'));
      } else {
        setIsMonthly(false);
      }
    };

    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [check]);

  return { isPro, isMonthly, loading, refresh: check };
}