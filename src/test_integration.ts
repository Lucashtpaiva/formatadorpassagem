import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch'; // requires node-fetch@2 or node v18+

const API_URL = 'http://localhost:3000/webhook';

async function sendWebhook(filename: string) {
  const filePath = path.join(__dirname, '..', filename);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  console.log(`Sending ${filename}...`);
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.text();
    console.log(`Response for ${filename}: ${response.status} - ${result}`);
  } catch (error) {
    console.error(`Failed to send ${filename}:`, error);
  }
}

async function runTests() {
  console.log('--- Starting Integration Tests ---');
  
  // Send Image 1
  await sendWebhook('msg1_imagemdata_gru_mad.json');
  
  // Wait a bit
  await new Promise(r => setTimeout(r, 2000));
  
  // Send Image 2
  await sendWebhook('msg2_imagemdata_mad_gru.json');

  // Wait a bit
  await new Promise(r => setTimeout(r, 2000));

  // Send Text (This should trigger the final OpenAI processing and webhook destination)
  await sendWebhook('msg3_texto.json');
  
  console.log('--- Finished Sending ---');
}

runTests();
