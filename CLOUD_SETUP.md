# Cloud persistence setup

The application works offline/local-first by default. Supabase is optional.

## 1. Create a Supabase project

Create a project, then copy:

- Project URL
- Publishable key (or legacy anon key)

## 2. Configure environment variables

Copy `.env.example` to `.env.local` and set:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

The client also accepts `VITE_SUPABASE_ANON_KEY` for older Supabase projects.

## 3. Apply the database migration

Run:

`supabase/migrations/20260929_presentation_studio_cloud.sql`

in the Supabase SQL editor or through the Supabase CLI.

The migration creates snapshot tables for:

- presentations
- brand kits
- saved templates
- asset metadata

Every table has Row Level Security enabled and policies scoped to `auth.uid()`.

## 4. Enable email/password authentication

In Supabase Authentication, enable Email provider. Email confirmation can remain enabled.

## 5. Use the app

Open **Settings → Cloud account**:

1. Create an account or sign in.
2. Choose **Sync now**.
3. Local and cloud records merge by their latest update timestamp.
4. Local storage remains available as an offline fallback.

Deletes are queued locally and propagated to Supabase on the next successful sync.

## Current sync scope

Cloud sync includes structured presentation data, compressed image data embedded in slides/brand kits, brand kits, saved templates and asset metadata.

A future phase can move large image/video assets to Supabase Storage rather than JSON snapshots.
