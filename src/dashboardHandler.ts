import { Request, Response } from 'express';
import { supabase } from './supabaseClient';
import { logEvent } from './logger';
import { checkForCompleteOffer } from './webhookHandler';

export async function getDashboardHtml(req: Request, res: Response) {
  const html = `
<!DOCTYPE html>
<html lang="pt-BR" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Passagem Premium API Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; background: #000000; color: #f3f4f6; }
        .glass-panel {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px;
        }
        .apple-gradient-text {
            background: linear-gradient(135deg, #ffffff 0%, #a1a1aa 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .btn-glass {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.1);
            transition: all 0.3s ease;
        }
        .btn-glass:hover {
            background: rgba(255, 255, 255, 0.2);
            transform: scale(1.02);
        }
        .btn-primary {
            background: linear-gradient(135deg, #007aff 0%, #0056b3 100%);
            box-shadow: 0 4px 14px 0 rgba(0, 122, 255, 0.39);
            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        }
        .btn-primary:hover {
            opacity: 0.9;
            box-shadow: 0 6px 20px rgba(0, 122, 255, 0.23);
            transform: translateY(-2px);
        }
        .log-error { border-left-color: #ff3b30; }
        .log-success { border-left-color: #34c759; }
        .log-info { border-left-color: #007aff; }
        
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    </style>
</head>
<body class="min-h-screen relative overflow-hidden flex flex-col">
    <!-- Ambient glowing orbs imitating visionOS/macOS Sonoma -->
    <div class="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] bg-blue-600 rounded-full mix-blend-screen filter blur-[120px] opacity-30 z-0 pointer-events-none"></div>
    <div class="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] bg-purple-600 rounded-full mix-blend-screen filter blur-[120px] opacity-30 z-0 pointer-events-none"></div>

    <div class="container mx-auto px-6 py-10 relative z-10 max-w-7xl flex flex-col h-screen">
        <header class="flex justify-between items-center mb-8 animate-slide-up" style="animation-delay: 0.1s; opacity: 0;">
            <div>
                <h1 class="text-4xl font-bold apple-gradient-text tracking-tight">Passagem Premium</h1>
                <p class="text-gray-400 mt-2 text-sm font-medium tracking-wide uppercase">Monitoring & Analytics Console</p>
            </div>
            <button onclick="fetchData()" class="btn-glass px-5 py-2.5 rounded-xl text-sm font-medium text-white flex items-center gap-2 shadow-lg">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                Atualizar Painel
            </button>
        </header>
        
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0 pb-6 animate-slide-up" style="animation-delay: 0.2s; opacity: 0;">
            <!-- Left Column: Queue -->
            <div class="lg:col-span-7 glass-panel p-8 flex flex-col overflow-hidden shadow-2xl">
                <div class="flex items-center justify-between mb-6">
                    <h2 class="text-xl font-semibold text-white flex items-center gap-2">
                        <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                        Fila de Processamento <span class="text-sm font-normal text-gray-400 ml-2">(Últimas 24h)</span>
                    </h2>
                </div>
                <div id="queue-container" class="flex-1 overflow-y-auto pr-3 space-y-4 scrollbar-thin">
                    <div class="flex items-center justify-center h-full text-gray-500">
                        <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Buscando rede...
                    </div>
                </div>
            </div>
            
            <!-- Right Column: Logs -->
            <div class="lg:col-span-5 glass-panel p-8 flex flex-col overflow-hidden shadow-2xl">
                <h2 class="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                    <svg class="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    Live Logs
                </h2>
                <div id="logs-container" class="flex-1 overflow-y-auto pr-3 space-y-3 scrollbar-thin">
                    <div class="flex items-center justify-center h-full text-gray-500">Aguardando eventos...</div>
                </div>
            </div>
        </div>
    </div>

    <!-- Notification Toast -->
    <div id="toast" class="fixed bottom-6 right-6 glass-panel px-6 py-4 transform transition-all duration-500 translate-y-20 opacity-0 z-50 flex items-center gap-3 shadow-2xl">
        <svg class="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <span id="toast-msg" class="text-sm font-medium text-white"></span>
    </div>

    <style>
        .scrollbar-thin::-webkit-scrollbar { width: 6px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 10px; }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.3); }
    </style>

    <script>
        function showToast(message) {
            const toast = document.getElementById('toast');
            document.getElementById('toast-msg').innerText = message;
            toast.classList.remove('translate-y-20', 'opacity-0');
            setTimeout(() => { toast.classList.add('translate-y-20', 'opacity-0'); }, 4000);
        }

        async function fetchData() {
            try {
                const res = await fetch('/api/dashboard');
                const data = await res.json();
                renderQueue(data.queue);
                renderLogs(data.logs);
            } catch (err) {
                console.error('Erro ao conectar com API:', err);
            }
        }

        function renderQueue(queueMap) {
            const container = document.getElementById('queue-container');
            container.innerHTML = '';
            
            if (Object.keys(queueMap).length === 0) {
                 container.innerHTML = '<div class="flex items-center justify-center h-full text-gray-400 text-sm">Nenhuma mensagem recente localizada.</div>';
                 return;
            }

            let delay = 0;
            for (const phone in queueMap) {
                const group = queueMap[phone];
                const ready = group.images >= 2 && group.texts >= 1;
                const div = document.createElement('div');
                div.className = \`animate-slide-up p-5 rounded-2xl \${ready ? 'bg-white/10 border border-white/20' : 'bg-white/5 opacity-60 border border-white/5'} transition-all hover:bg-white/10\`;
                div.style.animationDelay = \`\${delay}s\`;
                div.style.opacity = '0';
                delay += 0.05;

                div.innerHTML = \`
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <h3 class="font-semibold text-white text-lg tracking-tight">\${group.chat_name || 'Grupo Desconhecido'}</h3>
                            <p class="text-xs text-gray-400 font-mono mt-1 opacity-80">\${phone}</p>
                        </div>
                        \${ready ? \`<button onclick="reprocess('\${phone}', this)" class="btn-primary text-xs text-white font-semibold px-5 py-2 rounded-full">Reenviar Trio</button>\` : \`<span class="text-xs font-semibold px-3 py-1.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 backdrop-blur-md">Faltam Mensagens...</span>\`}
                    </div>
                    
                    <div class="flex items-center gap-5 mt-4 bg-black/40 p-4 rounded-xl border border-white/10">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl drop-shadow-lg">\${group.images >= 2 ? '📸' : '⏳'}</span>
                            <div class="flex flex-col">
                                <span class="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Imagens</span>
                                <span class="font-bold text-base \${group.images >= 2 ? 'text-green-400' : 'text-orange-400'}">\${group.images}/2</span>
                            </div>
                        </div>
                        <div class="w-px h-10 bg-white/10"></div>
                        <div class="flex items-center gap-3">
                            <span class="text-2xl drop-shadow-lg">\${group.texts >= 1 ? '📝' : '⏳'}</span>
                            <div class="flex flex-col">
                                <span class="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Textos</span>
                                <span class="font-bold text-base \${group.texts >= 1 ? 'text-green-400' : 'text-orange-400'}">\${group.texts}/1</span>
                            </div>
                        </div>
                        <div class="ml-auto text-right flex flex-col justify-center">
                            <span class="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Última att.</span>
                            <span class="text-sm text-gray-300 font-medium">\${new Date(group.last_updated).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                    </div>
                \`;
                container.appendChild(div);
            }
        }

        function renderLogs(logs) {
            const container = document.getElementById('logs-container');
            container.innerHTML = '';
            
            if (logs.length === 0) {
                 container.innerHTML = '<div class="flex items-center justify-center h-full text-gray-400 text-sm">Painel de logs limpo.</div>';
                 return;
            }

            let delay = 0;
            logs.forEach(log => {
                const div = document.createElement('div');
                let colorClass = 'border-white/20';
                let icon = '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>';
                let textColor = 'text-blue-400';
                
                if (log.event_type.includes('ERROR')) {
                    colorClass = 'border-red-500/50 bg-red-500/10';
                    textColor = 'text-red-400';
                    icon = '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>';
                } else if (log.event_type === 'OFFER_PROCESSED') {
                    colorClass = 'border-green-500/50 bg-green-500/10';
                    textColor = 'text-green-400';
                    icon = '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>';
                } else if (log.event_type === 'REPROCESS_INITIATED') {
                    colorClass = 'border-blue-500/50 bg-blue-500/10';
                    textColor = 'text-blue-400';
                    icon = '<path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.92-10.44l5.58 5.58"/>';
                } else if (log.event_type === 'PROCESSING_FINAL_OFFER') {
                    colorClass = 'border-yellow-500/50 bg-yellow-500/10';
                    textColor = 'text-yellow-400';
                    icon = '<path d="M2 12h4l2-9 5 18 2-9h5"></path>';
                } else {
                    colorClass = 'border-white/10 bg-white/5 text-gray-300';
                    textColor = 'text-gray-300';
                }
                
                div.className = \`animate-slide-up flex gap-4 p-4 rounded-xl mb-3 border backdrop-blur-sm transition-colors \${colorClass}\`;
                div.style.animationDelay = \`\${delay}s\`;
                div.style.opacity = '0';
                delay += 0.03;

                div.innerHTML = \`
                    <div class="mt-1 \${textColor}">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">\${icon}</svg>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-baseline mb-1">
                            <span class="text-sm font-semibold tracking-wide text-white">\${log.event_type}</span>
                            <span class="text-[11px] text-gray-400 font-medium">\${new Date(log.created_at).toLocaleTimeString('pt-BR')}</span>
                        </div>
                        <p class="text-sm text-gray-300 opacity-90 leading-relaxed">\${log.message}</p>
                    </div>
                \`;
                container.appendChild(div);
            });
        }

        async function reprocess(phone, btn) {
            const originalText = btn.innerText;
            btn.innerHTML = \`<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Reprocessando\`;
            btn.disabled = true;
            btn.classList.add('opacity-70', 'cursor-not-allowed');

            try {
                const res = await fetch('/api/reprocess', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone })
                });

                if (res.ok) {
                    showToast('Processo iniciado com sucesso na API!');
                    setTimeout(fetchData, 1000);
                } else {
                    alert('Falha ao acionar reprocessamento.');
                }
            } catch(e) {
                alert('Erro na conexão com API.');
            } finally {
                btn.innerText = originalText;
                btn.disabled = false;
                btn.classList.remove('opacity-70', 'cursor-not-allowed');
            }
        }

        fetchData();
        // Ping de atualização a cada 10s
        setInterval(fetchData, 10000);
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

        // Ensure they are false before calling check, and UPDATE created_at to NOW so it bypasses the 15-minute ignore restriction in webhookHandler!
        await supabase
          .from('whatsapp_offers_temp')
          .update({ processed: false, created_at: new Date().toISOString() })
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
