import { Request, Response } from 'express';
import { supabase } from './supabaseClient';
import { DESTINATIONS_LOOKUP } from './formatting';

// Runtime cache of destination overrides from DB
let destinationOverrides: Record<string, string> = {};

export async function ensureDestinationOverridesTable() {
  // Try selecting from the table to see if it exists
  const { error } = await supabase
    .from('destination_overrides')
    .select('cidade')
    .limit(1);

  if (error) {
    console.log('destination_overrides table may not exist, attempting to create via RPC...');
    // Table doesn't exist - try creating it
    const { error: rpcError } = await supabase.rpc('exec_sql', {
      sql: `CREATE TABLE IF NOT EXISTS destination_overrides (
        cidade TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      );`
    });
    if (rpcError) {
      console.error('Could not create destination_overrides table via RPC:', rpcError.message);
      console.log('Please create the table manually in Supabase.');
    } else {
      console.log('destination_overrides table created successfully.');
    }
  }

  // Load existing overrides into cache
  await refreshOverridesCache();
}

async function refreshOverridesCache() {
  const { data, error } = await supabase
    .from('destination_overrides')
    .select('cidade, url');

  if (!error && data) {
    destinationOverrides = {};
    data.forEach((row: any) => {
      destinationOverrides[row.cidade] = row.url;
    });
    console.log(`Loaded ${data.length} destination overrides from DB.`);
  }
}

export function getDestinationOverrides(): Record<string, string> {
  return destinationOverrides;
}

// GET /api/destinations?search=&page=&limit=
export async function listDestinations(req: Request, res: Response) {
  const search = ((req.query.search as string) || '').toLowerCase().trim();
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 30));

  // Merge hardcoded + overrides (overrides win)
  const merged: Record<string, string> = { ...DESTINATIONS_LOOKUP, ...destinationOverrides };

  // Build array
  let entries = Object.entries(merged).map(([cidade, url]) => ({
    cidade,
    url,
    overridden: !!destinationOverrides[cidade],
    custom: !Object.prototype.hasOwnProperty.call(DESTINATIONS_LOOKUP, cidade)
  }));

  // Filter by search
  if (search) {
    entries = entries.filter(e => e.cidade.toLowerCase().includes(search));
  }

  // Sort alphabetically
  entries.sort((a, b) => a.cidade.localeCompare(b.cidade, 'pt-BR'));

  const total = entries.length;
  const totalPages = Math.ceil(total / limit);
  const safePage = totalPages > 0 ? Math.min(page, totalPages) : 1;
  const offset = (safePage - 1) * limit;
  const pageEntries = entries.slice(offset, offset + limit);

  return res.status(200).json({
    destinations: pageEntries,
    page: safePage,
    limit,
    total,
    totalPages
  });
}

// PUT /api/destinations
export async function updateDestination(req: Request, res: Response) {
  const cidade = (req.body?.cidade || '').toString().trim();
  const url = (req.body?.url || '').toString().trim();

  if (!cidade || !url) {
    return res.status(400).json({ error: 'Missing cidade or url' });
  }

  const { error } = await supabase
    .from('destination_overrides')
    .upsert({ cidade, url }, { onConflict: 'cidade' });

  if (error) {
    console.error('Error saving destination override:', error);
    return res.status(500).json({ error: 'Database error' });
  }

  // Update runtime cache
  destinationOverrides[cidade] = url;

  return res.status(200).json({ success: true, cidade, url });
}

// DELETE /api/destinations - removes override (reverts to default)
export async function deleteDestinationOverride(req: Request, res: Response) {
  const cidade = (req.body?.cidade || '').toString().trim();

  if (!cidade) {
    return res.status(400).json({ error: 'Missing cidade' });
  }

  const { error } = await supabase
    .from('destination_overrides')
    .delete()
    .eq('cidade', cidade);

  if (error) {
    console.error('Error deleting destination override:', error);
    return res.status(500).json({ error: 'Database error' });
  }

  // Remove from cache
  delete destinationOverrides[cidade];

  return res.status(200).json({ success: true, cidade });
}
