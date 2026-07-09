"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const webhookHandler_1 = require("./webhookHandler");
const dashboardHandler_1 = require("./dashboardHandler");
const milheiroHandler_1 = require("./milheiroHandler");
const destinationHandler_1 = require("./destinationHandler");
const buscamilhasClient_1 = require("./buscamilhasClient");
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
app.use(express_1.default.json());
// Routes
app.post('/webhook', webhookHandler_1.handleWhatsAppWebhook);
// Health check
app.get('/health', (req, res) => {
    res.send('WhatsApp Flight Offers API is running.');
});
// Dashboard Routes
app.get('/dashboard', dashboardHandler_1.getDashboardHtml);
app.get('/api/dashboard', dashboardHandler_1.getDashboardData);
app.post('/api/reprocess', dashboardHandler_1.reprocessOffer);
// Milheiro CRUD Routes
app.get('/api/milheiros', milheiroHandler_1.listMilheiros);
app.post('/api/milheiros', milheiroHandler_1.createMilheiro);
app.put('/api/milheiros', milheiroHandler_1.updateMilheiro);
app.delete('/api/milheiros', milheiroHandler_1.deleteMilheiro);
// Destination Images Routes
app.get('/api/destinations', destinationHandler_1.listDestinations);
app.put('/api/destinations', destinationHandler_1.updateDestination);
app.delete('/api/destinations', destinationHandler_1.deleteDestinationOverride);
// BuscaMilhas Routes
app.post('/api/buscamilhas/search', buscamilhasClient_1.searchBuscaMilhas);
app.get('/api/buscamilhas/config', buscamilhasClient_1.listBmConfig);
app.put('/api/buscamilhas/config', buscamilhasClient_1.updateBmConfig);
app.get('/api/buscamilhas/results', buscamilhasClient_1.listBmResults);
app.get('/api/buscamilhas/enabled', buscamilhasClient_1.getBmEnabled);
app.put('/api/buscamilhas/enabled', buscamilhasClient_1.toggleBmEnabled);
// Ensure tables exist on startup
(0, milheiroHandler_1.ensureMilheiroTable)().catch(err => console.error('Error ensuring milheiro table:', err));
(0, destinationHandler_1.ensureDestinationOverridesTable)().catch(err => console.error('Error ensuring destination overrides table:', err));
(0, buscamilhasClient_1.ensureBmConfigTable)().catch(err => console.error('Error ensuring buscamilhas tables:', err));
// For local development, we listen to a port.
// For Vercel, exporting the app is the recommended pattern.
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Server is running at http://localhost:${port}`);
    });
}
exports.default = app;
