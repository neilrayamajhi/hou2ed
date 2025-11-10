/**
 * Repair existing listings.images values by converting storage paths
 * to public URLs from your Supabase Storage bucket.
 *
 * Usage
 *  1) Install dep:  npm i -D ts-node @types/node && npm i @supabase/supabase-js
 *  2) Env vars (recommended via .env.local or shell):
 *     - SUPABASE_URL
 *     - SUPABASE_SERVICE_ROLE_KEY  (service role key, NOT anon)
 *     - LISTING_IMAGES_BUCKET      (defaults to "listing-images")
 *     - REPAIR_APPLY=true          (to actually write changes)
 *  3) Run dry-run (no writes):
 *       npx ts-node scripts/repair-image-urls.ts
 *     Apply writes:
 *       REPAIR_APPLY=true npx ts-node scripts/repair-image-urls.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const BUCKET = process.env.LISTING_IMAGES_BUCKET || 'listing-images';
const APPLY = String(process.env.REPAIR_APPLY || '').toLowerCase() === 'true';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

type ListingRow = {
  id: string;
  images: any;
};

function isHttpUrl(s: string) {
  return /^https?:\/\//i.test(s);
}

function coerceToArray(input: any): any[] {
  if (Array.isArray(input)) return input;
  if (input == null) return [];
  return [input];
}

function toUrlString(val: any): string | null {
  if (val == null) return null;
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'object' && val.url) return String(val.url).trim();
  try { return String(val).trim(); } catch { return null; }
}

async function toPublicUrl(pathOrUrl: string): Promise<string | null> {
  if (!pathOrUrl) return null;
  if (isHttpUrl(pathOrUrl)) return pathOrUrl;
  // Treat as storage path
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(pathOrUrl);
  return data?.publicUrl || null;
}

async function repairListingImages(row: ListingRow): Promise<{ changed: boolean; images: string[] } | null> {
  const arr = coerceToArray(row.images);
  const out: string[] = [];
  for (const entry of arr) {
    const raw = toUrlString(entry);
    if (!raw) continue;
    const url = await toPublicUrl(raw);
    if (url) out.push(url);
  }
  // If resulting array differs from original (stringify for rough compare)
  const prev = JSON.stringify(arr.map(toUrlString).filter(Boolean));
  const next = JSON.stringify(out);
  return { changed: prev !== next, images: out };
}

async function main() {
  console.log(`Bucket: ${BUCKET}`);
  console.log(`Mode: ${APPLY ? 'APPLY (writes enabled)' : 'DRY-RUN (no writes)'}\n`);

  const pageSize = 500;
  let from = 0;
  let totalProcessed = 0;
  let totalChanged = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from('listings')
      .select('id, images')
      .range(from, to);

    if (error) {
      console.error('Select error:', error.message);
      process.exit(1);
    }

    const rows: ListingRow[] = data || [];
    if (rows.length === 0) break;

    for (const row of rows) {
      const repaired = await repairListingImages(row);
      if (!repaired) continue;
      totalProcessed++;
      if (!repaired.changed) continue;

      totalChanged++;
      console.log(`- Listing ${row.id}: fixing ${JSON.stringify(row.images)} -> ${JSON.stringify(repaired.images)}`);

      if (APPLY) {
        const { error: upErr } = await supabase
          .from('listings')
          .update({ images: repaired.images })
          .eq('id', row.id);
        if (upErr) {
          console.error(`  Update failed for ${row.id}:`, upErr.message);
        } else {
          console.log(`  Updated.`);
        }
      }
    }

    from += pageSize;
  }

  console.log(`\nDone. Processed: ${totalProcessed}, Changed: ${totalChanged}.`);
  if (!APPLY) console.log('Re-run with REPAIR_APPLY=true to write changes.');
}

main().catch((e) => {
  console.error('Unexpected error:', e);
  process.exit(1);
});

