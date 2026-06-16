# Supabase

This directory will hold database migrations, seed data, and local Supabase
configuration when the managed backend is connected.

Suggested production storage buckets:

- `gallery`: public optimized event photos
- `press`: public approved press photos and EPK assets
- `event-media`: public or restricted event posters and short clips
- `submissions`: private booking attachments, if added later

Do not commit Supabase service-role keys. The frontend may only use the public
anonymous key with Row Level Security enabled.
