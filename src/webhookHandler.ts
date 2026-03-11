import { Request, Response } from 'express';
import { supabase } from './supabaseClient';
import { processImageWithGPT, generateFinalOfferPayload, parseCaptionOffer } from './openaiClient';
import { findDestinationImage, buildFormattedMessage, buildWhatsAppLink, isBrazilianOrigin } from './formatting';
import { logEvent } from './logger';
import { loadMilheiroConfig } from './milheiroHandler';
import { getDestinationOverrides } from './destinationHandler';

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

      try {
        await processAlertaPremiumCaption(phone, chatName, image.caption);
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

    const { link_programa, destino } = finalData;

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
      carousel: [
        {
          text: formattedMessage, // the formatted message text (already has properly escaped \\n)
          image: destinationImage,
          buttons: [
            {
              id: "1",
              label: "Comprar com Milhas",
              url: link_programa || "https://www.smiles.com.br",
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
async function processAlertaPremiumCaption(phone: string, chatName: string, caption: string) {
  await logEvent(phone, 'PROCESSING_FINAL_OFFER', `Parsing Alertas Premium caption for ${chatName}`, { source: 'alertas_premium' });

  const finalData = await parseCaptionOffer(caption);

  if (!finalData) {
    await logEvent(phone, 'OFFER_DISCARDED', `Caption could not be parsed`, { caption });
    return;
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

  const { destino, link_programa } = finalData;

  const milheiroPorPrograma = await loadMilheiroConfig();
  const formattedMessage = buildFormattedMessage(finalData, milheiroPorPrograma);
  const destinationImage = findDestinationImage(destino, getDestinationOverrides());
  const waLink = buildWhatsAppLink(finalData, milheiroPorPrograma);

  const destinationPayload = {
    phone: phone,
    message: "Oferta Encontrada!",
    carousel: [
      {
        text: formattedMessage,
        image: destinationImage,
        buttons: [
          {
            id: "1",
            label: "Comprar com Milhas",
            url: link_programa || "https://www.smiles.com.br",
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
