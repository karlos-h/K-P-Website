import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function slugify(text, date) {
  const base = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return date ? `${base}-${date}` : base;
}

// Merges three sources into one list of per-event gallery groups:
//   • native media_assets photos, grouped by their own event_slug
//   • events with photo_gallery_url set (external Lightroom-style galleries)
//   • approved crowd_photos (visitor submissions — see migration 033)
//
// Groups are keyed by slug, not by event id, because media_assets rows only
// carry event_slug/event_name — there is no foreign key to events. crowd_photos
// does have a real event_id, so crowd rows are matched in by recomputing the
// slug from the event's title/sort_date, the same trick AdminGalleryManager
// uses to resolve a gallery back to its event.
//
// Each group in the result: { slug, event_id, event_name, event_date, photos,
//   crowdPhotos, cover, photo_gallery_url, photo_gallery_embeddable,
//   photographer_name, photographer_url }
export function useCombinedGalleries() {
  const [galleries, setGalleries] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    // Every event, not just the ones with an external gallery: an event whose
    // only photos are crowd submissions still needs a group, and filtering on
    // photo_gallery_url here would drop it before it could get one.
    const [assetsRes, eventsRes, crowdRes] = await Promise.all([
      supabase.from("media_assets").select("*").order("sort_order", { ascending: true }),
      supabase.from("events").select("id,title,sort_date,date,photo_gallery_url,photo_gallery_embeddable,photographer_name,photographer_url"),
      supabase.from("crowd_photos").select("*")
        .order("sort_order", { ascending: true })
        .order("approved_at", { ascending: true }),
    ]);

    const assets = assetsRes.data ?? [];
    const allEvents = eventsRes.data ?? [];

    const crowdByEvent = new Map();
    for (const photo of crowdRes.data ?? []) {
      if (!crowdByEvent.has(photo.event_id)) crowdByEvent.set(photo.event_id, []);
      crowdByEvent.get(photo.event_id).push(photo);
    }

    // Group native photos by slug
    const map = new Map();
    for (const photo of assets) {
      const key = photo.event_slug ?? photo.event_name;
      if (!map.has(key)) {
        map.set(key, {
          slug: key,
          event_id: null,
          event_name: photo.event_name,
          event_date: photo.event_date,
          photos: [],
          crowdPhotos: [],
          photo_gallery_url: null,
          photo_gallery_embeddable: false,
          photographer_name: null,
          photographer_url: null,
        });
      }
      map.get(key).photos.push(photo);
    }

    // Walk every event once: stamp the real UUID onto whichever group it maps
    // to, merge in external-gallery fields, and attach its approved crowd
    // photos. An event with neither native photos nor an external gallery only
    // earns a group if it has crowd photos to show — otherwise the Media Hub
    // would fill up with empty cards for every gig ever played.
    for (const event of allEvents) {
      const dateStr = event.sort_date ?? event.date ?? "";
      const isoDate = event.sort_date ?? null;
      const slug = slugify(event.title, isoDate || dateStr);
      const crowdPhotos = crowdByEvent.get(event.id) ?? [];

      const external = event.photo_gallery_url
        ? {
            photo_gallery_url: event.photo_gallery_url,
            photo_gallery_embeddable: event.photo_gallery_embeddable,
            photographer_name: event.photographer_name,
            photographer_url: event.photographer_url,
          }
        : null;

      if (map.has(slug)) {
        const group = map.get(slug);
        group.event_id = event.id;
        if (external) Object.assign(group, external);
        if (crowdPhotos.length) group.crowdPhotos = crowdPhotos;
      } else if (external || crowdPhotos.length) {
        map.set(slug, {
          slug,
          event_id: event.id,
          event_name: event.title,
          event_date: isoDate,
          photos: [],
          crowdPhotos,
          photo_gallery_url: null,
          photo_gallery_embeddable: false,
          photographer_name: null,
          photographer_url: null,
          ...(external ?? {}),
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
