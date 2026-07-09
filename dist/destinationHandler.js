"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureDestinationOverridesTable = ensureDestinationOverridesTable;
exports.refreshOverridesCache = refreshOverridesCache;
exports.getDestinationOverrides = getDestinationOverrides;
exports.getFreshDestinationOverrides = getFreshDestinationOverrides;
exports.listDestinations = listDestinations;
exports.updateDestination = updateDestination;
exports.deleteDestinationOverride = deleteDestinationOverride;
const supabaseClient_1 = require("./supabaseClient");
const formatting_1 = require("./formatting");
// Runtime cache of destination overrides from DB
let destinationOverrides = {};
function sanitizeDestinationText(value) {
    return String(value || '')
        .normalize('NFKC')
        .replace(/[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}
function normalizeDestinationSearch(value) {
    return sanitizeDestinationText(value)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}
async function findOverrideVariants(cidade) {
    const normalizedTarget = normalizeDestinationSearch(cidade);
    const { data, error } = await supabaseClient_1.supabase
        .from('destination_overrides')
        .select('cidade');
    if (error || !data)
        return [cidade];
    const variants = data
        .map((row) => row.cidade)
        .filter((rawCity) => normalizeDestinationSearch(rawCity) === normalizedTarget);
    if (!variants.includes(cidade)) {
        variants.push(cidade);
    }
    return Array.from(new Set(variants));
}
async function ensureDestinationOverridesTable() {
    // Try selecting from the table to see if it exists
    const { error } = await supabaseClient_1.supabase
        .from('destination_overrides')
        .select('cidade')
        .limit(1);
    if (error) {
        console.log('destination_overrides table may not exist, attempting to create via RPC...');
        // Table doesn't exist - try creating it
        const { error: rpcError } = await supabaseClient_1.supabase.rpc('exec_sql', {
            sql: `CREATE TABLE IF NOT EXISTS destination_overrides (
        cidade TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      );`
        });
        if (rpcError) {
            console.error('Could not create destination_overrides table via RPC:', rpcError.message);
            console.log('Please create the table manually in Supabase.');
        }
        else {
            console.log('destination_overrides table created successfully.');
        }
    }
    // Load existing overrides into cache
    await refreshOverridesCache();
}
async function refreshOverridesCache() {
    const { data, error } = await supabaseClient_1.supabase
        .from('destination_overrides')
        .select('cidade, url');
    if (!error && data) {
        destinationOverrides = {};
        data.forEach((row) => {
            const cidade = sanitizeDestinationText(row.cidade);
            const url = sanitizeDestinationText(row.url);
            if (cidade && url) {
                destinationOverrides[cidade] = url;
            }
        });
        console.log(`Loaded ${data.length} destination overrides from DB.`);
    }
}
function getDestinationOverrides() {
    return destinationOverrides;
}
async function getFreshDestinationOverrides() {
    await refreshOverridesCache();
    return destinationOverrides;
}
// GET /api/destinations?search=&page=&limit=
async function listDestinations(req, res) {
    res.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    const search = normalizeDestinationSearch(req.query.search);
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 30));
    await refreshOverridesCache();
    // Merge hardcoded + overrides (overrides win)
    const merged = { ...formatting_1.DESTINATIONS_LOOKUP, ...destinationOverrides };
    // Build array
    let entries = Object.entries(merged).map(([cidade, url]) => ({
        cidade,
        url,
        overridden: !!destinationOverrides[cidade],
        custom: !Object.prototype.hasOwnProperty.call(formatting_1.DESTINATIONS_LOOKUP, cidade)
    }));
    // Filter by search
    if (search) {
        entries = entries.filter(e => normalizeDestinationSearch(e.cidade).includes(search));
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
async function updateDestination(req, res) {
    const cidade = sanitizeDestinationText(req.body?.cidade);
    const url = sanitizeDestinationText(req.body?.url);
    if (!cidade || !url) {
        return res.status(400).json({ error: 'Missing cidade or url' });
    }
    const variants = await findOverrideVariants(cidade);
    const staleVariants = variants.filter(existingCity => existingCity !== cidade);
    if (staleVariants.length > 0) {
        const { error: cleanupError } = await supabaseClient_1.supabase
            .from('destination_overrides')
            .delete()
            .in('cidade', staleVariants);
        if (cleanupError) {
            console.error('Error cleaning destination override variants:', cleanupError);
            return res.status(500).json({ error: 'Database cleanup error' });
        }
    }
    const { error } = await supabaseClient_1.supabase
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
async function deleteDestinationOverride(req, res) {
    const cidade = sanitizeDestinationText(req.body?.cidade);
    if (!cidade) {
        return res.status(400).json({ error: 'Missing cidade' });
    }
    const variants = await findOverrideVariants(cidade);
    const { error } = await supabaseClient_1.supabase
        .from('destination_overrides')
        .delete()
        .in('cidade', variants);
    if (error) {
        console.error('Error deleting destination override:', error);
        return res.status(500).json({ error: 'Database error' });
    }
    // Remove from cache
    delete destinationOverrides[cidade];
    return res.status(200).json({ success: true, cidade });
}
