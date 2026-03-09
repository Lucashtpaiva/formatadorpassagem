import { supabase } from './supabaseClient';
import { processImageWithGPT, generateFinalOfferPayload } from './openaiClient';
import { findDestinationImage, buildFormattedMessage, buildWhatsAppLink } from './formatting';
import { logEvent } from './logger';

export async function handleWhatsAppWebhook(req: Request, res: Response) {
  try {
    // Determine structure (sometimes Z-API wraps messages in an array)
    const bodyArgs = Array.isArray(req.body) ? req.body[0] : req.body;
    
    // Safety check
    if (!bodyArgs || !bodyArgs.body) {
      return res.status(400).send('Invalid payload');
    }

    const { phone, chatName, text, image } = bodyArgs.body;

    if (!phone) {
      return res.status(400).send('Missing phone (group identifier)');
    }

    let msgType = '';
    let content = '';
    let extractedData = null;

    // Process based on type
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

async function checkForCompleteOffer(phone: string, chatName: string) {
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

    // Custom formatting exactly derived from n8n Script 2
    const formattedMessage = buildFormattedMessage(finalData);

    // Custom Image matcher derived from n8n Script 1
    const destinationImage = findDestinationImage(destino);

    // Generate strict WhatsApp pre-filled text link
    const waLink = buildWhatsAppLink(finalData);

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
