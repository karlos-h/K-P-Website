# LinkedIn Content — Kava & Pyramids Website

Two pieces below: a "Projects" section entry (detailed, for your profile) and a first
announcement post (short, for your feed). Both are grounded in what's actually in the
codebase and CHANGELOG.md — swap in your own dates/details where marked [ ].

---

## 1. LinkedIn "Projects" Entry

**Project name:**
Kava & Pyramids — Booking & Media Platform

**Dates:** [start month/year] – July 2026

**Associated skills (add these as tags):**
React, Vite, Supabase, PostgreSQL, Row-Level Security, REST API Integration, Serverless Functions, Framer Motion, Netlify, AI-Assisted Development

**Description:**

Kava & Pyramids is a touring DJ duo who needed to move off a Linktree onto a real site that could handle bookings, ticketed events, press requests, and event photo delivery in one place. I designed and built the full platform end to end — front end, database, and backend logic.

**Stack:** React 19 + Vite on the frontend, Supabase (PostgreSQL, Auth, Storage, Edge Functions) as the backend, deployed on Netlify.

**What it does:**
- Public site with a live events calendar, EPK (electronic press kit) with gig history and downloadable one-sheet, and an event photo Media Hub
- Event-photo galleries: auto-scrolling carousels grouped by event, each expandable into a full grid with lightbox — photos are uploaded per-event from a custom admin dashboard rather than dropped into a generic folder
- Admin dashboard (non-technical, no direct database access needed) to manage events, photo galleries, trusted venues, and a mailing list
- One-way sync with Humanitix (their ticketing provider) that pulls ticket-purchaser details into the mailing list via a serverless function — built with an explicit rule that a resync can never overwrite or resubscribe someone who's opted out
- Instagram and TikTok feeds, YouTube grid, and SoundCloud mix embeds, all live-managed from the database rather than hardcoded
- A Privacy Policy page addressing real data collection under NZ's Privacy Act 2020 and Unsolicited Electronic Messages Act 2007

**On security:** partway through the build I ran a dedicated hardening pass rather than treating security as an afterthought. The initial admin policies checked "is this user logged in," which — had public sign-up ever been enabled — would have given any authenticated visitor full read/write access to customer data. I replaced that with a proper admin allowlist gated behind a database-level permission check, closed a path-traversal gap in the photo upload flow, locked down CORS on the serverless functions, and added spam honeypots to the public forms. I then ran the codebase through Cursor's Bugbot as an automated review pass before going live.

**Live at:** kavapyramids.netlify.app

---

## 2. LinkedIn Announcement Post

Just shipped a full booking and media platform for Kava & Pyramids, a DJ duo I've been building for over the past few months 🎧

It's a full-stack build — React on the front end, Supabase (Postgres, Auth, Storage, Edge Functions) on the back end — with a few things I'm genuinely proud of:

→ An admin dashboard that lets them manage events, photo galleries, and their mailing list without ever touching a database
→ Event photo galleries that auto-organize by show, not one giant folder
→ A one-way sync that pulls ticket-purchaser data in from their ticketing provider, with a hard rule that it can never resubscribe someone who's opted out
→ A real security pass — found and fixed an RLS gap where the wrong policy could have exposed customer data, before it ever went live
→ Shipped through Cursor's Bugbot for an automated review pass before launch

Built solo, end to end — planning, database design, backend logic, frontend, and hardening.

Check it out: kavapyramids.netlify.app

[Optional: tag @Kava & Pyramids' page if they have one, or link their Instagram]

---

### Notes before you post
- The domain is still the free Netlify subdomain (kavapyramids.netlify.app) — if you're about to buy a custom domain, you may want to hold this post a few days so the link in it doesn't need editing later.
- Fill in your actual start date in the Projects entry — I don't have that in the repo history.
- The "why" framing assumes you built this for/with a real DJ duo you know rather than as a personal fictional project — adjust if that's not quite right.
