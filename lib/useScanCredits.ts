import { useState, useCallback } from "react";
import { supabase } from "./supabase";
import { useFocusEffect } from "@react-navigation/native";

export function useScanCredits() {
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setCredits(null);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("scan_credits")
      .eq("id", session.user.id)
      .single();

    setCredits(data?.scan_credits ?? 0);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return { credits, loading, refresh };
}
