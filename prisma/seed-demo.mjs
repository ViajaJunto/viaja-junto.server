// Fills a development database with a large, realistic, repeatable data set:
// users, a destination and activity catalog, trips in every state with their
// members, itinerary, budgets, expenses and reviews.
//
//   npm run db:seed:demo               add (or refresh) the demo data
//   npm run db:seed:demo -- --clean    remove only what this script created
//
// Everything is derived from fixed keys, so running it twice gives the same
// rows (same ids) instead of duplicates. Demo rows are easy to tell apart:
// users have @demo.viajajunto.dev emails, activities have source 'DEMO' and
// destinations an external id starting with 'demo:'. Never run it against a
// production database.
//
// Plain JavaScript on purpose, like seed.mjs: it runs with `node` alone.
import 'dotenv/config';
import { createHash } from 'node:crypto';
import pg from 'pg';

const DOMAIN = 'demo.viajajunto.dev';
const TODAY = new Date('2026-11-05T00:00:00Z');

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
const chance = (p) => random() < p;
function sample(list, count) {
  const pool = [...list];
  const out = [];
  while (out.length < count && pool.length) out.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  return out;
}
const addDays = (date, days) => new Date(date.getTime() + days * 86_400_000);
const day = (date) => date.toISOString().slice(0, 10);
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const slug = (text) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');
const INVITE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const inviteCode = (key) => {
  const h = createHash('sha1').update(`invite:${key}`).digest();
  return Array.from({ length: 8 }, (_, i) => INVITE_ALPHABET[h[i] % INVITE_ALPHABET.length]).join('');
};

// ── data ───────────────────────────────────────────────────────────────────

const FIRST = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Felipe', 'Gabriela', 'Henrique', 'Isabela', 'João', 'Karina', 'Lucas', 'Mariana', 'Nicolas', 'Olívia', 'Pedro', 'Rafaela', 'Sérgio', 'Tatiana', 'Vinícius', 'Beatriz', 'Caio', 'Débora', 'Eduardo', 'Fernanda', 'Guilherme', 'Helena', 'Igor', 'Júlia', 'Leonardo'];
const LAST = ['Almeida', 'Barbosa', 'Cardoso', 'Dias', 'Esteves', 'Ferreira', 'Gomes', 'Holanda', 'Ito', 'Junqueira', 'Lima', 'Moreira', 'Nogueira', 'Oliveira', 'Pereira', 'Queiroz', 'Ribeiro', 'Souza', 'Teixeira', 'Vasconcelos'];

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

// Rough BRL per unit of each currency, enough for believable expenses.
const RATE = { EUR: 6.1, USD: 5.6, GBP: 7.2, JPY: 0.037 };
const WHOLE_UNITS = new Set(['JPY']);

const FOOD_PREFIX = ['Cantina', 'Bistrô', 'Casa', 'Café', 'Taverna', 'Cozinha', 'Mesa', 'Forno'];
const FOOD_SUFFIX = ['da Praça', 'do Mercado', 'Velha', 'Central', 'do Porto', 'das Flores', 'do Chef', 'da Esquina'];
const HOTEL_PREFIX = ['Hotel', 'Pousada', 'Hostel', 'Residência', 'Grand Hotel', 'Boutique Hotel'];
const HOTEL_SUFFIX = ['Centro', 'Jardins', 'Vista', 'Imperial', 'Plaza', 'Aurora', 'Real'];

const TOUR_COMMENTS = ['Vale muito a pena, vá cedo para evitar fila.', 'Mais bonito pessoalmente do que nas fotos.', 'Um pouco cheio, mas imperdível.', 'Boa experiência, recomendo comprar o ingresso antes.', 'Surpreendente! Passamos a tarde toda.', 'Bom, mas esperava mais.', 'Perfeito para ir em família.', 'A melhor parte da viagem.'];
const CITY_COMMENTS = ['Cidade incrível, já quero voltar.', 'Fácil de explorar a pé e com ótima comida.', 'Linda, mas bem cheia na alta temporada.', 'Superou as expectativas.', 'Boa para um fim de semana prolongado.', 'Cada bairro tem uma personalidade diferente.', 'Transporte público excelente.', 'Vale cada dia que passamos lá.'];
const EXPENSE_TEXT = ['Jantar', 'Almoço', 'Táxi do aeroporto', 'Ingressos', 'Supermercado', 'Passeio de barco', 'Hospedagem', 'Metrô', 'Souvenirs', 'Café da manhã', 'Ônibus', 'Show'];
const TRIP_NAME = [(c) => `Férias em ${c}`, (c) => `${c} com a turma`, (c) => `Fim de semana em ${c}`, (c) => `Mochilão: ${c}`, (c) => `${c} 2026`, (c) => `Lua de mel em ${c}`];

// ── build ──────────────────────────────────────────────────────────────────

function build() {
  const d = { users: [], destinations: [], activities: [], trips: [], members: [], tripDestinations: [], tripActivities: [], budgets: [], expenses: [], shares: [], reviews: [], destinationReviews: [] };

  d.users.push({ id: id('user:admin'), name: 'Admin Demo', email: `admin@${DOMAIN}`, role: 'ADMIN' });
  for (let i = 0; i < 40; i += 1) {
    const name = `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]}`;
    d.users.push({ id: id(`user:${i}`), name, email: `${slug(name)}.${i}@${DOMAIN}`, role: 'USER' });
  }
  const people = d.users.filter((u) => u.role === 'USER');

  for (const [name, country, countryCode, category, latitude, longitude, description, currency, tours] of CITIES) {
    const destId = name === 'Londres' ? LONDON_ID : id(`dest:${name}`);
    const dest = { id: destId, key: name, name, country, countryCode, category, latitude, longitude, description, currency, externalId: name === 'Londres' ? null : `demo:dest:${slug(name)}`, activities: [] };
    d.destinations.push(dest);

    const near = (n) => [round6(latitude + (random() - 0.5) * 0.08), round6(longitude + (random() - 0.5) * 0.08), n];
    const add = (type, activityName, description2) => {
      const [lat, lng] = near();
      const act = { id: id(`act:${name}:${type}:${activityName}`), destId, name: activityName, description: description2, type, location: `${activityName}, ${name}`, city: name, country, latitude: lat, longitude: lng, externalId: `demo:act:${slug(name)}:${slug(activityName)}`, mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${activityName} ${name}`)}` };
      d.activities.push(act);
      dest.activities.push(act);
    };
    for (const tour of tours) add('TOUR', tour, `Um dos lugares mais visitados de ${name}.`);
    for (const food of sample(FOOD_PREFIX, 5).map((p) => `${p} ${pick(FOOD_SUFFIX)}`)) add('FOOD', `${food} – ${name}`, `Cozinha local em ${name}.`);
    for (const hotel of sample(HOTEL_PREFIX, 4).map((p) => `${p} ${pick(HOTEL_SUFFIX)}`)) add('LODGING', `${hotel} ${name}`, `Hospedagem bem localizada em ${name}.`);
  }

  // Trips: a third are over, a third are confirmed, a third are still being planned.
  const TRIPS = 36;
  for (let t = 0; t < TRIPS; t += 1) {
    const status = t % 3 === 0 ? 'COMPLETED' : t % 3 === 1 ? 'CONFIRMED' : 'PLANNING';
    const creator = people[(t * 5) % people.length];
    const stops = sample(d.destinations, int(1, 3));
    const lead = stops[0];
    const length = 4 + stops.length * 3;
    const start =
      status === 'COMPLETED' ? addDays(TODAY, -int(40, 560)) : status === 'CONFIRMED' ? addDays(TODAY, int(20, 150)) : addDays(TODAY, int(160, 420));
    const dated = !(status === 'PLANNING' && chance(0.3));
    const end = addDays(start, length);
    const trip = { id: id(`trip:${t}`), name: TRIP_NAME[t % TRIP_NAME.length](lead.name), description: `Roteiro por ${stops.map((s) => s.name).join(', ')}.`, startDate: dated ? start : null, endDate: dated ? end : null, status, createdBy: creator.id, currency: 'BRL', inviteCode: inviteCode(`trip:${t}`), createdAt: addDays(dated ? start : TODAY, -int(30, 120)) };
    if (trip.createdAt > TODAY) trip.createdAt = addDays(TODAY, -int(1, 30));
    d.trips.push(trip);

    const others = sample(people.filter((p) => p.id !== creator.id), int(1, 5));
    const everyone = [creator, ...others];
    for (const person of others) d.members.push({ id: id(`member:${t}:${person.id}`), tripId: trip.id, userId: person.id, permission: chance(0.45) ? 'EDITOR' : 'VIEWER', joinedAt: addDays(trip.createdAt, int(0, 20)) });

    stops.forEach((stop, order) => {
      const share = Math.floor(length / stops.length);
      const arrival = dated ? addDays(start, order * share) : null;
      const departure = dated ? addDays(start, order * share + share) : null;
      const td = { id: id(`td:${t}:${order}`), tripId: trip.id, destinationId: stop.id, arrival, departure, description: chance(0.4) ? `Base em ${stop.name}.` : null, order };
      d.tripDestinations.push(td);

      const wanted = int(2, 4);
      const chosen = [...sample(stop.activities.filter((a) => a.type === 'TOUR'), Math.min(wanted, 3)), ...sample(stop.activities.filter((a) => a.type === 'FOOD'), 1)];
      chosen.forEach((act, n) => {
        const when = arrival ? addDays(arrival, n % Math.max(1, share)) : null;
        if (when) when.setUTCHours(9 + n * 3, 0, 0, 0);
        const cost = act.type === 'TOUR' ? round2(int(40, 400)) : act.type === 'FOOD' ? round2(int(60, 300)) : null;
        d.tripActivities.push({ id: id(`ta:${t}:${order}:${act.id}`), tripDestinationId: td.id, activityId: act.id, dateTime: when, durationMinutes: act.type === 'FOOD' ? 90 : int(1, 5) * 60, expectedCost: cost, status: status === 'COMPLETED' ? 'COMPLETED' : status === 'CONFIRMED' && chance(0.6) ? 'CONFIRMED' : 'PENDING', tripId: trip.id });
      });
    });

    if (chance(0.85)) d.budgets.push({ id: id(`budget:${t}`), tripId: trip.id, totalValue: round2(int(25, 180) * 100 * everyone.length / 10), createdAt: trip.createdAt });

    if (status !== 'PLANNING') {
      const count = status === 'COMPLETED' ? int(5, 9) : int(1, 3);
      for (let e = 0; e < count; e += 1) {
        const payer = pick(everyone);
        const foreign = chance(0.5) && lead.currency !== 'BRL';
        const currency = foreign ? lead.currency : 'BRL';
        const amount = WHOLE_UNITS.has(currency) ? int(1500, 30000) : int(1800, 60000);
        const participants = sample(everyone, int(2, everyone.length));
        if (!participants.includes(payer) && chance(0.7)) participants.push(payer);
        const kind = chance(0.12) ? 'PROPORTIONAL' : chance(0.12) ? 'EXACT' : 'EQUAL';
        const expense = { id: id(`exp:${t}:${e}`), tripId: trip.id, payerId: payer.id, amount, currency, exchangeRate: foreign ? RATE[currency] : null, description: `${pick(EXPENSE_TEXT)} em ${lead.name}`, spentOn: dated ? addDays(start, int(0, length)) : null, splitType: kind, createdBy: chance(0.8) ? payer.id : creator.id, createdAt: addDays(dated ? start : trip.createdAt, int(0, length)) };
        if (expense.createdAt > TODAY) expense.createdAt = TODAY;
        d.expenses.push(expense);

        let left = amount;
        participants.forEach((person, position) => {
          const share = { id: id(`share:${expense.id}:${person.id}`), expenseId: expense.id, userId: person.id, position, weight: null, amount: null };
          if (kind === 'PROPORTIONAL') share.weight = int(1, 3);
          if (kind === 'EXACT') {
            share.amount = position === participants.length - 1 ? left : Math.floor(amount / participants.length);
            left -= share.amount;
          }
          d.shares.push(share);
        });
      }
    }

    // Only people who completed a trip with a destination review it, like the API requires.
    if (status === 'COMPLETED') {
      for (const person of everyone) {
        for (const stop of stops) {
          if (chance(0.7)) d.destinationReviews.push({ id: id(`dreview:${person.id}:${stop.id}`), userId: person.id, destinationId: stop.id, rating: pick([3, 4, 4, 5, 5, 5, 2]), comment: chance(0.7) ? pick(CITY_COMMENTS) : null, createdAt: addDays(end, int(1, 20)) });
        }
        for (const ta of d.tripActivities.filter((x) => x.tripId === trip.id)) {
          if (chance(0.45)) d.reviews.push({ id: id(`review:${person.id}:${ta.activityId}`), userId: person.id, activityId: ta.activityId, rating: pick([3, 4, 4, 5, 5, 5, 2, 1]), comment: chance(0.6) ? pick(TOUR_COMMENTS) : null, createdAt: addDays(end, int(1, 20)) });
        }
      }
    }
  }

  // A person reviews a thing once; keep the first.
  const once = (rows, key) => [...new Map(rows.map((r) => [key(r), r])).values()];
  d.reviews = once(d.reviews, (r) => `${r.userId}:${r.activityId}`);
  d.destinationReviews = once(d.destinationReviews, (r) => `${r.userId}:${r.destinationId}`);
  d.reviews.forEach((r) => (r.createdAt = r.createdAt > TODAY ? TODAY : r.createdAt));
  d.destinationReviews.forEach((r) => (r.createdAt = r.createdAt > TODAY ? TODAY : r.createdAt));

  return d;
}
const round6 = (n) => Math.round(n * 1e6) / 1e6;

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

  await insert(db, `INSERT INTO trip (id, name, description, start_date, end_date, status, created_by, currency, invite_code, created_at) VALUES ($1, $2, $3, $4, $5, $6::"TripStatus", $7, $8, $9, $10) ON CONFLICT (id) DO NOTHING`, d.trips, (t) => [t.id, t.name, t.description, t.startDate && day(t.startDate), t.endDate && day(t.endDate), t.status, t.createdBy, t.currency, t.inviteCode, t.createdAt]);
  await insert(db, `INSERT INTO trip_member (id, trip_id, user_id, permission, joined_at) VALUES ($1, $2, $3, $4::"MemberPermission", $5) ON CONFLICT (id) DO NOTHING`, d.members, (m) => [m.id, m.tripId, m.userId, m.permission, m.joinedAt]);
  await insert(db, `INSERT INTO trip_destination (id, trip_id, destination_catalog_id, arrival, departure, description, display_order) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING`, d.tripDestinations, (t) => [t.id, t.tripId, t.destinationId, t.arrival && day(t.arrival), t.departure && day(t.departure), t.description, t.order]);
  await insert(db, `INSERT INTO trip_activity (id, trip_destination_id, activity_catalog_id, date_time, duration_minutes, expected_cost, status) VALUES ($1, $2, $3, $4, $5, $6, $7::"TripActivityStatus") ON CONFLICT (id) DO NOTHING`, d.tripActivities, (t) => [t.id, t.tripDestinationId, t.activityId, t.dateTime, t.durationMinutes, t.expectedCost, t.status]);
  await insert(db, `INSERT INTO budget (id, trip_id, total_value, created_at) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`, d.budgets, (b) => [b.id, b.tripId, b.totalValue, b.createdAt]);
  await insert(db, `INSERT INTO trip_expense (id, trip_id, payer_id, amount, currency, exchange_rate, description, spent_on, split_type, created_by, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::"SplitType", $10, $11) ON CONFLICT (id) DO NOTHING`, d.expenses, (e) => [e.id, e.tripId, e.payerId, e.amount, e.currency, e.exchangeRate, e.description, e.spentOn && day(e.spentOn), e.splitType, e.createdBy, e.createdAt]);
  await insert(db, `INSERT INTO trip_expense_share (id, expense_id, user_id, position, weight, amount) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING`, d.shares, (s) => [s.id, s.expenseId, s.userId, s.position, s.weight, s.amount]);
  await insert(db, `INSERT INTO review (id, user_id, activity_catalog_id, rating, comment, created_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING`, d.reviews, (r) => [r.id, r.userId, r.activityId, r.rating, r.comment, r.createdAt]);
  await insert(db, `INSERT INTO destination_review (id, user_id, destination_catalog_id, rating, comment, created_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING`, d.destinationReviews, (r) => [r.id, r.userId, r.destinationId, r.rating, r.comment, r.createdAt]);

  // The ratings are derived from the reviews, like the API keeps them (two decimals).
  await db.query(`UPDATE activity_catalog a SET average_rating = s.avg, review_count = s.n FROM (SELECT activity_catalog_id AS id, ROUND(AVG(rating)::numeric, 2)::float AS avg, COUNT(*)::int AS n FROM review GROUP BY 1) s WHERE a.id = s.id`);
  await db.query(`UPDATE destination_catalog c SET average_rating = s.avg, review_count = s.n FROM (SELECT destination_catalog_id AS id, ROUND(AVG(rating)::numeric, 2)::float AS avg, COUNT(*)::int AS n FROM destination_review GROUP BY 1) s WHERE c.id = s.id`);

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
  // London belongs to the base seed: keep it, but drop what the demo added to its rating.
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
    if (!cleaning) console.log(`\nAdmin demo user: admin@${DOMAIN} (id ${id('user:admin')})`);
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
