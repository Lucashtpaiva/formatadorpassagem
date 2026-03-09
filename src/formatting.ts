// =====================================================================
// Match Imagem por Destino (Estratégias: IATA → alias → exato → substring → palavras → fallback)
// =====================================================================

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&q=80";

const DESTINATIONS_LOOKUP: Record<string, string> = {
  "Bangkok":"https://nomads.com/assets/img/places/bangkok-thailand.jpg",
  "Buenos Aires":"https://nomads.com/assets/img/places/buenos-aires-argentina.jpg",
  "Lisboa":"https://nomads.com/assets/img/places/lisbon-portugal.jpg",
  "Medellín":"https://nomads.com/assets/img/places/medellin-colombia.jpg",
  "Chiang Mai":"https://nomads.com/assets/img/places/chiang-mai-thailand.jpg",
  "Canggu":"https://nomads.com/assets/img/places/canggu-bali-indonesia.jpg",
  "Playa del Carmen":"https://nomads.com/assets/img/places/playa-del-carmen-mexico.jpg",
  "Ho Chi Minh":"https://nomads.com/assets/img/places/ho-chi-minh-city-vietnam.jpg",
  "Tenerife":"https://nomads.com/assets/img/places/tenerife-canary-islands-spain.jpg",
  "Kuala Lumpur":"https://nomads.com/assets/img/places/kuala-lumpur-malaysia.jpg",
  "Tbilisi":"https://nomads.com/assets/img/places/tbilisi-georgia.jpg",
  "Barcelona":"https://nomads.com/assets/img/places/barcelona-spain.jpg",
  "Seul":"https://nomads.com/assets/img/places/seoul-south-korea.jpg",
  "Tóquio":"https://nomads.com/assets/img/places/tokyo-japan.jpg",
  "Berlim":"https://nomads.com/assets/img/places/berlin-germany.jpg",
  "Taipei":"https://nomads.com/assets/img/places/taipei-taiwan.jpg",
  "Porto":"https://nomads.com/assets/img/places/porto-portugal.jpg",
  "Da Nang":"https://nomads.com/assets/img/places/da-nang-vietnam.jpg",
  "Cidade do México":"https://nomads.com/assets/img/places/mexico-city-mexico.jpg",
  "Ubud":"https://nomads.com/assets/img/places/ubud-bali-indonesia.jpg",
  "Split":"https://nomads.com/assets/img/places/split-croatia.jpg",
  "Dubai":"https://nomads.com/assets/img/places/dubai-united-arab-emirates.jpg",
  "Bogotá":"https://nomads.com/assets/img/places/bogota-colombia.jpg",
  "Budapeste":"https://nomads.com/assets/img/places/budapest-hungary.jpg",
  "São Paulo":"https://nomads.com/assets/img/places/sao-paulo-brazil.jpg",
  "Praga":"https://nomads.com/assets/img/places/prague-czech-republic.jpg",
  "Hanói":"https://nomads.com/assets/img/places/hanoi-vietnam.jpg",
  "Rio de Janeiro":"https://nomads.com/assets/img/places/rio-de-janeiro-brazil.jpg",
  "Phuket":"https://nomads.com/assets/img/places/phuket-thailand.jpg",
  "Florianópolis":"https://nomads.com/assets/img/places/florianopolis-brazil.jpg",
  "Curitiba":"https://nomads.com/assets/img/places/curitiba-brazil.jpg",
  "Porto Alegre":"https://nomads.com/assets/img/places/porto-alegre-brazil.jpg",
  "Belo Horizonte":"https://nomads.com/assets/img/places/belo-horizonte-brazil.jpg",
  "Salvador":"https://nomads.com/assets/img/places/salvador-brazil.jpg",
  "Recife":"https://nomads.com/assets/img/places/recife-brazil.jpg",
  "Fortaleza":"https://nomads.com/assets/img/places/fortaleza-brazil.jpg",
  "Natal":"https://nomads.com/assets/img/places/natal-brazil.jpg",
  "Brasília":"https://nomads.com/assets/img/places/brasilia-brazil.jpg",
  "Manaus":"https://nomads.com/assets/img/places/manaus-brazil.jpg",
  "Belém":"https://nomads.com/assets/img/places/belem-brazil.jpg",
  "Goiânia":"https://nomads.com/assets/img/places/goiania-brazil.jpg",
  "João Pessoa":"https://nomads.com/assets/img/places/joao-pessoa-brazil.jpg",
  "Vitória":"https://nomads.com/assets/img/places/vitoria-brazil.jpg",
  "Campinas":"https://nomads.com/assets/img/places/campinas-brazil.jpg",
  "Singapura":"https://nomads.com/assets/img/places/singapore.jpg",
  "Osaka":"https://nomads.com/assets/img/places/osaka-japan.jpg",
  "Busan":"https://nomads.com/assets/img/places/busan-south-korea.jpg",
  "Hong Kong":"https://nomads.com/assets/img/places/hong-kong.jpg",
  "Manila":"https://nomads.com/assets/img/places/manila-philippines.jpg",
  "Cebu":"https://nomads.com/assets/img/places/cebu-philippines.jpg",
  "Phnom Penh":"https://nomads.com/assets/img/places/phnom-penh-cambodia.jpg",
  "Jacarta":"https://nomads.com/assets/img/places/jakarta-indonesia.jpg",
  "Mumbai":"https://nomads.com/assets/img/places/mumbai-india.jpg",
  "Nova Delhi":"https://images.unsplash.com/photo-1587474260584-136574528ed5?w=600&q=80",
  "Bangalore":"https://nomads.com/assets/img/places/bangalore-india.jpg",
  "Goa":"https://nomads.com/assets/img/places/goa-india.jpg",
  "Colombo":"https://nomads.com/assets/img/places/colombo-sri-lanka.jpg",
  "Katmandu":"https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80",
  "Tel Aviv":"https://images.unsplash.com/photo-1552423314-cf29ab68ad73?w=600&q=80",
  "Cairo":"https://images.unsplash.com/photo-1539768942893-daf53e448371?w=600&q=80",
  "Nairobi":"https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=600&q=80",
  "Cidade do Cabo":"https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=600&q=80",
  "Lagos":"https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=600&q=80",
  "Acra":"https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=600&q=80",
  "Adis Abeba":"https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=600&q=80",
  "Dar es Salaam":"https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=600&q=80",
  "Amsterdã":"https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=600&q=80",
  "Paris":"https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&q=80",
  "Londres":"https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600&q=80",
  "Roma":"https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600&q=80",
  "Madri":"https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=600&q=80",
  "Milão":"https://images.unsplash.com/photo-1520175480921-4edfa2983e0f?w=600&q=80",
  "Viena":"https://images.unsplash.com/photo-1516550893923-42d28e5677af?w=600&q=80",
  "Zurique":"https://images.unsplash.com/photo-1515488764276-beab7607c1e6?w=600&q=80",
  "Atenas":"https://images.unsplash.com/photo-1555993539-1732b0258235?w=600&q=80",
  "Estocolmo":"https://images.unsplash.com/photo-1509356843151-3e7d96241e11?w=600&q=80",
  "Oslo":"https://images.unsplash.com/photo-1559682468-a6a29e7d9517?w=600&q=80",
  "Copenhague":"https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?w=600&q=80",
  "Varsóvia":"https://images.unsplash.com/photo-1519197924294-4ba991a11128?w=600&q=80",
  "Bucareste":"https://images.unsplash.com/photo-1583484963886-cfe2bff2945f?w=600&q=80",
  "Sofia":"https://images.unsplash.com/photo-1583484963886-cfe2bff2945f?w=600&q=80",
  "Nova Iorque":"https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600&q=80",
  "Los Angeles":"https://images.unsplash.com/photo-1496281894233-acf4b0bfa760?w=600&q=80",
  "Miami":"https://images.unsplash.com/photo-1533106418989-88406c7cc8ca?w=600&q=80",
  "Chicago":"https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=600&q=80",
  "São Francisco":"https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=600&q=80",
  "Las Vegas":"https://images.unsplash.com/photo-1581351721010-8cf859cb14a4?w=600&q=80",
  "Orlando":"https://images.unsplash.com/photo-1575089976121-8ed7b2a54265?w=600&q=80",
  "Boston":"https://images.unsplash.com/photo-1501979376754-1ff872af8b35?w=600&q=80",
  "Toronto":"https://images.unsplash.com/photo-1517935706615-2717063c2225?w=600&q=80",
  "Vancouver":"https://images.unsplash.com/photo-1559511260-66a654ae982a?w=600&q=80",
  "Montreal":"https://images.unsplash.com/photo-1519178614-68673b201f36?w=600&q=80",
  "Santiago":"https://images.unsplash.com/photo-1568694250748-01aaefc2e8f1?w=600&q=80",
  "Lima":"https://images.unsplash.com/photo-1531968455001-5c5272a41129?w=600&q=80",
  "Caracas":"https://images.unsplash.com/photo-1568694250748-01aaefc2e8f1?w=600&q=80",
  "Assunção":"https://images.unsplash.com/photo-1568694250748-01aaefc2e8f1?w=600&q=80",
  "Montevidéu":"https://images.unsplash.com/photo-1568694250748-01aaefc2e8f1?w=600&q=80",
  "Quito":"https://images.unsplash.com/photo-1568694250748-01aaefc2e8f1?w=600&q=80",
  "La Paz":"https://images.unsplash.com/photo-1568694250748-01aaefc2e8f1?w=600&q=80",
  "Joanesburgo":"https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=600&q=80",
  "Sydney":"https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=600&q=80",
  "Melbourne":"https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=600&q=80",
  "Auckland":"https://images.unsplash.com/photo-1507699622108-4be3abd695ad?w=600&q=80",
  "Denpasar":"https://nomads.com/assets/img/places/denpasar-bali-indonesia.jpg",
  "Pequim":"https://images.unsplash.com/photo-1517309230475-46f21f4e180a?w=600&q=80",
  "Xangai":"https://images.unsplash.com/photo-1517309230475-46f21f4e180a?w=600&q=80",
  "Guangzhou":"https://images.unsplash.com/photo-1517309230475-46f21f4e180a?w=600&q=80",
  "Cancún":"https://nomads.com/assets/img/places/playa-del-carmen-mexico.jpg",
  "Doha":"https://images.unsplash.com/photo-1586724237569-f3d0c1dee8c6?w=600&q=80",
  "Istambul":"https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=600&q=80"
};

const IATA_MAP: Record<string, string> = {
  // Brasil
  "GRU":"São Paulo","CGH":"São Paulo","VCP":"Campinas",
  "GIG":"Rio de Janeiro","SDU":"Rio de Janeiro",
  "BSB":"Brasília","CNF":"Belo Horizonte","PLU":"Belo Horizonte",
  "SSA":"Salvador","REC":"Recife","FOR":"Fortaleza",
  "NAT":"Natal","CWB":"Curitiba","POA":"Porto Alegre",
  "FLN":"Florianópolis","MAO":"Manaus","BEL":"Belém",
  "MCZ":"Maceió","THE":"Teresina","SLZ":"São Luís",
  "JPA":"João Pessoa","VIT":"Vitória","GYN":"Goiânia",
  // EUA
  "JFK":"Nova Iorque","EWR":"Nova Iorque","LGA":"Nova Iorque",
  "LAX":"Los Angeles","MIA":"Miami","MCO":"Orlando",
  "ORD":"Chicago","SFO":"São Francisco","LAS":"Las Vegas",
  "BOS":"Boston","ATL":"Atlanta","DFW":"Dallas","IAH":"Houston",
  "HNL":"Honolulu","OGG":"Maui",
  // Europa
  "CDG":"Paris","ORY":"Paris",
  "LHR":"Londres","LGW":"Londres","STN":"Londres",
  "FCO":"Roma","MXP":"Milão","LIN":"Milão",
  "MAD":"Madri","BCN":"Barcelona",
  "AMS":"Amsterdã","FRA":"Frankfurt","MUC":"Munique",
  "VIE":"Viena","ZRH":"Zurique","GVA":"Genebra",
  "ATH":"Atenas","LIS":"Lisboa","OPO":"Porto",
  "CPH":"Copenhague","ARN":"Estocolmo","OSL":"Oslo",
  "HEL":"Helsinki","DUB":"Dublin","BRU":"Bruxelas",
  "WAW":"Varsóvia","PRG":"Praga","BUD":"Budapeste",
  "IST":"Istambul","SAW":"Istambul",
  // Ásia
  "BKK":"Bangkok","DMK":"Bangkok",
  "NRT":"Tóquio","HND":"Tóquio",
  "ICN":"Seul","GMP":"Seul",
  "SIN":"Singapura","KUL":"Kuala Lumpur",
  "HKG":"Hong Kong","TPE":"Taipei",
  "PVG":"Xangai","SHA":"Xangai",
  "PEK":"Pequim","PKX":"Pequim",
  "CGK":"Jacarta","DPS":"Denpasar",
  "MNL":"Manila","CEB":"Cebu",
  "SGN":"Ho Chi Minh","HAN":"Hanói","DAD":"Da Nang",
  "PNH":"Phnom Penh","RGN":"Rangum",
  "BOM":"Mumbai","DEL":"Nova Delhi","BLR":"Bangalore",
  "GOI":"Goa","CCU":"Calcutá","MAA":"Chennai",
  "KTM":"Katmandu","CMB":"Colombo",
  "OAK":"Oakland","SJC":"San Jose",
  // Oriente Médio
  "DXB":"Dubai","AUH":"Abu Dhabi","DOH":"Doha",
  "TLV":"Tel Aviv","CAI":"Cairo","AMM":"Amã",
  "BEY":"Beirute","RUH":"Riade","KWI":"Kuwait City",
  // África
  "JNB":"Joanesburgo","CPT":"Cidade do Cabo",
  "NBO":"Nairobi","LOS":"Lagos","ACC":"Acra","ADD":"Adis Abeba",
  "DAR":"Dar es Salaam","CMN":"Casablanca","ALG":"Argel",
  // América Latina
  "EZE":"Buenos Aires","AEP":"Buenos Aires",
  "SCL":"Santiago","LIM":"Lima",
  "BOG":"Bogotá","CCS":"Caracas","ASU":"Assunção",
  "MVD":"Montevidéu","UIO":"Quito","LPB":"La Paz",
  "HAV":"Havana","CUN":"Cancún","GDL":"Guadalajara",
  "MDE":"Medellín","CTG":"Cartagena","CLO":"Cali",
  // Oceania
  "SYD":"Sydney","MEL":"Melbourne","BNE":"Brisbane",
  "PER":"Perth","AKL":"Auckland","CHC":"Christchurch",
  // Canadá
  "YYZ":"Toronto","YVR":"Vancouver","YUL":"Montreal","YYC":"Calgary"
};

const ALIASES: Record<string, string> = {
  "tokyo":"Tóquio","tokio":"Tóquio",
  "seoul":"Seul",
  "beijing":"Pequim","peking":"Pequim",
  "shanghai":"Xangai",
  "prague":"Praga",
  "budapest":"Budapeste",
  "lisbon":"Lisboa",
  "rome":"Roma","roma":"Roma",
  "madrid":"Madri",
  "milan":"Milão",
  "vienna":"Viena",
  "zurich":"Zurique",
  "athens":"Atenas",
  "stockholm":"Estocolmo",
  "copenhagen":"Copenhague",
  "warsaw":"Varsóvia",
  "berlin":"Berlim",
  "amsterdam":"Amsterdã",
  "paris":"Paris",
  "london":"Londres",
  "new york":"Nova Iorque","nueva york":"Nova Iorque","nyc":"Nova Iorque",
  "los angeles":"Los Angeles","la":"Los Angeles",
  "san francisco":"São Francisco","sf":"São Francisco",
  "mexico city":"Cidade do México","ciudad de mexico":"Cidade do México",
  "singapore":"Singapura",
  "jakarta":"Jacarta",
  "johannesburg":"Joanesburgo","joburg":"Joanesburgo","joanesburgo":"Joanesburgo",
  "cape town":"Cidade do Cabo",
  "nairobi":"Nairobi",
  "ho chi minh city":"Ho Chi Minh","saigon":"Ho Chi Minh","saigão":"Ho Chi Minh",
  "hanoi":"Hanói",
  "bali":"Canggu",
  "sydney":"Sydney",
  "melbourne":"Melbourne",
  "auckland":"Auckland",
  "buenos aires":"Buenos Aires",
  "rio":"Rio de Janeiro","rio de janeiro":"Rio de Janeiro",
  "sao paulo":"São Paulo","sampa":"São Paulo",
  "bogota":"Bogotá","bogotá":"Bogotá",
  "medellin":"Medellín","medellín":"Medellín",
  "kuala lumpur":"Kuala Lumpur","kl":"Kuala Lumpur",
  "hong kong":"Hong Kong",
  "toronto":"Toronto","vancouver":"Vancouver","montreal":"Montreal",
  "dubai":"Dubai","abu dhabi":"Abu Dhabi",
  "doha":"Doha","qatar":"Doha",
  "istanbul":"Istambul","istambul":"Istambul",
  "bangkok":"Bangkok",
  "chiang mai":"Chiang Mai",
  "phuket":"Phuket",
  "da nang":"Da Nang",
  "phnom penh":"Phnom Penh",
  "new delhi":"Nova Delhi","delhi":"Nova Delhi","nova delhi":"Nova Delhi",
  "mumbai":"Mumbai","bombay":"Mumbai",
  "bangalore":"Bangalore","bengaluru":"Bangalore",
  "colombo":"Colombo","kathmandu":"Katmandu",
  "tel aviv":"Tel Aviv","telaviv":"Tel Aviv",
  "cairo":"Cairo",
  "barcelona":"Barcelona","split":"Split","tenerife":"Tenerife",
  "tbilisi":"Tbilisi","taipei":"Taipei",
  "ubud":"Ubud","canggu":"Canggu","denpasar":"Denpasar",
  "osaka":"Osaka","busan":"Busan","cebu":"Cebu","manila":"Manila",
  "lima":"Lima","santiago":"Santiago",
  "florianopolis":"Florianópolis","floripa":"Florianópolis",
  "belo horizonte":"Belo Horizonte","bhz":"Belo Horizonte",
  "porto alegre":"Porto Alegre","poa":"Porto Alegre",
  "recife":"Recife","fortaleza":"Fortaleza","salvador":"Salvador",
  "natal":"Natal","curitiba":"Curitiba","brasilia":"Brasília",
  "manaus":"Manaus","belem":"Belém","goiania":"Goiânia",
  "joao pessoa":"João Pessoa","vitoria":"Vitória","campinas":"Campinas",
  "porto":"Porto"
};

function norm(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ALIASES_NORM: Record<string, string> = {};
Object.keys(ALIASES).forEach(k => {
  ALIASES_NORM[norm(k)] = ALIASES[k];
});

export function findDestinationImage(destino?: string): string {
  if (!destino) return FALLBACK_IMAGE;

  const input = destino.toString().trim();
  const inputNorm = norm(input);

  // Passo 1: IATA code
  if (/^[A-Z]{3}$/.test(input.toUpperCase())) {
    const iataCity = IATA_MAP[input.toUpperCase()];
    if (iataCity && DESTINATIONS_LOOKUP[iataCity]) {
      return DESTINATIONS_LOOKUP[iataCity];
    }
  }

  // Passo 2: Alias exato
  const aliasCity = ALIASES_NORM[inputNorm];
  if (aliasCity && DESTINATIONS_LOOKUP[aliasCity]) {
    return DESTINATIONS_LOOKUP[aliasCity];
  }

  // Passo 3: Match exato normalizado
  const cities = Object.keys(DESTINATIONS_LOOKUP);
  for (const city of cities) {
    if (norm(city) === inputNorm) {
      return DESTINATIONS_LOOKUP[city];
    }
  }

  // Passo 4: Substring
  for (const city of cities) {
    const cityNorm = norm(city);
    if (inputNorm.indexOf(cityNorm) >= 0 || cityNorm.indexOf(inputNorm) >= 0) {
      return DESTINATIONS_LOOKUP[city];
    }
  }

  // Passo 5: Word score
  const inputWords = inputNorm.split(" ").filter(w => w.length > 2);
  let bestScore = 0;
  let bestCity: string | null = null;
  
  for (const city of cities) {
    const cityWords = norm(city).split(" ").filter(w => w.length > 2);
    let score = 0;
    inputWords.forEach(w => {
      if (cityWords.includes(w)) score += 2;
      cityWords.forEach(cw => {
        if (cw.includes(w) || w.includes(cw)) score += 1;
      });
    });
    if (score > bestScore) { 
      bestScore = score; 
      bestCity = city; 
    }
  }
  
  if (bestScore >= 2 && bestCity) {
    return DESTINATIONS_LOOKUP[bestCity];
  }

  // Passo 6: Alias substring
  const aliasKeys = Object.keys(ALIASES_NORM);
  for (const ak of aliasKeys) {
    if (inputNorm.indexOf(ak) >= 0 || ak.indexOf(inputNorm) >= 0) {
      const mapped = ALIASES_NORM[ak];
      if (DESTINATIONS_LOOKUP[mapped]) {
        return DESTINATIONS_LOOKUP[mapped];
      }
    }
  }

  return FALLBACK_IMAGE;
}

// ===================== DADOS NORMALIZADOS =====================
function safeStr(v: any, fallback = ""): string {
  return (v ?? "").toString().trim() || fallback;
}

function upperCity(v: string) {
  return safeStr(v).toUpperCase();
}

function fmtIntBR(n: any) {
  const num = Number(n || 0);
  return num.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

function fmtMoneyBR(n: any) {
  const num = Number(n || 0);
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtMoneyBR2(n: any) {
  const num = Number(n || 0);
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function uniq(list: any[]) {
  return [...new Set((list || []).map(x => String(x).trim()).filter(Boolean))];
}

function sortDates(list: any[]) {
  return (list || []).slice().sort((a, b) => {
    const [d1, m1, y1] = String(a).split("/").map(Number);
    const [d2, m2, y2] = String(b).split("/").map(Number);
    return new Date(y1, m1 - 1, d1).getTime() - new Date(y2, m2 - 1, d2).getTime();
  });
}

function formatDatesBlock(dates: any[]) {
  const sorted = sortDates(uniq(dates));
  if (!sorted.length) return "";
  return sorted.map(d => `🗓 ${d}`).join("\\n");
}

export function buildFormattedMessage(data: any): string {
  const origem = safeStr(data.origem, "ORIGEM");
  const destino = safeStr(data.destino, "DESTINO");
  const cia = safeStr(data.cia_aerea, "CIA");
  const programa = safeStr(data.programa_mais_vantajoso, "PROGRAMA");

  const datasIda = Array.isArray(data.datas_ida) ? data.datas_ida : [];
  const datasVolta = Array.isArray(data.datas_volta) ? data.datas_volta : [];

  const milhasIda = Number(data.milhas_ida || 0);
  const milhasVolta = Number(data.milhas_volta || 0);

  const valorIda = Number(data.valor_ida || 0);
  const valorVolta = Number(data.valor_volta || 0);
  const valorIdaEVolta = Number(data.valor_ida_e_volta || 0);

  const valorTaxas = Number(data.valor_taxas || 0);

  const isOneWay =
    !uniq(datasVolta).length ||
    milhasVolta <= 0 ||
    (valorVolta <= 0 && !uniq(datasVolta).length);

  const totalValue = isOneWay ? valorIda : (valorIdaEVolta || (valorIda + valorVolta));
  const taxesSuffix = (valorTaxas && valorTaxas > 0) ? `+ ${fmtMoneyBR2(valorTaxas)} em txs` : "+ txs";

  const header =
    `*${upperCity(origem)}* ✈️ *${upperCity(destino)}*\\n` +
    `Cia: ${cia}\\n` +
    `Programa: ${programa}\\n\\n`;

  const idaBlock =
    `*Ida:* 🛫\\n` +
    `✅ ${fmtIntBR(milhasIda)} milhas ou R$ ${fmtMoneyBR(valorIda)}\\n\\n` +
    `${formatDatesBlock(datasIda)}\\n\\n`;

  let voltaBlock = "";
  if (!isOneWay) {
    voltaBlock =
      `*Volta:* 🛬\\n` +
      `✅ ${fmtIntBR(milhasVolta)} milhas ou R$ ${fmtMoneyBR(valorVolta)}\\n\\n` +
      `${formatDatesBlock(datasVolta)}\\n\\n`;
  }

  const totalBlock =
    `*Valor total:* R$ ${fmtMoneyBR(totalValue)} ${taxesSuffix}\\n\\n` +
    `Obs.: Os valores acima poderão ser modificados a qualquer instante, a critério exclusivo da companhia aérea.`;

  return header + idaBlock + voltaBlock + totalBlock;
}

export function buildWhatsAppLink(data: any): string {
  const origem = safeStr(data.origem, "ORIGEM");
  const destino = safeStr(data.destino, "DESTINO");
  const cia = safeStr(data.cia_aerea, "CIA");
  const programa = safeStr(data.programa_mais_vantajoso, "PROGRAMA");

  const datasIda = Array.isArray(data.datas_ida) ? data.datas_ida : [];
  const datasVolta = Array.isArray(data.datas_volta) ? data.datas_volta : [];

  const milhasIda = Number(data.milhas_ida || 0);
  const milhasVolta = Number(data.milhas_volta || 0);

  const valorIda = Number(data.valor_ida || 0);
  const valorVolta = Number(data.valor_volta || 0);
  const valorIdaEVolta = Number(data.valor_ida_e_volta || 0);
  const valorTaxas = Number(data.valor_taxas || 0);

  const isOneWay =
    !uniq(datasVolta).length ||
    milhasVolta <= 0 ||
    (valorVolta <= 0 && !uniq(datasVolta).length);

  const totalMilhas = milhasIda + (isOneWay ? 0 : milhasVolta);
  const totalValue = isOneWay ? valorIda : (valorIdaEVolta || (valorIda + valorVolta));

  let text = `✈️ Quero emitir uma passagem encontrada pelo *Passagem Premium*:\n\n` +
             `*Rota:* ${origem} → ${destino}\n` +
             `*Cia Aérea:* ${cia}\n` +
             `*Cabine:* Econômica\n` +
             `*Programa:* ${programa}\n\n` +
             `*🛫 IDA*\n` +
             `📅 Datas disponíveis: A definir\n` +
             `🏅 Milhas: ${fmtMoneyBR(milhasIda)}\n` +
             `💰 Valor estimado: R$ ${fmtMoneyBR2(valorIda)}\n\n`;

  if (!isOneWay) {
    text +=  `*🛬 VOLTA*\n` +
             `📅 Datas disponíveis: A definir\n` +
             `🏅 Milhas: ${fmtMoneyBR(milhasVolta)}\n` +
             `💰 Valor estimado: R$ ${fmtMoneyBR2(valorVolta)}\n\n`;
  }

  text +=    `*📊 RESUMO ${isOneWay ? 'IDA' : 'IDA + VOLTA'}*\n` +
             `🏅 Total milhas: ${fmtMoneyBR(totalMilhas)}\n` +
             `💰 Valor total: R$ ${fmtMoneyBR2(totalValue)}\n` +
             `💳 Taxas: R$ ${fmtMoneyBR2(valorTaxas)}\n\n` +
             `*👤 Passageiros:* 1 ADT`;

  // Encode the text for WhatsApp URL
  const encodedText = encodeURIComponent(text);
  // Default WhatsApp number (you can make this configurable)
  const waNumber = "5522981459289"; 
  
  return `https://wa.me/${waNumber}?text=${encodedText}`;
}
