import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest';
import { partnerIngest } from '@/inngest/partner_ingest';
import { partnerDigest } from '@/inngest/partner_digest';
import { partnerBackfill } from '@/inngest/backfill';

export const { GET, POST } = serve({
  client: inngest,
  functions: [partnerIngest, partnerDigest, partnerBackfill],
});

