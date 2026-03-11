import { Request, Response } from 'express';
import { supabase } from './supabaseClient';

const DEFAULT_MILHEIROS: Record<string, number> = {
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
const PROGRAMA_ALIASES: Record<string, string> = {
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
  'azul linhas aereas interline': 'Azul Interline',
  // Iberia / AVIOS
  'iberia': 'Iberia Plus', 'iberia plus': 'Iberia Plus', 'avios': 'Iberia Plus',
  'avios program': 'Iberia Plus', 'british airways executive club': 'Iberia Plus',
  'executive club': 'Iberia Plus', 'iag loyalty': 'Iberia Plus',
  // TAP
  'tap': 'TAP Miles&Go', 'tap miles&go': 'TAP Miles&Go', 'miles&go': 'TAP Miles&Go',
  'tap air portugal miles&go': 'TAP Miles&Go', 'tap portugal': 'TAP Miles&Go',
  'tap miles and go': 'TAP Miles&Go',
  // American Airlines
  'aa': 'AAdvantage', 'aadvantage': 'AAdvantage', 'american airlines aadvantage': 'AAdvantage',
  'american aadvantage': 'AAdvantage', 'american airlines': 'AAdvantage',
  // Copa
  'copa': 'ConnectMiles', 'connectmiles': 'ConnectMiles', 'copa airlines connectmiles': 'ConnectMiles',
  'copa connectmiles': 'ConnectMiles',
  // Qatar
  'qatar': 'Privilege Club', 'privilege club': 'Privilege Club',
  'qatar airways privilege club': 'Privilege Club', 'qatar privilege club': 'Privilege Club',
  // Air France / KLM
  'airfrance': 'Flying Blue', 'air france': 'Flying Blue', 'klm': 'Flying Blue',
  'flying blue': 'Flying Blue', 'air france flying blue': 'Flying Blue',
  'klm flying blue': 'Flying Blue', 'af-klm flying blue': 'Flying Blue',
  'airfrance e klm': 'Flying Blue',
  // Alaska
  'alaska': 'Mileage Plan', 'mileage plan': 'Mileage Plan',
  'alaska airlines mileage plan': 'Mileage Plan', 'alaska mileage plan': 'Mileage Plan',
  // Virgin Atlantic
  'virgin atlantic': 'Flying Club', 'flying club': 'Flying Club',
  'virgin atlantic flying club': 'Flying Club', 'virgin flying club': 'Flying Club',
  // Delta
  'delta': 'SkyMiles', 'skymiles': 'SkyMiles', 'delta skymiles': 'SkyMiles',
  'delta air lines skymiles': 'SkyMiles',
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

/** Recebe o nome retornado pelo GPT e normaliza para o nome canônico */
export function normalizeProgramaName(raw: string): string {
  if (!raw) return raw;
  const lower = raw.toLowerCase().trim();
  return PROGRAMA_ALIASES[lower] || raw;
}

export async function ensureMilheiroTable(): Promise<void> {
  // Try to read from the table; if it fails, create it
  const { error } = await supabase.from('milheiro_config').select('id').limit(1);

  if (error) {
    console.log('Creating milheiro_config table...');
    const { error: createError } = await supabase.rpc('exec_sql', {
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
  const { data: existing } = await supabase.from('milheiro_config').select('id').limit(1);
  if (!existing || existing.length === 0) {
    console.log('Seeding milheiro_config with default values...');
    const rows = Object.entries(DEFAULT_MILHEIROS).map(([programa, preco_milheiro]) => ({
      programa,
      preco_milheiro,
    }));
    const { error: seedError } = await supabase.from('milheiro_config').insert(rows);
    if (seedError) {
      console.error('Error seeding milheiro_config:', seedError.message);
    }
  }
}

export async function loadMilheiroConfig(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('milheiro_config')
    .select('programa, preco_milheiro')
    .order('programa', { ascending: true });

  if (error || !data) {
    console.error('Error loading milheiro_config, using defaults:', error?.message);
    return { ...DEFAULT_MILHEIROS };
  }

  // Always start with defaults, then override with DB values
  const map: Record<string, number> = { ...DEFAULT_MILHEIROS };
  data.forEach((row: any) => {
    map[row.programa] = Number(row.preco_milheiro);
  });

  return map;
}

// --- API Handlers ---

export async function listMilheiros(req: Request, res: Response) {
  const { data, error } = await supabase
    .from('milheiro_config')
    .select('*')
    .order('programa', { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }
  return res.status(200).json(data || []);
}

export async function createMilheiro(req: Request, res: Response) {
  const { programa, preco_milheiro } = req.body;
  if (!programa || preco_milheiro == null) {
    return res.status(400).json({ error: 'Missing programa or preco_milheiro' });
  }

  const { data, error } = await supabase
    .from('milheiro_config')
    .insert([{ programa: programa.trim(), preco_milheiro: Number(preco_milheiro) }])
    .select();

  if (error) {
    return res.status(400).json({ error: error.message });
  }
  return res.status(201).json(data?.[0] || {});
}

export async function updateMilheiro(req: Request, res: Response) {
  const { programa, preco_milheiro } = req.body;
  if (!programa || preco_milheiro == null) {
    return res.status(400).json({ error: 'Missing programa or preco_milheiro' });
  }

  const { data, error } = await supabase
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

export async function deleteMilheiro(req: Request, res: Response) {
  const { programa } = req.body;
  if (!programa) {
    return res.status(400).json({ error: 'Missing programa' });
  }

  const { error } = await supabase
    .from('milheiro_config')
    .delete()
    .eq('programa', programa.trim());

  if (error) {
    return res.status(400).json({ error: error.message });
  }
  return res.status(200).json({ success: true });
}
