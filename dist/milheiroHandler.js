"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROGRAMA_ALIASES_DISPLAY = exports.PROGRAMA_LINKS = void 0;
exports.normalizeProgramaName = normalizeProgramaName;
exports.ensureMilheiroTable = ensureMilheiroTable;
exports.loadMilheiroConfig = loadMilheiroConfig;
exports.listMilheiros = listMilheiros;
exports.createMilheiro = createMilheiro;
exports.updateMilheiro = updateMilheiro;
exports.deleteMilheiro = deleteMilheiro;
const supabaseClient_1 = require("./supabaseClient");
const DEFAULT_MILHEIROS = {
    'LATAM Pass': 29,
    'Smiles': 18,
    'Azul Fidelidade': 18,
    'Azul Interline': 17,
    'Iberia Plus': 58,
    'TAP Miles&Go': 48,
    'AAdvantage': 104,
    'ConnectMiles': 65,
    'Privilege Club': 63,
    'Flying Blue': 87,
    'Mileage Plan': 104,
    'Flying Club': 92,
    'SkyMiles': 72,
    'MileagePlus': 98,
    'Aeroplan': 101,
    'Suma Miles': 87,
    'LifeMiles': 98,
};
// Normaliza aliases do GPT → nome canônico no banco
const PROGRAMA_ALIASES = {
    // LATAM
    'latam': 'LATAM Pass', 'latam pass': 'LATAM Pass', 'latam airlines': 'LATAM Pass',
    'latam fidelidade': 'LATAM Pass',
    // Smiles / GOL
    'smiles': 'Smiles', 'smiles gol': 'Smiles', 'gol smiles': 'Smiles', 'gol': 'Smiles',
    // Azul
    'azul': 'Azul Fidelidade', 'azul fidelidade': 'Azul Fidelidade', 'tudoazul': 'Azul Fidelidade',
    'tudo azul': 'Azul Fidelidade',
    // Azul Interline
    'azul interline': 'Azul Interline', 'azul linhas aéreas interline': 'Azul Interline',
    'azul linhas aereas interline': 'Azul Interline', 'azul pelo mundo': 'Azul Interline',
    // Iberia / AVIOS
    'iberia': 'Iberia Plus', 'iberia plus': 'Iberia Plus', 'avios': 'Iberia Plus',
    'avios program': 'Iberia Plus', 'british airways executive club': 'Iberia Plus',
    'executive club': 'Iberia Plus', 'iag loyalty': 'Iberia Plus',
    'iberia club': 'Iberia Plus', 'finnair plus': 'Iberia Plus', 'finnair': 'Iberia Plus',
    // TAP
    'tap': 'TAP Miles&Go', 'tap miles&go': 'TAP Miles&Go', 'miles&go': 'TAP Miles&Go',
    'tap air portugal miles&go': 'TAP Miles&Go', 'tap portugal': 'TAP Miles&Go',
    'tap miles and go': 'TAP Miles&Go', 'tap milesgo': 'TAP Miles&Go',
    // American Airlines
    'aa': 'AAdvantage', 'aadvantage': 'AAdvantage', 'american airlines aadvantage': 'AAdvantage',
    'american aadvantage': 'AAdvantage', 'american airlines': 'AAdvantage',
    // Copa
    'copa': 'ConnectMiles', 'connectmiles': 'ConnectMiles', 'copa airlines connectmiles': 'ConnectMiles',
    'copa connectmiles': 'ConnectMiles',
    // Qatar
    'qatar': 'Privilege Club', 'privilege club': 'Privilege Club',
    'qatar airways privilege club': 'Privilege Club', 'qatar privilege club': 'Privilege Club',
    'qatar airways': 'Privilege Club',
    // Air France / KLM
    'airfrance': 'Flying Blue', 'air france': 'Flying Blue', 'klm': 'Flying Blue',
    'flying blue': 'Flying Blue', 'air france flying blue': 'Flying Blue',
    'klm flying blue': 'Flying Blue', 'af-klm flying blue': 'Flying Blue',
    'airfrance e klm': 'Flying Blue', 'air france e klm': 'Flying Blue',
    // Alaska
    'alaska': 'Mileage Plan', 'mileage plan': 'Mileage Plan',
    'alaska airlines mileage plan': 'Mileage Plan', 'alaska mileage plan': 'Mileage Plan',
    'alaska airlines': 'Mileage Plan',
    // Virgin Atlantic
    'virgin atlantic': 'Flying Club', 'flying club': 'Flying Club',
    'virgin atlantic flying club': 'Flying Club', 'virgin flying club': 'Flying Club',
    // Delta
    'delta': 'SkyMiles', 'skymiles': 'SkyMiles', 'delta skymiles': 'SkyMiles',
    'delta air lines skymiles': 'SkyMiles', 'delta air lines': 'SkyMiles',
    // United
    'united': 'MileagePlus', 'united airlines': 'MileagePlus', 'mileageplus': 'MileagePlus',
    'united mileageplus': 'MileagePlus', 'united airlines mileageplus': 'MileagePlus',
    // Air Canada
    'aircanada': 'Aeroplan', 'air canada': 'Aeroplan', 'aeroplan': 'Aeroplan',
    'air canada aeroplan': 'Aeroplan', 'ac aeroplan': 'Aeroplan',
    // Air Europa
    'aireuropa': 'Suma Miles', 'air europa': 'Suma Miles', 'suma miles': 'Suma Miles',
    'air europa suma': 'Suma Miles', 'suma': 'Suma Miles', 'air europa suma miles': 'Suma Miles',
    // Avianca
    'avianca': 'LifeMiles', 'lifemiles': 'LifeMiles', 'avianca lifemiles': 'LifeMiles',
    'avianca plus lifemiles': 'LifeMiles',
};
// URLs oficiais dos programas de milhas (usada quando GPT não retorna link ou retorna encurtado)
exports.PROGRAMA_LINKS = {
    'LATAM Pass': 'https://www.latampass.com.br',
    'Smiles': 'https://www.smiles.com.br',
    'Azul Fidelidade': 'https://www.tudoazul.com.br',
    'Azul Interline': 'https://www.voeazul.com.br',
    'Iberia Plus': 'https://www.iberia.com',
    'TAP Miles&Go': 'https://www.flytap.com',
    'AAdvantage': 'https://www.aa.com',
    'ConnectMiles': 'https://www.copaair.com',
    'Privilege Club': 'https://www.qatarairways.com',
    'Flying Blue': 'https://www.flyingblue.com',
    'Mileage Plan': 'https://www.alaskaair.com',
    'Flying Club': 'https://www.virginatlantic.com',
    'SkyMiles': 'https://www.delta.com',
    'MileagePlus': 'https://www.united.com',
    'Aeroplan': 'https://www.aircanada.com',
    'Suma Miles': 'https://www.aireuropa.com',
    'LifeMiles': 'https://www.lifemiles.com',
};
// Todos os aliases agrupados por programa canônico (para exibição no dashboard)
exports.PROGRAMA_ALIASES_DISPLAY = {
    'LATAM Pass': ['Latam', 'Latam Pass', 'Latam Airlines', 'Latam Fidelidade'],
    'Smiles': ['Smiles', 'Smiles Gol', 'GOL Smiles'],
    'Azul Fidelidade': ['Azul', 'Azul Fidelidade', 'TudoAzul', 'Tudo Azul'],
    'Azul Interline': ['Azul Interline', 'Azul Linhas Aéreas Interline'],
    'Iberia Plus': ['Iberia', 'AVIOS', 'Iberia Plus', 'Iberia Club', 'British Airways Executive Club', 'Avios Program', 'IAG Loyalty', 'Finnair Plus'],
    'TAP Miles&Go': ['TAP', 'Miles&Go', 'TAP Air Portugal Miles&Go', 'TAP Portugal'],
    'AAdvantage': ['AA', 'AAdvantage', 'American Airlines AAdvantage', 'American AAdvantage'],
    'ConnectMiles': ['Copa', 'ConnectMiles', 'Copa Airlines ConnectMiles', 'Copa ConnectMiles'],
    'Privilege Club': ['Qatar', 'Privilege Club', 'Qatar Airways Privilege Club', 'Qatar Privilege Club'],
    'Flying Blue': ['AirFrance e KLM', 'Flying Blue', 'Air France Flying Blue', 'KLM Flying Blue', 'AF-KLM Flying Blue'],
    'Mileage Plan': ['Alaska', 'Alaska Airlines Mileage Plan', 'Mileage Plan', 'Alaska Mileage Plan'],
    'Flying Club': ['Virgin Atlantic', 'Flying Club', 'Virgin Atlantic Flying Club', 'Virgin Flying Club'],
    'SkyMiles': ['Delta', 'SkyMiles', 'Delta SkyMiles', 'Delta Air Lines SkyMiles'],
    'MileagePlus': ['United', 'United Airlines', 'MileagePlus', 'United MileagePlus', 'United Airlines MileagePlus'],
    'Aeroplan': ['AirCanada', 'Aeroplan', 'Air Canada Aeroplan', 'AC Aeroplan'],
    'Suma Miles': ['AirEuropa', 'Suma Miles', 'Air Europa Suma', 'Suma', 'Air Europa Suma Miles'],
    'LifeMiles': ['Avianca', 'LifeMiles', 'Avianca LifeMiles', 'Avianca Plus LifeMiles'],
};
/** Recebe o nome retornado pelo GPT e normaliza para o nome canônico */
function normalizeProgramaName(raw) {
    if (!raw)
        return raw;
    const lower = raw.toLowerCase().trim();
    return PROGRAMA_ALIASES[lower] || raw;
}
async function ensureMilheiroTable() {
    // Try to read from the table; if it fails, create it
    const { error } = await supabaseClient_1.supabase.from('milheiro_config').select('id').limit(1);
    if (error) {
        console.log('Creating milheiro_config table...');
        const { error: createError } = await supabaseClient_1.supabase.rpc('exec_sql', {
            query: `
        CREATE TABLE IF NOT EXISTS milheiro_config (
          id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          programa text UNIQUE NOT NULL,
          preco_milheiro numeric NOT NULL,
          created_at timestamptz DEFAULT now()
        );
      `
        });
        if (createError) {
            console.error('Could not auto-create milheiro_config table. Please create it manually:', createError.message);
            console.log(`
SQL to run in Supabase SQL Editor:

CREATE TABLE IF NOT EXISTS milheiro_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  programa text UNIQUE NOT NULL,
  preco_milheiro numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);
      `);
            return;
        }
    }
    // Seed if empty
    const { data: existing } = await supabaseClient_1.supabase.from('milheiro_config').select('id').limit(1);
    if (!existing || existing.length === 0) {
        console.log('Seeding milheiro_config with default values...');
        const rows = Object.entries(DEFAULT_MILHEIROS).map(([programa, preco_milheiro]) => ({
            programa,
            preco_milheiro,
        }));
        const { error: seedError } = await supabaseClient_1.supabase.from('milheiro_config').insert(rows);
        if (seedError) {
            console.error('Error seeding milheiro_config:', seedError.message);
        }
    }
}
async function loadMilheiroConfig() {
    const { data, error } = await supabaseClient_1.supabase
        .from('milheiro_config')
        .select('programa, preco_milheiro')
        .order('programa', { ascending: true });
    if (error || !data) {
        console.error('Error loading milheiro_config, using defaults:', error?.message);
        return { ...DEFAULT_MILHEIROS };
    }
    // Always start with defaults, then override with DB values
    const map = { ...DEFAULT_MILHEIROS };
    data.forEach((row) => {
        map[row.programa] = Number(row.preco_milheiro);
    });
    return map;
}
// --- API Handlers ---
async function listMilheiros(req, res) {
    const { data, error } = await supabaseClient_1.supabase
        .from('milheiro_config')
        .select('*')
        .order('programa', { ascending: true });
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    return res.status(200).json(data || []);
}
async function createMilheiro(req, res) {
    const { programa, preco_milheiro } = req.body;
    if (!programa || preco_milheiro == null) {
        return res.status(400).json({ error: 'Missing programa or preco_milheiro' });
    }
    const { data, error } = await supabaseClient_1.supabase
        .from('milheiro_config')
        .insert([{ programa: programa.trim(), preco_milheiro: Number(preco_milheiro) }])
        .select();
    if (error) {
        return res.status(400).json({ error: error.message });
    }
    return res.status(201).json(data?.[0] || {});
}
async function updateMilheiro(req, res) {
    const { programa, preco_milheiro } = req.body;
    if (!programa || preco_milheiro == null) {
        return res.status(400).json({ error: 'Missing programa or preco_milheiro' });
    }
    const { data, error } = await supabaseClient_1.supabase
        .from('milheiro_config')
        .update({ preco_milheiro: Number(preco_milheiro) })
        .eq('programa', programa.trim())
        .select();
    if (error) {
        return res.status(400).json({ error: error.message });
    }
    if (!data || data.length === 0) {
        return res.status(404).json({ error: 'Programa not found' });
    }
    return res.status(200).json(data[0]);
}
async function deleteMilheiro(req, res) {
    const { programa } = req.body;
    if (!programa) {
        return res.status(400).json({ error: 'Missing programa' });
    }
    const { error } = await supabaseClient_1.supabase
        .from('milheiro_config')
        .delete()
        .eq('programa', programa.trim());
    if (error) {
        return res.status(400).json({ error: error.message });
    }
    return res.status(200).json({ success: true });
}
