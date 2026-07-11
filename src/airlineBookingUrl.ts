type TripType = "OW" | "RT";
type Cabin = "economy" | "business" | "first";

function parseDateStr(dateStr: string): Date | null {
  const parts = (dateStr || "").trim().split("/");
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map(Number);
  if (!d || !m || !y) return null;
  const fullYear = y < 100 ? 2000 + y : y;
  return new Date(fullYear, m - 1, d);
}

function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toDDMMYYYY(date: Date): string {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function toCOPA(date: Date): string {
  const months = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];
  const d = String(date.getDate()).padStart(2, "0");
  return `${d}${months[date.getMonth()]}${date.getFullYear()}`;
}

function toYYYYMMDD(date: Date): string {
  return toISO(date).replace(/-/g, "");
}

// Smiles usa epoch ms às 03:00 UTC (00:00 BRT)
function toEpochBRT(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 3, 0, 0);
}

function toDashDMY(date: Date): string {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${d}-${m}-${date.getFullYear()}`;
}

function toDotDMY(date: Date): string {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${d}.${m}.${date.getFullYear()}`;
}

// Qatar usa DD-MMM-YYYY com mês abreviado em inglês
function toQatarDate(date: Date): string {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const d = String(date.getDate()).padStart(2, "0");
  return `${d}-${months[date.getMonth()]}-${date.getFullYear()}`;
}

// Azul: mesmo motor selecao-voo para cash (cc=BRL) e pontos (cc=PTS)
function buildAzulSelecaoVoo(o: string, d: string, dep: Date, ret: Date | null, cc: "BRL" | "PTS"): string {
  const mdy = (dt: Date) => `${String(dt.getMonth() + 1).padStart(2, "0")}/${String(dt.getDate()).padStart(2, "0")}/${dt.getFullYear()}`;
  let qs = `c%5B0%5D.ds=${o}&c%5B0%5D.std=${mdy(dep)}&c%5B0%5D.as=${d}`;
  if (ret) qs += `&c%5B1%5D.ds=${d}&c%5B1%5D.std=${mdy(ret)}&c%5B1%5D.as=${o}`;
  qs += `&p%5B0%5D.t=ADT&p%5B0%5D.c=1&p%5B0%5D.cp=false&f.dl=3&f.dr=3&cc=${cc}`;
  return `https://www.voeazul.com.br/br/pt/home/selecao-voo?${qs}`;
}

// TAP: deeplink oficial do IBE (não há parâmetro de cabine)
function buildTapDeeplink(o: string, d: string, dep: Date, ret: Date | null): string {
  return buildUrl("https://booking.flytap.com/booking/flights/deeplink", {
    market: "BR",
    language: "pt",
    origin: o,
    destination: d,
    adt: "1",
    chd: "0",
    inf: "0",
    flexibleDates: "false",
    flightType: ret ? "return" : "single",
    depDate: toDotDMY(dep),
    ...(ret ? { retDate: toDotDMY(ret) } : {}),
  });
}

// Qatar: motor de booking direto (mesma URL para cash; award exige login)
function buildQatarBooking(o: string, d: string, dep: Date, ret: Date | null, cabin: Cabin): string {
  return buildUrl("https://booking.qatarairways.com/nsp/views/showBooking.action", {
    widget: "QR",
    searchType: "F",
    addTaxToFare: "Y",
    minPurTime: "0",
    selLang: "pt",
    fromStation: o,
    from: o,
    toStation: d,
    to: d,
    departingHidden: toQatarDate(dep),
    departing: toISO(dep),
    ...(ret ? { returningHidden: toQatarDate(ret), returning: toISO(ret) } : {}),
    bookingClass: cabin === "business" ? "B" : cabin === "first" ? "F" : "E",
    tripType: ret ? "R" : "O",
    adults: "1",
    children: "0",
    infants: "0",
    teenager: "0",
    ofw: "0",
    flexibleDate: "off",
  });
}

// Delta: pré-preenche o formulário de busca (não dispara a busca automaticamente)
function buildDeltaSearch(o: string, d: string, dep: Date, ret: Date | null, award: boolean): string {
  return buildUrl("https://www.delta.com/flightsearch/book-a-flight", {
    action: "findFlights",
    tripType: ret ? "ROUND_TRIP" : "ONE_WAY",
    priceSchedule: "PRICE",
    originCity: o,
    destinationCity: d,
    departureDate: toISO(dep),
    ...(ret ? { returnDate: toISO(ret) } : {}),
    paxCount: "1",
    ...(award ? { awardTravel: "true" } : {}),
  });
}

// Iberia: motor /flights/ (mesmo para cash e Avios, muda pagoAvios)
function buildIberiaFlights(o: string, d: string, dep: Date, ret: Date | null, cabin: Cabin, avios: boolean): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const ym = (dt: Date) => `${dt.getFullYear()}${pad(dt.getMonth() + 1)}`;
  const fareType = cabin === "business" ? "B" : "Y";
  const params: [string, string][] = [
    ["market", "US"], ["fromMarket", "BR"], ["language", "pt"],
    ["appliesOMB", "false"], ["splitEndCity", "false"], ["initializedOMB", "true"],
    ["flexible", "true"], ["TRIP_TYPE", ret ? "1" : "2"],
    ["BEGIN_CITY_01", o], ["END_CITY_01", d],
    ["BEGIN_DAY_01", pad(dep.getDate())], ["BEGIN_MONTH_01", ym(dep)], ["BEGIN_YEAR_01", String(dep.getFullYear())],
    ["END_DAY_01", ret ? pad(ret.getDate()) : ""], ["END_MONTH_01", ret ? ym(ret) : ""], ["END_YEAR_01", ret ? String(ret.getFullYear()) : ""],
    ["FARE_TYPE", fareType], ["quadrigam", "IBADVS"],
    ["ADT", "1"], ["CHD", "0"], ["INF", "0"],
    ["residentCode", ""], ["familianumerosa", ""], ["boton", "Buscar"],
    ["bookingMarket", "BR"], ["pagoAvios", avios ? "true" : "false"],
  ];
  const qs = params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
  return `https://www.iberia.com/flights/?${qs}#!/availability`;
}

function normAirline(cia: string): string {
  return (cia || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

function normCabin(classe: string): Cabin {
  const c = (classe || "").toLowerCase();
  if (c.includes("executiva") || c.includes("business")) return "business";
  if (c.includes("primeira") || c.includes("first")) return "first";
  return "economy";
}

function buildUrl(base: string, params: Record<string, string>): string {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
  return `${base}?${qs}`;
}

type BuildFn = (
  o: string,
  d: string,
  depDate: Date,
  retDate: Date | null,
  cabin: Cabin,
) => string;

const AIRLINE_BUILDERS: Record<string, BuildFn> = {
  latam: (o, d, dep, ret, cabin) =>
    buildUrl("https://www.latamairlines.com/br/pt/oferta-voos", {
      origin: o,
      destination: d,
      outbound: toISO(dep),
      ...(ret ? { inbound: toISO(ret) } : {}),
      adt: "1",
      inf: "0",
      chd: "0",
      cabin:
        cabin === "business"
          ? "Business"
          : cabin === "first"
            ? "PremiumBusiness"
            : "Economy",
      redemption: "false",
      // "PRICE" sozinho quebra a página da LATAM; o valor aceito é "PRICE,asc"
      sort: "PRICE,asc",
    }),

  gol: (o, d, dep, ret, _cabin) =>
    buildUrl("https://b2c.voegol.com.br/compra/busca-parceiros", {
      pv: "BR",
      tipo: "DF",
      de: o,
      para: d,
      ida: toDashDMY(dep),
      ...(ret ? { volta: toDashDMY(ret) } : {}),
      ADT: "1",
      CHD: "0",
      INF: "0",
    }),

  azul: (o, d, dep, ret, _cabin) => buildAzulSelecaoVoo(o, d, dep, ret, "BRL"),

  copa: (o, d, dep, ret, _cabin) =>
    buildUrl("https://shopping.copaair.com/", {
      roundtrip: ret ? "true" : "false",
      area1: o,
      area2: d,
      date1: toISO(dep),
      ...(ret ? { date2: toISO(ret) } : {}),
      flexible_dates_v2: "false",
      adults: "1",
      children: "0",
      infants: "0",
      isMiles: "false",
      advanced_air_search: "false",
      stopover: "false",
      sf: "br",
      langid: "pt",
    }),

  iberia: (o, d, dep, ret, cabin) => buildIberiaFlights(o, d, dep, ret, cabin, false),

  tap: (o, d, dep, ret, _cabin) => buildTapDeeplink(o, d, dep, ret),

  american: (o, d, dep, ret, cabin) => {
    const slices = [{ orig: o, dest: d, date: toISO(dep) }];
    if (ret) slices.push({ orig: d, dest: o, date: toISO(ret) });
    return buildUrl("https://www.aa.com/booking/find-flights", {
      pax: "1",
      adult: "1",
      type: ret ? "RoundTrip" : "OneWay",
      searchType: "Revenue",
      cabin: cabin === "business" ? "B" : cabin === "first" ? "F" : "W",
      slices: JSON.stringify(slices),
    });
  },

  delta: (o, d, dep, ret, _cabin) => buildDeltaSearch(o, d, dep, ret, false),

  united: (o, d, dep, ret, cabin) =>
    buildUrl("https://www.united.com/en/us/fsr/choose-flights", {
      f: o,
      t: d,
      d: toISO(dep),
      ...(ret ? { r: toISO(ret) } : {}),
      tt: ret ? "2" : "1",
      at: "1",
      px: "1",
      sc: cabin === "business" ? "1" : "7",
    }),

  qatar: (o, d, dep, ret, cabin) => buildQatarBooking(o, d, dep, ret, cabin),

  alaska: (o, d, dep, ret, _cabin) =>
    buildUrl("https://www.alaskaair.com/search/results", {
      A: "1",
      O: o,
      D: d,
      OD: toISO(dep),
      ...(ret ? { RD: toISO(ret) } : {}),
      RT: ret ? "true" : "false",
    }),

  // Companhias sem deeplink público funcional (verificado 07/2026 — 404/redirect):
  // link estático para a página de busca do site oficial
  airfrance: () => "https://wwws.airfrance.com.br/search/advanced",

  klm: () => "https://www.klm.com.br/",

  turkish: () => "https://www.turkishairlines.com/pt-br/",

  emirates: () => "https://www.emirates.com/br/portuguese/",

  avianca: (o, d, dep, ret, _cabin) =>
    buildUrl("https://booking.avianca.com/av/booking/avail", {
      departureDate: toISO(dep),
      tripType: ret ? "round-trip" : "one-way",
      platform: "WEBB2C",
      from: o,
      to: d,
      nbAdults: "1",
      nbYoungs: "0",
      nbChildren: "0",
      nbInfants: "0",
      language: "PT",
      pointOfSale: "BR",
      ...(ret ? { returnDate: toISO(ret) } : {}),
      accessMethod: "default",
      backend: "PRD",
    }),

  aeromexico: (o, d, dep, ret, _cabin) => {
    let itinerary = `${o}_${d}_${toISO(dep)}`;
    if (ret) itinerary += `.${d}_${o}_${toISO(ret)}`;
    return buildUrl("https://www.aeromexico.com/bf/pt-br/reserva/opcoes", {
      itinerary,
      leg: "1",
      travelers: "A1_C0_I0_PH0_PC0",
    });
  },

  aircanada: (o, d, dep, ret, _cabin) =>
    buildUrl("https://www.aircanada.com/booking/ca/en/aco/search", {
      org0: o,
      dest0: d,
      orgType0: "A",
      destType0: "A",
      ...(ret ? { org1: d, dest1: o, orgType1: "A", destType1: "A" } : {}),
      departureDate0: toDDMMYYYY(dep),
      ...(ret ? { departureDate1: toDDMMYYYY(ret) } : {}),
      adt: "1",
      yth: "0",
      chd: "0",
      inf: "0",
      ins: "0",
      marketCode: "INT",
      tripType: ret ? "RoundTrip" : "OneWay",
      isFlexible: "false",
    }),

  british: (o, d, dep, ret, cabin) => {
    let onds = `${o}-${d}_${toISO(dep)}`;
    if (ret) onds += `,${d}-${o}_${toISO(ret)}`;
    return buildUrl("https://www.britishairways.com/travel/book/public/pt_br/flightList", {
      onds,
      ad: "1",
      yad: "0",
      ch: "0",
      inf: "0",
      cabin: cabin === "business" ? "C" : cabin === "first" ? "F" : "M",
      flex: "LOWEST",
      ond: "1",
    });
  },

  aireuropa: () => "https://www.aireuropa.com/br/pt/home",

  // Virgin usa parâmetros repetidos (um origin/destination/departing por
  // trecho) — não dá pra usar buildUrl (chaves únicas), monta a query manual
  virgin: (o, d, dep, ret, _cabin) => {
    const legs = [{ origin: o, destination: d, departing: toISO(dep) }];
    if (ret) legs.push({ origin: d, destination: o, departing: toISO(ret) });
    const originQs = legs.map((l) => `origin=${l.origin}`).join("&");
    const destQs = legs.map((l) => `destination=${l.destination}`).join("&");
    const depQs = legs.map((l) => `departing=${l.departing}`).join("&");
    return `https://www.virginatlantic.com/flights/search/slice?passengers=a1t0c0i0&${originQs}&${destQs}&${depQs}`;
  },

  // Lufthansa: o fragment pré-preenche ao menos a origem na página de busca
  lufthansa: (o, d, dep, _ret, cabin) => {
    const dep_date = toDotDMY(dep);
    const fragment = `outboundFlight=${o},${d},${dep_date}&cabinClass=${cabin === "business" ? "BUSINESS" : "ECONOMY"}&adult=1`;
    return `https://www.lufthansa.com/br/pt/flight-search#${fragment}`;
  },
};

const AIRLINE_NAME_MAP: Record<string, string> = {
  // LATAM
  latam: "latam",
  "latam airlines": "latam",
  "latam pass": "latam",
  // GOL
  gol: "gol",
  smiles: "gol",
  "gol linhas aereas": "gol",
  // Azul
  azul: "azul",
  "azul linhas aereas": "azul",
  "azul interline": "azul",
  "azul pelo mundo": "azul",
  // COPA
  copa: "copa",
  "copa airlines": "copa",
  connectmiles: "copa",
  // Iberia
  iberia: "iberia",
  "iberia plus": "iberia",
  // TAP
  tap: "tap",
  "tap air portugal": "tap",
  // American
  "american airlines": "american",
  american: "american",
  aadvantage: "american",
  aa: "american",
  // Delta
  delta: "delta",
  "delta air lines": "delta",
  skymiles: "delta",
  // United
  united: "united",
  "united airlines": "united",
  mileageplus: "united",
  // Air France
  "air france": "airfrance",
  airfrance: "airfrance",
  // KLM
  klm: "klm",
  // Qatar
  qatar: "qatar",
  "qatar airways": "qatar",
  "privilege club": "qatar",
  // Turkish
  turkish: "turkish",
  "turkish airlines": "turkish",
  // Emirates
  emirates: "emirates",
  // Avianca
  avianca: "avianca",
  lifemiles: "avianca",
  // Aeromexico
  aeromexico: "aeromexico",
  // Air Canada
  "air canada": "aircanada",
  aeroplan: "aircanada",
  // Lufthansa
  lufthansa: "lufthansa",
  // British Airways
  "british airways": "british",
  ba: "british",
  "executive club": "british",
  // Alaska
  alaska: "alaska",
  "alaska airlines": "alaska",
  "mileage plan": "alaska",
  // Air Europa
  "air europa": "aireuropa",
  "suma miles": "aireuropa",
  // Virgin Atlantic
  "virgin atlantic": "virgin",
  "flying club": "virgin",
};

type ProgramBuildFn = (o: string, d: string, depDate: Date, retDate: Date | null, cabin: Cabin) => string;

const PROGRAM_BUILDERS: Record<string, ProgramBuildFn> = {
  'latam pass': (o, d, dep, ret, cabin) =>
    buildUrl('https://www.latamairlines.com/br/pt/oferta-voos', {
      origin: o, destination: d,
      outbound: toISO(dep),
      ...(ret ? { inbound: toISO(ret) } : {}),
      adt: '1', inf: '0', chd: '0',
      cabin: cabin === 'business' ? 'Business' : cabin === 'first' ? 'PremiumBusiness' : 'Economy',
      redemption: 'true',
      // "PRICE" sozinho quebra a página da LATAM; o valor aceito é "PRICE,asc"
      sort: 'PRICE,asc',
    }),

  smiles: (o, d, dep, ret, cabin) =>
    buildUrl('https://www.smiles.com.br/mfe/emissao-passagem/', {
      adults: '1',
      cabin: cabin === 'business' ? 'BUSINESS' : 'ECONOMY',
      children: '0', infants: '0',
      isElegible: 'false', isFlexibleDateChecked: 'false',
      searchType: 'g3', segments: '1',
      originAirportIsAny: 'true', destinAirportIsAny: 'true',
      'novo-resultado-voos': 'true',
      departureDate: String(toEpochBRT(dep)),
      ...(ret ? { returnDate: String(toEpochBRT(ret)) } : {}),
      tripType: ret ? '1' : '2',
      originAirport: o, destinationAirport: d,
    }),

  'azul fidelidade': (o, d, dep, ret, _cabin) => buildAzulSelecaoVoo(o, d, dep, ret, 'PTS'),

  'azul interline': (o, d, dep, ret, cabin) => {
    const tripType = ret ? 'RT' : 'OW';
    const retDate = ret ? toISO(ret) : '-';
    const cabinStr = cabin === 'business' ? 'BUSINESS' : 'ECONOMY';
    return `https://azulpelomundo.voeazul.com.br/flights/${tripType}/${o}/${d}/-/-/${toISO(dep)}/${retDate}/1/0/0/0/0/ALL/F/${cabinStr}/-/-/-/-/A/-`;
  },

  'iberia plus': (o, d, dep, ret, cabin) => buildIberiaFlights(o, d, dep, ret, cabin, true),

  // TAP não tem deeplink público de milhas; o IBE pré-preenche a busca e o
  // cliente alterna para milhas após login no Miles&Go
  'tap miles&go': (o, d, dep, ret, _cabin) => buildTapDeeplink(o, d, dep, ret),

  aadvantage: (o, d, dep, ret, cabin) => {
    const slices = [{ orig: o, dest: d, date: toISO(dep) }];
    if (ret) slices.push({ orig: d, dest: o, date: toISO(ret) });
    return buildUrl('https://www.aa.com/booking/find-flights', {
      pax: '1', adult: '1',
      type: ret ? 'RoundTrip' : 'OneWay',
      searchType: 'Award',
      cabin: cabin === 'business' ? 'B' : cabin === 'first' ? 'F' : 'W',
      slices: JSON.stringify(slices),
    });
  },

  connectmiles: (o, d, dep, ret, _cabin) =>
    buildUrl('https://shopping.copaair.com/miles', {
      roundtrip: ret ? 'true' : 'false',
      area1: o, area2: d,
      date1: toISO(dep),
      ...(ret ? { date2: toISO(ret) } : {}),
      flexible_dates_v2: 'false',
      adults: '1', children: '0', infants: '0',
      isMiles: 'true',
      advanced_air_search: 'false',
      stopover: 'false',
      sf: 'br', langid: 'pt',
    }),

  'privilege club': (o, d, dep, ret, cabin) => buildQatarBooking(o, d, dep, ret, cabin),

  'mileage plan': (o, d, dep, ret, _cabin) =>
    buildUrl('https://www.alaskaair.com/search/results', {
      A: '1', O: o, D: d,
      OD: toISO(dep),
      ...(ret ? { RD: toISO(ret) } : {}),
      RT: ret ? 'true' : 'false',
      MR: 'true',
    }),

  skymiles: (o, d, dep, ret, _cabin) => buildDeltaSearch(o, d, dep, ret, true),

  mileageplus: (o, d, dep, ret, cabin) =>
    buildUrl('https://www.united.com/en/us/fsr/choose-flights', {
      f: o, t: d,
      d: toISO(dep),
      ...(ret ? { r: toISO(ret) } : {}),
      tt: ret ? '2' : '1',
      at: '1', px: '1',
      sc: cabin === 'business' ? '1' : '7',
      awd: 'true',
    }),

  // Programas sem deeplink público funcional (verificado 07/2026 — 404/redirect):
  // link estático para a página do programa/companhia
  'flying blue': () => "https://wwws.airfrance.com.br/search/advanced",

  'flying club': () => "https://www.virginatlantic.com/",

  // Aeroplan: deeplink reconhecido; pede login e segue para a disponibilidade
  aeroplan: (o, d, dep, ret, _cabin) =>
    buildUrl("https://www.aircanada.com/aeroplan/redeem/availability/outbound", {
      org0: o,
      dest0: d,
      departureDate0: toISO(dep),
      ...(ret ? { departureDate1: toISO(ret) } : {}),
      lang: "en-CA",
      tripType: ret ? "R" : "O",
      ADT: "1",
      YTH: "0",
      CHD: "0",
      INF: "0",
      INS: "0",
      marketCode: "INT",
    }),

  'suma miles': () => "https://www.aireuropa.com/br/pt/home",

  lifemiles: () => "https://www.lifemiles.com/",
};

function normProgram(programa: string): string {
  return (programa || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

export function buildProgramBookingUrl(
  programa: string,
  iataOrigem: string,
  iataDestino: string,
  datasIda: string[],
  datasVolta: string[],
  classe: string,
): string | null {
  const key = normProgram(programa);
  const builder = PROGRAM_BUILDERS[key];

  if (!builder || !iataOrigem || !iataDestino) return null;

  const depDate = parseDateStr(datasIda[0]);
  if (!depDate) return null;

  const retDate = datasVolta.length > 0 ? parseDateStr(datasVolta[0]) : null;
  const cabin = normCabin(classe);

  try {
    return builder(iataOrigem.toUpperCase(), iataDestino.toUpperCase(), depDate, retDate, cabin);
  } catch {
    return null;
  }
}

export function buildAirlineBookingUrl(
  cia: string,
  iataOrigem: string,
  iataDestino: string,
  datasIda: string[],
  datasVolta: string[],
  classe: string,
): string | null {
  const normalized = normAirline(cia);
  const key = AIRLINE_NAME_MAP[normalized];
  const builder = key ? AIRLINE_BUILDERS[key] : null;

  if (!builder || !iataOrigem || !iataDestino) return null;

  const depDate = parseDateStr(datasIda[0]);
  if (!depDate) return null;

  const retDate = datasVolta.length > 0 ? parseDateStr(datasVolta[0]) : null;
  const cabin = normCabin(classe);

  try {
    return builder(
      iataOrigem.toUpperCase(),
      iataDestino.toUpperCase(),
      depDate,
      retDate,
      cabin,
    );
  } catch {
    return null;
  }
}
