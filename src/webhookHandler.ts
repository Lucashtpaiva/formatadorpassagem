import { Request, Response } from 'express';
import { supabase } from './supabaseClient';
import { processImageWithGPT, generateFinalOfferPayload, parseCaptionOffer, extractIataFromImage } from './openaiClient';
import { findDestinationImage, buildFormattedMessage, buildWhatsAppLink, isBrazilianOrigin, ensureHttps, resolveLinkPrograma, normalizeDatePairs } from './formatting';
import { normalizeProgramaName } from './milheiroHandler';
import { logEvent } from './logger';
import { loadMilheiroConfig } from './milheiroHandler';
import { getDestinationOverrides } from './destinationHandler';
import { verifyOffer, saveBmResult, getBmAirline, isBmEnabled } from './buscamilhasClient';

export async function handleWhatsAppWebhook(req: Request, res: Response) {
  try {
    // Determine structure (sometimes Z-API wraps messages in an array)
    const rootData = Array.isArray(req.body) ? req.body[0] : req.body;
    
    // Safety check - resilient to both `{{ $json }}` and `{{ $json.body }}`
    const payload = rootData.body ? rootData.body : rootData;

    if (!payload || !payload.phone) {
      return res.status(400).send('Invalid payload or missing phone property');
    }

    const { phone, chatName, text, image } = payload;

    // ===== "Alertas Premium" single-caption flow =====
    if (chatName && chatName.includes('Alertas Premium') && image && image.caption) {
      await logEvent(phone, 'RECEIVED_CAPTION', `Received Alertas Premium caption for ${chatName}`, { caption: image.caption });

      // Save to temp table so it appears in the dashboard queue
      const { error: insertCaptionError } = await supabase
        .from('whatsapp_offers_temp')
        .insert([{
          group_phone: phone,
          chat_name: chatName || '',
          msg_type: 'caption',
          content: image.caption,
          extracted_data: null,
          processed: false,
        }]);

      let captionRowId: string | null = null;
      if (!insertCaptionError) {
        // Get the ID for marking processed later
        const { data: captionRow } = await supabase
          .from('whatsapp_offers_temp')
          .select('id')
          .eq('group_phone', phone)
          .eq('msg_type', 'caption')
          .eq('processed', false)
          .order('created_at', { ascending: false })
          .limit(1);
        captionRowId = captionRow?.[0]?.id || null;
      }

      try {
        await processAlertaPremiumCaption(phone, chatName, image.caption, image.imageUrl);
        // Mark as processed after successful processing
        if (captionRowId) {
          await supabase.from('whatsapp_offers_temp').update({ processed: true }).eq('id', captionRowId);
        }
      } catch (e: any) {
        await logEvent(phone, 'ERROR', `Error processing Alertas Premium caption`, { error: e.message || String(e) });
      }
      return res.status(200).send('OK');
    }

    let msgType = '';
    let content = '';
    let extractedData = null;

    // Process based on type (original 3-message flow)
    if (image && image.imageUrl) {
      msgType = 'image';
      content = image.imageUrl;
      await logEvent(phone, 'RECEIVED_IMAGE', `Received image for group ${phone}`, { url: content });
      
      extractedData = await processImageWithGPT(content);
      
      if (!extractedData) {
        await logEvent(phone, 'OFFER_DISCARDED', `Image discarded (not a flight offer)`, { url: content });
        return res.status(200).send('Discarded');
      }
    } else if (text && text.message) {
      msgType = 'text';
      content = text.message;
      await logEvent(phone, 'RECEIVED_TEXT', `Received text for group ${phone}`, { text: content });
    } else {
      return res.status(200).send('Ignored');
    }

    // Save to Supabase
    const { error: insertError } = await supabase
      .from('whatsapp_offers_temp')
      .insert([
        {
          group_phone: phone,
          chat_name: chatName || '',
          msg_type: msgType,
          content: content,
          extracted_data: extractedData,
          processed: false,
        }
      ]);

    if (insertError) {
      console.error('Error saving to Supabase:', insertError);
      return res.status(500).send('Database error');
    }

    // Now, check for the completion of the 3-message "pack"
    await checkForCompleteOffer(phone, chatName);

    return res.status(200).send('OK');
  } catch (error) {
    await logEvent(null, 'ERROR', `Webhook fatal error`, { error: String(error) });
    return res.status(500).send('Internal Server Error');
  }
}

export async function checkForCompleteOffer(phone: string, chatName: string) {
  // Get unprocessed messages for this group in the last 15 minutes
  const fifteenMinsAgo = new Date();
  fifteenMinsAgo.setMinutes(fifteenMinsAgo.getMinutes() - 15);

  const { data: messages, error } = await supabase
    .from('whatsapp_offers_temp')
    .select('*')
    .eq('group_phone', phone)
    .eq('processed', false)
    .gte('created_at', fifteenMinsAgo.toISOString())
    .order('created_at', { ascending: true });

  if (error || !messages) {
    console.error('Error retrieving messages:', error);
    return;
  }

  const images = messages.filter((m: any) => m.msg_type === 'image');
  const texts = messages.filter((m: any) => m.msg_type === 'text');

  // We need at least 2 images and 1 text message
  if (images.length >= 2 && texts.length >= 1) {
    await logEvent(phone, 'PROCESSING_FINAL_OFFER', `Found 3 matching messages, parsing final JSON`, { imagesCount: images.length, textCount: texts.length });

    // Pick the most recent text and its corresponding images
    const textMsg = texts[texts.length - 1]; // Assume latest text is the offer details
    // For images, we just take the last 2 (Ida and Volta)
    const recentImages = images.slice(-2);
    
    // IDs to mark as processed later
    const messageIds = [textMsg.id, recentImages[0].id, recentImages[1].id];

    // Generate final JSON using GPT
    let finalData;
    try {
      finalData = await generateFinalOfferPayload(
        textMsg.content,
        recentImages.map((img: any) => img.extracted_data)
      );
    } catch (e: any) {
      await logEvent(phone, 'ERROR', `Error generating GPT final payload`, { error: e.message || String(e) });
      return;
    }

    // Log IATA codes if extracted from images
    if (finalData.iata_origem || finalData.iata_destino) {
      await logEvent(phone, 'IATA_EXTRACTED', `IATA extraídos das imagens: ${finalData.iata_origem || '?'} → ${finalData.iata_destino || '?'}`, { iata_origem: finalData.iata_origem, iata_destino: finalData.iata_destino });
    }

    // Normalize dates for 3-message flow: all dates are "available dates", create ida/volta pairs with 5-day gap
    const normalized = normalizeDatePairs(finalData.datas_ida || [], finalData.datas_volta || [], 5);
    finalData.datas_ida = normalized.datas_ida;
    finalData.datas_volta = normalized.datas_volta;

    const { destino } = finalData;
    const programaCanonical = normalizeProgramaName(finalData.programa_mais_vantajoso || '');
    const resolvedLink = resolveLinkPrograma(finalData.link_programa, programaCanonical);

    // Detect source and cabin from chatName
    const fonte = (chatName || '').toLowerCase().includes('alerta') ? 'Alerta de Voos' : 'Passageiro de Primeira';
    // Detect cabin class from text message content
    let cabine = 'Econômica'; // default
    const textContent = (textMsg.content || '').toLowerCase();
    if (textContent.includes('executiva') || textContent.includes('business')) {
      cabine = 'Executiva';
    } else if (textContent.includes('primeira classe') || textContent.includes('first class')) {
      cabine = 'Primeira Classe';
    }

    // Validate: only process flights departing from Brazil
    if (!isBrazilianOrigin(finalData.origem)) {
      await logEvent(phone, 'OFFER_DISCARDED', `Offer discarded: origin "${finalData.origem}" is not in Brazil`, { finalData });
      await supabase.from('whatsapp_offers_temp').update({ processed: true }).in('id', messageIds);
      return;
    }

    // Validate: never send flights with zero miles
    const milhasIda = Number(finalData.milhas_ida || 0);
    const milhasVolta = Number(finalData.milhas_volta || 0);
    const datasVolta = Array.isArray(finalData.datas_volta) ? finalData.datas_volta.filter(Boolean) : [];
    const isOneWay = !datasVolta.length || milhasVolta <= 0;

    if (milhasIda <= 0) {
      await logEvent(phone, 'OFFER_DISCARDED', `Offer discarded: milhas_ida is zero`, { finalData });
      await supabase.from('whatsapp_offers_temp').update({ processed: true }).in('id', messageIds);
      return;
    }
    if (!isOneWay && milhasVolta <= 0) {
      await logEvent(phone, 'OFFER_DISCARDED', `Offer discarded: milhas_volta is zero on round-trip`, { finalData });
      await supabase.from('whatsapp_offers_temp').update({ processed: true }).in('id', messageIds);
      return;
    }

    // Load milheiro config from database
    const milheiroPorPrograma = await loadMilheiroConfig();

    const formattedMessage = buildFormattedMessage(finalData, milheiroPorPrograma);
    const destinationImage = findDestinationImage(destino, getDestinationOverrides());
    const waLink = buildWhatsAppLink(finalData, milheiroPorPrograma);

    // Construct exactly as requested
    const destinationPayload = {
      phone: phone,
      message: "Oferta Encontrada!",
      fonte: fonte,
      grupo: chatName || '',
      cabine: cabine,
      cidade_origem: finalData.origem || '',
      cidade_destino: finalData.destino || '',
      regiao_origem: finalData.regiao_origem || '',
      regiao_destino: finalData.regiao_destino || '',
      iata_origem: finalData.iata_origem || '',
      iata_destino: finalData.iata_destino || '',
      datas_ida: finalData.datas_ida || [],
      datas_volta: finalData.datas_volta || [],
      classe: finalData.classe || cabine || 'Econômica',
      carousel: [
        {
          text: formattedMessage,
          image: destinationImage,
          buttons: [
            {
              id: "1",
              label: "Comprar com Milhas",
              url: resolvedLink,
              type: "URL"
            },
            {
              id: "2",
              label: "Emitir via WhatsApp",
              url: waLink,
              type: "URL"
            }
          ]
        }
      ]
    };

    // ===== Verificação BuscaMilhas =====
    const bmEnabled = await isBmEnabled();
    const bmAirline = getBmAirline(programaCanonical);
    if (bmAirline && bmEnabled) {
      try {
        await logEvent(phone, 'BM_VERIFICATION', `Iniciando verificação BuscaMilhas (${bmAirline})`, { programa: programaCanonical, milhasIda, milhasVolta });
        const verification = await verifyOffer({ ...finalData, programa_mais_vantajoso: programaCanonical, cabine });
        await saveBmResult(phone, finalData, verification);

        if (verification.verified) {
          (destinationPayload as any).verificado = true;
          await logEvent(phone, 'BM_VERIFICATION', `BuscaMilhas: Oferta VERIFICADA`, { matchedIda: verification.matchedMilesIda, matchedVolta: verification.matchedMilesVolta });
        } else if (verification.error && !verification.skipped) {
          // Erro na API → envia mesmo assim (fail open)
          (destinationPayload as any).verificado = null;
          await logEvent(phone, 'BM_VERIFICATION', `BuscaMilhas: Erro na verificação, enviando mesmo assim`, { error: verification.error });
        } else {
          // Não verificado → BLOQUEIA envio
          await logEvent(phone, 'OFFER_NOT_VERIFIED', `Oferta BLOQUEADA - não encontrada no BuscaMilhas`, {
            milhas_esperadas_ida: milhasIda,
            milhas_esperadas_volta: milhasVolta,
            airline: bmAirline,
            verification,
          });
          await supabase.from('whatsapp_offers_temp').update({ processed: true }).in('id', messageIds);
          return;
        }
      } catch (bmErr: any) {
        // Erro inesperado → envia mesmo assim
        (destinationPayload as any).verificado = null;
        await logEvent(phone, 'ERROR', `BuscaMilhas verification exception`, { error: bmErr.message || String(bmErr) });
      }
    } else {
      // BuscaMilhas desativado ou programa não suportado → envia sem verificar
      (destinationPayload as any).verificado = null;
    }

    // Send to final Webhook
    try {
      const webhookUrl = process.env.DESTINATION_WEBHOOK_URL;
      if (webhookUrl) {
         await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(destinationPayload)
         });
         await logEvent(phone, 'OFFER_PROCESSED', `Final offer JSON generated and sent to Destination Webhook`, { payload: destinationPayload });
      } else {
         await logEvent(phone, 'ERROR', `DESTINATION_WEBHOOK_URL is missing!`, { payload: destinationPayload });
      }

      // Mark as processed
      await supabase
         .from('whatsapp_offers_temp')
         .update({ processed: true })
         .in('id', messageIds);

    } catch (e: any) {
      await logEvent(phone, 'ERROR', `Failed to send POST to final webhook`, { error: e.message || String(e) });
    }
  }
}

// ===== Alertas Premium: single caption → full offer =====
async function processAlertaPremiumCaption(phone: string, chatName: string, caption: string, imageUrl?: string) {
  await logEvent(phone, 'PROCESSING_FINAL_OFFER', `Parsing Alertas Premium caption for ${chatName}`, { source: 'alertas_premium' });

  const finalData = await parseCaptionOffer(caption);

  if (!finalData) {
    await logEvent(phone, 'OFFER_DISCARDED', `Caption could not be parsed`, { caption });
    return;
  }

  // Extract IATA codes from the image if available
  if (imageUrl) {
    try {
      const iataData = await extractIataFromImage(imageUrl);
      if (iataData) {
        if (iataData.iata_origem) finalData.iata_origem = iataData.iata_origem;
        if (iataData.iata_destino) finalData.iata_destino = iataData.iata_destino;
        await logEvent(phone, 'IATA_EXTRACTED', `IATA extraídos da imagem Alertas Premium: ${iataData.iata_origem} → ${iataData.iata_destino}`, { iata_origem: iataData.iata_origem, iata_destino: iataData.iata_destino, imageUrl });
      }
    } catch (iataErr: any) {
      console.error('Failed to extract IATA from Alertas Premium image:', iataErr);
    }
  }

  // Validate: only process flights departing from Brazil
  if (!isBrazilianOrigin(finalData.origem)) {
    await logEvent(phone, 'OFFER_DISCARDED', `Alertas Premium offer discarded: origin "${finalData.origem}" is not in Brazil`, { finalData });
    return;
  }

  // Validate: never send flights with zero miles
  const milhasIda = Number(finalData.milhas_ida || 0);
  const milhasVolta = Number(finalData.milhas_volta || 0);
  const datasVolta = Array.isArray(finalData.datas_volta) ? finalData.datas_volta.filter(Boolean) : [];
  const isOneWay = !datasVolta.length || milhasVolta <= 0;

  if (milhasIda <= 0) {
    await logEvent(phone, 'OFFER_DISCARDED', `Alertas Premium offer discarded: milhas_ida is zero`, { finalData });
    return;
  }
  if (!isOneWay && milhasVolta <= 0) {
    await logEvent(phone, 'OFFER_DISCARDED', `Alertas Premium offer discarded: milhas_volta is zero on round-trip`, { finalData });
    return;
  }

  const { destino } = finalData;
  const programaCanonical = normalizeProgramaName(finalData.programa_mais_vantajoso || '');
  const resolvedLink = resolveLinkPrograma(finalData.link_programa, programaCanonical);

  const milheiroPorPrograma = await loadMilheiroConfig();
  const formattedMessage = buildFormattedMessage(finalData, milheiroPorPrograma);
  const destinationImage = findDestinationImage(destino, getDestinationOverrides());
  const waLink = buildWhatsAppLink(finalData, milheiroPorPrograma);

  // Alertas Premium
  const classeAlerta = finalData.classe || 'Econômica';
  const destinationPayload = {
    phone: phone,
    message: "Oferta Encontrada!",
    fonte: 'Alerta de Voos',
    grupo: chatName || '',
    cabine: classeAlerta,
    cidade_origem: finalData.origem || '',
    cidade_destino: finalData.destino || '',
    regiao_origem: finalData.regiao_origem || '',
    regiao_destino: finalData.regiao_destino || '',
    iata_origem: finalData.iata_origem || '',
    iata_destino: finalData.iata_destino || '',
    datas_ida: finalData.datas_ida || [],
    datas_volta: finalData.datas_volta || [],
    classe: classeAlerta,
    carousel: [
      {
        text: formattedMessage,
        image: destinationImage,
        buttons: [
          {
            id: "1",
            label: "Comprar com Milhas",
            url: resolvedLink,
            type: "URL"
          },
          {
            id: "2",
            label: "Emitir via WhatsApp",
            url: waLink,
            type: "URL"
          }
        ]
      }
    ]
  };

  // ===== Verificação BuscaMilhas =====
  const bmEnabled = await isBmEnabled();
  const bmAirline = getBmAirline(programaCanonical);
  if (bmAirline && bmEnabled) {
    try {
      await logEvent(phone, 'BM_VERIFICATION', `Iniciando verificação BuscaMilhas Alertas Premium (${bmAirline})`, { programa: programaCanonical, milhasIda, milhasVolta });
      const verification = await verifyOffer({ ...finalData, programa_mais_vantajoso: programaCanonical, cabine: classeAlerta });
      await saveBmResult(phone, finalData, verification);

      if (verification.verified) {
        (destinationPayload as any).verificado = true;
        await logEvent(phone, 'BM_VERIFICATION', `BuscaMilhas: Alertas Premium VERIFICADA`, { matchedIda: verification.matchedMilesIda, matchedVolta: verification.matchedMilesVolta });
      } else if (verification.error && !verification.skipped) {
        (destinationPayload as any).verificado = null;
        await logEvent(phone, 'BM_VERIFICATION', `BuscaMilhas: Erro, enviando mesmo assim`, { error: verification.error });
      } else {
        await logEvent(phone, 'OFFER_NOT_VERIFIED', `Alertas Premium BLOQUEADA - não encontrada no BuscaMilhas`, {
          milhas_esperadas_ida: milhasIda,
          milhas_esperadas_volta: milhasVolta,
          airline: bmAirline,
          verification,
        });
        return;
      }
    } catch (bmErr: any) {
      (destinationPayload as any).verificado = null;
      await logEvent(phone, 'ERROR', `BuscaMilhas verification exception (Alertas Premium)`, { error: bmErr.message || String(bmErr) });
    }
  } else {
    // BuscaMilhas desativado ou programa não suportado → envia sem verificar
    (destinationPayload as any).verificado = null;
  }

  try {
    const webhookUrl = process.env.DESTINATION_WEBHOOK_URL;
    if (webhookUrl) {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(destinationPayload)
      });
      await logEvent(phone, 'OFFER_PROCESSED', `Alertas Premium offer sent to Destination Webhook`, { payload: destinationPayload });
    } else {
      await logEvent(phone, 'ERROR', `DESTINATION_WEBHOOK_URL is missing!`, { payload: destinationPayload });
    }
  } catch (e: any) {
    await logEvent(phone, 'ERROR', `Failed to send Alertas Premium offer to webhook`, { error: e.message || String(e) });
  }
}
