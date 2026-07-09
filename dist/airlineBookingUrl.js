"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildProgramBookingUrl = buildProgramBookingUrl;
exports.buildAirlineBookingUrl = buildAirlineBookingUrl;
function parseDateStr(dateStr) {
    const parts = (dateStr || "").trim().split("/");
    if (parts.length !== 3)
        return null;
    const [d, m, y] = parts.map(Number);
    if (!d || !m || !y)
        return null;
    const fullYear = y < 100 ? 2000 + y : y;
    return new Date(fullYear, m - 1, d);
}
function toISO(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}
function toDDMMYYYY(date) {
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
}
function toCOPA(date) {
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
function toYYYYMMDD(date) {
    return toISO(date).replace(/-/g, "");
}
function normAirline(cia) {
    return (cia || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}
function normCabin(classe) {
    const c = (classe || "").toLowerCase();
    if (c.includes("executiva") || c.includes("business"))
        return "business";
    if (c.includes("primeira") || c.includes("first"))
        return "first";
    return "economy";
}
function buildUrl(base, params) {
    const qs = Object.entries(params)
        .filter(([, v]) => v !== "")
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join("&");
    return `${base}?${qs}`;
}
const AIRLINE_BUILDERS = {
    latam: (o, d, dep, ret, cabin) => buildUrl("https://www.latamairlines.com/br/pt/oferta-voos", {
        origin: o,
        destination: d,
        outbound: toISO(dep),
        ...(ret ? { inbound: toISO(ret) } : {}),
        adt: "1",
        inf: "0",
        chd: "0",
        cabin: cabin === "business"
            ? "Business"
            : cabin === "first"
                ? "PremiumBusiness"
                : "Economy",
        redemption: "false",
        sort: "PRICE",
    }),
    gol: (o, d, dep, ret, _cabin) => buildUrl("https://www.voegol.com.br/pt/buscar-voos", {
        origin: o,
        destination: d,
        departure: toISO(dep),
        ...(ret ? { return: toISO(ret) } : {}),
        adults: "1",
        children: "0",
        infants: "0",
    }),
    azul: (o, d, dep, ret, cabin) => buildUrl("https://www.voeazul.com.br/pt-br/home/voos", {
        origin: o,
        destination: d,
        departure: toISO(dep),
        ...(ret ? { return: toISO(ret) } : {}),
        adults: "1",
        children: "0",
        infants: "0",
        cabin: cabin === "business" ? "business" : "economy",
    }),
    copa: (o, d, dep, ret, _cabin) => buildUrl("https://shopping.copaair.com/", {
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
    iberia: (o, d, dep, ret, cabin) => buildUrl("https://www.iberia.com/br/comprar/buscador/", {
        origen: o,
        destino: d,
        fechaIda: toDDMMYYYY(dep),
        ...(ret ? { fechaVuelta: toDDMMYYYY(ret) } : {}),
        adultos: "1",
        cabina: cabin === "business" ? "C" : cabin === "first" ? "F" : "Y",
    }),
    tap: (o, d, dep, ret, cabin) => buildUrl("https://www.flytap.com/pt-br/voos/pesquisa", {
        origem: o,
        destino: d,
        "data-partida": toDDMMYYYY(dep),
        ...(ret ? { "data-retorno": toDDMMYYYY(ret) } : {}),
        adultos: "1",
        criancas: "0",
        bebes: "0",
        "tipo-viagem": ret ? "RT" : "OW",
        cabin: cabin === "business" ? "C" : "Y",
    }),
    american: (o, d, dep, ret, cabin) => {
        const slices = [{ orig: o, dest: d, date: toISO(dep) }];
        if (ret)
            slices.push({ orig: d, dest: o, date: toISO(ret) });
        return buildUrl("https://www.aa.com/booking/find-flights", {
            pax: "1",
            adult: "1",
            type: ret ? "RoundTrip" : "OneWay",
            searchType: "Revenue",
            cabin: cabin === "business" ? "B" : cabin === "first" ? "F" : "W",
            slices: JSON.stringify(slices),
        });
    },
    delta: (o, d, dep, ret, cabin) => buildUrl("https://www.delta.com/us/en/flight-search/book-a-flight", {
        tripType: ret ? "ROUND_TRIP" : "ONE_WAY",
        adults: "1",
        origin: o,
        dest: d,
        departureDate: toISO(dep),
        ...(ret ? { returnDate: toISO(ret) } : {}),
        cabinType: cabin === "business" ? "FIRST" : "COACH",
    }),
    united: (o, d, dep, ret, cabin) => buildUrl("https://www.united.com/en/us/fsr/choose-flights", {
        f: o,
        t: d,
        d: toISO(dep),
        ...(ret ? { r: toISO(ret) } : {}),
        tt: ret ? "2" : "1",
        at: "1",
        px: "1",
        sc: cabin === "business" ? "1" : "7",
    }),
    airfrance: (o, d, dep, ret, cabin) => buildUrl("https://www.airfrance.com.br/shopping/search", {
        departure: o,
        destination: d,
        outbound: toISO(dep),
        ...(ret ? { inbound: toISO(ret) } : {}),
        adt: "1",
        cabin: cabin === "business" ? "BUSINESS" : "ECONOMY",
    }),
    klm: (o, d, dep, ret, cabin) => buildUrl(`https://www.klm.com/flights/br-pt/${o}-${d}`, {
        type: ret ? "ROUND_TRIP" : "ONE_WAY",
        adult: "1",
        departure: toISO(dep),
        ...(ret ? { return: toISO(ret) } : {}),
        cabin: cabin === "business" ? "BUSINESS" : "ECONOMY",
    }),
    qatar: (o, d, dep, ret, cabin) => buildUrl("https://www.qatarairways.com/pt-br/flights.html", {
        widget: "QRW",
        searchType: ret ? "R" : "F",
        fromStation: o,
        toStation: d,
        departingDate: toISO(dep),
        ...(ret ? { returningDate: toISO(ret) } : {}),
        Adults: "1",
        Children: "0",
        Infants: "0",
        cabinClass: cabin === "business" ? "B" : cabin === "first" ? "F" : "E",
        addTaxToFare: "Y",
    }),
    turkish: (o, d, dep, ret, cabin) => buildUrl("https://www.turkishairlines.com/pt-br/flights/buy-flights/", {
        origin: o,
        destination: d,
        date: toYYYYMMDD(dep),
        ...(ret ? { returnDate: toYYYYMMDD(ret) } : {}),
        adults: "1",
        cabin: cabin === "business" ? "C" : "Y",
    }),
    emirates: (o, d, dep, ret, cabin) => buildUrl("https://www.emirates.com/br/portuguese/book/flights/", {
        origin: o,
        destination: d,
        class: cabin === "business"
            ? "Business"
            : cabin === "first"
                ? "First"
                : "Economy",
        adults: "1",
        dep_date: toDDMMYYYY(dep),
        ...(ret ? { ret_date: toDDMMYYYY(ret) } : {}),
    }),
    avianca: (o, d, dep, ret, cabin) => buildUrl("https://www.avianca.com/br/pt/buscar-voos/", {
        origin: o,
        destination: d,
        departureDate: toISO(dep),
        ...(ret ? { returnDate: toISO(ret) } : {}),
        pax: "1",
        cabinType: cabin === "business" ? "business" : "economy",
    }),
    aeromexico: (o, d, dep, ret, cabin) => buildUrl("https://aeromexico.com/pt-br/busca/resultado", {
        origin: o,
        destination: d,
        departureDate: toISO(dep),
        ...(ret ? { returnDate: toISO(ret) } : {}),
        adults: "1",
        children: "0",
        infants: "0",
        cabinClass: cabin === "business" ? "AM_BUSINESS" : "AM_ECONOMY",
        isFlexDate: "false",
        type: ret ? "RT" : "OW",
    }),
    aircanada: (o, d, dep, ret, cabin) => buildUrl("https://www.aircanada.com/ca/en/aco/home/book/flights.html", {
        origin: o,
        destination: d,
        departureDate: toISO(dep),
        ...(ret ? { returnDate: toISO(ret) } : {}),
        adults: "1",
        cabin: cabin === "business" ? "BUSINESS" : "ECONOMY",
    }),
    lufthansa: (o, d, dep, ret, cabin) => {
        const dep_date = `${String(dep.getDate()).padStart(2, "0")}.${String(dep.getMonth() + 1).padStart(2, "0")}.${dep.getFullYear()}`;
        const fragment = `outboundFlight=${o},${d},${dep_date}&cabinClass=${cabin === "business" ? "BUSINESS" : "ECONOMY"}&adult=1`;
        return `https://www.lufthansa.com/br/pt/flight-search#${fragment}`;
    },
    british: (o, d, dep, ret, cabin) => {
        const months = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
        ];
        const depStr = `${String(dep.getDate()).padStart(2, "0")}${months[dep.getMonth()]}${String(dep.getFullYear()).slice(-2)}`;
        return buildUrl("https://www.britishairways.com/en-gb/flights", {
            tripType: ret ? "RT" : "OW",
            from: o,
            to: d,
            depart: depStr,
            adult: "1",
            cabin: cabin === "business" ? "C" : cabin === "first" ? "F" : "M",
        });
    },
    alaska: (o, d, dep, ret, _cabin) => buildUrl("https://www.alaskaair.com/search/results", {
        A: "1",
        O: o,
        D: d,
        OD: toISO(dep),
        ...(ret ? { RD: toISO(ret) } : {}),
        RT: ret ? "true" : "false",
    }),
    aireuropa: (o, d, dep, ret, cabin) => buildUrl("https://www.aireuropa.com/br/pt/busca", {
        departure: o,
        arrival: d,
        outboundDate: toISO(dep),
        ...(ret ? { inboundDate: toISO(ret) } : {}),
        adults: "1",
        cabin: cabin === "business" ? "C" : "Y",
    }),
    virgin: (o, d, dep, ret, cabin) => buildUrl("https://www.virginatlantic.com/flights/search", {
        origin: o,
        destination: d,
        outbound: toISO(dep),
        ...(ret ? { inbound: toISO(ret) } : {}),
        adults: "1",
        cabinClass: cabin === "business" ? "Upper" : "Economy",
    }),
};
const AIRLINE_NAME_MAP = {
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
const PROGRAM_BUILDERS = {
    'latam pass': (o, d, dep, ret, cabin) => buildUrl('https://www.latamairlines.com/br/pt/oferta-voos', {
        origin: o, destination: d,
        outbound: toISO(dep),
        ...(ret ? { inbound: toISO(ret) } : {}),
        adt: '1', inf: '0', chd: '0',
        cabin: cabin === 'business' ? 'Business' : cabin === 'first' ? 'PremiumBusiness' : 'Economy',
        redemption: 'true',
        sort: 'PRICE',
    }),
    smiles: (o, d, dep, ret, cabin) => buildUrl('https://www.smiles.com.br/passagem-aerea', {
        tripType: ret ? '1' : '2',
        originAirport: o, destinationAirport: d,
        departureDate: toISO(dep),
        ...(ret ? { returnDate: toISO(ret) } : {}),
        adults: '1', children: '0', infants: '0',
        cabin: cabin === 'business' ? 'business' : 'economy',
        isFlexDate: 'false',
    }),
    'azul fidelidade': (o, d, dep, ret, cabin) => buildUrl('https://www.tudoazul.com.br/emissao', {
        originAirportCode: o, destinationAirportCode: d,
        departureDate: toISO(dep),
        ...(ret ? { returnDate: toISO(ret) } : {}),
        adults: '1',
        cabin: cabin === 'business' ? 'business' : 'economy',
    }),
    'azul interline': (o, d, dep, ret, cabin) => {
        const tripType = ret ? 'RT' : 'OW';
        const retDate = ret ? toISO(ret) : '-';
        const cabinStr = cabin === 'business' ? 'BUSINESS' : 'ECONOMY';
        return `https://azulpelomundo.voeazul.com.br/flights/${tripType}/${o}/${d}/-/-/${toISO(dep)}/${retDate}/1/0/0/0/0/ALL/F/${cabinStr}/-/-/-/-/A/-`;
    },
    'iberia plus': (o, d, dep, ret, cabin) => {
        const pad = (n) => String(n).padStart(2, '0');
        const iberiaMonth = (date) => `${date.getFullYear()}${pad(date.getMonth() + 1)}`;
        const fareType = cabin === 'business' ? 'B' : 'Y';
        const params = [
            ['market', 'US'], ['fromMarket', 'BR'], ['language', 'pt'],
            ['appliesOMB', 'false'], ['splitEndCity', 'false'], ['initializedOMB', 'true'],
            ['flexible', 'true'], ['TRIP_TYPE', ret ? '1' : '2'],
            ['BEGIN_CITY_01', o], ['END_CITY_01', d],
            ['BEGIN_DAY_01', pad(dep.getDate())], ['BEGIN_MONTH_01', iberiaMonth(dep)], ['BEGIN_YEAR_01', String(dep.getFullYear())],
            ['END_DAY_01', ret ? pad(ret.getDate()) : ''], ['END_MONTH_01', ret ? iberiaMonth(ret) : ''], ['END_YEAR_01', ret ? String(ret.getFullYear()) : ''],
            ['FARE_TYPE', fareType], ['quadrigam', 'IBADVS'],
            ['ADT', '1'], ['CHD', '0'], ['INF', '0'],
            ['residentCode', ''], ['familianumerosa', ''], ['boton', 'Buscar'],
            ['bookingMarket', 'BR'], ['pagoAvios', 'true'],
        ];
        const qs = params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
        return `https://www.iberia.com/flights/?${qs}#!/availability`;
    },
    'tap miles&go': (o, d, dep, ret, cabin) => buildUrl('https://www.flytap.com/pt-br/voos/pesquisa', {
        origem: o, destino: d,
        'data-partida': toDDMMYYYY(dep),
        ...(ret ? { 'data-retorno': toDDMMYYYY(ret) } : {}),
        adultos: '1', criancas: '0', bebes: '0',
        'tipo-viagem': ret ? 'RT' : 'OW',
        payment: 'miles',
    }),
    aadvantage: (o, d, dep, ret, cabin) => {
        const slices = [{ orig: o, dest: d, date: toISO(dep) }];
        if (ret)
            slices.push({ orig: d, dest: o, date: toISO(ret) });
        return buildUrl('https://www.aa.com/booking/find-flights', {
            pax: '1', adult: '1',
            type: ret ? 'RoundTrip' : 'OneWay',
            searchType: 'Award',
            cabin: cabin === 'business' ? 'B' : cabin === 'first' ? 'F' : 'W',
            slices: JSON.stringify(slices),
        });
    },
    connectmiles: (o, d, dep, ret, cabin) => buildUrl('https://www.copaair.com/pt-br/web/br/busca', {
        departure: o, arrival: d,
        date: toCOPA(dep),
        ...(ret ? { returnDate: toCOPA(ret) } : {}),
        cabin: cabin === 'business' ? 'C' : cabin === 'first' ? 'F' : 'Y',
        adults: '1', children: '0', infants: '0',
        currency: 'BRL',
        redemption: 'true',
    }),
    'privilege club': (o, d, dep, ret, cabin) => buildUrl('https://www.qatarairways.com/pt-br/flights.html', {
        widget: 'QRW',
        searchType: ret ? 'R' : 'F',
        fromStation: o, toStation: d,
        departingDate: toISO(dep),
        ...(ret ? { returningDate: toISO(ret) } : {}),
        Adults: '1', Children: '0', Infants: '0',
        cabinClass: cabin === 'business' ? 'B' : cabin === 'first' ? 'F' : 'E',
        addTaxToFare: 'Y',
    }),
    'flying blue': (o, d, dep, ret, cabin) => buildUrl('https://www.flyingblue.com/en/spend/flights/search', {
        origin: o, destination: d,
        adults: '1',
        travel_date: toISO(dep),
        ...(ret ? { return_date: toISO(ret) } : {}),
        cabin: cabin === 'business' ? 'BUSINESS' : 'ECONOMY',
    }),
    'mileage plan': (o, d, dep, ret, _cabin) => buildUrl('https://www.alaskaair.com/search/results', {
        A: '1', O: o, D: d,
        OD: toISO(dep),
        ...(ret ? { RD: toISO(ret) } : {}),
        RT: ret ? 'true' : 'false',
        MR: 'true',
    }),
    'flying club': (o, d, dep, ret, cabin) => buildUrl('https://www.virginatlantic.com/flights/search', {
        origin: o, destination: d,
        outbound: toISO(dep),
        ...(ret ? { inbound: toISO(ret) } : {}),
        adults: '1',
        cabinClass: cabin === 'business' ? 'Upper' : 'Economy',
        flightType: 'MILES',
    }),
    skymiles: (o, d, dep, ret, cabin) => buildUrl('https://www.delta.com/us/en/flight-search/book-a-flight', {
        tripType: ret ? 'ROUND_TRIP' : 'ONE_WAY',
        adults: '1', origin: o, dest: d,
        departureDate: toISO(dep),
        ...(ret ? { returnDate: toISO(ret) } : {}),
        cabinType: cabin === 'business' ? 'FIRST' : 'COACH',
        awardTravel: 'true',
    }),
    mileageplus: (o, d, dep, ret, cabin) => buildUrl('https://www.united.com/en/us/fsr/choose-flights', {
        f: o, t: d,
        d: toISO(dep),
        ...(ret ? { r: toISO(ret) } : {}),
        tt: ret ? '2' : '1',
        at: '1', px: '1',
        sc: cabin === 'business' ? '1' : '7',
        awd: 'true',
    }),
    aeroplan: (o, d, dep, ret, cabin) => buildUrl('https://www.aircanada.com/ca/en/aco/home/book/flights-only/rewards.html', {
        origin: o, destination: d,
        departureDate: toISO(dep),
        ...(ret ? { returnDate: toISO(ret) } : {}),
        adults: '1',
        cabin: cabin === 'business' ? 'BUSINESS' : 'ECONOMY',
    }),
    'suma miles': (o, d, dep, ret, cabin) => buildUrl('https://www.aireuropa.com/br/pt/busca', {
        departure: o, arrival: d,
        outboundDate: toISO(dep),
        ...(ret ? { inboundDate: toISO(ret) } : {}),
        adults: '1',
        cabin: cabin === 'business' ? 'C' : 'Y',
        sumamiles: 'true',
    }),
    lifemiles: (o, d, dep, ret, cabin) => buildUrl('https://www.avianca.com/br/pt/buscar-voos/', {
        origin: o, destination: d,
        departureDate: toISO(dep),
        ...(ret ? { returnDate: toISO(ret) } : {}),
        pax: '1',
        cabinType: cabin === 'business' ? 'business' : 'economy',
        redemption: 'true',
    }),
};
function normProgram(programa) {
    return (programa || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}
function buildProgramBookingUrl(programa, iataOrigem, iataDestino, datasIda, datasVolta, classe) {
    const key = normProgram(programa);
    const builder = PROGRAM_BUILDERS[key];
    if (!builder || !iataOrigem || !iataDestino)
        return null;
    const depDate = parseDateStr(datasIda[0]);
    if (!depDate)
        return null;
    const retDate = datasVolta.length > 0 ? parseDateStr(datasVolta[0]) : null;
    const cabin = normCabin(classe);
    try {
        return builder(iataOrigem.toUpperCase(), iataDestino.toUpperCase(), depDate, retDate, cabin);
    }
    catch {
        return null;
    }
}
function buildAirlineBookingUrl(cia, iataOrigem, iataDestino, datasIda, datasVolta, classe) {
    const normalized = normAirline(cia);
    const key = AIRLINE_NAME_MAP[normalized];
    const builder = key ? AIRLINE_BUILDERS[key] : null;
    if (!builder || !iataOrigem || !iataDestino)
        return null;
    const depDate = parseDateStr(datasIda[0]);
    if (!depDate)
        return null;
    const retDate = datasVolta.length > 0 ? parseDateStr(datasVolta[0]) : null;
    const cabin = normCabin(classe);
    try {
        return builder(iataOrigem.toUpperCase(), iataDestino.toUpperCase(), depDate, retDate, cabin);
    }
    catch {
        return null;
    }
}
