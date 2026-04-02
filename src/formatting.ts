// =====================================================================
// Match Imagem por Destino (Estratégias: IATA → alias → exato → substring → palavras → fallback)
// =====================================================================
import { normalizeProgramaName, PROGRAMA_LINKS } from './milheiroHandler';

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&q=80";

export const DESTINATIONS_LOOKUP: Record<string, string> = {
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
  "Nova Delhi":"https://nomads.com/assets/img/places/delhi-india.jpg",
  "Bangalore":"https://nomads.com/assets/img/places/bangalore-india.jpg",
  "Goa":"https://nomads.com/assets/img/places/goa-india.jpg",
  "Colombo":"https://nomads.com/assets/img/places/colombo-sri-lanka.jpg",
  "Katmandu":"https://nomads.com/assets/img/places/kathmandu-nepal.jpg",
  "Yerevan":"https://nomads.com/assets/img/places/yerevan-armenia.jpg",
  "Siem Reap":"https://nomads.com/assets/img/places/siem-reap-cambodia.jpg",
  "Vientiane":"https://nomads.com/assets/img/places/vientiane-laos.jpg",
  "Penang":"https://nomads.com/assets/img/places/penang-malaysia.jpg",
  "Madri":"https://nomads.com/assets/img/places/madrid-spain.jpg",
  "Munique":"https://nomads.com/assets/img/places/munich-germany.jpg",
  "Paris":"https://nomads.com/assets/img/places/paris-france.jpg",
  "Londres":"https://nomads.com/assets/img/places/london-united-kingdom.jpg",
  "Amsterdã":"https://nomads.com/assets/img/places/amsterdam-netherlands.jpg",
  "Viena":"https://nomads.com/assets/img/places/vienna-austria.jpg",
  "Roma":"https://nomads.com/assets/img/places/rome-italy.jpg",
  "Milão":"https://nomads.com/assets/img/places/milan-italy.jpg",
  "Florença":"https://nomads.com/assets/img/places/florence-italy.jpg",
  "Atenas":"https://nomads.com/assets/img/places/athens-greece.jpg",
  "Istambul":"https://nomads.com/assets/img/places/istanbul-turkey.jpg",
  "Varsóvia":"https://nomads.com/assets/img/places/warsaw-poland.jpg",
  "Cracóvia":"https://nomads.com/assets/img/places/krakow-poland.jpg",
  "Bucareste":"https://nomads.com/assets/img/places/bucharest-romania.jpg",
  "Sófia":"https://nomads.com/assets/img/places/sofia-bulgaria.jpg",
  "Belgrado":"https://nomads.com/assets/img/places/belgrade-serbia.jpg",
  "Zagreb":"https://nomads.com/assets/img/places/zagreb-croatia.jpg",
  "Liubliana":"https://nomads.com/assets/img/places/ljubljana-slovenia.jpg",
  "Tallinn":"https://nomads.com/assets/img/places/tallinn-estonia.jpg",
  "Riga":"https://nomads.com/assets/img/places/riga-latvia.jpg",
  "Vilnius":"https://nomads.com/assets/img/places/vilnius-lithuania.jpg",
  "Helsinque":"https://nomads.com/assets/img/places/helsinki-finland.jpg",
  "Estocolmo":"https://nomads.com/assets/img/places/stockholm-sweden.jpg",
  "Copenhague":"https://nomads.com/assets/img/places/copenhagen-denmark.jpg",
  "Dublin":"https://nomads.com/assets/img/places/dublin-ireland.jpg",
  "Edimburgo":"https://nomads.com/assets/img/places/edinburgh-united-kingdom.jpg",
  "Bruxelas":"https://nomads.com/assets/img/places/brussels-belgium.jpg",
  "Sevilha":"https://nomads.com/assets/img/places/seville-spain.jpg",
  "Valência":"https://nomads.com/assets/img/places/valencia-spain.jpg",
  "Málaga":"https://nomads.com/assets/img/places/malaga-spain.jpg",
  "Nice":"https://nomads.com/assets/img/places/nice-france.jpg",
  "Lyon":"https://nomads.com/assets/img/places/lyon-france.jpg",
  "Zurique":"https://nomads.com/assets/img/places/zurich-switzerland.jpg",
  "Genebra":"https://nomads.com/assets/img/places/geneva-switzerland.jpg",
  "Oslo":"https://nomads.com/assets/img/places/oslo-norway.jpg",
  "Cancún":"https://nomads.com/assets/img/places/cancun-mexico.jpg",
  "Tulum":"https://nomads.com/assets/img/places/tulum-mexico.jpg",
  "Cartagena":"https://nomads.com/assets/img/places/cartagena-colombia.jpg",
  "Lima":"https://nomads.com/assets/img/places/lima-peru.jpg",
  "Cusco":"https://nomads.com/assets/img/places/cusco-peru.jpg",
  "Santiago":"https://nomads.com/assets/img/places/santiago-chile.jpg",
  "Montevidéu":"https://nomads.com/assets/img/places/montevideo-uruguay.jpg",
  "Quito":"https://nomads.com/assets/img/places/quito-ecuador.jpg",
  "San José":"https://nomads.com/assets/img/places/san-jose-costa-rica.jpg",
  "Cidade do Panamá":"https://nomads.com/assets/img/places/panama-city-panama.jpg",
  "Nova York":"https://nomads.com/assets/img/places/new-york-city-ny-united-states.jpg",
  "San Francisco":"https://nomads.com/assets/img/places/san-francisco-ca-united-states.jpg",
  "Los Angeles":"https://nomads.com/assets/img/places/los-angeles-ca-united-states.jpg",
  "Austin":"https://nomads.com/assets/img/places/austin-tx-united-states.jpg",
  "Miami":"https://nomads.com/assets/img/places/miami-fl-united-states.jpg",
  "Chicago":"https://nomads.com/assets/img/places/chicago-il-united-states.jpg",
  "Toronto":"https://nomads.com/assets/img/places/toronto-canada.jpg",
  "Vancouver":"https://nomads.com/assets/img/places/vancouver-canada.jpg",
  "Montreal":"https://nomads.com/assets/img/places/montreal-canada.jpg",
  "Valparaíso":"https://nomads.com/assets/img/places/valparaiso-chile.jpg",
  "Cidade do Cabo":"https://nomads.com/assets/img/places/cape-town-south-africa.jpg",
  "Nairóbi":"https://nomads.com/assets/img/places/nairobi-kenya.jpg",
  "Marrakech":"https://nomads.com/assets/img/places/marrakech-morocco.jpg",
  "Cairo":"https://nomads.com/assets/img/places/cairo-egypt.jpg",
  "Acra":"https://nomads.com/assets/img/places/accra-ghana.jpg",
  "Lagos":"https://nomads.com/assets/img/places/lagos-nigeria.jpg",
  "Dacar":"https://nomads.com/assets/img/places/dakar-senegal.jpg",
  "Adis Abeba":"https://nomads.com/assets/img/places/addis-ababa-ethiopia.jpg",
  "Kigali":"https://nomads.com/assets/img/places/kigali-rwanda.jpg",
  "Zanzibar":"https://images.unsplash.com/photo-1586861203927-800a5acdcc4d?w=600&q=80",
  "Tunis":"https://nomads.com/assets/img/places/tunis-tunisia.jpg",
  "Casablanca":"https://nomads.com/assets/img/places/casablanca-morocco.jpg",
  "Dar es Salaam":"https://nomads.com/assets/img/places/dar-es-salaam-tanzania.jpg",
  "Port Louis":"https://nomads.com/assets/img/places/port-louis-mauritius.jpg",
  "Sydney":"https://nomads.com/assets/img/places/sydney-australia.jpg",
  "Melbourne":"https://nomads.com/assets/img/places/melbourne-australia.jpg",
  "Brisbane":"https://nomads.com/assets/img/places/brisbane-australia.jpg",
  "Auckland":"https://nomads.com/assets/img/places/auckland-new-zealand.jpg",
  "Wellington":"https://nomads.com/assets/img/places/wellington-new-zealand.jpg",
  "Gold Coast":"https://nomads.com/assets/img/places/gold-coast-australia.jpg",
  "Perth":"https://nomads.com/assets/img/places/perth-australia.jpg",
  "Abu Dhabi":"https://nomads.com/assets/img/places/abu-dhabi-united-arab-emirates.jpg",
  "Tel Aviv":"https://nomads.com/assets/img/places/tel-aviv-israel.jpg",
  "Amã":"https://nomads.com/assets/img/places/amman-jordan.jpg",
  "Doha":"https://nomads.com/assets/img/places/doha-qatar.jpg",
  "Mascate":"https://nomads.com/assets/img/places/muscat-oman.jpg",
  "Beirute":"https://nomads.com/assets/img/places/beirut-lebanon.jpg",
  "Chiang Rai":"https://nomads.com/assets/img/places/chiang-rai-thailand.jpg",
  "Koh Samui":"https://nomads.com/assets/img/places/ko-samui-thailand.jpg",
  "Luang Prabang":"https://nomads.com/assets/img/places/luang-prabang-laos.jpg",
  "Hoi An":"https://nomads.com/assets/img/places/hoi-an-vietnam.jpg",
  "Nha Trang":"https://nomads.com/assets/img/places/nha-trang-vietnam.jpg",
  "Langkawi":"https://nomads.com/assets/img/places/langkawi-malaysia.jpg",
  "Yogyakarta":"https://nomads.com/assets/img/places/yogyakarta-indonesia.jpg",
  "Seminyak":"https://nomads.com/assets/img/places/seminyak-bali-indonesia.jpg",
  "Quioto":"https://nomads.com/assets/img/places/kyoto-japan.jpg",
  "Fukuoka":"https://nomads.com/assets/img/places/fukuoka-japan.jpg",
  "Ilha de Jeju":"https://nomads.com/assets/img/places/jeju-island-south-korea.jpg",
  "Batumi":"https://nomads.com/assets/img/places/batumi-georgia.jpg",
  "Antalya":"https://nomads.com/assets/img/places/antalya-turkey.jpg",
  "Dubrovnik":"https://nomads.com/assets/img/places/dubrovnik-croatia.jpg",
  "Tessalônica":"https://nomads.com/assets/img/places/thessaloniki-greece.jpg",
  "Kotor":"https://nomads.com/assets/img/places/kotor-montenegro.jpg",
  "Tirana":"https://nomads.com/assets/img/places/tirana-albania.jpg",
  "Skopje":"https://nomads.com/assets/img/places/skopje-north-macedonia.jpg",
  "Sarajevo":"https://nomads.com/assets/img/places/sarajevo-bosnia.jpg",
  "Palermo":"https://nomads.com/assets/img/places/palermo-italy.jpg",
  "Nápoles":"https://nomads.com/assets/img/places/naples-italy.jpg",
  "Cascais":"https://nomads.com/assets/img/places/cascais-portugal.jpg",
  "Lagos (Algarve)":"https://nomads.com/assets/img/places/lagos-portugal.jpg",
  "Granada":"https://nomads.com/assets/img/places/granada-spain.jpg",
  "San Sebastián":"https://nomads.com/assets/img/places/san-sebastian-spain.jpg",
  "Bordeaux":"https://nomads.com/assets/img/places/bordeaux-france.jpg",
  "Marselha":"https://nomads.com/assets/img/places/marseille-france.jpg",
  "Hamburgo":"https://nomads.com/assets/img/places/hamburg-germany.jpg",
  "Ericeira":"https://nomads.com/assets/img/places/ericeira-portugal.jpg",
  "Portland":"https://nomads.com/assets/img/places/portland-or-united-states.jpg",
  "Seattle":"https://nomads.com/assets/img/places/seattle-wa-united-states.jpg",
  "Denver":"https://nomads.com/assets/img/places/denver-co-united-states.jpg",
  "Oaxaca":"https://nomads.com/assets/img/places/oaxaca-mexico.jpg",
  "Puerto Vallarta":"https://nomads.com/assets/img/places/puerto-vallarta-mexico.jpg",
  "Guadalajara":"https://nomads.com/assets/img/places/guadalajara-mexico.jpg",
  "San Miguel de Allende":"https://nomads.com/assets/img/places/san-miguel-de-allende-mexico.jpg",
  "Cali":"https://nomads.com/assets/img/places/cali-colombia.jpg",
  "Santa Marta":"https://nomads.com/assets/img/places/santa-marta-colombia.jpg",
  "La Paz":"https://nomads.com/assets/img/places/la-paz-bolivia.jpg",
  "Assunção":"https://nomads.com/assets/img/places/asuncion-paraguay.jpg",
  "Guayaquil":"https://nomads.com/assets/img/places/guayaquil-ecuador.jpg",
  "Cuenca":"https://nomads.com/assets/img/places/cuenca-ecuador.jpg",
  "Havana":"https://nomads.com/assets/img/places/havana-cuba.jpg",
  "Kingston":"https://nomads.com/assets/img/places/kingston-jamaica.jpg",
  "Santo Domingo":"https://nomads.com/assets/img/places/santo-domingo-dominican-republic.jpg",
  "Antigua":"https://nomads.com/assets/img/places/antigua-guatemala.jpg",
  "Punta Cana":"https://nomads.com/assets/img/places/punta-cana-dominican-republic.jpg",
  "Baku":"https://nomads.com/assets/img/places/baku-azerbaijan.jpg",
  "Reykjavik":"https://nomads.com/assets/img/places/reykjavik-iceland.jpg",
  "Pokhara":"https://nomads.com/assets/img/places/pokhara-nepal.jpg",
  "Galle":"https://nomads.com/assets/img/places/galle-sri-lanka.jpg",
  "Almaty":"https://nomads.com/assets/img/places/almaty-kazakhstan.jpg",
  "Tashkent":"https://nomads.com/assets/img/places/tashkent-uzbekistan.jpg",
  "Siargao":"https://nomads.com/assets/img/places/siargao-philippines.jpg",
  "Riade":"https://nomads.com/assets/img/places/riyadh-saudi-arabia.jpg",
  "Jeddah":"https://nomads.com/assets/img/places/jeddah-saudi-arabia.jpg",
  "Windhoek":"https://nomads.com/assets/img/places/windhoek-namibia.jpg",
  "Adelaide":"https://nomads.com/assets/img/places/adelaide-australia.jpg",
  "Queenstown":"https://nomads.com/assets/img/places/queenstown-new-zealand.jpg",
  "Nadi":"https://images.unsplash.com/photo-1507699622108-4be3abd695ad?w=600&q=80",
  "Apia":"https://nomads.com/assets/img/places/apia-samoa.jpg",
  "Suva":"https://nomads.com/assets/img/places/suva-fiji.jpg",
  "Chennai":"https://nomads.com/assets/img/places/chennai-india.jpg",
  "Jaipur":"https://nomads.com/assets/img/places/jaipur-india.jpg",
  "Kochi":"https://nomads.com/assets/img/places/kochi-india.jpg",
  "Jiufen":"https://images.unsplash.com/photo-1513023840371-dd774fcaee5b?w=600&q=80",
  "Kaohsiung":"https://nomads.com/assets/img/places/kaohsiung-taiwan.jpg",
  "Mtskheta":"https://images.unsplash.com/photo-1565008576549-57569a49371d?w=600&q=80",
  "Pocitos (Montevidéu)":"https://nomads.com/assets/img/places/montevideo-uruguay.jpg",
  "Arequipa":"https://nomads.com/assets/img/places/arequipa-peru.jpg",
  "Tamarindo":"https://nomads.com/assets/img/places/tamarindo-costa-rica.jpg",
  "Cairns":"https://nomads.com/assets/img/places/cairns-australia.jpg",
  "Nouméa":"https://nomads.com/assets/img/places/noumea-new-caledonia.jpg",
  "Ghent":"https://nomads.com/assets/img/places/ghent-belgium.jpg",
  "Gdansk":"https://nomads.com/assets/img/places/gdansk-poland.jpg",
  "Cluj-Napoca":"https://nomads.com/assets/img/places/cluj-romania.jpg",
  "Essaouira":"https://nomads.com/assets/img/places/essaouira-morocco.jpg",
  "Santa Maria (Sal)":"https://images.unsplash.com/photo-1523805009345-7448845a9e53?w=600&q=80",
  "Kampala":"https://nomads.com/assets/img/places/kampala-uganda.jpg",
  "George Town":"https://nomads.com/assets/img/places/penang-malaysia.jpg",
  "Ipoh":"https://nomads.com/assets/img/places/ipoh-malaysia.jpg",
  "Mandalay":"https://nomads.com/assets/img/places/mandalay-myanmar.jpg",
  "Negombo":"https://images.unsplash.com/photo-1586613835259-5c51d8e8a47f?w=600&q=80",
  "Bratislava":"https://nomads.com/assets/img/places/bratislava-slovakia.jpg",
  "Ljubljana":"https://nomads.com/assets/img/places/ljubljana-slovenia.jpg",
  "Ulan Bator":"https://nomads.com/assets/img/places/ulaanbaatar-mongolia.jpg",
  "La Paz (BCS)":"https://nomads.com/assets/img/places/la-paz-mexico.jpg",
  "Mérida":"https://nomads.com/assets/img/places/merida-mexico.jpg",
  "Sucre":"https://images.unsplash.com/photo-1564500020755-258bfe4d4ff4?w=600&q=80",
  "Córdoba":"https://nomads.com/assets/img/places/cordoba-spain.jpg",
  "San Carlos de Bariloche":"https://nomads.com/assets/img/places/bariloche-argentina.jpg",
  "Budva":"https://nomads.com/assets/img/places/budva-montenegro.jpg",
  "Fez":"https://nomads.com/assets/img/places/fes-morocco.jpg",
  "Maputo":"https://nomads.com/assets/img/places/maputo-mozambique.jpg",
  "Lamu":"https://images.unsplash.com/photo-1523805009345-7448845a9e53?w=600&q=80",
  "Pune":"https://nomads.com/assets/img/places/pune-india.jpg",
  "Panaji (Goa)":"https://nomads.com/assets/img/places/goa-india.jpg",
  "Varna":"https://nomads.com/assets/img/places/varna-bulgaria.jpg",
  "Nicósia":"https://nomads.com/assets/img/places/nicosia-cyprus.jpg",
  "Valletta":"https://nomads.com/assets/img/places/malta.jpg",
  "Lausanne":"https://nomads.com/assets/img/places/lausanne-switzerland.jpg",
  "Inverness":"https://images.unsplash.com/photo-1648674136198-86bab411a319?w=800&q=80",
  "Las Palmas":"https://nomads.com/assets/img/places/las-palmas-gran-canaria-spain.jpg",
  "Chefchaouen":"https://images.unsplash.com/photo-1509822929063-6b6cfc9b42f2?w=600&q=80",
  "Hué":"https://nomads.com/assets/img/places/hue-vietnam.jpg",
  "Ella":"https://images.unsplash.com/photo-1586613835259-5c51d8e8a47f?w=600&q=80",
  "Mussoorie":"https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=600&q=80",
  "Taghazout":"https://nomads.com/assets/img/places/taghazout-morocco.jpg",
  "Bruges":"https://nomads.com/assets/img/places/bruges-belgium.jpg",
  "Tegallalang":"https://nomads.com/assets/img/places/ubud-bali-indonesia.jpg",
  "Salta":"https://nomads.com/assets/img/places/salta-argentina.jpg",
  "Mendoza":"https://nomads.com/assets/img/places/mendoza-argentina.jpg",
  "Cochabamba":"https://nomads.com/assets/img/places/cochabamba-bolivia.jpg",
  "Oranjestad":"https://nomads.com/assets/img/places/aruba.jpg",
  "Bucaramanga":"https://nomads.com/assets/img/places/bucaramanga-colombia.jpg",
  "Paramaribo":"https://nomads.com/assets/img/places/paramaribo-suriname.jpg",
  "Viña del Mar":"https://nomads.com/assets/img/places/vina-del-mar-chile.jpg",
  "Punta del Este":"https://nomads.com/assets/img/places/punta-del-este-uruguay.jpg",
  "Chachapoyas":"https://nomads.com/assets/img/places/chachapoyas-peru.jpg",
  "Jundiaí":"https://nomads.com/assets/img/places/jundiai-brazil.jpg",
  "Montañita":"https://nomads.com/assets/img/places/montanita-ecuador.jpg",
  "Salento":"https://nomads.com/assets/img/places/salento-colombia.jpg",
  "Willemstad":"https://nomads.com/assets/img/places/curacao.jpg",
  "La Plata":"https://nomads.com/assets/img/places/la-plata-argentina.jpg",
  "Pipa":"https://nomads.com/assets/img/places/pipa-brazil.jpg",
  "Itajaí":"https://nomads.com/assets/img/places/itajai-brazil.jpg",
  "Rosario":"https://nomads.com/assets/img/places/rosario-argentina.jpg",
  "Santa Cruz":"https://nomads.com/assets/img/places/santa-cruz-bolivia.jpg",
  "Basse-Terre":"https://nomads.com/assets/img/places/basse-terre-guadeloupe.jpg",
  "Máncora":"https://nomads.com/assets/img/places/mancora-peru.jpg",
  "Kralendijk":"https://nomads.com/assets/img/places/kralendijk-caribbean-netherlands.jpg",
  "São José dos Campos":"https://nomads.com/assets/img/places/sao-jose-dos-campos-brazil.jpg",
  "Trancoso":"https://nomads.com/assets/img/places/trancoso-brazil.jpg",
  "Sorocaba":"https://nomads.com/assets/img/places/sorocaba-brazil.jpg",
  "Mar del Plata":"https://nomads.com/assets/img/places/mar-del-plata-argentina.jpg",
  "Campo Grande":"https://nomads.com/assets/img/places/campo-grande-brazil.jpg",
  "Georgetown":"https://nomads.com/assets/img/places/georgetown-guyana.jpg",
  "Foz do Iguaçu":"https://nomads.com/assets/img/places/foz-do-iguacu-brazil.jpg",
  "Anápolis":"https://nomads.com/assets/img/places/anapolis-brazil.jpg",
  "St. George's":"https://nomads.com/assets/img/places/st-georges-grenada.jpg",
  "El Alto":"https://nomads.com/assets/img/places/el-alto-bolivia.jpg",
  "São Luís":"https://nomads.com/assets/img/places/sao-luis-brazil.jpg",
  "La Serena":"https://nomads.com/assets/img/places/la-serena-chile.jpg",
  "Iquique":"https://nomads.com/assets/img/places/iquique-chile.jpg",
  "Campos dos Goytacazes":"https://nomads.com/assets/img/places/campos-dos-goytacazes-brazil.jpg",
  "Itapema":"https://nomads.com/assets/img/places/itapema-brazil.jpg",
  "San Pedro de Atacama":"https://nomads.com/assets/img/places/san-pedro-de-atacama-chile.jpg",
  "Maracaibo":"https://nomads.com/assets/img/places/maracaibo-venezuela.jpg",
  "Pasto":"https://nomads.com/assets/img/places/pasto-colombia.jpg",
  "Antofagasta":"https://nomads.com/assets/img/places/antofagasta-chile.jpg",
  "Maracay":"https://nomads.com/assets/img/places/maracay-venezuela.jpg",
  "Intag Valley":"https://nomads.com/assets/img/places/intag-valley-ecuador.jpg",
  "Port of Spain":"https://nomads.com/assets/img/places/port-of-spain-trinidad-and-tobago.jpg",
  "Uberlândia":"https://nomads.com/assets/img/places/uberlandia-brazil.jpg",
  "Caracas":"https://nomads.com/assets/img/places/caracas-venezuela.jpg",
  "Bridgetown":"https://nomads.com/assets/img/places/bridgetown-barbados.jpg",
  "St. John's":"https://nomads.com/assets/img/places/st-johns-antigua-and-barbuda.jpg",
  "Martinica":"https://nomads.com/assets/img/places/martinique.jpg",
  "Cayenne":"https://nomads.com/assets/img/places/cayenne-french-guiana.jpg",
  "Tabatinga":"https://images.unsplash.com/photo-1618681738822-076049b6e573?w=600&q=80",
  "Querétaro":"https://nomads.com/assets/img/places/queretaro-mexico.jpg",
  "San Salvador":"https://nomads.com/assets/img/places/san-salvador-el-salvador.jpg",
  "Montego Bay":"https://nomads.com/assets/img/places/montego-bay-jamaica.jpg",
  "Cabarete":"https://nomads.com/assets/img/places/cabarete-dominican-republic.jpg",
  "San Juan":"https://nomads.com/assets/img/places/san-juan-puerto-rico.jpg",
  "Puerto Viejo":"https://nomads.com/assets/img/places/puerto-viejo-costa-rica.jpg",
  "Monterrey":"https://nomads.com/assets/img/places/monterrey-mexico.jpg",
  "Torreón":"https://nomads.com/assets/img/places/torreon-mexico.jpg",
  "Puebla":"https://nomads.com/assets/img/places/puebla-mexico.jpg",
  "Ilhas Galápagos":"https://nomads.com/assets/img/places/galapagos-islands-ecuador.jpg",
  "Ushuaia":"https://nomads.com/assets/img/places/ushuaia-argentina.jpg",
  "Jarabacoa":"https://nomads.com/assets/img/places/jarabacoa-dominican-republic.jpg",
  "Nassau":"https://nomads.com/assets/img/places/nassau-the-bahamas.jpg",
  "Caye Caulker":"https://nomads.com/assets/img/places/caye-caulker-belize.jpg",
  "Liberia":"https://nomads.com/assets/img/places/liberia-costa-rica.jpg",
  "Managua":"https://nomads.com/assets/img/places/managua-nicaragua.jpg",
  "Tijuana":"https://nomads.com/assets/img/places/tijuana-mexico.jpg",
  "Toluca":"https://nomads.com/assets/img/places/toluca-mexico.jpg",
  "Cidade da Guatemala":"https://nomads.com/assets/img/places/guatemala-city-guatemala.jpg",
  "Cozumel":"https://nomads.com/assets/img/places/cozumel-mexico.jpg",
  "Bocas del Toro":"https://nomads.com/assets/img/places/bocas-del-toro-panama.jpg",
  "Puerto Escondido":"https://nomads.com/assets/img/places/puerto-escondido-mexico.jpg",
  "Isla Mujeres":"https://nomads.com/assets/img/places/isla-mujeres-mexico.jpg",
  "Islas de la Bahía":"https://images.unsplash.com/photo-1570137491981-c5b1c0a25e2f?w=600&q=80",
  "San Juan del Sur":"https://nomads.com/assets/img/places/san-juan-del-sur-nicaragua.jpg",
  "Panajachel":"https://nomads.com/assets/img/places/panajachel-guatemala.jpg",
  "Aguascalientes":"https://nomads.com/assets/img/places/aguascalientes-mexico.jpg",
  "León":"https://nomads.com/assets/img/places/leon-nicaragua.jpg",
  "San Pedro Sula":"https://nomads.com/assets/img/places/san-pedro-sula-honduras.jpg",
  "San Cristóbal de las Casas":"https://nomads.com/assets/img/places/san-cristobal-de-las-casas-mexico.jpg",
  "Porto Príncipe":"https://nomads.com/assets/img/places/port-au-prince-haiti.jpg",
  "Hermosillo":"https://nomads.com/assets/img/places/hermosillo-mexico.jpg",
  "Tegucigalpa":"https://nomads.com/assets/img/places/tegucigalpa-honduras.jpg",
  "San Luis Potosí":"https://nomads.com/assets/img/places/san-luis-potosi-mexico.jpg",
  "Barranquilla":"https://nomads.com/assets/img/places/barranquilla-colombia.jpg",
  "Philipsburg":"https://nomads.com/assets/img/places/philipsburg-sint-maarten.jpg",
  "Juárez":"https://nomads.com/assets/img/places/juarez-mexico.jpg",
  "King Edward Point":"https://nomads.com/assets/img/places/king-edward-point-south-georgia-and-the-south-sandwich-islands.jpg",
  "Road Town":"https://nomads.com/assets/img/places/road-town-british-virgin-islands.jpg",
  "Mexicali":"https://nomads.com/assets/img/places/mexicali-mexico.jpg",
  "Santa Teresa":"https://nomads.com/assets/img/places/santa-teresa-costa-rica.jpg",
  "Charlotte Amalie":"https://nomads.com/assets/img/places/charlotte-amalie-united-states-virgin-islands.jpg",
  "Stanley":"https://nomads.com/assets/img/places/stanley-falkland-islands.jpg",
  "Sayulita":"https://nomads.com/assets/img/places/sayulita-mexico.jpg",
  "Guanajuato":"https://nomads.com/assets/img/places/guanajuato-mexico.jpg",
  "Hamilton":"https://nomads.com/assets/img/places/hamilton-bermuda.jpg",
  "Belize City":"https://nomads.com/assets/img/places/belize-city-belize.jpg",
  "Copán":"https://nomads.com/assets/img/places/copan-honduras.jpg",
  "Minca":"https://nomads.com/assets/img/places/minca-colombia.jpg",
  "Cabo San Lucas":"https://nomads.com/assets/img/places/cabo-san-lucas-mexico.jpg",
  "El Calafate":"https://nomads.com/assets/img/places/el-calafate-argentina.jpg",
  "San Ignacio":"https://nomads.com/assets/img/places/san-ignacio-belize.jpg",
  "San Pedro":"https://nomads.com/assets/img/places/san-pedro-belize.jpg",
  "Dallas":"https://nomads.com/assets/img/places/dallas-united-states.jpg",
  "Columbus":"https://nomads.com/assets/img/places/columbus-oh-united-states.jpg",
  "Ogden":"https://nomads.com/assets/img/places/ogden-ut-united-states.jpg",
  "Battle Creek":"https://nomads.com/assets/img/places/battle-creek-mi-united-states.jpg",
  "Amarillo":"https://nomads.com/assets/img/places/amarillo-tx-united-states.jpg",
  "Honolulu":"https://nomads.com/assets/img/places/honolulu-united-states.jpg",
  "Greeley":"https://nomads.com/assets/img/places/greeley-co-united-states.jpg",
  "Atlanta":"https://nomads.com/assets/img/places/atlanta-united-states.jpg",
  "Memphis":"https://nomads.com/assets/img/places/memphis-tn-united-states.jpg",
  "Winnipeg":"https://nomads.com/assets/img/places/winnipeg-canada.jpg",
  "Pittsburgh":"https://nomads.com/assets/img/places/pittsburgh-pa-united-states.jpg",
  "Cincinnati":"https://nomads.com/assets/img/places/cincinnati-oh-united-states.jpg",
  "Tampa":"https://nomads.com/assets/img/places/tampa-united-states.jpg",
  "Fresno":"https://nomads.com/assets/img/places/fresno-ca-united-states.jpg",
  "Chattanooga":"https://nomads.com/assets/img/places/chattanooga-tn-united-states.jpg",
  "Oxnard":"https://nomads.com/assets/img/places/oxnard-ca-united-states.jpg",
  "Louisville":"https://nomads.com/assets/img/places/louisville-ky-united-states.jpg",
  "Oklahoma City":"https://nomads.com/assets/img/places/oklahoma-city-ok-united-states.jpg",
  "Grand Rapids":"https://nomads.com/assets/img/places/grand-rapids-mi-united-states.jpg",
  "Des Moines":"https://nomads.com/assets/img/places/des-moines-ia-united-states.jpg",
  "San Antonio":"https://nomads.com/assets/img/places/san-antonio-united-states.jpg",
  "Timișoara":"https://nomads.com/assets/img/places/timisoara-romania.jpg",
  "Açores":"https://nomads.com/assets/img/places/azores-portugal.jpg",
  "Madeira":"https://nomads.com/assets/img/places/madeira-portugal.jpg",
  "Aveiro":"https://nomads.com/assets/img/places/aveiro-portugal.jpg",
  "Ploiești":"https://nomads.com/assets/img/places/ploiesti-romania.jpg",
  "Portimão":"https://nomads.com/assets/img/places/portimao-portugal.jpg",
  "Coimbra":"https://nomads.com/assets/img/places/coimbra-portugal.jpg",
  "Rijeka":"https://nomads.com/assets/img/places/rijeka-croatia.jpg",
  "Faro":"https://nomads.com/assets/img/places/faro-portugal.jpg",
  "Costa da Caparica":"https://nomads.com/assets/img/places/costa-da-caparica-portugal.jpg",
  "Craiova":"https://nomads.com/assets/img/places/craiova-romania.jpg",
  "Adana":"https://nomads.com/assets/img/places/adana-turkey.jpg",
  "Niš":"https://nomads.com/assets/img/places/nis-serbia.jpg",
  "Burgas":"https://nomads.com/assets/img/places/burgas-bulgaria.jpg",
  "Andorra la Vella":"https://nomads.com/assets/img/places/andorra-la-vella-andorra.jpg",
  "Tartu":"https://nomads.com/assets/img/places/tartu-estonia.jpg",
  "Pátras":"https://nomads.com/assets/img/places/patras-greece.jpg",
  "Aachen":"https://nomads.com/assets/img/places/aachen-germany.jpg",
  "Nuremberg":"https://nomads.com/assets/img/places/nuremberg-germany.jpg",
  "Wrocław":"https://nomads.com/assets/img/places/wroclaw-poland.jpg",
  "Brașov":"https://nomads.com/assets/img/places/brasov-romania.jpg",
  "Lublin":"https://nomads.com/assets/img/places/lublin-poland.jpg",
  "Zadar":"https://nomads.com/assets/img/places/zadar-croatia.jpg",
  "Peniche":"https://nomads.com/assets/img/places/peniche-portugal.jpg",
  "Kutaisi":"https://nomads.com/assets/img/places/kutaisi-georgia.jpg",
  "Łódź":"https://nomads.com/assets/img/places/lodz-poland.jpg",
  "Karlsruhe":"https://nomads.com/assets/img/places/karlsruhe-germany.jpg",
  "Alanya":"https://nomads.com/assets/img/places/alanya-turkey.jpg",
  "Mostar":"https://nomads.com/assets/img/places/mostar-bosnia.jpg",
  "Novi Sad":"https://nomads.com/assets/img/places/novi-sad-serbia.jpg",
  "Utrecht":"https://nomads.com/assets/img/places/utrecht-netherlands.jpg",
  "Gran Canaria":"https://nomads.com/assets/img/places/gran-canaria-canary-islands-spain.jpg",
  "Groningen":"https://nomads.com/assets/img/places/groningen-netherlands.jpg",
  "Frankfurt":"https://nomads.com/assets/img/places/frankfurt-germany.jpg",
  "Leiden":"https://nomads.com/assets/img/places/leiden-netherlands.jpg",
  "Košice":"https://nomads.com/assets/img/places/kosice-slovakia.jpg",
  "Nottingham":"https://nomads.com/assets/img/places/nottingham-united-kingdom.jpg",
  "Bristol":"https://nomads.com/assets/img/places/bristol-united-kingdom.jpg",
  "Lago Balaton":"https://nomads.com/assets/img/places/budapest-hungary.jpg",
  "Norwich":"https://nomads.com/assets/img/places/norwich-united-kingdom.jpg",
  "Catania":"https://nomads.com/assets/img/places/catania-italy.jpg",
  "Newcastle":"https://nomads.com/assets/img/places/newcastle-upon-tyne-united-kingdom.jpg",
  "Alicante":"https://nomads.com/assets/img/places/alicante-spain.jpg",
  "Leeds":"https://nomads.com/assets/img/places/leeds-united-kingdom.jpg",
  "Bremen":"https://nomads.com/assets/img/places/bremen-germany.jpg",
  "Arnhem":"https://nomads.com/assets/img/places/arnhem-netherlands.jpg",
  "Plovdiv":"https://nomads.com/assets/img/places/plovdiv-bulgaria.jpg",
  "Liverpool":"https://nomads.com/assets/img/places/liverpool-united-kingdom.jpg",
  "Lago Como":"https://nomads.com/assets/img/places/lake-como-italy.jpg",
  "Grenoble":"https://nomads.com/assets/img/places/grenoble-france.jpg",
  "Bournemouth":"https://nomads.com/assets/img/places/bournemouth-united-kingdom.jpg",
  "Chișinău":"https://nomads.com/assets/img/places/chisinau-moldova.jpg",
  "Gaziantep":"https://nomads.com/assets/img/places/gaziantep-turkey.jpg",
  "Bodrum":"https://nomads.com/assets/img/places/bodrum-turkey.jpg",
  "Rodes":"https://nomads.com/assets/img/places/rhodes-greece.jpg",
  "Erlangen":"https://nomads.com/assets/img/places/erlangen-germany.jpg",
  "Rethymno":"https://nomads.com/assets/img/places/rethymno-greece.jpg",
  "Cork":"https://nomads.com/assets/img/places/cork-ireland.jpg",
  "Rennes":"https://nomads.com/assets/img/places/rennes-france.jpg",
  "Bursa":"https://nomads.com/assets/img/places/bursa-turkey.jpg",
  "Salzburg":"https://nomads.com/assets/img/places/salzburg-austria.jpg",
  "Basileia":"https://nomads.com/assets/img/places/basel-switzerland.jpg",
  "Poznań":"https://nomads.com/assets/img/places/poznan-poland.jpg",
  "Cannes":"https://nomads.com/assets/img/places/cannes-france.jpg",
  "Pristina":"https://nomads.com/assets/img/places/pristina-kosovo.jpg",
  "Leipzig":"https://nomads.com/assets/img/places/leipzig-germany.jpg",
  "Bath":"https://nomads.com/assets/img/places/bath-united-kingdom.jpg",
  "Heidelberg":"https://nomads.com/assets/img/places/heidelberg-germany.jpg",
  "Manchester":"https://nomads.com/assets/img/places/manchester-united-kingdom.jpg",
  "Mombasa":"https://nomads.com/assets/img/places/mombasa-kenya.jpg",
  "Lusaka":"https://nomads.com/assets/img/places/lusaka-zambia.jpg",
  "Gaborone":"https://nomads.com/assets/img/places/gaborone-botswana.jpg",
  "Antananarivo":"https://nomads.com/assets/img/places/antananarivo-madagascar.jpg",
  "Freetown":"https://nomads.com/assets/img/places/freetown-sierra-leone.jpg",
  "Conacri":"https://nomads.com/assets/img/places/conakry-guinea.jpg",
  "Harare":"https://nomads.com/assets/img/places/harare-zimbabwe.jpg",
  "Victoria":"https://nomads.com/assets/img/places/victoria-seychelles.jpg",
  "Pretória":"https://nomads.com/assets/img/places/pretoria-south-africa.jpg",
  "Rabat":"https://nomads.com/assets/img/places/rabat-morocco.jpg",
  "Livingstone":"https://nomads.com/assets/img/places/livingstone-zambia.jpg",
  "El Gouna":"https://nomads.com/assets/img/places/el-gouna-egypt.jpg",
  "Gizé":"https://nomads.com/assets/img/places/giza-egypt.jpg",
  "Luxor":"https://nomads.com/assets/img/places/luxor-egypt.jpg",
  "Dammam":"https://nomads.com/assets/img/places/dammam-saudi-arabia.jpg",
  "Duhok":"https://nomads.com/assets/img/places/duhok-kurdistan.jpg",
  "Kirkuk":"https://nomads.com/assets/img/places/kirkuk-kurdistan.jpg",
  "Dahab":"https://nomads.com/assets/img/places/dahab-egypt.jpg",
  "Kuwait City":"https://nomads.com/assets/img/places/kuwait-city-kuwait.jpg",
  "Manama":"https://nomads.com/assets/img/places/manama-bahrain.jpg",
  "Jerusalém":"https://nomads.com/assets/img/places/jerusalem-israel.jpg",
  "Haifa":"https://nomads.com/assets/img/places/haifa-israel.jpg",
  "Erbil":"https://nomads.com/assets/img/places/erbil-kurdistan.jpg",
  "Uluwatu":"https://nomads.com/assets/img/places/uluwatu-bali-indonesia.jpg",
  "Naha (Okinawa)":"https://nomads.com/assets/img/places/naha-okinawa-japan.jpg",
  "Guangzhou":"https://nomads.com/assets/img/places/guangzhou-china.jpg",
  "Weligama":"https://nomads.com/assets/img/places/weligama-sri-lanka.jpg",
  "Hangzhou":"https://nomads.com/assets/img/places/hangzhou-china.jpg",
  "Daejeon":"https://nomads.com/assets/img/places/daejeon-south-korea.jpg",
  "Nakhon Ratchasima":"https://nomads.com/assets/img/places/nakhon-ratchasima-thailand.jpg",
  "Chengdu":"https://nomads.com/assets/img/places/chengdu-china.jpg",
  "Denpasar":"https://nomads.com/assets/img/places/denpasar-bali-indonesia.jpg",
  "Calcutá":"https://nomads.com/assets/img/places/kolkata-india.jpg",
  "Ko Lanta":"https://nomads.com/assets/img/places/ko-lanta-thailand.jpg",
  "Cemagi (Bali)":"https://nomads.com/assets/img/places/canggu-bali-indonesia.jpg",
  "Xangai":"https://nomads.com/assets/img/places/shanghai-china.jpg",
  "Makassar":"https://nomads.com/assets/img/places/makassar-indonesia.jpg",
  "Krabi":"https://nomads.com/assets/img/places/krabi-thailand.jpg",
  "Astana":"https://nomads.com/assets/img/places/astana-kazakhstan.jpg",
  "La Union":"https://nomads.com/assets/img/places/la-union-philippines.jpg",
  "Hiroshima":"https://nomads.com/assets/img/places/hiroshima-japan.jpg",
  "Thimphu":"https://nomads.com/assets/img/places/thimphu-bhutan.jpg",
  "Tainan":"https://nomads.com/assets/img/places/tainan-taiwan.jpg",
  "Pequim":"https://nomads.com/assets/img/places/beijing-china.jpg",
  "Gili Air":"https://nomads.com/assets/img/places/gili-air-indonesia.jpg",
  "Jodhpur":"https://nomads.com/assets/img/places/jodhpur-india.jpg",
  "Senggigi (Lombok)":"https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&q=80",
  "Matara":"https://nomads.com/assets/img/places/matara-sri-lanka.jpg",
  "Lahore":"https://nomads.com/assets/img/places/lahore-pakistan.jpg",
  "Vadodara":"https://nomads.com/assets/img/places/vadodara-india.jpg",
  "Christchurch":"https://nomads.com/assets/img/places/christchurch-new-zealand.jpg",
  "Hagatña":"https://nomads.com/assets/img/places/hagatna-guam.jpg",
  "Wanaka":"https://nomads.com/assets/img/places/wanaka-new-zealand.jpg",
  "Funafuti":"https://nomads.com/assets/img/places/funafuti-tuvalu.jpg",
  "Port Moresby":"https://nomads.com/assets/img/places/port-moresby-papua-new-guinea.jpg",
  "Hobart":"https://nomads.com/assets/img/places/hobart-australia.jpg",
  "Wollongong":"https://nomads.com/assets/img/places/wollongong-australia.jpg",
  "Nukualofa":"https://nomads.com/assets/img/places/nukualofa-tonga.jpg",
  "Honiara":"https://nomads.com/assets/img/places/honiara-solomon-islands.jpg",
  "Dunedin":"https://nomads.com/assets/img/places/dunedin-new-zealand.jpg",
  "Byron Bay":"https://nomads.com/assets/img/places/byron-bay-australia.jpg",
  "Kauai":"https://nomads.com/assets/img/places/kauai-hawaii-united-states.jpg",
  "Canberra":"https://nomads.com/assets/img/places/canberra-australia.jpg",
  "Hilo":"https://nomads.com/assets/img/places/hilo-hawaii-united-states.jpg",
  "Port Vila":"https://nomads.com/assets/img/places/port-vila-vanuatu.jpg",
  "Darwin":"https://nomads.com/assets/img/places/darwin-australia.jpg",
  "Dededo":"https://nomads.com/assets/img/places/dededo-guam.jpg",
  "Avarua":"https://nomads.com/assets/img/places/avarua-cook-islands.jpg",
  "Nova Iorque":"https://nomads.com/assets/img/places/new-york-city-ny-united-states.jpg",
  "São Francisco":"https://nomads.com/assets/img/places/san-francisco-ca-united-states.jpg",
  "Las Vegas":"https://nomads.com/assets/img/places/las-vegas-nv-united-states.jpg",
  "Orlando":"https://nomads.com/assets/img/places/orlando-fl-united-states.jpg",
  "Boston":"https://nomads.com/assets/img/places/boston-ma-united-states.jpg",
  "Joanesburgo":"https://nomads.com/assets/img/places/johannesburg-south-africa.jpg",
  "Maui":"https://images.unsplash.com/photo-1507876466758-bc54f384809c?w=600&q=80",
  "Houston":"https://nomads.com/assets/img/places/houston-tx-united-states.jpg",
  "Rangum":"https://nomads.com/assets/img/places/yangon-myanmar.jpg",
  "Argel":"https://nomads.com/assets/img/places/algiers-algeria.jpg",
  "Oakland":"https://nomads.com/assets/img/places/oakland-ca-united-states.jpg",
  "Calgary":"https://nomads.com/assets/img/places/calgary-canada.jpg",
  "Maceió":"https://images.unsplash.com/photo-1601329275729-631bf7b4e149?w=800&q=80",
  "Aracaju":"https://images.unsplash.com/photo-1662781288502-5d3a42cf4290?w=800&q=80",
  "Búzios":"https://images.unsplash.com/photo-1508272961731-dc692d634a79?w=800&q=80",
  "Gramado":"https://images.unsplash.com/photo-1690907938160-133874466bb0?w=800&q=80",
  "Paraty":"https://images.unsplash.com/photo-1738350142684-6c1e0d81896e?w=800&q=80",
  "Ouro Preto":"https://images.unsplash.com/photo-1659621065449-009507f1b7c1?w=800&q=80",
  "Fernando de Noronha":"https://images.unsplash.com/photo-1642889014528-8e41d350ac35?w=800&q=80",
  "Jericoacoara":"https://images.unsplash.com/photo-1524943999231-42946c42ee78?w=800&q=80",
  "Balneário Camboriú":"https://images.unsplash.com/photo-1541107617727-94bbb769fdef?w=800&q=80",
  "Bonito":"https://images.unsplash.com/photo-1669639613055-7c5a1b28eddd?w=800&q=80",
  "Chapada Diamantina":"https://images.unsplash.com/photo-1698315495764-3e32b61ea1c0?w=800&q=80",
  "Ilhabela":"https://images.unsplash.com/photo-1668295502115-a80fc3ef1377?w=800&q=80",
  "Porto Seguro":"https://images.unsplash.com/photo-1615129614910-042efe893485?w=800&q=80",
  "Porto de Galinhas":"https://images.unsplash.com/photo-1698760043845-02becc795cdd?w=800&q=80",
  "Arraial do Cabo":"https://images.unsplash.com/photo-1633130172061-e539b61df05f?w=800&q=80",
  "Lençóis Maranhenses":"https://images.unsplash.com/photo-1574186150360-b77724e79e1f?w=800&q=80",
  "Morro de São Paulo":"https://images.unsplash.com/photo-1594358037468-121d0af96ca2?w=800&q=80",
  "Olinda":"https://images.unsplash.com/photo-1617172966463-3c52a9d0c18f?w=800&q=80",
  "Ubatuba":"https://images.unsplash.com/photo-1661692755472-d5f29e2edb7a?w=800&q=80",
  "Ilhéus":"https://images.unsplash.com/photo-1603719846095-12a6cdffdcd7?w=800&q=80",
  "Santos":"https://images.unsplash.com/photo-1531517760206-6ccdac026a62?w=800&q=80",
  "Petrópolis":"https://images.unsplash.com/photo-1730132432963-e88edf654eec?w=800&q=80",
  "Tiradentes":"https://images.unsplash.com/photo-1708457471461-ab3509ab9ab3?w=800&q=80",
  "Canela":"https://images.unsplash.com/photo-1612209410552-24756489cf07?w=800&q=80",
  "Ribeirão Preto":"https://images.unsplash.com/photo-1523962389844-25940ebd2226?w=800&q=80",
  "Londrina":"https://images.unsplash.com/photo-1687821016316-573453ff4ebe?w=800&q=80",
  "Maringá":"https://images.unsplash.com/photo-1753973690189-bdf847114773?w=800&q=80",
  "Cuiabá":"https://images.unsplash.com/photo-1495480857653-79a3f39d99af?w=800&q=80",
  "Palmas":"https://images.unsplash.com/photo-1662998305968-2d52d2ccd7ba?w=800&q=80",
  "Teresina":"https://images.unsplash.com/photo-1667819955012-9aff07d8fce5?w=800&q=80",
  "Niterói":"https://images.unsplash.com/photo-1672778491063-f6a5b461595f?w=800&q=80",
  "Pirenópolis":"https://images.unsplash.com/photo-1611937315268-0899710284c9?w=800&q=80",
  "Alto Paraíso de Goiás":"https://images.unsplash.com/photo-1611945959114-47dfbd5cb005?w=800&q=80",
  "Caraíva":"https://images.unsplash.com/photo-1749648495131-772de4f86426?w=800&q=80",
  "Praia do Forte":"https://images.unsplash.com/photo-1745681278433-4f45b29fb3c4?w=800&q=80"
};

export const IATA_MAP: Record<string, string> = {
  // Brasil — completo (~155 aeroportos comerciais)
  "AFL":"Alta Floresta","AJU":"Aracaju","AQA":"Araraquara","ARU":"Araçatuba",
  "ARX":"Aracati","ATM":"Altamira","AUX":"Araguaína","AAX":"Araxá",
  "BAZ":"Barcelos","BEL":"Belém","BGX":"Bagé","BPG":"Barra do Garças",
  "BPS":"Porto Seguro","BRA":"Barreiras","BRB":"Barreirinhas","BSB":"Brasília",
  "BVB":"Boa Vista","BVH":"Vilhena","BVS":"Breves","BYO":"Bonito",
  "BZC":"Búzios","CAC":"Cascavel","CAF":"Carauari","CAU":"Caruaru",
  "CAW":"Campos dos Goytacazes","CCM":"Criciúma","CDJ":"Conceição do Araguaia",
  "CFB":"Cabo Frio","CGB":"Cuiabá","CGH":"São Paulo","CGR":"Campo Grande",
  "CIZ":"Coari","CKS":"Carajás","CLV":"Caldas Novas","CMG":"Corumbá",
  "CNF":"Belo Horizonte","CPV":"Campina Grande","CWB":"Curitiba",
  "CXJ":"Caxias do Sul","CZS":"Cruzeiro do Sul","DIQ":"Divinópolis",
  "DOU":"Dourados","ERN":"Eirunepé","FEC":"Feira de Santana",
  "FEN":"Fernando de Noronha","FLN":"Florianópolis","FOR":"Fortaleza",
  "FRC":"Franca","GEL":"Santo Ângelo","GIG":"Rio de Janeiro",
  "GNM":"Guanambi","GPB":"Guarapuava","GRU":"São Paulo",
  "GVR":"Governador Valadares","GYN":"Goiânia","IGU":"Foz do Iguaçu",
  "IMP":"Imperatriz","IOS":"Ilhéus","IPN":"Ipatinga","ITA":"Itacoatiara",
  "ITB":"Itaituba","IZA":"Juiz de Fora","JDF":"Juiz de Fora",
  "JDO":"Juazeiro do Norte","JJD":"Jericoacoara","JOI":"Joinville",
  "JPA":"João Pessoa","JPR":"Ji-Paraná","JTC":"Bauru","LAJ":"Lages",
  "LAZ":"Bom Jesus da Lapa","LBR":"Lábrea","LDB":"Londrina","LEC":"Lençóis",
  "MAB":"Marabá","MAO":"Manaus","MBZ":"Maués","MCZ":"Maceió","MCP":"Macapá",
  "MEA":"Macaé","MGF":"Maringá","MII":"Marília","MNX":"Manicoré",
  "MOC":"Montes Claros","MVF":"Mossoró","NAT":"Natal","NVT":"Navegantes",
  "OBI":"Óbidos","OPS":"Sinop","ORX":"Oriximiná","OYK":"Oiapoque",
  "PAV":"Paulo Afonso","PET":"Pelotas","PFB":"Passo Fundo","PHB":"Parnaíba",
  "PIN":"Parintins","PLU":"Belo Horizonte","PMG":"Ponta Porã","PMW":"Palmas",
  "PNZ":"Petrolina","POA":"Porto Alegre","POO":"Poços de Caldas",
  "PPB":"Presidente Prudente","PVH":"Porto Velho","RAO":"Ribeirão Preto",
  "RBR":"Rio Branco","RDC":"Redenção","REC":"Recife","RIA":"Santa Maria",
  "ROO":"Rondonópolis","RVD":"Rio Verde","SDU":"Rio de Janeiro",
  "SJK":"São José dos Campos","SJL":"São Gabriel da Cachoeira",
  "SJP":"São José do Rio Preto","SLZ":"São Luís","SMT":"Sorriso",
  "SRA":"Santa Rosa","SSA":"Salvador","SSZ":"Santos","STM":"Santarém",
  "TBT":"Tabatinga","TFF":"Tefé","TFL":"Teófilo Otoni","THE":"Teresina",
  "TJL":"Três Lagoas","TUR":"Tucuruí","TXF":"Teixeira de Freitas",
  "UBA":"Uberaba","UDI":"Uberlândia","UNA":"Una","URG":"Uruguaiana",
  "VAG":"Varginha","VAL":"Valença","VCP":"Campinas",
  "VDC":"Vitória da Conquista","VIX":"Vitória","XAP":"Chapecó",
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

// ===== Reverse map: cidade → IATA (preferindo aeroportos principais) =====
const PRIORITY_IATA: Record<string, string> = {
  'sao paulo': 'GRU', 'rio de janeiro': 'GIG', 'belo horizonte': 'CNF',
  'buenos aires': 'EZE', 'paris': 'CDG', 'londres': 'LHR', 'milao': 'MXP',
  'toquio': 'NRT', 'seul': 'ICN', 'bangkok': 'BKK', 'istambul': 'IST',
  'nova iorque': 'JFK', 'xangai': 'PVG', 'pequim': 'PEK',
};

const CITY_TO_IATA_MAP: Record<string, string> = {};
// Primeiro, preenche com todos (o último ganha)
for (const [iata, city] of Object.entries(IATA_MAP)) {
  const n = norm(city);
  if (!CITY_TO_IATA_MAP[n]) CITY_TO_IATA_MAP[n] = iata;
}
// Depois sobrescreve com as prioridades
for (const [cityNorm, iata] of Object.entries(PRIORITY_IATA)) {
  CITY_TO_IATA_MAP[cityNorm] = iata;
}

export function cityToIata(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  // Já é um código IATA válido?
  if (/^[A-Z]{3}$/i.test(trimmed) && IATA_MAP[trimmed.toUpperCase()]) {
    return trimmed.toUpperCase();
  }
  // Busca normalizada
  const n = norm(trimmed);
  if (CITY_TO_IATA_MAP[n]) return CITY_TO_IATA_MAP[n];
  // Tenta alias
  const aliased = ALIASES_NORM[n];
  if (aliased) {
    const aliasN = norm(aliased);
    if (CITY_TO_IATA_MAP[aliasN]) return CITY_TO_IATA_MAP[aliasN];
  }
  // Tenta substring match
  for (const [cityNorm, iata] of Object.entries(CITY_TO_IATA_MAP)) {
    if (cityNorm.includes(n) || n.includes(cityNorm)) return iata;
  }
  return null;
}

// ===== Validação de origem brasileira =====
// Cidades brasileiras extraídas do IATA_MAP (seção Brasil)
const BRAZILIAN_CITIES_SET = new Set<string>();
// Adiciona todas as cidades que têm IATA brasileiro
const BRAZILIAN_IATA_CODES = [
  "AFL","AJU","AQA","ARU","ARX","ATM","AUX","AAX","BAZ","BEL","BGX","BPG",
  "BPS","BRA","BRB","BSB","BVB","BVH","BVS","BYO","BZC","CAC","CAF","CAU",
  "CAW","CCM","CDJ","CFB","CGB","CGH","CGR","CIZ","CKS","CLV","CMG","CNF",
  "CPV","CWB","CXJ","CZS","DIQ","DOU","ERN","FEC","FEN","FLN","FOR","FRC",
  "GEL","GIG","GNM","GPB","GRU","GVR","GYN","IGU","IMP","IOS","IPN","ITA",
  "ITB","IZA","JDF","JDO","JJD","JOI","JPA","JPR","JTC","LAJ","LAZ","LBR",
  "LDB","LEC","MAB","MAO","MBZ","MCZ","MCP","MEA","MGF","MII","MNX","MOC",
  "MVF","NAT","NVT","OBI","OPS","ORX","OYK","PAV","PET","PFB","PHB","PIN",
  "PLU","PMG","PMW","PNZ","POA","POO","PPB","PVH","RAO","RBR","RDC","REC",
  "RIA","ROO","SDU","SJK","SJL","SJP","SLZ","SMT","SRA","SSA","SSZ","STM",
  "TBT","TFF","TFL","THE","TJL","TUR","TXF","UBA","UDI","UNA","URG","VAG",
  "VAL","VCP","VDC","VIX","XAP"
];
BRAZILIAN_IATA_CODES.forEach(code => {
  const city = IATA_MAP[code];
  if (city) BRAZILIAN_CITIES_SET.add(norm(city));
});

export function isBrazilianOrigin(origem?: string): boolean {
  if (!origem) return false;
  const input = origem.toString().trim();

  // Check IATA code
  if (/^[A-Z]{3}$/i.test(input)) {
    return BRAZILIAN_IATA_CODES.includes(input.toUpperCase());
  }

  // Check city name (normalized)
  const inputNorm = norm(input);
  if (BRAZILIAN_CITIES_SET.has(inputNorm)) return true;

  // Check aliases that resolve to Brazilian cities
  const aliasCity = ALIASES_NORM[inputNorm];
  if (aliasCity && BRAZILIAN_CITIES_SET.has(norm(aliasCity))) return true;

  // Partial match: if the input contains a known Brazilian city name
  for (const cityNorm of BRAZILIAN_CITIES_SET) {
    if (inputNorm.includes(cityNorm) || cityNorm.includes(inputNorm)) return true;
  }

  return false;
}

export function findDestinationImage(destino?: string, overrides: Record<string, string> = {}): string {
  if (!destino) return FALLBACK_IMAGE;

  const lookup = { ...DESTINATIONS_LOOKUP, ...overrides };

  const input = destino.toString().trim();
  const inputNorm = norm(input);

  // Passo 1: IATA code
  if (/^[A-Z]{3}$/.test(input.toUpperCase())) {
    const iataCity = IATA_MAP[input.toUpperCase()];
    if (iataCity && lookup[iataCity]) {
      return lookup[iataCity];
    }
  }

  // Passo 2: Alias exato
  const aliasCity = ALIASES_NORM[inputNorm];
  if (aliasCity && lookup[aliasCity]) {
    return lookup[aliasCity];
  }

  // Passo 3: Match exato normalizado
  const cities = Object.keys(lookup);
  for (const city of cities) {
    if (norm(city) === inputNorm) {
      return lookup[city];
    }
  }

  // Passo 4: Substring
  for (const city of cities) {
    const cityNorm = norm(city);
    if (inputNorm.indexOf(cityNorm) >= 0 || cityNorm.indexOf(inputNorm) >= 0) {
      return lookup[city];
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
    return lookup[bestCity];
  }

  // Passo 6: Alias substring
  const aliasKeys = Object.keys(ALIASES_NORM);
  for (const ak of aliasKeys) {
    if (inputNorm.indexOf(ak) >= 0 || ak.indexOf(inputNorm) >= 0) {
      const mapped = ALIASES_NORM[ak];
      if (lookup[mapped]) {
        return lookup[mapped];
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

/**
 * For Passageiro de Primeira: all dates are just "available dates" without ida/volta distinction.
 * Normalize: take all unique dates, sort, pick up to 10, and for each ida date generate volta = ida + gapDays.
 */
export function normalizeDatePairs(datasIda: string[], datasVolta: string[], gapDays: number = 5): { datas_ida: string[]; datas_volta: string[] } {
  // Merge all dates into one pool
  const allDates = uniq([...(datasIda || []), ...(datasVolta || [])]);
  const sorted = sortDates(allDates);
  const selected = sorted.slice(0, 10);

  const newIda: string[] = [];
  const newVolta: string[] = [];

  for (const dateStr of selected) {
    const [d, m, y] = String(dateStr).split('/').map(Number);
    const fullYear = y < 100 ? 2000 + y : y;
    const idaDate = new Date(fullYear, m - 1, d);
    const voltaDate = new Date(idaDate);
    voltaDate.setDate(voltaDate.getDate() + gapDays);

    newIda.push(dateStr);
    const dd = String(voltaDate.getDate()).padStart(2, '0');
    const mm = String(voltaDate.getMonth() + 1).padStart(2, '0');
    const yy = y < 100 ? String(voltaDate.getFullYear()).slice(-2) : String(voltaDate.getFullYear());
    newVolta.push(`${dd}/${mm}/${yy}`);
  }

  return { datas_ida: newIda, datas_volta: newVolta };
}

function formatDatesBlock(dates: any[]) {
  const sorted = sortDates(uniq(dates));
  if (!sorted.length) return "";
  
  const MAX_DATES = 10;
  const displayDates = sorted.slice(0, MAX_DATES);
  
  let result = displayDates.map(d => `🗓 ${d}`).join("\\n");
  
  return result;
}

/** Garante que qualquer URL tenha https:// */
export function ensureHttps(url: string): string {
  if (!url || !url.trim()) return '';
  let u = url.trim();
  // Remove protocolo se for http://
  if (u.startsWith('http://')) u = u.replace('http://', 'https://');
  // Adiciona https:// se não tem protocolo nenhum
  if (!u.startsWith('https://')) u = 'https://' + u;
  return u;
}

/** Resolve o link do programa: usa o link do GPT se válido, senão busca do mapa oficial */
export function resolveLinkPrograma(linkFromGpt: string | undefined, programaCanonical: string): string {
  // Se GPT retornou link, mas é encurtado (pd1a.com, etc), preferir o mapa oficial
  const gptLink = (linkFromGpt || '').trim();
  const isShortener = gptLink && (gptLink.includes('pd1a.com') || gptLink.includes('bit.ly') || gptLink.includes('goo.gl'));

  if (gptLink && !isShortener) {
    return ensureHttps(gptLink);
  }

  // Fallback: URL oficial do programa
  return PROGRAMA_LINKS[programaCanonical] || ensureHttps(gptLink) || 'https://www.smiles.com.br';
}

export function buildFormattedMessage(data: any, milheiroPorPrograma: Record<string, number> = {}): string {
  const origem = safeStr(data.origem, "ORIGEM");
  const destino = safeStr(data.destino, "DESTINO");
  const cia = safeStr(data.cia_aerea, "CIA");
  const programaRaw = safeStr(data.programa_mais_vantajoso, "PROGRAMA");
  const programa = normalizeProgramaName(programaRaw);

  const multiplicador = milheiroPorPrograma[programa] || 0;

  const datasIda = Array.isArray(data.datas_ida) ? data.datas_ida : [];
  const datasVolta = Array.isArray(data.datas_volta) ? data.datas_volta : [];

  const milhasIda = Number(data.milhas_ida || 0);
  const milhasVolta = Number(data.milhas_volta || 0);

  let valorIda = Number(data.valor_ida || 0);
  let valorVolta = Number(data.valor_volta || 0);
  let valorIdaEVolta = Number(data.valor_ida_e_volta || 0);

  // Se o JSON não trouxer o valor em R$ mas tiver o multiplicador, calculamos:
  if (valorIda === 0 && milhasIda > 0 && multiplicador > 0) {
    valorIda = (milhasIda / 1000) * multiplicador;
  }
  if (valorVolta === 0 && milhasVolta > 0 && multiplicador > 0) {
    valorVolta = (milhasVolta / 1000) * multiplicador;
  }
  if (valorIdaEVolta === 0 && (valorIda > 0 || valorVolta > 0)) {
    valorIdaEVolta = valorIda + valorVolta;
  }

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

export function buildWhatsAppLink(data: any, milheiroPorPrograma: Record<string, number> = {}): string {
  const origem = safeStr(data.origem, "ORIGEM");
  const destino = safeStr(data.destino, "DESTINO");
  const cia = safeStr(data.cia_aerea, "CIA");
  const programaRaw = safeStr(data.programa_mais_vantajoso, "PROGRAMA");
  const programa = normalizeProgramaName(programaRaw);

  const multiplicador = milheiroPorPrograma[programa] || 0;

  const datasVolta = Array.isArray(data.datas_volta) ? data.datas_volta : [];

  const milhasIda = Number(data.milhas_ida || 0);
  const milhasVolta = Number(data.milhas_volta || 0);

  let valorIda = Number(data.valor_ida || 0);
  let valorVolta = Number(data.valor_volta || 0);
  const valorTaxas = Number(data.valor_taxas || 0);

  if (valorIda === 0 && milhasIda > 0 && multiplicador > 0) {
    valorIda = (milhasIda / 1000) * multiplicador;
  }
  if (valorVolta === 0 && milhasVolta > 0 && multiplicador > 0) {
    valorVolta = (milhasVolta / 1000) * multiplicador;
  }

  const datasIda = Array.isArray(data.datas_ida) ? data.datas_ida.filter(Boolean) : [];

  const isOneWay =
    !uniq(datasVolta).length ||
    milhasVolta <= 0;

  let text = `✈️ Quero emitir uma passagem encontrada pelo *Passagem Secreta*:\n\n` +
             `*Rota:* ${origem} → ${destino}\n` +
             `*Cia Aérea:* ${cia}\n` +
             `*Cabine:* Econômica\n` +
             `*Programa:* ${programa}\n\n` +
             `*🛫 IDA*\n` +
             `Milhas: ${fmtIntBR(milhasIda)}\n` +
             `Valor estimado: R$ ${fmtMoneyBR2(valorIda)}\n`;

  if (datasIda.length > 0) {
    text += `\n`;
    for (const d of datasIda) {
      text += `🗓 ${d}\n`;
    }
  }

  if (!isOneWay) {
    text += `\n*🛬 VOLTA*\n` +
             `Milhas: ${fmtIntBR(milhasVolta)}\n` +
             `Valor estimado: R$ ${fmtMoneyBR2(valorVolta)}\n`;

    if (datasVolta.length > 0) {
      text += `\n`;
      for (const d of datasVolta) {
        text += `🗓 ${d}\n`;
      }
    }
  }

  if (valorTaxas > 0) {
    text += `\n*Taxas:* R$ ${fmtMoneyBR2(valorTaxas)}`;
  }

  const encodedText = encodeURIComponent(text);
  const waNumber = "5522981459289";

  return `https://wa.me/${waNumber}?text=${encodedText}`;
}
