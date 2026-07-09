"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processImageWithGPT = processImageWithGPT;
exports.parseCaptionOffer = parseCaptionOffer;
exports.extractIataFromImage = extractIataFromImage;
exports.parseCashCaptionOffer = parseCashCaptionOffer;
exports.generateFinalOfferPayload = generateFinalOfferPayload;
const openai_1 = __importDefault(require("openai"));
const dotenv_1 = __importDefault(require("dotenv"));
const logger_1 = require("./logger");
const milheiroHandler_1 = require("./milheiroHandler");
dotenv_1.default.config();
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
const CANONICAL_PROGRAMS = 'LATAM Pass, Smiles, Azul Fidelidade, Azul Interline, Iberia Plus, TAP Miles&Go, AAdvantage, ConnectMiles, Privilege Club, Flying Blue, Mileage Plan, Flying Club, SkyMiles, MileagePlus, Aeroplan, Suma Miles, LifeMiles';
const NOISE_VALUE_PATTERNS = [
    'alertadevoos',
    'alerta de voos',
    'agencia do alerta',
    'agência do alerta',
    'flypass',
];
function cleanCaptionValue(value) {
    return (value || '')
        .replace(/\*/g, '')
        .replace(/\u00A0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
function normalizeNoiseValue(value) {
    return cleanCaptionValue(value)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}
function isNoiseValue(value) {
    const normalized = normalizeNoiseValue(value);
    return !!normalized && NOISE_VALUE_PATTERNS.some((pattern) => normalized.includes(pattern));
}
function extractCaptionField(caption, label) {
    const prefix = `${label.toLowerCase()}:`;
    for (const rawLine of (caption || '').split(/\r?\n/)) {
        const line = cleanCaptionValue(rawLine);
        if (!line)
            continue;
        if (line.toLowerCase().startsWith(prefix)) {
            return cleanCaptionValue(line.slice(prefix.length));
        }
    }
    return '';
}
function applyCaptionFieldOverrides(caption, parsed) {
    parsed.cia_aerea = cleanCaptionValue(parsed.cia_aerea || '');
    parsed.programa_mais_vantajoso = cleanCaptionValue(parsed.programa_mais_vantajoso || '');
    const captionAirline = extractCaptionField(caption, 'Companhia');
    if (captionAirline && !isNoiseValue(captionAirline)) {
        parsed.cia_aerea = captionAirline;
    }
    else if (isNoiseValue(parsed.cia_aerea)) {
        parsed.cia_aerea = '';
    }
    const captionProgram = extractCaptionField(caption, 'Programa de Milhas');
    const normalizedCaptionProgram = (0, milheiroHandler_1.normalizeProgramaName)(captionProgram);
    if (captionProgram && normalizedCaptionProgram !== captionProgram) {
        parsed.programa_mais_vantajoso = normalizedCaptionProgram;
    }
    else if (captionProgram && !isNoiseValue(captionProgram) && (!parsed.programa_mais_vantajoso || isNoiseValue(parsed.programa_mais_vantajoso))) {
        parsed.programa_mais_vantajoso = captionProgram;
    }
    else if (isNoiseValue(parsed.programa_mais_vantajoso) && !captionProgram) {
        parsed.programa_mais_vantajoso = '';
    }
    return parsed;
}
function parseJsonObject(output) {
    const trimmed = (output || '').trim();
    if (!trimmed)
        return {};
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : trimmed);
}
function ensureOfferArrays(parsed) {
    if (!Array.isArray(parsed.datas_ida))
        parsed.datas_ida = [];
    if (!Array.isArray(parsed.datas_volta))
        parsed.datas_volta = [];
    return parsed;
}
function getCaptionValidationError(parsed, caption) {
    if (!parsed?.origem || !parsed?.destino)
        return 'origem/destino ausentes';
    if (!parsed?.cia_aerea)
        return 'companhia ausente';
    const explicitProgram = extractCaptionField(caption, 'Programa de Milhas');
    if (explicitProgram && !parsed?.programa_mais_vantajoso) {
        return 'programa ausente apesar de existir no caption';
    }
    const milhasIda = Number(parsed?.milhas_ida || 0);
    if (milhasIda <= 0 || milhasIda > 500000) {
        return `milhas_ida fora da faixa (${milhasIda})`;
    }
    return null;
}
function getFinalPayloadValidationError(parsed) {
    if (!parsed?.origem || !parsed?.destino)
        return 'origem/destino ausentes';
    const milhasIda = Number(parsed?.milhas_ida || 0);
    if (milhasIda <= 0 || milhasIda > 500000) {
        return `milhas_ida fora da faixa (${milhasIda})`;
    }
    return null;
}
async function requestCaptionOffer(caption, mode) {
    const fallbackGuidance = mode === 'fallback'
        ? `
Modo de contingência:
- Priorize as linhas explícitas do texto, especialmente "Companhia:" e "Programa de Milhas:".
- Se "Programa de Milhas" for "LATAM", retorne "LATAM Pass"; se for "SMILES", retorne "Smiles"; se for "AZUL" ou "AZUL PELO MUNDO", retorne "Azul Fidelidade" ou "Azul Interline" conforme o texto.
- Nunca use "ALERTADEVOOS", "Flypass" ou "Agência do Alerta" como companhia ou programa.
- Se o texto tiver origem e destino no cabeçalho, use o cabeçalho como fonte de verdade.
- Se houver só ida, use milhas_volta = 0 e datas_volta = [].
- Responda com o melhor JSON possível mesmo que algum campo secundário fique vazio.
`
        : '';
    const response = await openai.chat.completions.create({
        model: 'gpt-4.1',
        messages: [
            {
                role: 'system',
                content: `Você é um assistente especializado em extrair dados de ofertas de voos a partir de mensagens de alerta do WhatsApp. Extraia todas as informações relevantes e retorne um JSON estruturado. Ignore links, promoções de agências, e textos promocionais.`
            },
            {
                role: 'user',
                content: `Extraia os dados desta oferta de voo:

${caption}

Retorne um JSON com exatamente estes campos:
- origem (cidade de origem, sem código de aeroporto)
- destino (cidade de destino, sem código de aeroporto)
- cia_aerea (companhia aérea)
- programa_mais_vantajoso (nome do programa de milhas. Use EXATAMENTE um destes nomes: ${CANONICAL_PROGRAMS})
- milhas_ida (número inteiro, sem pontos ou vírgulas)
- milhas_volta (número inteiro, sem pontos ou vírgulas. Se não houver volta, use 0)
- valor_taxas (número em reais, se mencionado. Se não houver, use 0)
- datas_ida (array de datas no formato "dd/mm/aa")
- datas_volta (array de datas no formato "dd/mm/aa")
- link_programa (URL do programa de milhas se houver, caso contrário string vazia)
- regiao_origem (região brasileira da cidade de origem: Sudeste, Nordeste, Sul, Centro-Oeste ou Norte)
- regiao_destino (se destino no Brasil: região brasileira. Se destino internacional: use o continente - América do Norte, América do Sul, América Central, Europa, Ásia, África, Oceania ou Oriente Médio)
- classe (classe da cabine: Econômica, Executiva ou Primeira Classe. Se não mencionado, use "Econômica")
- pais_destino (nome do país de destino em português. Ex: "Estados Unidos", "Portugal", "Brasil")
- continente_destino (continente do destino: América do Norte, América do Sul, América Central, Europa, Ásia, África, Oceania ou Oriente Médio. Se destino no Brasil, use "América do Sul")

Regras:
- Use nomes de cidades em português, não códigos IATA.
- Milhas devem ser números inteiros (ex: "17.500 milhas" = 17500, "19,300 milhas" = 19300).
- Ignore links de agências externas (alertadevoos, flypass, etc).
${fallbackGuidance}
- Responda SOMENTE o JSON válido, sem blocos markdown.`
            }
        ],
        response_format: { type: "json_object" }
    });
    return parseJsonObject(response.choices[0].message.content || '{}');
}
async function requestFinalOfferPayload(textMessage, extractedImagesData, mode) {
    const fallbackGuidance = mode === 'fallback'
        ? `
Atenção extra:
- Se houver divergência entre texto e imagens, priorize origem/destino descritos no texto.
- Use as imagens principalmente para datas e apoio de rota.
- Nunca invente companhia, programa ou milhas se o texto já trouxer esses valores.
- Responda com o melhor JSON possível mesmo que algum campo secundário fique vazio.
`
        : '';
    const response = await openai.chat.completions.create({
        model: 'gpt-4.1',
        messages: [
            {
                role: 'system',
                content: `Você é um assistente especializado em formatar ofertas de voos. Você receberá o texto original da oferta e os dados estruturados de ida e volta extraídos de imagens. Seu objetivo é consolidar essas informações para preparar um JSON de saída com os dados mapeados para o webhook final. Extraia todas as milhas, valores e companhia aérea do texto e agrupe com as datas das imagens.`
            },
            {
                role: 'user',
                content: `Aqui está o texto da oferta recebida:
${textMessage}

Aqui estão os dados estruturados extraídos das 2 imagens (ida e volta, a ordem pode variar):
${JSON.stringify(extractedImagesData, null, 2)}

Por favor, analise esses dados e me devolva um único JSON com os seguintes campos extraídos:
- origem
- destino
- cia_aerea
- programa_mais_vantajoso (use EXATAMENTE um destes nomes: ${CANONICAL_PROGRAMS})
- milhas_ida (número, extraído do texto)
- milhas_volta (número, extraído do texto)
- valor_ida_e_volta (número, se tiver no texto)
- valor_taxas (número total de taxas, em reais ou convertido do dólar aproximado, do texto)
- datas_ida (array das datas referentes ao trecho de ida)
- datas_volta (array das datas referentes ao trecho de volta)
- link_programa (se houver no texto, ex: iberia.com)
- link_whatsapp (se houver)
- regiao_origem (região brasileira da cidade de origem: Sudeste, Nordeste, Sul, Centro-Oeste ou Norte)
- regiao_destino (se destino no Brasil: região brasileira. Se destino internacional: use o continente - América do Norte, América do Sul, América Central, Europa, Ásia, África, Oceania ou Oriente Médio)
- classe (classe da cabine: Econômica, Executiva ou Primeira Classe. Se não mencionado, use "Econômica")
- pais_destino (nome do país de destino em português. Ex: "Estados Unidos", "Portugal", "Brasil")
- continente_destino (continente do destino: América do Norte, América do Sul, América Central, Europa, Ásia, África, Oceania ou Oriente Médio. Se destino no Brasil, use "América do Sul")
${fallbackGuidance}

Atenção: responda SOMENTE o JSON válido, sem blocos markdown (\`\`\`).`
            }
        ],
        response_format: { type: "json_object" }
    });
    return parseJsonObject(response.choices[0].message.content || '{}');
}
async function processImageWithGPT(imageUrl) {
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4.1',
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: `Você está analisando uma imagem que pode ou não conter um alerta de voo.

Tarefas:

1) Verifique se a imagem contém claramente informações de um voo, incluindo:
   - Cidade de origem
   - Cidade de destino final
   - Datas disponíveis para viagem

2) Se a imagem CONTIVER essas informações, responda SOMENTE em JSON no formato:

{
  "origem": "<cidade de origem>",
  "destino": "<cidade de destino final>",
  "iata_origem": "<código IATA de 3 letras da origem, se visível na imagem>",
  "iata_destino": "<código IATA de 3 letras do destino FINAL, se visível na imagem>",
  "região": "região da cidade brasileira",
  "bandeira": "bandeira no formato emoji do país de destino",
  "internacional": "TRUE or FALSE",
  "continente": "Continente de destino (América do Norte, Europa, Asia etc)",
  "datas": ["dd/mm/aa", "dd/mm/aa"]
}

Regras:
- Use nomes de cidades nos campos "origem" e "destino".
- Se códigos de aeroporto IATA (3 letras como GRU, MAD, OPO) estiverem visíveis na imagem, extraia-os nos campos "iata_origem" e "iata_destino".
- O iata_origem é o PRIMEIRO código da rota. O iata_destino é o ÚLTIMO código da rota (ignore escalas no meio).
- Exemplo: "São Paulo GRU - Madrid MAD - Porto OPO" → iata_origem = "GRU", iata_destino = "OPO".
- Se não houver códigos IATA visíveis, use string vazia "" para iata_origem e iata_destino.
- Converta todas as datas para o formato "dd/mm/aa".
- Não considere a cidade de escala no meio, caso tenha.
- Se houver múltiplos meses, junte todas as datas em uma única lista.
- Não inclua texto fora do JSON.
- Não inclua campos extras além dos listados acima.

3) Se a imagem NÃO contiver informações claras de voo (origem, destino e datas), responda EXATAMENTE com:

NÃO É ALERTA DE VOO

Responda com JSON sem blocos de código markdown (não use \`\`\`)`
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: imageUrl
                            }
                        }
                    ]
                }
            ],
            max_tokens: 1500,
        });
        const output = response.choices[0].message.content?.trim() || '';
        if (output === 'NÃO É ALERTA DE VOO') {
            return null;
        }
        // Parse JSON safely
        let parsed;
        const jsonMatch = output.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
        }
        else {
            parsed = JSON.parse(output);
        }
        // Safeguard: validate required fields exist
        if (!parsed.origem || !parsed.destino || !Array.isArray(parsed.datas) || parsed.datas.length === 0) {
            console.warn('GPT image extraction missing required fields, discarding:', parsed);
            return null;
        }
        return parsed;
    }
    catch (error) {
        const errMsg = error?.message || String(error);
        await (0, logger_1.logEvent)(null, 'ERROR', `OpenAI processImageWithGPT failed: ${errMsg.substring(0, 150)}`, { error: errMsg });
        return null;
    }
}
async function parseCaptionOffer(caption) {
    try {
        let parsed = applyCaptionFieldOverrides(caption, await requestCaptionOffer(caption, 'primary'));
        parsed = ensureOfferArrays(parsed);
        const primaryError = getCaptionValidationError(parsed, caption);
        if (!primaryError) {
            return parsed;
        }
        await (0, logger_1.logEvent)(null, 'PROCESSING_FINAL_OFFER', `Caption parse fallback acionado`, { reason: primaryError });
        parsed = applyCaptionFieldOverrides(caption, await requestCaptionOffer(caption, 'fallback'));
        parsed = ensureOfferArrays(parsed);
        const fallbackError = getCaptionValidationError(parsed, caption);
        if (fallbackError) {
            console.warn('GPT caption parse invalid after fallback:', fallbackError, parsed);
            return null;
        }
        return parsed;
    }
    catch (error) {
        const errMsg = error?.message || String(error);
        await (0, logger_1.logEvent)(null, 'ERROR', `OpenAI parseCaptionOffer failed: ${errMsg.substring(0, 150)}`, { error: errMsg });
        return null;
    }
}
async function extractIataFromImage(imageUrl) {
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4.1',
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: `Analise esta imagem de oferta de voo e extraia SOMENTE os códigos de aeroporto IATA (3 letras) da rota.

Exemplos de rota: "CGR - CTG", "GRU - MAD - OPO", "BSB - LIS"

Retorne um JSON com:
{
  "iata_origem": "<PRIMEIRO código IATA da rota>",
  "iata_destino": "<ÚLTIMO código IATA da rota (destino final, ignorando escalas)>"
}

Se não encontrar códigos IATA visíveis, retorne:
{"iata_origem": "", "iata_destino": ""}

Responda SOMENTE o JSON, sem blocos de código markdown.`
                        },
                        {
                            type: 'image_url',
                            image_url: { url: imageUrl }
                        }
                    ]
                }
            ],
            max_tokens: 200,
        });
        const output = response.choices[0].message.content?.trim() || '';
        const jsonMatch = output.match(/\{[\s\S]*\}/);
        if (!jsonMatch)
            return null;
        const parsed = JSON.parse(jsonMatch[0]);
        const iataRegex = /^[A-Z]{3}$/;
        return {
            iata_origem: iataRegex.test((parsed.iata_origem || '').toUpperCase()) ? parsed.iata_origem.toUpperCase() : '',
            iata_destino: iataRegex.test((parsed.iata_destino || '').toUpperCase()) ? parsed.iata_destino.toUpperCase() : '',
        };
    }
    catch (error) {
        console.error('Error extracting IATA from image:', error);
        return null;
    }
}
async function parseCashCaptionOffer(caption) {
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4.1',
            messages: [
                {
                    role: 'system',
                    content: 'Você é um assistente especializado em extrair dados de ofertas de passagens aéreas pagas em dinheiro (não em milhas) a partir de mensagens do WhatsApp. Extraia as informações e retorne um JSON estruturado.',
                },
                {
                    role: 'user',
                    content: `Extraia os dados desta oferta de passagem paga em dinheiro:

${caption}

Retorne um JSON com exatamente estes campos:
- origem (cidade de origem, sem código de aeroporto)
- destino (cidade de destino, sem código de aeroporto)
- cia_aerea (companhia aérea)
- preco_cash (valor numérico em reais, ex: 6864.32. Sem R$, sem pontos de milhar, use ponto como separador decimal)
- tipo_viagem ("IDA" ou "IDA E VOLTA")
- datas_ida (array de datas no formato "dd/mm/aaaa")
- datas_volta (array de datas no formato "dd/mm/aaaa". Se só ida, use [])
- link_emissao (URL do link de compra encontrado na mensagem. Se não houver, use "")
- regiao_origem (região brasileira da cidade de origem: Sudeste, Nordeste, Sul, Centro-Oeste ou Norte)
- regiao_destino (se destino no Brasil: região brasileira. Se internacional: continente - América do Norte, América do Sul, América Central, Europa, Ásia, África, Oceania ou Oriente Médio)
- classe ("Econômica", "Executiva" ou "Primeira Classe". Se não mencionado, use "Executiva")
- pais_destino (nome do país de destino em português)
- continente_destino (continente do destino)

Regras:
- Use nomes de cidades em português, não códigos IATA.
- preco_cash deve ser um número (ex: 6864.32), não uma string com R$ ou vírgulas.
- O link_emissao deve ser a URL de compra/emissão da mensagem (ex: https://alertadevoos.com.br/XXXX). Não use links do Flypass ou redes sociais.
- Responda SOMENTE o JSON válido, sem blocos markdown.`,
                },
            ],
            response_format: { type: 'json_object' },
        });
        const parsed = parseJsonObject(response.choices[0].message.content || '{}');
        if (!Array.isArray(parsed.datas_ida))
            parsed.datas_ida = [];
        if (!Array.isArray(parsed.datas_volta))
            parsed.datas_volta = [];
        return parsed;
    }
    catch (error) {
        const errMsg = error?.message || String(error);
        await (0, logger_1.logEvent)(null, 'ERROR', `OpenAI parseCashCaptionOffer failed: ${errMsg.substring(0, 150)}`, { error: errMsg });
        return null;
    }
}
async function generateFinalOfferPayload(textMessage, extractedImagesData) {
    try {
        let parsed = ensureOfferArrays(await requestFinalOfferPayload(textMessage, extractedImagesData, 'primary'));
        const primaryError = getFinalPayloadValidationError(parsed);
        if (!primaryError) {
            return parsed;
        }
        await (0, logger_1.logEvent)(null, 'PROCESSING_FINAL_OFFER', `Final payload fallback acionado`, { reason: primaryError });
        parsed = ensureOfferArrays(await requestFinalOfferPayload(textMessage, extractedImagesData, 'fallback'));
        const fallbackError = getFinalPayloadValidationError(parsed);
        if (fallbackError) {
            console.warn('GPT final payload invalid after fallback:', fallbackError, parsed);
            return {};
        }
        return parsed;
    }
    catch (error) {
        console.error('Error generating final payload with GPT:', error);
        return {};
    }
}
