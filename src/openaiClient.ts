import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function processImageWithGPT(imageUrl: string): Promise<any> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
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
  "região": "região da cidade brasileira",
  "bandeira": "bandeira no formato emoji do país de destino",
  "internacional": "TRUE or FALSE",
  "continente": "Continente de destino (América do Norte, Europa, Asia etc)",
  "datas": ["dd/mm/aa", "dd/mm/aa"]
}

Regras:
- Use apenas nomes de cidades, sem códigos de aeroporto (não use GRU, CUN, LIS etc).
- Converta todas as datas para o formato "dd/mm/aa".
- Não considere a cidade de escala no meio, caso tenha.
- Se houver múltiplos meses, junte todas as datas em uma única lista.
- Não inclua texto fora do JSON.
- Não inclua campos extras.

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
    const jsonMatch = output.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(output);
  } catch (error) {
    console.error('Error processing image with GPT:', error);
    return null;
  }
}

export async function generateFinalOfferPayload(textMessage: string, extractedImagesData: any[]): Promise<any> {
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
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
- programa_mais_vantajoso (ex: Iberia Club, Smiles, etc)
- milhas_ida (número, extraído do texto)
- milhas_volta (número, extraído do texto)
- valor_ida_e_volta (número, se tiver no texto)
- valor_taxas (número total de taxas, em reais ou convertido do dólar aproximado, do texto)
- datas_ida (array das datas referentes ao trecho de ida)
- datas_volta (array das datas referentes ao trecho de volta)
- link_programa (se houver no texto, ex: iberia.com)
- link_whatsapp (se houver)

Atenção: responda SOMENTE o JSON válido, sem blocos markdown (\`\`\`).`
                }
            ],
            response_format: { type: "json_object" }
        });

        const output = response.choices[0].message.content || '{}';
        return JSON.parse(output);
    } catch (error) {
        console.error('Error generating final payload with GPT:', error);
        return {};
    }
}
