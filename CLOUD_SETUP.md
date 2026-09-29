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


## 6. Enable real AI generation

The browser never receives the model API key. AI requests go through the authenticated Supabase Edge Function:

`supabase/functions/presentation-ai/index.ts`

Set the server-side secrets:

```bash
supabase secrets set OPENAI_API_KEY=YOUR_OPENAI_API_KEY
supabase secrets set OPENAI_MODEL=gpt-5.6-luna
```

`OPENAI_MODEL` is optional. If it is omitted, the function uses `gpt-5.6-luna` as the default cost-efficient model.

Deploy the function:

```bash
supabase functions deploy presentation-ai
```

The function verifies that the caller has a valid Supabase user session before calling the model.

If Supabase, authentication, the Edge Function, or the model provider is unavailable, the frontend automatically falls back to the deterministic local Smart planner so presentation creation stays usable.


## Secure external review links

The updated cloud migration also enables review collaboration:

- Owner-created, time-limited review links
- View-only slide access for external reviewers
- Slide-level external comments without requiring a reviewer account
- Revocation and expiration
- Speaker notes and rehearsal history are stripped from the shared payload
- Internal review comments remain private and are never returned through public review links

After updating an existing Supabase project, re-run the latest SQL migration so the review tables, RLS policies and RPC functions are installed.

From a presentation, open **Review → External collaboration**:

1. Choose **Create 7-day link**.
2. Send the copied URL to the reviewer.
3. The reviewer can browse slides and leave comments.
4. Back in the owner account, choose **Sync feedback** to merge new comments into the local/cloud review workspace.
5. Revoke the link when review is complete.


## Live team collaboration

The latest migration also enables opt-in collaboration for individual presentations.

From a presentation, open **Team** and choose **Enable collaboration**. The owner can then invite a user by email as:

- **Editor** — can edit and save live revisions.
- **Reviewer** — read-only deck access with authenticated team comments.
- **Viewer** — read-only deck access.

Team invitations expire after 7 days and can be revoked. The invited user must sign in with the exact email address used in the invitation.

### Realtime presence

Collaborative presentations use Supabase Realtime Presence to show:

- Who is currently in the deck.
- Which slide each person is viewing.
- Which element a teammate has selected for editing.
- Live cursor position on the 1600×900 logical slide canvas.

Selected elements are soft-locked in the UI. If two users still reach the same element concurrently, the server performs a before/after comparison and rejects the second conflicting change rather than silently overwriting it.

### Revision-safe saves

Structural deck changes use an optimistic document revision:

`expected revision → save → next revision`

If another teammate saved first, the editor shows **Team conflict**. Choosing **Load latest team version** first stores the local work as a recovery snapshot in Version History, then loads the newest live revision.

Pure element edits use a more granular merge. Changes to different elements on the same slide can be merged even if the deck revision changed in the meantime. A change to the same element still becomes a conflict.

The owner snapshot is updated whenever the live document is saved so normal cloud persistence and collaborative state stay aligned.

### Collaboration activity

The Team tab records collaboration events including:

- invitations
- joins
- role changes
- removals
- review comments
- editor opens
- conflicts and conflict resolution

### Existing Supabase projects

Re-run:

`supabase/migrations/20260929_presentation_studio_cloud.sql`

after pulling these changes. The migration is written to be re-runnable and adds missing collaboration columns with `IF NOT EXISTS`.

GitHub Actions now runs:

`bun run check:migrations`

before the frontend build. This catches malformed or unbalanced PL/pgSQL dollar quoting before changes are merged.
