import express from 'express';
import { handleWhatsAppWebhook } from './webhookHandler';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Routes
app.post('/webhook', handleWhatsAppWebhook);

// Health check
app.get('/health', (req, res) => {
  res.send('WhatsApp Flight Offers API is running.');
});

// For local development, we listen to a port.
// For Vercel, exporting the app is the recommended pattern.
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
  });
}

export default app;
