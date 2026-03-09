import { Request, Response } from 'express';
import { supabase } from './supabaseClient';
import { logEvent } from './logger';
import { checkForCompleteOffer } from './webhookHandler';

export async function getDashboardHtml(req: Request, res: Response) {
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Passagem Premium API Dashboard</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 20px; background-color: #f9fafb; color: #111827; }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { font-size: 24px; font-weight: 600; margin-bottom: 20px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        @media (max-width: 768px) { .grid { grid-template-columns: 1fr; } }
        .card { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        h2 { font-size: 18px; margin-top: 0; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; }
        .item { padding: 10px; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 10px; font-size: 14px; }
        .item strong { display: block; margin-bottom: 5px; }
        .log-error { border-left: 4px solid #ef4444; }
        .log-success { border-left: 4px solid #10b981; }
        .log-info { border-left: 4px solid #3b82f6; }
        .reprocess-btn { background-color: #4f46e5; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 13px; float: right; margin-top: -30px; }
        .reprocess-btn:hover { background-color: #4338ca; }
        .loading { text-align: center; padding: 20px; color: #6b7280; }
        code { background: #f3f4f6; padding: 2px 4px; border-radius: 4px; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Dashboard Passagem Premium ✈️</h1>
        
        <div class="grid">
            <div class="card">
                <h2>Mensagens Recebidas (Últimas 24h)</h2>
                <div id="queue-container"><div class="loading">Carregando...</div></div>
            </div>
            
            <div class="card">
                <h2>Últimos Logs (api_logs)</h2>
                <button onclick="fetchData()" style="float: right; margin-top: -30px; cursor: pointer;">Atualizar</button>
                <div id="logs-container"><div class="loading">Carregando...</div></div>
            </div>
        </div>
    </div>

    <script>
        async function fetchData() {
            try {
                const res = await fetch('/api/dashboard');
                const data = await res.json();
                renderQueue(data.queue);
                renderLogs(data.logs);
            } catch (err) {
                alert('Erro ao carregar os dados.');
            }
        }

        function renderQueue(queueMap) {
            const container = document.getElementById('queue-container');
            container.innerHTML = '';
            
            if (Object.keys(queueMap).length === 0) {
                 container.innerHTML = '<p style="color: #6b7280; font-size: 14px;">Nenhuma mensagem recebida nas últimas 24h.</p>';
                 return;
            }

            for (const phone in queueMap) {
                const group = queueMap[phone];
                const div = document.createElement('div');
                div.className = 'item';
                div.innerHTML = \`
                    <strong>Grupo: \${phone} (\${group.chat_name || 'Desconhecido'})</strong>
                    <span>Imagens recebidas: \${group.images} | Textos recebidos: \${group.texts}</span>
                    <br><span style="font-size: 12px; color: #6b7280;">Última mensagem: \${new Date(group.last_updated).toLocaleString('pt-BR')}</span>
                    \${(group.images >= 2 && group.texts >= 1) ? \`<button class="reprocess-btn" onclick="reprocess('\${phone}')">▶ Reprocessar Último Trio</button>\` : ''}
                \`;
                container.appendChild(div);
            }
        }

        function renderLogs(logs) {
            const container = document.getElementById('logs-container');
            container.innerHTML = '';
            
            if (logs.length === 0) {
                 container.innerHTML = '<p style="color: #6b7280; font-size: 14px;">Nenhum log recente.</p>';
                 return;
            }

            logs.forEach(log => {
                const div = document.createElement('div');
                let colorClass = 'log-info';
                if (log.event_type.includes('ERROR')) colorClass = 'log-error';
                else if (log.event_type === 'OFFER_PROCESSED') colorClass = 'log-success';
                
                div.className = \`item \${colorClass}\`;
                div.innerHTML = \`
                    <strong>[\${new Date(log.created_at).toLocaleTimeString('pt-BR')}] \${log.event_type}</strong>
                    <span>\${log.message}</span>
                    <br><span style="font-size: 12px; color: #6b7280;">Grupo: \${log.group_phone || 'N/A'}</span>
                \`;
                container.appendChild(div);
            });
        }

        async function reprocess(phone) {
            if (!confirm('Deseja forçar o reprocessamento deste trio (2 Imagens + 1 Texto)? Isso pode demorar até 30 segundos.')) return;
            
            try {
                const res = await fetch('/api/reprocess', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone })
                });

                if (res.ok) {
                    alert('Reprocessamento finalizado (check os logs à direita).');
                    fetchData();
                } else {
                    alert('Falha ao reprocessar.');
                }
            } catch(e) {
                alert('Erro de conexão ao reprocessar.');
            }
        }

        fetchData();
    </script>
</body>
</html>
  `;
  res.status(200).send(html);
}

export async function getDashboardData(req: Request, res: Response) {
  try {
    // 1. Fetch recent queue (last 24 hours) from whatsapp_offers_temp
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);

    const { data: queueData, error: queueError } = await supabase
      .from('whatsapp_offers_temp')
      .select('group_phone, chat_name, msg_type, created_at')
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false });

    // 2. Fetch recent logs
    const { data: logsData, error: logsError } = await supabase
      .from('api_logs')
      .select('group_phone, event_type, message, created_at')
      .order('created_at', { ascending: false })
      .limit(30);

    if (queueError || logsError) {
      console.error('Db Error fetching dashboard:', queueError || logsError);
      return res.status(500).json({ error: 'Database error' });
    }

    // Group queue by phone
    const queueMap: Record<string, any> = {};
    if (queueData) {
        queueData.forEach((msg: any) => {
            if (!queueMap[msg.group_phone]) {
                queueMap[msg.group_phone] = {
                    chat_name: msg.chat_name,
                    images: 0,
                    texts: 0,
                    last_updated: msg.created_at
                };
            }
            if (msg.msg_type === 'image') queueMap[msg.group_phone].images++;
            if (msg.msg_type === 'text') queueMap[msg.group_phone].texts++;
        });
    }

    return res.status(200).json({
        queue: queueMap,
        logs: logsData || []
    });
  } catch(e) {
      return res.status(500).json({ error: 'Server error' });
  }
}

export async function reprocessOffer(req: Request, res: Response) {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'Missing phone property' });
  }

  try {
    // For reprocessing, we reset "processed = false" for the most recent 1 text and 2 images of this group within the last 24h
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);

    const { data: messages, error } = await supabase
      .from('whatsapp_offers_temp')
      .select('id, msg_type')
      .eq('group_phone', phone)
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false });

    if (error || !messages) {
      return res.status(500).json({ error: 'Error fetching to reprocess' });
    }

    const images = messages.filter((m: any) => m.msg_type === 'image');
    const texts = messages.filter((m: any) => m.msg_type === 'text');

    if (images.length >= 2 && texts.length >= 1) {
        const idsToReset = [texts[0].id, images[0].id, images[1].id];

        // Ensure they are false before calling check
        await supabase
          .from('whatsapp_offers_temp')
          .update({ processed: false })
          .in('id', idsToReset);
        
        await logEvent(phone, 'REPROCESS_INITIATED', 'Manual reprocess triggered via Dashboard', { idsToReset });

        // Trigger the original handler function (this uses local webhook variables)
        // Note: we pass a generic chatNa me because it'll fetch the actual row anyway
        await checkForCompleteOffer(phone, 'Recuperado Dashboard');

        return res.status(200).json({ success: true, message: 'Reprocessado com sucesso.' });
    } else {
        return res.status(400).json({ error: 'Este grupo não possui 2 imagens e 1 texto na fila.' });
    }
  } catch(e) {
      return res.status(500).json({ error: 'Fatal error manually reprocessing' });
  }
}
