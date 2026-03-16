import { Request, Response } from 'express';
import { supabase } from './supabaseClient';
import { cityToIata } from './formatting';

// =====================================================================
// BuscaMilhas API Client - Verificação de Ofertas
// =====================================================================

const BM_BASE = 'https://api-v2.buscamilhas.com/v2';

// Mapeamento: programa canônico → airline name no BuscaMilhas
export const PROGRAMA_TO_BM_AIRLINE: Record<string, string> = {
  'LATAM Pass': 'LANPASS',
  'Smiles': 'GOL',
  'Azul Fidelidade': 'AZUL',
  'Azul Interline': 'AZUL',
  'Iberia Plus': 'IBERIA',
  'AAdvantage': 'AMERICAN AIRLINES',
  'ConnectMiles': 'COPA',
};

export function getBmAirline(programaCanonical: string): string | null {
  return PROGRAMA_TO_BM_AIRLINE[programaCanonical] || null;
}

// ---- Config from Supabase ----

interface BmConfig {
  authorization: string;
  session_authorization: string;
  x_api_key: string;
}

export async function loadBmConfig(): Promise<BmConfig | null> {
  const { data, error } = await supabase
    .from('buscamilhas_config')
    .select('key, value');

  if (error || !data || data.length === 0) return null;

  const map: Record<string, string> = {};
  for (const row of data) map[row.key] = row.value;

  if (!map.authorization || !map.session_authorization || !map.x_api_key) return null;

  return {
    authorization: map.authorization,
    session_authorization: map.session_authorization,
    x_api_key: map.x_api_key,
  };
}

function buildBmHeaders(config: BmConfig): Record<string, string> {
  return {
    'accept': 'application/json',
    'content-type': 'application/json',
    'authorization': config.authorization,
    'session-authorization': config.session_authorization,
    'x-api-key': config.x_api_key,
    'origin': 'https://agente.buscamilhas.com',
    'referer': 'https://agente.buscamilhas.com/',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
    'x-source': 'web',
  };
}

// ---- Date conversion ----

/** Converte "dd/mm/aa" → "dd/mm/yyyy" */
function dateShortToFull(d: string): string {
  if (!d) return '';
  const parts = d.split('/');
  if (parts.length !== 3) return d;
  const [dd, mm, yy] = parts;
  if (yy.length === 4) return d; // já está completo
  return `${dd}/${mm}/20${yy}`;
}

// ---- BuscaMilhas API calls ----

async function createSearch(
  config: BmConfig,
  origin: string,
  destination: string,
  departureDate: string,
  returnDate: string | undefined,
  airline: string,
  cabinClass: string = 'Econômica'
): Promise<number> {
  const isRoundTrip = !!returnDate;
  const segment: any = {
    origin,
    destination,
    departureDate,
    tripType: null,
  };
  if (returnDate) segment.returnDate = returnDate;

  const body = {
    flexibleDates: null,
    airlines: [airline],
    searchType: 0,
    tripType: isRoundTrip ? 1 : 0,
    flightSegments: [segment],
    class: cabinClass,
    adults: 1,
    children: 0,
    infants: 0,
    installmentOption: false,
    pricingOption: false,
    milesOnly: false,
    somentePagante: false,
    cached: false,
    device: 'Web',
    frontendVersion: '2.4.8+129',
    isRoundTrip,
  };

  const resp = await fetch(`${BM_BASE}/search/searchId`, {
    method: 'POST',
    headers: buildBmHeaders(config),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });

  if (!resp.ok) throw new Error(`createSearch HTTP ${resp.status}`);
  const json = await resp.json() as any;
  if (!json.searchId) throw new Error('No searchId in response');
  return json.searchId;
}

async function triggerSearch(config: BmConfig, searchId: number, airline: string): Promise<void> {
  const url = `${BM_BASE}/search/get-flight?searchId=${searchId}&airline=${encodeURIComponent(airline)}`;
  try {
    await fetch(url, {
      method: 'GET',
      headers: buildBmHeaders(config),
      signal: AbortSignal.timeout(60000), // pode demorar
    });
  } catch {
    // 504/timeout é esperado para rotas longas; a busca segue no backend
  }
}

async function fetchResults(config: BmConfig, searchId: number, airline: string): Promise<any> {
  const resp = await fetch(`${BM_BASE}/search/filter?new=true`, {
    method: 'POST',
    headers: buildBmHeaders(config),
    body: JSON.stringify({
      searchId,
      airlines: [airline],
      showPreview: false,
      limit: 15,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!resp.ok) throw new Error(`fetchResults HTTP ${resp.status}`);
  return resp.json();
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ---- Extrair milhas dos resultados ----

interface FlightMiles {
  direction: string; // "ida" | "volta"
  miles: number;
  flightNumber: string;
  origin: string;
  destination: string;
  date: string;
  time: string;
  cabin: string;
  boardingFee: number;
}

function extractMilesFromResults(results: any): FlightMiles[] {
  const flights: FlightMiles[] = [];
  const data = results?.data?.flights;
  if (!data || typeof data !== 'object') return flights;

  for (const id of Object.keys(data)) {
    const f = data[id];
    if (!f?.miles?.length || !f?.trip) continue;
    for (const m of f.miles) {
      flights.push({
        direction: f.trip.direction || '',
        miles: m.passengersTotal || 0,
        flightNumber: f.trip.flightNumber || '',
        origin: f.trip.origin || '',
        destination: f.trip.destination || '',
        date: f.trip.departure?.date || '',
        time: f.trip.departure?.time || '',
        cabin: f.trip.class || '',
        boardingFee: m.boardingFee || 0,
      });
    }
  }
  return flights;
}

// ---- Verificação principal ----

export interface VerificationResult {
  verified: boolean;
  skipped: boolean;
  matchedMilesIda?: number;
  matchedMilesVolta?: number;
  searchId?: number;
  error?: string;
  rawResults?: any;
  airline?: string;
}

export async function verifyOffer(offerData: any): Promise<VerificationResult> {
  const programa = offerData.programa_mais_vantajoso || '';
  const airline = getBmAirline(programa);
  if (!airline) {
    return { verified: false, skipped: true, airline: undefined, error: `Programa "${programa}" não suportado no BuscaMilhas` };
  }

  const config = await loadBmConfig();
  if (!config) {
    return { verified: false, skipped: false, airline, error: 'BuscaMilhas config não encontrada no Supabase' };
  }

  // Prefer direct IATA codes from image extraction, fall back to cityToIata conversion
  const originIata = offerData.iata_origem || cityToIata(offerData.origem || '');
  const destIata = offerData.iata_destino || cityToIata(offerData.destino || '');
  if (!originIata || !destIata) {
    return { verified: false, skipped: false, airline, error: `IATA não encontrado: origem="${offerData.origem}" (iata=${offerData.iata_origem || 'n/a'}) destino="${offerData.destino}" (iata=${offerData.iata_destino || 'n/a'})` };
  }

  const milhasIda = Number(offerData.milhas_ida || 0);
  const milhasVolta = Number(offerData.milhas_volta || 0);
  const datasIda: string[] = (offerData.datas_ida || []).filter(Boolean);
  const datasVolta: string[] = (offerData.datas_volta || []).filter(Boolean);
  const isOneWay = !datasVolta.length || milhasVolta <= 0;

  // Cabine
  const cabine = offerData.cabine || 'Econômica';

  // Tenta até 2 pares de datas
  const maxAttempts = Math.min(datasIda.length, 2);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const depDate = dateShortToFull(datasIda[attempt]);
    const retDate = isOneWay ? undefined : dateShortToFull(datasVolta[attempt] || datasVolta[0]);

    if (!depDate) continue;

    try {
      const searchId = await createSearch(config, originIata, destIata, depDate, retDate, airline, cabine);
      // Dispara a busca (pode timeout, ok)
      await triggerSearch(config, searchId, airline);
      // Polling: tenta até 4x com intervalo de 5s
      let results: any = null;
      for (let poll = 0; poll < 4; poll++) {
        await sleep(5000);
        results = await fetchResults(config, searchId, airline);
        const total = results?.total || 0;
        if (total > 0) break;
        // Se expirou, não adianta tentar mais
        if (results?.data?.expired) break;
      }

      if (!results || (results.total || 0) === 0) continue; // próxima data

      const flights = extractMilesFromResults(results);
      const idaFlights = flights.filter(f => f.direction === 'ida');
      const voltaFlights = flights.filter(f => f.direction === 'volta');

      // Verificar match de milhas
      const idaMatch = idaFlights.find(f => f.miles === milhasIda);
      if (!idaMatch) continue;

      if (isOneWay) {
        return {
          verified: true, skipped: false, airline, searchId,
          matchedMilesIda: milhasIda,
          rawResults: results,
        };
      }

      const voltaMatch = voltaFlights.find(f => f.miles === milhasVolta);
      if (voltaMatch) {
        return {
          verified: true, skipped: false, airline, searchId,
          matchedMilesIda: milhasIda,
          matchedMilesVolta: milhasVolta,
          rawResults: results,
        };
      }
    } catch (err: any) {
      // Erro nesta tentativa, tenta próxima data
      if (attempt === maxAttempts - 1) {
        return { verified: false, skipped: false, airline, error: err.message || String(err) };
      }
    }
  }

  return { verified: false, skipped: false, airline, error: 'Nenhum voo com milhas correspondentes encontrado' };
}

// ---- Salvar resultado ----

export async function saveBmResult(phone: string, offerData: any, result: VerificationResult) {
  await supabase.from('buscamilhas_results').insert([{
    group_phone: phone,
    offer_data: offerData,
    verified: result.verified,
    skipped: result.skipped,
    matched_miles: (result.matchedMilesIda || 0) + (result.matchedMilesVolta || 0),
    search_id: result.searchId || null,
    error: result.error || null,
    raw_results: result.rawResults || null,
  }]);
}

// ---- Ensure table ----

export async function ensureBmConfigTable() {
  const { error } = await supabase.from('buscamilhas_config').select('key').limit(1);
  if (error) {
    console.log('buscamilhas_config table may not exist, create it manually via SQL');
  }
  // Also check results table
  const { error: err2 } = await supabase.from('buscamilhas_results').select('id').limit(1);
  if (err2) {
    console.log('buscamilhas_results table may not exist, create it manually via SQL');
  }
}

// =====================================================================
// Express Route Handlers
// =====================================================================

/** POST /api/buscamilhas/search - Busca manual do dashboard */
export async function searchBuscaMilhas(req: Request, res: Response) {
  try {
    const { origin, destination, departureDate, returnDate, airline } = req.body;
    if (!origin || !destination || !departureDate || !airline) {
      return res.status(400).json({ error: 'Campos obrigatórios: origin, destination, departureDate, airline' });
    }

    const config = await loadBmConfig();
    if (!config) {
      return res.status(500).json({ error: 'BuscaMilhas config não encontrada. Configure authorization, session_authorization e x_api_key.' });
    }

    const isRoundTrip = !!returnDate;
    const cabinClass = req.body.cabinClass || 'Econômica';

    const searchId = await createSearch(config, origin, destination, departureDate, returnDate || undefined, airline, cabinClass);

    await triggerSearch(config, searchId, airline);

    // Polling
    let results: any = null;
    for (let i = 0; i < 4; i++) {
      await sleep(5000);
      results = await fetchResults(config, searchId, airline);
      if ((results?.total || 0) > 0) break;
      if (results?.data?.expired) break;
    }

    const flights = results ? extractMilesFromResults(results) : [];

    return res.json({
      searchId,
      airline,
      origin,
      destination,
      departureDate,
      returnDate: returnDate || null,
      total: results?.total || 0,
      flights,
      raw: results,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || String(err) });
  }
}

/** GET /api/buscamilhas/config - Lista config (mascarada) */
export async function listBmConfig(req: Request, res: Response) {
  const { data, error } = await supabase.from('buscamilhas_config').select('key, value, updated_at');
  if (error) return res.status(500).json({ error: error.message });

  const masked = (data || []).map((row: any) => ({
    key: row.key,
    value: row.value ? '...' + row.value.slice(-8) : '',
    updated_at: row.updated_at,
  }));

  return res.json(masked);
}

/** PUT /api/buscamilhas/config - Atualiza config */
export async function updateBmConfig(req: Request, res: Response) {
  const { key, value } = req.body;
  if (!key || !value) return res.status(400).json({ error: 'key e value obrigatórios' });

  const allowed = ['authorization', 'session_authorization', 'x_api_key', 'bm_enabled'];
  if (!allowed.includes(key)) return res.status(400).json({ error: `key deve ser: ${allowed.join(', ')}` });

  const { error } = await supabase
    .from('buscamilhas_config')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ success: true });
}

/** GET /api/buscamilhas/results - Histórico de verificações */
export async function listBmResults(req: Request, res: Response) {
  const { data, error } = await supabase
    .from('buscamilhas_results')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data || []);
}

// ---- BuscaMilhas Enable/Disable ----

export async function isBmEnabled(): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('buscamilhas_config')
      .select('value')
      .eq('key', 'bm_enabled')
      .single();
    return !data || data.value !== 'false';
  } catch {
    return true; // default enabled
  }
}

/** GET /api/buscamilhas/enabled */
export async function getBmEnabled(req: Request, res: Response) {
  const enabled = await isBmEnabled();
  return res.json({ enabled });
}

/** PUT /api/buscamilhas/enabled */
export async function toggleBmEnabled(req: Request, res: Response) {
  const { enabled } = req.body;
  if (typeof enabled !== 'boolean') return res.status(400).json({ error: 'enabled must be boolean' });

  const { error } = await supabase
    .from('buscamilhas_config')
    .upsert({ key: 'bm_enabled', value: String(enabled), updated_at: new Date().toISOString() }, { onConflict: 'key' });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ success: true, enabled });
}
