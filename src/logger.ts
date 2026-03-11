import { supabase } from './supabaseClient';

type EventType = 'RECEIVED_IMAGE' | 'RECEIVED_TEXT' | 'RECEIVED_CAPTION' | 'OFFER_DISCARDED' | 'PROCESSING_FINAL_OFFER' | 'OFFER_PROCESSED' | 'ERROR' | 'REPROCESS_INITIATED';

export async function logEvent(groupPhone: string | null, eventType: EventType, message: string, metadata?: any) {
  try {
    console.log(`[${eventType}] ${message}`);

    const { error } = await supabase.from('api_logs').insert([
      {
        group_phone: groupPhone,
        event_type: eventType,
        message: message,
        metadata: metadata || {},
      }
    ]);

    if (error) {
      console.error('Failed to insert log into Supabase:', error);
    }
  } catch (err) {
    console.error('Unexpected error in logEvent:', err);
  }
}
