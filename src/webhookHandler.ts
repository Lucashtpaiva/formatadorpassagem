import { supabase } from './supabaseClient';
import { processImageWithGPT, generateFinalOfferPayload } from './openaiClient';
import { findDestinationImage, buildFormattedMessage, buildWhatsAppLink } from './formatting';

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
      console.log(`[INFO] Processing image for group ${phone}`);
      extractedData = await processImageWithGPT(content);
      
      if (!extractedData) {
        console.log(`[INFO] Image discarded (not a flight offer)`);
        return res.status(200).send('Discarded');
      }
    } else if (text && text.message) {
      msgType = 'text';
      content = text.message;
      console.log(`[INFO] Received text for group ${phone}`);
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
    console.error('Webhook Error:', error);
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
    console.log(`[INFO] Found 3 matching messages for group ${phone}, processing final offer...`);

    // Pick the most recent text and its corresponding images
    const textMsg = texts[texts.length - 1]; // Assume latest text is the offer details
    // For images, we just take the last 2 (Ida and Volta)
    const recentImages = images.slice(-2);
    
    // IDs to mark as processed later
    const messageIds = [textMsg.id, recentImages[0].id, recentImages[1].id];

    // Generate final JSON using GPT
    const finalData = await generateFinalOfferPayload(
      textMsg.content,
      recentImages.map((img: any) => img.extracted_data)
    );

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
         console.log(`[INFO] Final offer sent to webhook successfully!`);
      } else {
         console.warn(`[WARN] DESTINATION_WEBHOOK_URL not defined. Mocking send:`, destinationPayload);
      }
      
      // Mark as processed
      await supabase
         .from('whatsapp_offers_temp')
         .update({ processed: true })
         .in('id', messageIds);

    } catch (e) {
      console.error('[ERROR] Failed to send final webhook:', e);
    }
  }
}
