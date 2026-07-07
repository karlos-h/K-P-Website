import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function slugify(text, date) {
  const base = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return date ? `${base}-${date}` : base;
}

// Merges native media_assets galleries with events that have photo_gallery_url set.
// Events with both native photos AND a gallery URL → native group is enriched with
// the external gallery fields. Events with only a gallery URL → synthetic group created.
// Each group in the result: { slug, event_name, event_date, photos, cover,
//   photo_gallery_url, photo_gallery_embeddable, photographer_name, photographer_url }
export function useCombinedGalleries() {
  const [galleries, setGalleries] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    const [assetsRes, eventsRes] = await Promise.all([
      supabase.from("media_assets").select("*").order("sort_order", { ascending: true }),
      supabase.from("events").select("id,title,sort_date,date,photo_gallery_url,photo_gallery_embeddable,photographer_name,photographer_url").not("photo_gallery_url", "is", null),
    ]);

    const assets = assetsRes.data ?? [];
    const externalEvents = eventsRes.data ?? [];

    // Group native photos by slug
    const map = new Map();
    for (const photo of assets) {
      const key = photo.event_slug ?? photo.event_name;
      if (!map.has(key)) {
        map.set(key, {
          slug: key,
          event_name: photo.event_name,
          event_date: photo.event_date,
          photos: [],
          photo_gallery_url: null,
          photo_gallery_embeddable: false,
          photographer_name: null,
          photographer_url: null,
        });
      }
      map.get(key).photos.push(photo);
    }

    // Merge or insert external event gallery entries
    for (const ev of externalEvents) {
      const dateStr = ev.sort_date ?? ev.date ?? "";
      const isoDate = ev.sort_date ?? null;
      const slug = slugify(ev.title, isoDate || dateStr);

      const external = {
        photo_gallery_url: ev.photo_gallery_url,
        photo_gallery_embeddable: ev.photo_gallery_embeddable,
        photographer_name: ev.photographer_name,
        photographer_url: ev.photographer_url,
      };

      if (map.has(slug)) {
        // Enrich existing native group
        Object.assign(map.get(slug), external);
      } else {
        // Synthetic group — no native photos
        map.set(slug, {
          slug,
          event_name: ev.title,
          event_date: isoDate,
          photos: [],
          ...external,
        });
      }
    }

    // Sort newest-first
    const sorted = [...map.values()].sort((a, b) => {
      if (!a.event_date && !b.event_date) return 0;
      if (!a.event_date) return 1;
      if (!b.event_date) return -1;
      return new Date(b.event_date) - new Date(a.event_date);
    });

    const withCover = sorted.map((group) => ({
      ...group,
      cover: group.photos.find((p) => p.is_cover) ?? group.photos[0] ?? null,
    }));

    setGalleries(withCover);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { galleries, loading, refetch: load };
}
