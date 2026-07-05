const soundCloudProfile = encodeURIComponent("https://soundcloud.com/kavapyramids");
const soundCloudEmbed = `https://w.soundcloud.com/player/?url=${soundCloudProfile}&color=%23c9a84c&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false`;

// Replace VIDEO_ID with a YouTube ID, or replace the full value with a Vimeo player URL.
export const HIGHLIGHT_REEL_EMBED = "https://www.youtube-nocookie.com/embed/VIDEO_ID";

export const TIMELINE = [
  { year: "2018", title: "The Beginning", desc: "Two high school students meet. This is where it starts." },
  { year: "2023", title: "Christchurch", desc: "The city becomes their proving ground." },
  { year: "2024", title: "Bar 185", desc: "Grassroots hosted events, building a name one night at a time." },
  { year: "2025", title: "Breakthrough", desc: "Weekly residencies at Original Sin and Kong Bar, plus Rolling Meadows, Auckland, Dunedin, and Fiji." },
  { year: "2026", title: "The World", desc: "Brisbane and Wonderland take the movement international." },
];

// Replace these SVG placeholders with optimized JPG, WebP, or MP4 files in /public/gallery/.
export const GALLERY_ITEMS = [
  { title: "Original Sin", category: "Crowd Energy", type: "image", src: "/gallery/crowd-energy.svg" },
  { title: "Behind the Decks", category: "DJ Life", type: "image", src: "/gallery/dj-life.svg" },
  { title: "Fiji Tour", category: "Travel", type: "image", src: "/gallery/travel.svg" },
  { title: "Rolling Meadows", category: "Festivals", type: "image", src: "/gallery/festival.svg" },
  { title: "Freshers", category: "Crowd Energy", type: "image", src: "/gallery/freshers.svg" },
  { title: "Brisbane", category: "Travel", type: "image", src: "/gallery/brisbane.svg" },
];

export const BOOKING_FEATURES = [
  { title: "High-Energy Crowd Engagement", description: "Sets built around reading the room and keeping the floor moving." },
  { title: "Festival & University Experience", description: "Proven across large student events, clubs, and festival stages." },
  { title: "International Experience", description: "Performance history across New Zealand, Fiji, and Australia." },
  { title: "Professional Communication", description: "Clear, responsive coordination from first enquiry to show day." },
  { title: "Versatile Open Format Sets", description: "Hip-Hop, R&B, Pop, and Afrobeats, with an ear tuned to what's next in global club sound." },
  { title: "Reliable & Easy To Work With", description: "Prepared, punctual, adaptable, and focused on delivering the event." },
];

// Core sound — use consistently across Home, Press, and EPK genre mentions.
export const GENRES = ["Hip-Hop", "R&B", "Pop", "Afrobeats"];
// Subgenres currently in rotation on SoundCloud — signals an active, current ear rather than one fixed lane.
export const EDGE_GENRES = ["Baile Funk", "Miami Bass", "Jersey Club"];

// Current weekly residencies — a concrete, named proof point (not a vague "the scene" claim).
export const RESIDENCIES = [
  { venue: "Kong Bar", night: "Saturdays" },
  { venue: "Original Sin", night: "Fridays" },
];

export const SOCIAL_LINKS = [
  { name: "Instagram", url: "https://www.instagram.com/kava_pyramids/" },
  { name: "TikTok", url: "https://www.tiktok.com/@kavaxpyramids" },
  { name: "SoundCloud", url: "https://soundcloud.com/kavapyramids" },
  { name: "YouTube", url: "https://www.youtube.com/@KavaPyramids" },
];

// Update this with your actual Linktree URL once confirmed
export const LINKTREE_URL = "https://linktr.ee/kavapyramids";

export const VENUES = [
  { region: "Christchurch", venues: ["Kong Bar", "Original Sin", "Bar 185", "Rolling Meadows Festival", "UCSA Fresher 5", "Lincoln University"] },
  { region: "New Zealand", venues: ["Auckland Shows", "Dunedin Shows", "University of Canterbury Events"] },
  { region: "International", venues: ["Fiji Tour (2025)", "Wonderland Brisbane (2026)", "Brisbane, Australia"] },
];
