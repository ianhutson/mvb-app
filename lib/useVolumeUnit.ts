import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type VolumeUnit = 'ml' | 'floz';

export function useVolumeUnit() {
  const [unit, setUnit] = useState<VolumeUnit>('floz');

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from('profiles')
        .select('volume_unit')
        .eq('id', session.user.id)
        .single();
      if (data?.volume_unit) setUnit(data.volume_unit as VolumeUnit);
    }
    load();
  }, []);

  return unit;
}

export function formatVolume(volume_ml: number | null, unit: VolumeUnit): string | null {
  if (!volume_ml) return null;
  if (unit === 'floz') {
    return `${(volume_ml / 29.5735).toFixed(0)}fl oz`;
  }
  return `${volume_ml}ml`;
}