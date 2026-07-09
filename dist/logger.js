"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logEvent = logEvent;
const supabaseClient_1 = require("./supabaseClient");
async function logEvent(groupPhone, eventType, message, metadata) {
    try {
        console.log(`[${eventType}] ${message}`);
        const { error } = await supabaseClient_1.supabase.from('api_logs').insert([
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
    }
    catch (err) {
        console.error('Unexpected error in logEvent:', err);
    }
}
