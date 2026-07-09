"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleWhatsAppWebhook = handleWhatsAppWebhook;
exports.checkForCompleteOffer = checkForCompleteOffer;
const supabaseClient_1 = require("./supabaseClient");
const openaiClient_1 = require("./openaiClient");
const formatting_1 = require("./formatting");
const airlineBookingUrl_1 = require("./airlineBookingUrl");
const milheiroHandler_1 = require("./milheiroHandler");
const logger_1 = require("./logger");
const milheiroHandler_2 = require("./milheiroHandler");
const destinationHandler_1 = require("./destinationHandler");
const buscamilhasClient_1 = require("./buscamilhasClient");
const WA_SUPORTE = 'https://wa.me/5522981459289';
async function expandRedirectUrl(url) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(url, { method: 'GET', redirect: 'follow', signal: controller.signal });
        clearTimeout(timeout);
        const finalUrl = response.url;
        if (!finalUrl ||
            finalUrl.includes('alertadevoos.com.br') ||
            finalUrl.includes('flypass.ai') ||
            finalUrl.includes('wa.me') ||
            finalUrl.includes('whatsapp.com')) {
            return null;
        }
        return finalUrl;
    }
    catch {
        return null;
    }
}
async function postDestinationWebhook(url, payload) {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        throw new Error(`Webhook responded with status ${response.status}`);
    }
}
async function sendDestinationPayload(phone, payload, successMessage, missingPrimaryMessage, primaryErrorMessage) {
    const primaryWebhookUrl = process.env.DESTINATION_WEBHOOK_URL;
    const secondaryWebhookUrl = process.env.SECONDARY_DESTINATION_WEBHOOK_URL;
    if (!primaryWebhookUrl) {
        await (0, logger_1.logEvent)(phone, 'ERROR', missingPrimaryMessage, { payload });
        return false;
    }
    const secondaryRequest = secondaryWebhookUrl
        ? postDestinationWebhook(secondaryWebhookUrl, payload).catch(() => undefined)
        : Promise.resolve();
    try {
        await postDestinationWebhook(primaryWebhookUrl, payload);
        await secondaryRequest;
        await (0, logger_1.logEvent)(phone, 'OFFER_PROCESSED', successMessage, { payload });
        return true;
    }
    catch (e) {
        await (0, logger_1.logEvent)(phone, 'ERROR', primaryErrorMessage, { error: e.message || String(e) });
        return false;
    }
}
async function applyValidatedImageIata(phone, source, finalData, candidates) {
    const checked = candidates
        .filter((candidate) => candidate?.iata_origem || candidate?.iata_destino)
        .map((candidate) => {
        const origem = (candidate.iata_origem || '').toUpperCase();
        const destino = (candidate.iata_destino || '').toUpperCase();
        return {
            imageUrl: candidate.imageUrl || null,
            iata_origem: origem,
            iata_destino: destino,
            origem_confere: origem ? (0, formatting_1.iataMatchesCity)(origem, finalData.origem) : false,
            destino_confere: destino ? (0, formatting_1.iataMatchesCity)(destino, finalData.destino) : false,
        };
    });
    if (!checked.length)
        return;
    const acceptedOrigem = checked.find((item) => item.origem_confere)?.iata_origem || '';
    const acceptedDestino = checked.find((item) => item.destino_confere)?.iata_destino || '';
    if (acceptedOrigem)
        finalData.iata_origem = acceptedOrigem;
    if (acceptedDestino)
        finalData.iata_destino = acceptedDestino;
    const appliedAny = Boolean(acceptedOrigem || acceptedDestino);
    await (0, logger_1.logEvent)(phone, 'IATA_EXTRACTED', appliedAny
        ? `${source}: IATA da imagem validado e aplicado`
        : `${source}: IATA da imagem ignorado por divergência com origem/destino`, {
        origem: finalData.origem,
        destino: finalData.destino,
        iata_origem_aplicado: acceptedOrigem,
        iata_destino_aplicado: acceptedDestino,
        candidates: checked,
    });
}
async function handleWhatsAppWebhook(req, res) {
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
        const isAlertaPremiumGroup = chatName && (chatName.includes('Alertas Premium') ||
            chatName.includes('Executivas Premium') ||
            chatName.includes('TESTE PREMIUM'));
        if (isAlertaPremiumGroup && image && image.caption) {
            await (0, logger_1.logEvent)(phone, 'RECEIVED_CAPTION', `Received Alertas Premium caption for ${chatName}`, { caption: image.caption });
            // Save to temp table so it appears in the dashboard queue
            const { error: insertCaptionError } = await supabaseClient_1.supabase
                .from('whatsapp_offers_temp')
                .insert([{
                    group_phone: phone,
                    chat_name: chatName || '',
                    msg_type: 'caption',
                    content: image.caption,
                    extracted_data: null,
                    processed: false,
                }]);
            let captionRowId = null;
            if (!insertCaptionError) {
                // Get the ID for marking processed later
                const { data: captionRow } = await supabaseClient_1.supabase
                    .from('whatsapp_offers_temp')
                    .select('id')
                    .eq('group_phone', phone)
                    .eq('msg_type', 'caption')
                    .eq('processed', false)
                    .order('created_at', { ascending: false })
                    .limit(1);
                captionRowId = captionRow?.[0]?.id || null;
            }
            const isExecutivasCash = chatName.includes('Executivas Premium') && !image.caption.toLowerCase().includes('milhas');
            try {
                if (isExecutivasCash) {
                    await processExecutivasCashCaption(phone, chatName, image.caption, image.imageUrl);
                }
                else {
                    await processAlertaPremiumCaption(phone, chatName, image.caption, image.imageUrl);
                }
                // Mark as processed after successful processing
                if (captionRowId) {
                    await supabaseClient_1.supabase.from('whatsapp_offers_temp').update({ processed: true }).eq('id', captionRowId);
                }
            }
            catch (e) {
                await (0, logger_1.logEvent)(phone, 'ERROR', `Error processing Alertas Premium caption`, { error: e.message || String(e) });
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
            await (0, logger_1.logEvent)(phone, 'RECEIVED_IMAGE', `Received image for group ${phone}`, { url: content });
            extractedData = await (0, openaiClient_1.processImageWithGPT)(content);
            if (!extractedData) {
                await (0, logger_1.logEvent)(phone, 'OFFER_DISCARDED', `Image discarded (not a flight offer)`, { url: content });
                return res.status(200).send('Discarded');
            }
        }
        else if (text && text.message) {
            msgType = 'text';
            content = text.message;
            await (0, logger_1.logEvent)(phone, 'RECEIVED_TEXT', `Received text for group ${phone}`, { text: content });
        }
        else {
            return res.status(200).send('Ignored');
        }
        // Save to Supabase
        const { error: insertError } = await supabaseClient_1.supabase
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
    }
    catch (error) {
        await (0, logger_1.logEvent)(null, 'ERROR', `Webhook fatal error`, { error: String(error) });
        return res.status(500).send('Internal Server Error');
    }
}
async function checkForCompleteOffer(phone, chatName) {
    // Get unprocessed messages for this group in the last 15 minutes
    const fifteenMinsAgo = new Date();
    fifteenMinsAgo.setMinutes(fifteenMinsAgo.getMinutes() - 15);
    const { data: messages, error } = await supabaseClient_1.supabase
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
    const images = messages.filter((m) => m.msg_type === 'image');
    const texts = messages.filter((m) => m.msg_type === 'text');
    // We need at least 2 images and 1 text message
    if (images.length >= 2 && texts.length >= 1) {
        await (0, logger_1.logEvent)(phone, 'PROCESSING_FINAL_OFFER', `Found 3 matching messages, parsing final JSON`, { imagesCount: images.length, textCount: texts.length });
        // Pick the most recent text and its corresponding images
        const textMsg = texts[texts.length - 1]; // Assume latest text is the offer details
        // For images, we just take the last 2 (Ida and Volta)
        const recentImages = images.slice(-2);
        // IDs to mark as processed later
        const messageIds = [textMsg.id, recentImages[0].id, recentImages[1].id];
        // Generate final JSON using GPT
        let finalData;
        try {
            finalData = await (0, openaiClient_1.generateFinalOfferPayload)(textMsg.content, recentImages.map((img) => img.extracted_data));
        }
        catch (e) {
            await (0, logger_1.logEvent)(phone, 'ERROR', `Error generating GPT final payload`, { error: e.message || String(e) });
            return;
        }
        await applyValidatedImageIata(phone, 'Passageiro de Primeira', finalData, recentImages.map((img) => ({
            iata_origem: img.extracted_data?.iata_origem,
            iata_destino: img.extracted_data?.iata_destino,
            imageUrl: img.content,
        })));
        // Normalize dates for 3-message flow: all dates are "available dates", create ida/volta pairs with 5-day gap
        const normalized = (0, formatting_1.normalizeDatePairs)(finalData.datas_ida || [], finalData.datas_volta || [], 5);
        finalData.datas_ida = normalized.datas_ida;
        finalData.datas_volta = normalized.datas_volta;
        const { destino } = finalData;
        const programaCanonical = (0, milheiroHandler_1.normalizeProgramaName)(finalData.programa_mais_vantajoso || '');
        const iataOrigem = finalData.iata_origem || (0, formatting_1.cityToIata)(finalData.origem) || '';
        const iataDestino = finalData.iata_destino || (0, formatting_1.cityToIata)(finalData.destino) || '';
        const programLink = (0, airlineBookingUrl_1.buildProgramBookingUrl)(programaCanonical, iataOrigem, iataDestino, finalData.datas_ida || [], finalData.datas_volta || [], finalData.classe || 'Econômica');
        const resolvedLink = programLink || (0, formatting_1.resolveLinkPrograma)(finalData.link_programa, programaCanonical);
        // Detect source and cabin from chatName
        const fonte = (chatName || '').toLowerCase().includes('alerta') ? 'Alerta de Voos' : 'Passageiro de Primeira';
        // Detect cabin class from text message content
        let cabine = 'Econômica'; // default
        const textContent = (textMsg.content || '').toLowerCase();
        if (textContent.includes('executiva') || textContent.includes('business')) {
            cabine = 'Executiva';
        }
        else if (textContent.includes('primeira classe') || textContent.includes('first class')) {
            cabine = 'Primeira Classe';
        }
        // Validate: only process flights departing from Brazil
        if (!(0, formatting_1.isBrazilianOrigin)(finalData.origem)) {
            await (0, logger_1.logEvent)(phone, 'OFFER_DISCARDED', `Offer discarded: origin "${finalData.origem}" is not in Brazil`, { finalData });
            await supabaseClient_1.supabase.from('whatsapp_offers_temp').update({ processed: true }).in('id', messageIds);
            return;
        }
        // Validate: never send flights with zero miles
        const milhasIda = Number(finalData.milhas_ida || 0);
        const milhasVolta = Number(finalData.milhas_volta || 0);
        const datasVolta = Array.isArray(finalData.datas_volta) ? finalData.datas_volta.filter(Boolean) : [];
        const isOneWay = !datasVolta.length || milhasVolta <= 0;
        if (milhasIda <= 0) {
            await (0, logger_1.logEvent)(phone, 'OFFER_DISCARDED', `Offer discarded: milhas_ida is zero`, { finalData });
            await supabaseClient_1.supabase.from('whatsapp_offers_temp').update({ processed: true }).in('id', messageIds);
            return;
        }
        if (!isOneWay && milhasVolta <= 0) {
            await (0, logger_1.logEvent)(phone, 'OFFER_DISCARDED', `Offer discarded: milhas_volta is zero on round-trip`, { finalData });
            await supabaseClient_1.supabase.from('whatsapp_offers_temp').update({ processed: true }).in('id', messageIds);
            return;
        }
        // Load milheiro config from database
        const milheiroPorPrograma = await (0, milheiroHandler_2.loadMilheiroConfig)();
        const formattedMessage = (0, formatting_1.buildFormattedMessage)(finalData, milheiroPorPrograma);
        const destinationImage = (0, formatting_1.findDestinationImage)(destino, await (0, destinationHandler_1.getFreshDestinationOverrides)());
        const waLink = (0, formatting_1.buildWhatsAppLink)(finalData, milheiroPorPrograma);
        // Calcular valores convertidos via milheiro
        const milheiroValor = milheiroPorPrograma[programaCanonical] || 0;
        const milhasTotal = milhasIda + milhasVolta;
        const precoIda = milheiroValor > 0 ? Math.round((milhasIda / 1000) * milheiroValor * 100) / 100 : 0;
        const precoVolta = milheiroValor > 0 ? Math.round((milhasVolta / 1000) * milheiroValor * 100) / 100 : 0;
        const dinheiroTotal = Math.round((precoIda + precoVolta) * 100) / 100;
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
            pais_destino: finalData.pais_destino || '',
            continente_destino: finalData.continente_destino || '',
            milhas_total: milhasTotal,
            preco_ida: precoIda,
            preco_volta: precoVolta,
            dinheiro_total: dinheiroTotal,
            carousel: [
                {
                    text: formattedMessage,
                    image: destinationImage,
                    buttons: [
                        {
                            id: "1",
                            label: "Comprar em Dinheiro",
                            url: WA_SUPORTE,
                            type: "URL"
                        },
                        {
                            id: "2",
                            label: "Comprar com Milhas",
                            url: resolvedLink,
                            type: "URL"
                        }
                    ]
                }
            ]
        };
        // ===== Verificação BuscaMilhas =====
        const bmEnabled = await (0, buscamilhasClient_1.isBmEnabled)();
        const bmAirline = (0, buscamilhasClient_1.getBmAirline)(programaCanonical);
        if (bmAirline && bmEnabled) {
            try {
                await (0, logger_1.logEvent)(phone, 'BM_VERIFICATION', `Iniciando verificação BuscaMilhas (${bmAirline})`, { programa: programaCanonical, milhasIda, milhasVolta });
                const verification = await (0, buscamilhasClient_1.verifyOffer)({ ...finalData, programa_mais_vantajoso: programaCanonical, cabine });
                await (0, buscamilhasClient_1.saveBmResult)(phone, finalData, verification);
                if (verification.verified) {
                    destinationPayload.verificado = true;
                    await (0, logger_1.logEvent)(phone, 'BM_VERIFICATION', `BuscaMilhas: Oferta VERIFICADA`, { matchedIda: verification.matchedMilesIda, matchedVolta: verification.matchedMilesVolta });
                }
                else if (verification.error && !verification.skipped) {
                    // Erro na API → envia mesmo assim (fail open)
                    destinationPayload.verificado = null;
                    await (0, logger_1.logEvent)(phone, 'BM_VERIFICATION', `BuscaMilhas: Erro na verificação, enviando mesmo assim`, { error: verification.error });
                }
                else {
                    // Não verificado → BLOQUEIA envio
                    await (0, logger_1.logEvent)(phone, 'OFFER_NOT_VERIFIED', `Oferta BLOQUEADA - não encontrada no BuscaMilhas`, {
                        milhas_esperadas_ida: milhasIda,
                        milhas_esperadas_volta: milhasVolta,
                        airline: bmAirline,
                        verification,
                    });
                    await supabaseClient_1.supabase.from('whatsapp_offers_temp').update({ processed: true }).in('id', messageIds);
                    return;
                }
            }
            catch (bmErr) {
                // Erro inesperado → envia mesmo assim
                destinationPayload.verificado = null;
                await (0, logger_1.logEvent)(phone, 'ERROR', `BuscaMilhas verification exception`, { error: bmErr.message || String(bmErr) });
            }
        }
        else {
            // BuscaMilhas desativado ou programa não suportado → envia sem verificar
            destinationPayload.verificado = null;
        }
        const sent = await sendDestinationPayload(phone, destinationPayload, 'Final offer JSON generated and sent to Destination Webhook', 'DESTINATION_WEBHOOK_URL is missing!', 'Failed to send POST to final webhook');
        if (sent) {
            await supabaseClient_1.supabase
                .from('whatsapp_offers_temp')
                .update({ processed: true })
                .in('id', messageIds);
        }
    }
}
// ===== Executivas Premium: cash caption → full offer =====
async function processExecutivasCashCaption(phone, chatName, caption, imageUrl) {
    await (0, logger_1.logEvent)(phone, 'PROCESSING_FINAL_OFFER', `Parsing Executivas Premium cash caption for ${chatName}`, { source: 'executivas_cash' });
    const finalData = await (0, openaiClient_1.parseCashCaptionOffer)(caption);
    if (!finalData) {
        await (0, logger_1.logEvent)(phone, 'OFFER_DISCARDED', `Executivas cash caption could not be parsed`, { caption });
        return;
    }
    const precoCash = Number(finalData.preco_cash || 0);
    if (precoCash <= 0) {
        await (0, logger_1.logEvent)(phone, 'OFFER_DISCARDED', `Executivas cash offer discarded: preco_cash is zero`, { finalData });
        return;
    }
    if (!(0, formatting_1.isBrazilianOrigin)(finalData.origem)) {
        await (0, logger_1.logEvent)(phone, 'OFFER_DISCARDED', `Executivas cash offer discarded: origin "${finalData.origem}" is not in Brazil`, { finalData });
        return;
    }
    const { destino } = finalData;
    const classeAlerta = finalData.classe || 'Executiva';
    const destinationImage = (0, formatting_1.findDestinationImage)(destino, await (0, destinationHandler_1.getFreshDestinationOverrides)());
    const waLink = (0, formatting_1.buildWhatsAppLinkCash)(finalData);
    const iataOrigem = (0, formatting_1.cityToIata)(finalData.origem) || '';
    const iataDestino = (0, formatting_1.cityToIata)(finalData.destino) || '';
    const airlineLink = (0, airlineBookingUrl_1.buildAirlineBookingUrl)(finalData.cia_aerea, iataOrigem, iataDestino, finalData.datas_ida, finalData.datas_volta, classeAlerta);
    const linkEmissao = (finalData.link_emissao || '').trim();
    const expandedLink = !airlineLink && linkEmissao ? await expandRedirectUrl(linkEmissao) : null;
    const directLink = airlineLink || expandedLink;
    const formattedMessage = (0, formatting_1.buildFormattedMessageCash)(finalData, true, !!airlineLink);
    if (imageUrl) {
        try {
            const iataData = await (0, openaiClient_1.extractIataFromImage)(imageUrl);
            if (iataData) {
                await applyValidatedImageIata(phone, 'Executivas Premium Cash', finalData, [{
                        iata_origem: iataData.iata_origem,
                        iata_destino: iataData.iata_destino,
                        imageUrl,
                    }]);
            }
        }
        catch (iataErr) {
            console.error('Failed to extract IATA from Executivas cash image:', iataErr);
        }
    }
    const destinationPayload = {
        phone: phone,
        message: 'Oferta Encontrada!',
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
        pais_destino: finalData.pais_destino || '',
        continente_destino: finalData.continente_destino || '',
        milhas_total: 0,
        preco_ida: 0,
        preco_volta: 0,
        preco_cash: precoCash,
        dinheiro_total: precoCash,
        verificado: null,
        carousel: [
            {
                text: formattedMessage,
                image: destinationImage,
                buttons: directLink ? [
                    {
                        id: '1',
                        label: 'Comprar Passagem',
                        url: directLink,
                        type: 'URL',
                    },
                ] : [],
            },
        ],
    };
    await sendDestinationPayload(phone, destinationPayload, 'Executivas Premium cash offer sent to Destination Webhook', 'DESTINATION_WEBHOOK_URL is missing!', 'Failed to send Executivas Premium cash offer to webhook');
}
// ===== Alertas Premium: single caption → full offer =====
async function processAlertaPremiumCaption(phone, chatName, caption, imageUrl) {
    await (0, logger_1.logEvent)(phone, 'PROCESSING_FINAL_OFFER', `Parsing Alertas Premium caption for ${chatName}`, { source: 'alertas_premium' });
    const finalData = await (0, openaiClient_1.parseCaptionOffer)(caption);
    if (!finalData) {
        await (0, logger_1.logEvent)(phone, 'OFFER_DISCARDED', `Caption could not be parsed`, { caption });
        return;
    }
    // Extract IATA codes from the image if available
    if (imageUrl) {
        try {
            const iataData = await (0, openaiClient_1.extractIataFromImage)(imageUrl);
            if (iataData) {
                await applyValidatedImageIata(phone, 'Alertas Premium', finalData, [{
                        iata_origem: iataData.iata_origem,
                        iata_destino: iataData.iata_destino,
                        imageUrl,
                    }]);
            }
        }
        catch (iataErr) {
            console.error('Failed to extract IATA from Alertas Premium image:', iataErr);
        }
    }
    // Validate: only process flights departing from Brazil
    if (!(0, formatting_1.isBrazilianOrigin)(finalData.origem)) {
        await (0, logger_1.logEvent)(phone, 'OFFER_DISCARDED', `Alertas Premium offer discarded: origin "${finalData.origem}" is not in Brazil`, { finalData });
        return;
    }
    // Validate: never send flights with zero miles
    const milhasIda = Number(finalData.milhas_ida || 0);
    const milhasVolta = Number(finalData.milhas_volta || 0);
    const datasVolta = Array.isArray(finalData.datas_volta) ? finalData.datas_volta.filter(Boolean) : [];
    const isOneWay = !datasVolta.length || milhasVolta <= 0;
    if (milhasIda <= 0) {
        await (0, logger_1.logEvent)(phone, 'OFFER_DISCARDED', `Alertas Premium offer discarded: milhas_ida is zero`, { finalData });
        return;
    }
    if (!isOneWay && milhasVolta <= 0) {
        await (0, logger_1.logEvent)(phone, 'OFFER_DISCARDED', `Alertas Premium offer discarded: milhas_volta is zero on round-trip`, { finalData });
        return;
    }
    const { destino } = finalData;
    const programaCanonical = (0, milheiroHandler_1.normalizeProgramaName)(finalData.programa_mais_vantajoso || '');
    const iataOrigem = finalData.iata_origem || (0, formatting_1.cityToIata)(finalData.origem) || '';
    const iataDestino = finalData.iata_destino || (0, formatting_1.cityToIata)(finalData.destino) || '';
    const milheiroPorPrograma = await (0, milheiroHandler_2.loadMilheiroConfig)();
    // Alertas Premium — grupo Executivas Premium sempre força classe Executiva
    const classeAlerta = chatName.includes('Executivas Premium')
        ? 'Executiva'
        : (finalData.classe || 'Econômica');
    const programLink = (0, airlineBookingUrl_1.buildProgramBookingUrl)(programaCanonical, iataOrigem, iataDestino, finalData.datas_ida || [], finalData.datas_volta || [], classeAlerta);
    const resolvedLink = programLink || (0, formatting_1.resolveLinkPrograma)(finalData.link_programa, programaCanonical);
    const isExecutivaMiles = chatName.includes('Executivas Premium');
    const formattedMessage = (0, formatting_1.buildFormattedMessage)(finalData, milheiroPorPrograma, isExecutivaMiles);
    const destinationImage = (0, formatting_1.findDestinationImage)(destino, await (0, destinationHandler_1.getFreshDestinationOverrides)());
    const waLink = (0, formatting_1.buildWhatsAppLink)(finalData, milheiroPorPrograma);
    // Para Executivas: tenta montar link direto da companhia para o botão cash
    const airlineCashLink = isExecutivaMiles
        ? (0, airlineBookingUrl_1.buildAirlineBookingUrl)(finalData.cia_aerea || '', iataOrigem, iataDestino, finalData.datas_ida || [], finalData.datas_volta || [], classeAlerta)
        : null;
    // Calcular valores convertidos via milheiro
    const milheiroValor = milheiroPorPrograma[programaCanonical] || 0;
    const milhasTotal = milhasIda + milhasVolta;
    const precoIda = milheiroValor > 0 ? Math.round((milhasIda / 1000) * milheiroValor * 100) / 100 : 0;
    const precoVolta = milheiroValor > 0 ? Math.round((milhasVolta / 1000) * milheiroValor * 100) / 100 : 0;
    const dinheiroTotal = Math.round((precoIda + precoVolta) * 100) / 100;
    // Monta botões: Executivas nunca usa WA Suporte — só link direto da CIA ou milhas
    const executivasButtons = [
        ...(airlineCashLink ? [{ id: "1", label: "Comprar em Dinheiro", url: airlineCashLink, type: "URL" }] : []),
        ...(resolvedLink ? [{ id: airlineCashLink ? "2" : "1", label: "Comprar com Milhas", url: resolvedLink, type: "URL" }] : []),
    ];
    const normalButtons = [
        { id: "1", label: "Comprar em Dinheiro", url: WA_SUPORTE, type: "URL" },
        ...(resolvedLink ? [{ id: "2", label: "Comprar com Milhas", url: resolvedLink, type: "URL" }] : []),
    ];
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
        pais_destino: finalData.pais_destino || '',
        continente_destino: finalData.continente_destino || '',
        milhas_total: milhasTotal,
        preco_ida: precoIda,
        preco_volta: precoVolta,
        dinheiro_total: dinheiroTotal,
        carousel: [
            {
                text: formattedMessage,
                image: destinationImage,
                buttons: isExecutivaMiles ? executivasButtons : normalButtons,
            }
        ]
    };
    // ===== Verificação BuscaMilhas =====
    const bmEnabled = await (0, buscamilhasClient_1.isBmEnabled)();
    const bmAirline = (0, buscamilhasClient_1.getBmAirline)(programaCanonical);
    if (bmAirline && bmEnabled) {
        try {
            await (0, logger_1.logEvent)(phone, 'BM_VERIFICATION', `Iniciando verificação BuscaMilhas Alertas Premium (${bmAirline})`, { programa: programaCanonical, milhasIda, milhasVolta });
            const verification = await (0, buscamilhasClient_1.verifyOffer)({ ...finalData, programa_mais_vantajoso: programaCanonical, cabine: classeAlerta });
            await (0, buscamilhasClient_1.saveBmResult)(phone, finalData, verification);
            if (verification.verified) {
                destinationPayload.verificado = true;
                await (0, logger_1.logEvent)(phone, 'BM_VERIFICATION', `BuscaMilhas: Alertas Premium VERIFICADA`, { matchedIda: verification.matchedMilesIda, matchedVolta: verification.matchedMilesVolta });
            }
            else if (verification.error && !verification.skipped) {
                destinationPayload.verificado = null;
                await (0, logger_1.logEvent)(phone, 'BM_VERIFICATION', `BuscaMilhas: Erro, enviando mesmo assim`, { error: verification.error });
            }
            else {
                await (0, logger_1.logEvent)(phone, 'OFFER_NOT_VERIFIED', `Alertas Premium BLOQUEADA - não encontrada no BuscaMilhas`, {
                    milhas_esperadas_ida: milhasIda,
                    milhas_esperadas_volta: milhasVolta,
                    airline: bmAirline,
                    verification,
                });
                return;
            }
        }
        catch (bmErr) {
            destinationPayload.verificado = null;
            await (0, logger_1.logEvent)(phone, 'ERROR', `BuscaMilhas verification exception (Alertas Premium)`, { error: bmErr.message || String(bmErr) });
        }
    }
    else {
        // BuscaMilhas desativado ou programa não suportado → envia sem verificar
        destinationPayload.verificado = null;
    }
    await sendDestinationPayload(phone, destinationPayload, 'Alertas Premium offer sent to Destination Webhook', 'DESTINATION_WEBHOOK_URL is missing!', 'Failed to send Alertas Premium offer to webhook');
}
