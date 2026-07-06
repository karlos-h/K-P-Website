import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

// Fetches all media_assets, groups them by event_slug, sorts groups
// newest-event-first, sorts photos within each group by sort_order,
// and resolves the cover photo (is_cover=true, or first photo).
// Returns { galleries, loading, refetch } — call refetch() after mutations.
export function useEventGalleries() {
  const [galleries, setGalleries] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("media_assets")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error || !data || data.length === 0) {
      setGalleries([]);
      setLoading(false);
      return;
    }

    // Group by event_slug (fall back to event_name for legacy rows)
    const map = new Map();
    for (const photo of data) {
      const key = photo.event_slug ?? photo.event_name;
      if (!map.has(key)) {
        map.set(key, {
          slug: key,
          event_name: photo.event_name,
          event_date: photo.event_date,
          photos: [],
        });
      }
      map.get(key).photos.push(photo);
    }

    // Sort groups newest-first (null dates go last)
    const sorted = [...map.values()].sort((a, b) => {
      if (!a.event_date && !b.event_date) return 0;
      if (!a.event_date) return 1;
      if (!b.event_date) return -1;
      return new Date(b.event_date) - new Date(a.event_date);
    });

    // Resolve cover per group
    const withCover = sorted.map((group) => ({
      ...group,
      cover: group.photos.find((p) => p.is_cover) ?? group.photos[0],
    }));

    setGalleries(withCover);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { galleries, loading, refetch: load };
}
