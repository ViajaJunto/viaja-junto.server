// Fills a development database with a ready-to-use demo: ONE user, a large
// destination and activity catalog, and a trip that user already has
// scheduled, with its itinerary, planned activities and budget.
//
//   npm run db:seed:demo               add (or refresh) the demo data
//   npm run db:seed:demo -- --clean    remove only what this script created
//
// Everything is derived from fixed keys, so running it twice gives the same
// rows (same ids) instead of duplicates. Demo rows are easy to tell apart: the
// user has an @demo.viajajunto.dev email, activities have source 'DEMO' and
// destinations an external id starting with 'demo:'. Never run it against a
// production database.
//
// The demo user is an ADMIN, so it can also write to the catalogs and use the
// places endpoints. It has no Google account: act as it with a signed token.
//
// Plain JavaScript on purpose, like seed.mjs: it runs with `node` alone.
import 'dotenv/config';
import { createHash } from 'node:crypto';
import pg from 'pg';

const DOMAIN = 'demo.viajajunto.dev';

// ── deterministic helpers ──────────────────────────────────────────────────

/** A version 4 UUID derived from a key, so the same key is always the same id. */
function id(key) {
  const h = createHash('sha1').update(`viajajunto-demo:${key}`).digest('hex');
  const variant = '89ab'[parseInt(h[16], 16) % 4];
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/** Small seeded generator: the data is "random" but identical on every run. */
function rng(seed) {
  let a = createHash('sha1').update(seed).digest().readUInt32LE(0);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = rng('viajajunto-demo');
const int = (min, max) => min + Math.floor(random() * (max - min + 1));
const pick = (list) => list[Math.floor(random() * list.length)];
function sample(list, count) {
  const pool = [...list];
  const out = [];
  while (out.length < count && pool.length) out.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  return out;
}
const round6 = (n) => Math.round(n * 1e6) / 1e6;
const slug = (text) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');

// ── data ───────────────────────────────────────────────────────────────────

// name, country, ISO, category, lat, lng, description, currency, the real attractions
const CITIES = [
  ['Paris', 'França', 'FR', 'CITY', 48.8566, 2.3522, 'Capital da França, dos museus, dos cafés e da Torre Eiffel.', 'EUR', ['Torre Eiffel', 'Museu do Louvre', 'Catedral de Notre-Dame', 'Basílica de Sacré-Cœur', 'Museu d’Orsay']],
  ['Roma', 'Itália', 'IT', 'CULTURAL', 41.9028, 12.4964, 'A cidade eterna: ruínas, fontes e massas inesquecíveis.', 'EUR', ['Coliseu', 'Fontana di Trevi', 'Panteão', 'Fórum Romano', 'Museus do Vaticano']],
  ['Barcelona', 'Espanha', 'ES', 'CITY', 41.3874, 2.1686, 'Gaudí, praia e tapas na capital da Catalunha.', 'EUR', ['Sagrada Família', 'Parque Güell', 'Casa Batlló', 'La Rambla', 'Bairro Gótico']],
  ['Lisboa', 'Portugal', 'PT', 'CITY', 38.7223, -9.1393, 'Ladeiras, bondinhos amarelos e pastéis de nata.', 'EUR', ['Torre de Belém', 'Mosteiro dos Jerónimos', 'Castelo de São Jorge', 'Alfama', 'Elevador de Santa Justa']],
  ['Amsterdã', 'Países Baixos', 'NL', 'CITY', 52.3676, 4.9041, 'Canais, bicicletas e grandes museus.', 'EUR', ['Rijksmuseum', 'Museu Van Gogh', 'Casa de Anne Frank', 'Vondelpark', 'Mercado das Flores']],
  ['Berlim', 'Alemanha', 'DE', 'CULTURAL', 52.52, 13.405, 'História do século XX, arte de rua e vida noturna.', 'EUR', ['Portão de Brandemburgo', 'Muro de Berlim – East Side Gallery', 'Ilha dos Museus', 'Reichstag', 'Checkpoint Charlie']],
  ['Praga', 'República Tcheca', 'CZ', 'CULTURAL', 50.0755, 14.4378, 'A cidade das cem torres, de contos de fadas e cerveja.', 'EUR', ['Ponte Carlos', 'Castelo de Praga', 'Relógio Astronômico', 'Praça da Cidade Velha', 'Bairro Judeu']],
  ['Viena', 'Áustria', 'AT', 'CULTURAL', 48.2082, 16.3738, 'Palácios imperiais, música clássica e cafés históricos.', 'EUR', ['Palácio de Schönbrunn', 'Catedral de Santo Estêvão', 'Ópera Estatal de Viena', 'Palácio Belvedere', 'Hofburg']],
  ['Nova York', 'Estados Unidos', 'US', 'CITY', 40.7128, -74.006, 'A cidade que nunca dorme.', 'USD', ['Estátua da Liberdade', 'Central Park', 'Empire State Building', 'Times Square', 'Museu Metropolitano de Arte']],
  ['Tóquio', 'Japão', 'JP', 'CITY', 35.6762, 139.6503, 'Neon, templos e gastronomia de outro mundo.', 'JPY', ['Templo Senso-ji', 'Cruzamento de Shibuya', 'Torre de Tóquio', 'Santuário Meiji', 'Mercado de Tsukiji']],
  ['Kyoto', 'Japão', 'JP', 'CULTURAL', 35.0116, 135.7681, 'Templos, jardins e gueixas na antiga capital.', 'JPY', ['Fushimi Inari', 'Kinkaku-ji', 'Floresta de Bambu de Arashiyama', 'Kiyomizu-dera', 'Gion']],
  ['Rio de Janeiro', 'Brasil', 'BR', 'BEACH', -22.9068, -43.1729, 'Cidade maravilhosa, entre o mar e a montanha.', 'BRL', ['Cristo Redentor', 'Pão de Açúcar', 'Praia de Copacabana', 'Escadaria Selarón', 'Jardim Botânico']],
  ['Florianópolis', 'Brasil', 'BR', 'BEACH', -27.5954, -48.548, 'A ilha da magia, com dezenas de praias.', 'BRL', ['Praia Mole', 'Lagoa da Conceição', 'Ponte Hercílio Luz', 'Praia do Campeche', 'Santo Antônio de Lisboa']],
  ['Salvador', 'Brasil', 'BR', 'CULTURAL', -12.9777, -38.5016, 'Axé, história colonial e a melhor comida baiana.', 'BRL', ['Pelourinho', 'Elevador Lacerda', 'Igreja do Bonfim', 'Farol da Barra', 'Mercado Modelo']],
  ['Buenos Aires', 'Argentina', 'AR', 'CITY', -34.6037, -58.3816, 'Tango, carnes e livrarias belíssimas.', 'USD', ['Casa Rosada', 'La Boca – Caminito', 'Cemitério da Recoleta', 'Teatro Colón', 'Plaza de Mayo']],
  ['Santiago', 'Chile', 'CL', 'CITY', -33.4489, -70.6693, 'Cercada pela Cordilheira dos Andes.', 'USD', ['Cerro San Cristóbal', 'Plaza de Armas', 'Palacio de La Moneda', 'Mercado Central', 'Bairro Lastarria']],
  ['Cusco', 'Peru', 'PE', 'CULTURAL', -13.5319, -71.9675, 'Portão de entrada para Machu Picchu.', 'USD', ['Plaza de Armas de Cusco', 'Sacsayhuamán', 'Qorikancha', 'Mercado de San Pedro', 'Bairro de San Blas']],
  ['Cidade do México', 'México', 'MX', 'CULTURAL', 19.4326, -99.1332, 'Museus, mercados e tacos de rua.', 'USD', ['Zócalo', 'Museu Frida Kahlo', 'Pirâmides de Teotihuacán', 'Castelo de Chapultepec', 'Xochimilco']],
  ['Cancún', 'México', 'MX', 'BEACH', 21.1619, -86.8515, 'Mar caribenho de água turquesa.', 'USD', ['Isla Mujeres', 'Chichén Itzá', 'Zona Hoteleira de Cancún', 'Museu Subaquático MUSA', 'Tulum']],
  ['Istambul', 'Turquia', 'TR', 'CULTURAL', 41.0082, 28.9784, 'Onde a Europa encontra a Ásia.', 'USD', ['Santa Sofia', 'Mesquita Azul', 'Palácio de Topkapi', 'Grande Bazar', 'Cisterna da Basílica']],
  ['Dubai', 'Emirados Árabes Unidos', 'AE', 'CITY', 25.2048, 55.2708, 'Arranha-céus, deserto e compras.', 'USD', ['Burj Khalifa', 'Dubai Mall', 'Palm Jumeirah', 'Souk do Ouro', 'Deserto de Dubai']],
  ['Bangkok', 'Tailândia', 'TH', 'CITY', 13.7563, 100.5018, 'Templos dourados, tuk-tuks e comida de rua.', 'USD', ['Grande Palácio', 'Wat Pho', 'Wat Arun', 'Mercado Flutuante', 'Chatuchak']],
  ['Ubud', 'Indonésia', 'ID', 'NATURE', -8.5069, 115.2625, 'Arrozais, templos e yoga no coração de Bali.', 'USD', ['Floresta dos Macacos de Ubud', 'Terraços de Arroz de Tegalalang', 'Palácio de Ubud', 'Templo Tirta Empul', 'Mercado de Ubud']],
  ['Sydney', 'Austrália', 'AU', 'CITY', -33.8688, 151.2093, 'Porto, praias e a Ópera mais famosa do mundo.', 'USD', ['Opera House', 'Harbour Bridge', 'Praia de Bondi', 'Jardim Botânico Real', 'Taronga Zoo']],
  ['Cairo', 'Egito', 'EG', 'CULTURAL', 30.0444, 31.2357, 'Pirâmides, faraós e o rio Nilo.', 'USD', ['Pirâmides de Gizé', 'Esfinge de Gizé', 'Museu Egípcio', 'Bazar Khan el-Khalili', 'Cidadela de Saladino']],
  ['Cidade do Cabo', 'África do Sul', 'ZA', 'NATURE', -33.9249, 18.4241, 'Entre a Montanha da Mesa e dois oceanos.', 'USD', ['Table Mountain', 'Cabo da Boa Esperança', 'Robben Island', 'Praia dos Pinguins de Boulders', 'V&A Waterfront']],
  ['Reykjavik', 'Islândia', 'IS', 'NATURE', 64.1466, -21.9426, 'Auroras boreais, gêiseres e fontes termais.', 'EUR', ['Hallgrímskirkja', 'Harpa', 'Lagoa Azul', 'Círculo Dourado', 'Perlan']],
  ['Atenas', 'Grécia', 'GR', 'CULTURAL', 37.9838, 23.7275, 'Berço da democracia e da filosofia.', 'EUR', ['Acrópole', 'Partenon', 'Ágora Antiga', 'Plaka', 'Museu da Acrópole']],
  ['Marrakech', 'Marrocos', 'MA', 'CULTURAL', 31.6295, -7.9811, 'Souks, riads e a praça Jemaa el-Fna.', 'EUR', ['Praça Jemaa el-Fna', 'Jardim Majorelle', 'Palácio da Bahia', 'Mesquita Koutoubia', 'Souks de Marrakech']],
  ['Londres', 'Reino Unido', 'GB', 'CITY', 51.5007, -0.1246, 'Capital do Reino Unido, do Big Ben e de museus gratuitos.', 'GBP', ['Big Ben', 'Museu Britânico', 'Torre de Londres', 'London Eye', 'Palácio de Buckingham']],
  ['Veneza', 'Itália', 'IT', 'CULTURAL', 45.4408, 12.3155, 'Cidade de canais, gôndolas e palácios sobre a lagoa.', 'EUR', ['Praça San Marco', 'Ponte di Rialto', 'Palácio Ducal', 'Basílica de São Marcos', 'Ilha de Murano', 'Grande Canal']],
  ['Florença', 'Itália', 'IT', 'CULTURAL', 43.7696, 11.2558, 'Berço do Renascimento, com arte em cada esquina.', 'EUR', ['Duomo de Florença', 'Galeria Uffizi', 'Ponte Vecchio', 'Galeria da Academia', 'Palazzo Pitti', 'Piazzale Michelangelo']],
  ['Milão', 'Itália', 'IT', 'CITY', 45.4642, 9.19, 'Moda, design e a catedral mais exuberante da Itália.', 'EUR', ['Duomo di Milano', 'Galleria Vittorio Emanuele II', 'Teatro alla Scala', 'Castelo Sforzesco', 'Santa Maria delle Grazie', 'Navigli']],
  ['Madri', 'Espanha', 'ES', 'CITY', 40.4168, -3.7038, 'Grandes museus, parques e noites que começam tarde.', 'EUR', ['Museu do Prado', 'Palácio Real de Madri', 'Parque do Retiro', 'Plaza Mayor', 'Museu Reina Sofía', 'Puerta del Sol']],
  ['Sevilha', 'Espanha', 'ES', 'CULTURAL', 37.3891, -5.9845, 'Flamenco, laranjeiras e o legado mouro da Andaluzia.', 'EUR', ['Real Alcázar', 'Catedral de Sevilha', 'Plaza de España', 'Torre del Oro', 'Bairro de Santa Cruz', 'Metropol Parasol']],
  ['Porto', 'Portugal', 'PT', 'CITY', 41.1579, -8.6291, 'Vinho, azulejos e a Ribeira à beira do Douro.', 'EUR', ['Ribeira do Porto', 'Livraria Lello', 'Ponte Dom Luís I', 'Torre dos Clérigos', 'Palácio da Bolsa', 'Caves de Vinho do Porto']],
  ['Bruxelas', 'Bélgica', 'BE', 'CITY', 50.8503, 4.3517, 'Chocolate, cerveja e uma das praças mais bonitas da Europa.', 'EUR', ['Grand-Place', 'Atomium', 'Manneken Pis', 'Galerias Saint-Hubert', 'Museus Reais de Belas-Artes', 'Basílica de Koekelberg']],
  ['Budapeste', 'Hungria', 'HU', 'CITY', 47.4979, 19.0402, 'Duas margens, termas e um parlamento de cartão-postal.', 'EUR', ['Parlamento Húngaro', 'Bastião dos Pescadores', 'Ponte das Correntes', 'Banhos Termais Széchenyi', 'Castelo de Buda', 'Praça dos Heróis']],
  ['Edimburgo', 'Reino Unido', 'GB', 'CULTURAL', 55.9533, -3.1883, 'Castelo no alto da colina e ruelas medievais.', 'GBP', ['Castelo de Edimburgo', 'Royal Mile', 'Arthur’s Seat', 'Palácio de Holyroodhouse', 'Calton Hill', 'Museu Nacional da Escócia']],
  ['Dublin', 'Irlanda', 'IE', 'CITY', 53.3498, -6.2603, 'Pubs, literatura e música ao vivo.', 'EUR', ['Trinity College', 'Guinness Storehouse', 'Castelo de Dublin', 'Temple Bar', 'Catedral de São Patrício', 'Phoenix Park']],
  ['Copenhague', 'Dinamarca', 'DK', 'CITY', 55.6761, 12.5683, 'Design nórdico, bicicletas e o porto colorido de Nyhavn.', 'EUR', ['Nyhavn', 'Jardins de Tivoli', 'A Pequena Sereia', 'Castelo de Rosenborg', 'Palácio de Christiansborg', 'Strøget']],
  ['Estocolmo', 'Suécia', 'SE', 'CITY', 59.3293, 18.0686, 'Arquipélago, museus e uma cidade antiga encantadora.', 'EUR', ['Gamla Stan', 'Museu Vasa', 'Palácio Real de Estocolmo', 'Skansen', 'ABBA The Museum', 'Fotografiska']],
  ['Oslo', 'Noruega', 'NO', 'CITY', 59.9139, 10.7522, 'Fiordes na porta da cidade e museus de navios vikings.', 'EUR', ['Ópera de Oslo', 'Museu dos Navios Vikings', 'Parque Vigeland', 'Fortaleza de Akershus', 'Museu Munch', 'Museu Fram']],
  ['Zurique', 'Suíça', 'CH', 'CITY', 47.3769, 8.5417, 'Lago cristalino, relógios e chocolate.', 'EUR', ['Bahnhofstrasse', 'Lago de Zurique', 'Grossmünster', 'Cidade Velha de Zurique', 'Lindenhof', 'Museu Nacional Suíço']],
  ['Munique', 'Alemanha', 'DE', 'CITY', 48.1351, 11.582, 'Cervejarias, palácios e a porta para os Alpes.', 'EUR', ['Marienplatz', 'Englischer Garten', 'Palácio de Nymphenburg', 'Hofbräuhaus', 'Residenz de Munique', 'Viktualienmarkt']],
  ['Nice', 'França', 'FR', 'BEACH', 43.7102, 7.262, 'A pérola da Riviera Francesa.', 'EUR', ['Promenade des Anglais', 'Colina do Castelo', 'Cidade Velha de Nice', 'Cours Saleya', 'Museu Matisse', 'Porto de Nice']],
  ['Santorini', 'Grécia', 'GR', 'BEACH', 36.3932, 25.4615, 'Casas brancas sobre a caldeira e o pôr do sol mais famoso do Egeu.', 'EUR', ['Oia', 'Fira', 'Praia Vermelha', 'Sítio Arqueológico de Akrotiri', 'Baía de Amoudi', 'Praia Preta de Perissa']],
  ['Dubrovnik', 'Croácia', 'HR', 'CULTURAL', 42.6507, 18.0944, 'Muralhas medievais sobre o Adriático.', 'EUR', ['Muralhas de Dubrovnik', 'Stradun', 'Fortaleza de Lovrijenac', 'Ilha de Lokrum', 'Palácio do Reitor', 'Teleférico do Monte Srđ']],
  ['Los Angeles', 'Estados Unidos', 'US', 'CITY', 34.0522, -118.2437, 'Cinema, praias e muito sol.', 'USD', ['Calçada da Fama de Hollywood', 'Observatório Griffith', 'Santa Monica Pier', 'Universal Studios Hollywood', 'Getty Center', 'Venice Beach']],
  ['São Francisco', 'Estados Unidos', 'US', 'CITY', 37.7749, -122.4194, 'Ladeiras, bondinhos e a ponte mais fotografada do mundo.', 'USD', ['Golden Gate Bridge', 'Alcatraz', 'Fisherman’s Wharf', 'Lombard Street', 'Chinatown de São Francisco', 'Painted Ladies']],
  ['Miami', 'Estados Unidos', 'US', 'BEACH', 25.7617, -80.1918, 'Art déco, praias e cultura latina.', 'USD', ['South Beach', 'Distrito Art Déco', 'Wynwood Walls', 'Vizcaya Museum and Gardens', 'Little Havana', 'Everglades']],
  ['Toronto', 'Canadá', 'CA', 'CITY', 43.6532, -79.3832, 'A maior cidade do Canadá, às margens do lago Ontário.', 'USD', ['CN Tower', 'Ripley’s Aquarium of Canada', 'Royal Ontario Museum', 'Distillery District', 'Ilhas de Toronto', 'Mercado St. Lawrence']],
  ['Vancouver', 'Canadá', 'CA', 'NATURE', 49.2827, -123.1207, 'Montanhas, floresta e mar a poucos minutos do centro.', 'USD', ['Stanley Park', 'Granville Island', 'Ponte Suspensa de Capilano', 'Gastown', 'Grouse Mountain', 'English Bay']],
  ['Havana', 'Cuba', 'CU', 'CULTURAL', 23.1136, -82.3666, 'Carros antigos, música e arquitetura colonial.', 'USD', ['Malecón', 'Havana Velha', 'El Capitolio', 'Plaza de la Catedral', 'Plaza de la Revolución', 'Fábrica de Arte Cubano']],
  ['Cartagena', 'Colômbia', 'CO', 'BEACH', 10.391, -75.4794, 'Cidade amuralhada colorida à beira do Caribe.', 'USD', ['Cidade Amuralhada', 'Castillo San Felipe de Barajas', 'Torre del Reloj', 'Plaza Santo Domingo', 'Ilhas do Rosário', 'Getsemaní']],
  ['Bogotá', 'Colômbia', 'CO', 'CITY', 4.711, -74.0721, 'Capital cultural entre montanhas.', 'USD', ['Monserrate', 'La Candelaria', 'Museu do Ouro', 'Plaza de Bolívar', 'Museu Botero', 'Catedral de Sal de Zipaquirá']],
  ['Gramado', 'Brasil', 'BR', 'CITY', -29.3788, -50.8741, 'Charme europeu na Serra Gaúcha, com chocolate e fondue.', 'BRL', ['Rua Coberta', 'Lago Negro', 'Mini Mundo', 'Palácio dos Festivais', 'Snowland', 'Parque Knorr']],
  ['Foz do Iguaçu', 'Brasil', 'BR', 'NATURE', -25.5163, -54.5854, 'Uma das maiores quedas d’água do planeta.', 'BRL', ['Cataratas do Iguaçu', 'Parque das Aves', 'Itaipu Binacional', 'Marco das Três Fronteiras', 'Templo Budista Chen Tien', 'Garganta do Diabo']],
  ['Fernando de Noronha', 'Brasil', 'BR', 'BEACH', -3.8547, -32.4249, 'Arquipélago de águas cristalinas e tartarugas.', 'BRL', ['Baía do Sancho', 'Praia do Leão', 'Baía dos Porcos', 'Morro do Pico', 'Praia do Atalaia', 'Projeto Tamar']],
  ['Jericoacoara', 'Brasil', 'BR', 'BEACH', -2.7975, -40.5136, 'Dunas, lagoas e o pôr do sol mais disputado do Ceará.', 'BRL', ['Duna do Pôr do Sol', 'Pedra Furada', 'Lagoa do Paraíso', 'Praia de Jericoacoara', 'Lagoa Azul', 'Árvore da Preguiça']],
  ['Seul', 'Coreia do Sul', 'KR', 'CITY', 37.5665, 126.978, 'Palácios antigos ao lado de arranha-céus e K-pop.', 'USD', ['Palácio Gyeongbokgung', 'N Seoul Tower', 'Vila Hanok de Bukchon', 'Mercado de Myeongdong', 'Dongdaemun Design Plaza', 'Templo Bongeunsa']],
  ['Singapura', 'Singapura', 'SG', 'CITY', 1.3521, 103.8198, 'Cidade-estado de jardins futuristas e comida de rua premiada.', 'USD', ['Marina Bay Sands', 'Gardens by the Bay', 'Sentosa', 'Merlion Park', 'Chinatown de Singapura', 'Maxwell Food Centre']],
  ['Hanói', 'Vietnã', 'VN', 'CITY', 21.0278, 105.8342, 'Ruelas, lagos e café com ovo.', 'USD', ['Lago Hoàn Kiếm', 'Templo da Literatura', 'Bairro Antigo de Hanói', 'Mausoléu de Ho Chi Minh', 'Teatro de Marionetes na Água', 'Prisão de Hoa Lo']],
  ['Pequim', 'China', 'CN', 'CULTURAL', 39.9042, 116.4074, 'Cidade Proibida, hutongs e a Grande Muralha por perto.', 'USD', ['Cidade Proibida', 'Grande Muralha de Badaling', 'Templo do Céu', 'Palácio de Verão', 'Praça Tiananmen', 'Hutongs de Pequim']],
];
// London already exists from `npm run db:seed` with this id: reuse it.
const LONDON_ID = '7c1e9a52-3b4d-4f60-9a1e-2d8b5c6f0a11';

const FOOD_PREFIX = ['Cantina', 'Bistrô', 'Casa', 'Café', 'Taverna', 'Cozinha', 'Mesa', 'Forno'];
const FOOD_SUFFIX = ['da Praça', 'do Mercado', 'Velha', 'Central', 'do Porto', 'das Flores', 'do Chef', 'da Esquina'];
const HOTEL_PREFIX = ['Hotel', 'Pousada', 'Hostel', 'Residência', 'Grand Hotel', 'Boutique Hotel'];
const HOTEL_SUFFIX = ['Centro', 'Jardins', 'Vista', 'Imperial', 'Plaza', 'Aurora', 'Real'];

/** The demo user's scheduled trip: three stops, in order, with the days spent in each. */
const TRIP = {
  name: 'Eurotrip 2027',
  description: 'Paris, Roma e Barcelona em duas semanas.',
  startDate: '2027-01-15',
  currency: 'BRL',
  stops: [
    { city: 'Paris', nights: 4, note: 'Hotel perto do Louvre.' },
    { city: 'Roma', nights: 5, note: 'Chegada de trem às 10h.' },
    { city: 'Barcelona', nights: 4, note: 'Fim de viagem na praia.' },
  ],
};
const addDays = (iso, days) => new Date(new Date(`${iso}T00:00:00Z`).getTime() + days * 86_400_000).toISOString().slice(0, 10);

// ── build ──────────────────────────────────────────────────────────────────

function build() {
  const d = { users: [], destinations: [], activities: [], trips: [], tripDestinations: [], tripActivities: [], budgets: [] };

  const user = { id: id('user:admin'), name: 'Viajante Demo', email: `admin@${DOMAIN}`, role: 'ADMIN' };
  d.users.push(user);

  for (const [name, country, countryCode, category, latitude, longitude, description, currency, tours] of CITIES) {
    const destId = name === 'Londres' ? LONDON_ID : id(`dest:${name}`);
    const dest = { id: destId, name, country, countryCode, category, latitude, longitude, description, currency, externalId: name === 'Londres' ? null : `demo:dest:${slug(name)}`, activities: [] };
    d.destinations.push(dest);

    const add = (type, activityName, text) => {
      const act = {
        id: id(`act:${name}:${type}:${activityName}`),
        destId,
        name: activityName,
        description: text,
        type,
        location: `${activityName}, ${name}`,
        city: name,
        country,
        latitude: round6(latitude + (random() - 0.5) * 0.08),
        longitude: round6(longitude + (random() - 0.5) * 0.08),
        externalId: `demo:act:${slug(name)}:${slug(activityName)}`,
        mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${activityName} ${name}`)}`,
      };
      d.activities.push(act);
      dest.activities.push(act);
    };
    for (const tour of tours) add('TOUR', tour, `Um dos lugares mais visitados de ${name}.`);
    for (const food of sample(FOOD_PREFIX, 5).map((p) => `${p} ${pick(FOOD_SUFFIX)}`)) add('FOOD', `${food} – ${name}`, `Cozinha local em ${name}.`);
    for (const hotel of sample(HOTEL_PREFIX, 4).map((p) => `${p} ${pick(HOTEL_SUFFIX)}`)) add('LODGING', `${hotel} ${name}`, `Hospedagem bem localizada em ${name}.`);
  }

  // The scheduled trip: confirmed, in the future, with the user as its only member (the creator).
  const length = TRIP.stops.reduce((sum, stop) => sum + stop.nights, 0);
  const trip = { id: id('trip:eurotrip'), name: TRIP.name, description: TRIP.description, startDate: TRIP.startDate, endDate: addDays(TRIP.startDate, length), status: 'CONFIRMED', createdBy: user.id, currency: TRIP.currency, inviteCode: 'JVT2M7KQ', createdAt: '2026-10-20T12:00:00Z' };
  d.trips.push(trip);

  let planned = 0;
  let offset = 0;
  TRIP.stops.forEach((stop, order) => {
    const dest = d.destinations.find((x) => x.name === stop.city);
    const td = { id: id(`td:eurotrip:${order}`), tripId: trip.id, destinationId: dest.id, arrival: addDays(trip.startDate, offset), departure: addDays(trip.startDate, offset + stop.nights), description: stop.note, order };
    d.tripDestinations.push(td);

    const tours = dest.activities.filter((a) => a.type === 'TOUR');
    const food = dest.activities.filter((a) => a.type === 'FOOD');
    const hotel = dest.activities.filter((a) => a.type === 'LODGING');
    // Hotel on the arrival day, then a sightseeing day by day with a meal in between.
    const items = [
      { act: hotel[0], cost: stop.nights * int(380, 620), minutes: stop.nights * 24 * 60, dayOffset: 0, hour: 14 },
      ...tours.slice(0, Math.min(4, tours.length)).map((act, n) => ({ act, cost: int(60, 260), minutes: int(2, 4) * 60, dayOffset: Math.min(n + 1, stop.nights), hour: 10 })),
      ...food.slice(0, 2).map((act, n) => ({ act, cost: int(90, 280), minutes: 90, dayOffset: Math.min(n + 1, stop.nights), hour: 20 })),
    ];
    items.forEach(({ act, cost, minutes, dayOffset, hour }, n) => {
      planned += cost;
      d.tripActivities.push({
        id: id(`ta:eurotrip:${order}:${act.id}`),
        tripDestinationId: td.id,
        activityId: act.id,
        dateTime: `${addDays(td.arrival, dayOffset)}T${String(hour).padStart(2, '0')}:00:00Z`,
        durationMinutes: minutes,
        expectedCost: cost,
        status: n % 3 === 0 ? 'CONFIRMED' : 'PENDING',
      });
    });
    offset += stop.nights;
  });

  // A budget with some room over what is planned, rounded to a neat figure.
  d.budgets.push({ id: id('budget:eurotrip'), tripId: trip.id, totalValue: Math.ceil((planned * 1.6) / 1000) * 1000, createdAt: trip.createdAt });

  return d;
}

// ── write ──────────────────────────────────────────────────────────────────

async function insert(db, sql, rows, toParams) {
  for (const row of rows) await db.query(sql, toParams(row));
}

async function seed(db) {
  const d = build();

  await insert(db, `INSERT INTO "user" (id, name, email, role) VALUES ($1, $2, $3, $4::"UserRole") ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`, d.users, (u) => [u.id, u.name, u.email, u.role]);

  await insert(
    db,
    `INSERT INTO destination_catalog (id, name, country, country_code, category, description, latitude, longitude, external_id)
     VALUES ($1, $2, $3, $4, $5::"DestinationCategory", $6, $7, $8, $9)
     ON CONFLICT (id) DO UPDATE SET description = EXCLUDED.description, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude`,
    d.destinations,
    (x) => [x.id, x.name, x.country, x.countryCode, x.category, x.description, x.latitude, x.longitude, x.externalId],
  );

  await insert(
    db,
    `INSERT INTO activity_catalog (id, name, description, type, location, city, country, latitude, longitude, external_id, maps_url, source, destination_catalog_id)
     VALUES ($1, $2, $3, $4::"ActivityType", $5, $6, $7, $8, $9, $10, $11, 'DEMO', $12)
     ON CONFLICT (id) DO UPDATE SET description = EXCLUDED.description, maps_url = EXCLUDED.maps_url`,
    d.activities,
    (a) => [a.id, a.name, a.description, a.type, a.location, a.city, a.country, a.latitude, a.longitude, a.externalId, a.mapsUrl, a.destId],
  );

  await insert(db, `INSERT INTO trip (id, name, description, start_date, end_date, status, created_by, currency, invite_code, created_at) VALUES ($1, $2, $3, $4, $5, $6::"TripStatus", $7, $8, $9, $10) ON CONFLICT (id) DO NOTHING`, d.trips, (t) => [t.id, t.name, t.description, t.startDate, t.endDate, t.status, t.createdBy, t.currency, t.inviteCode, t.createdAt]);
  await insert(db, `INSERT INTO trip_destination (id, trip_id, destination_catalog_id, arrival, departure, description, display_order) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING`, d.tripDestinations, (t) => [t.id, t.tripId, t.destinationId, t.arrival, t.departure, t.description, t.order]);
  await insert(db, `INSERT INTO trip_activity (id, trip_destination_id, activity_catalog_id, date_time, duration_minutes, expected_cost, status) VALUES ($1, $2, $3, $4, $5, $6, $7::"TripActivityStatus") ON CONFLICT (id) DO NOTHING`, d.tripActivities, (t) => [t.id, t.tripDestinationId, t.activityId, t.dateTime, t.durationMinutes, t.expectedCost, t.status]);
  await insert(db, `INSERT INTO budget (id, trip_id, total_value, created_at) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`, d.budgets, (b) => [b.id, b.tripId, b.totalValue, b.createdAt]);

  return Object.fromEntries(Object.entries(d).map(([key, rows]) => [key, rows.length]));
}

async function clean(db) {
  const demoUsers = `(SELECT id FROM "user" WHERE email LIKE '%@${DOMAIN}')`;
  const counts = {};
  const run = async (label, sql) => {
    counts[label] = (await db.query(sql)).rowCount;
  };
  // Trips cascade to members, itinerary, budgets and expenses; reviews go with their users.
  await run('trips', `DELETE FROM trip WHERE created_by IN ${demoUsers}`);
  await run('users', `DELETE FROM "user" WHERE email LIKE '%@${DOMAIN}'`);
  await run('activities', `DELETE FROM activity_catalog WHERE source = 'DEMO'`);
  await run('destinations', `DELETE FROM destination_catalog WHERE external_id LIKE 'demo:%'`);
  // London belongs to the base seed: keep it, but drop the rating the demo reviews gave it.
  await db.query(`UPDATE destination_catalog SET average_rating = NULL, review_count = 0 WHERE id = '${LONDON_ID}' AND NOT EXISTS (SELECT 1 FROM destination_review WHERE destination_catalog_id = '${LONDON_ID}')`);
  return counts;
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
  if (process.env.NODE_ENV === 'production') throw new Error('Refusing to seed demo data with NODE_ENV=production');

  const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    await db.query('BEGIN');
    const cleaning = process.argv.includes('--clean');
    const counts = cleaning ? await clean(db) : await seed(db);
    await db.query('COMMIT');
    console.log(cleaning ? 'Removed:' : 'Demo data ready:');
    for (const [key, value] of Object.entries(counts)) console.log(`  ${key.padEnd(20)} ${value}`);
    if (!cleaning) console.log(`\nDemo user: admin@${DOMAIN} (ADMIN, id ${id('user:admin')})`);
  } catch (error) {
    await db.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
