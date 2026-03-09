import express from 'express';
import { handleWhatsAppWebhook } from './webhookHandler';
import { getDashboardHtml, getDashboardData, reprocessOffer } from './dashboardHandler';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Routes
app.post('/webhook', handleWhatsAppWebhook);

// Health check
app.get('/health', (req: express.Request, res: express.Response) => {
  res.send('WhatsApp Flight Offers API is running.');
});

// Dashboard Routes
app.get('/dashboard', getDashboardHtml);
app.get('/api/dashboard', getDashboardData);
app.post('/api/reprocess', reprocessOffer);

// For local development, we listen to a port.
// For Vercel, exporting the app is the recommended pattern.
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
  });
}

export default app;
