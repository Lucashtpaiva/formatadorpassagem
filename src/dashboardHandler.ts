import { Request, Response } from 'express';
import { supabase } from './supabaseClient';
import { logEvent } from './logger';
import { checkForCompleteOffer } from './webhookHandler';
import { PROGRAMA_ALIASES_DISPLAY } from './milheiroHandler';

export async function getDashboardHtml(req: Request, res: Response) {
  const html = `
<!DOCTYPE html>
<html lang="pt-BR" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Passagem Secreta - Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; background: #0E171E; color: #f3f4f6; }
        .glass-panel {
            background: rgba(255, 255, 255, 0.04);
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 20px;
        }
        .glass-panel-header {
            background: rgba(255, 255, 255, 0.03);
            border-bottom: 1px solid rgba(255, 255, 255, 0.06);
            padding: 16px 24px;
            border-radius: 20px 20px 0 0;
            display: flex;
            align-items: center;
            justify-content: space-between;
            cursor: default;
        }
        .apple-gradient-text {
            background: linear-gradient(135deg, #ffffff 0%, #a1a1aa 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .brand-gradient {
            background: linear-gradient(135deg, #60a5fa 0%, #a78bfa 50%, #f472b6 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .btn-glass {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.1);
            transition: all 0.3s ease;
        }
        .btn-glass:hover {
            background: rgba(255, 255, 255, 0.15);
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
        .section-toggle {
            cursor: pointer;
            user-select: none;
            transition: transform 0.3s ease;
        }
        .section-toggle.collapsed { transform: rotate(-90deg); }
        .collapsible-body {
            transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease, padding 0.3s ease;
            overflow: hidden;
        }
        .collapsible-body.collapsed {
            max-height: 0 !important;
            opacity: 0;
            padding-top: 0 !important;
            padding-bottom: 0 !important;
        }

        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes pulse-glow { 0%, 100% { opacity: 0.15; } 50% { opacity: 0.25; } }
        .ambient-orb { animation: pulse-glow 8s ease-in-out infinite; }
    </style>
</head>
<body class="min-h-screen relative overflow-auto flex flex-col">
    <!-- Ambient glowing orbs -->
    <div class="absolute top-[-20%] left-[-15%] w-[600px] h-[600px] bg-blue-600 rounded-full mix-blend-screen filter blur-[150px] opacity-15 z-0 pointer-events-none ambient-orb"></div>
    <div class="absolute bottom-[-20%] right-[-15%] w-[600px] h-[600px] bg-purple-600 rounded-full mix-blend-screen filter blur-[150px] opacity-15 z-0 pointer-events-none ambient-orb" style="animation-delay: 4s;"></div>
    <div class="absolute top-[40%] right-[10%] w-[400px] h-[400px] bg-indigo-500 rounded-full mix-blend-screen filter blur-[150px] opacity-10 z-0 pointer-events-none ambient-orb" style="animation-delay: 2s;"></div>

    <div class="container mx-auto px-6 py-8 relative z-10 max-w-7xl flex flex-col min-h-screen">
        <header class="flex justify-between items-center mb-10 animate-slide-up" style="animation-delay: 0.1s; opacity: 0;">
            <div class="flex items-center">
                <img src="https://media.atomicatpages.net/u/MAti4bwCd4R1BpbcRAMqvwoGrtN2/Pictures/kAjAps5647853.png" alt="Passagem Secreta" class="h-14" />
            </div>
            <button onclick="fetchData(); fetchMilheiros(); fetchDestinations();" class="btn-glass px-5 py-2.5 rounded-xl text-sm font-medium text-gray-300 flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                Atualizar
            </button>
        </header>
        
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0 pb-6 animate-slide-up" style="animation-delay: 0.2s; opacity: 0;">
            <!-- Left Column: Queue -->
            <div class="lg:col-span-7 glass-panel flex flex-col overflow-hidden">
                <div class="glass-panel-header">
                    <h2 class="text-base font-semibold text-white flex items-center gap-2.5">
                        <span class="w-2 h-2 rounded-full bg-blue-400 shadow-sm shadow-blue-400/50"></span>
                        Fila de Processamento <span id="queue-count" class="text-xs font-normal text-gray-500 ml-1">(24h)</span>
                    </h2>
                </div>
                <div id="queue-container" class="flex-1 overflow-y-auto p-5 space-y-3 scrollbar-thin">
                    <div class="flex items-center justify-center h-full text-gray-500 text-sm">
                        <svg class="animate-spin -ml-1 mr-3 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Carregando...
                    </div>
                </div>
            </div>

            <!-- Right Column: Logs (Collapsible) -->
            <div class="lg:col-span-5 glass-panel flex flex-col overflow-hidden">
                <div class="glass-panel-header cursor-pointer" onclick="toggleLogs()">
                    <h2 class="text-base font-semibold text-white flex items-center gap-2.5">
                        <span class="w-2 h-2 rounded-full bg-purple-400 shadow-sm shadow-purple-400/50"></span>
                        Live Logs
                        <span id="logs-count" class="text-xs font-normal text-gray-500 ml-1"></span>
                    </h2>
                    <svg id="logs-toggle-icon" class="w-4 h-4 text-gray-500 section-toggle transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
                <div id="logs-body" class="collapsible-body flex-1 overflow-y-auto p-5 space-y-2.5 scrollbar-thin" style="max-height: 600px;">
                    <div class="flex items-center justify-center h-32 text-gray-500 text-sm">Aguardando eventos...</div>
                </div>
            </div>
        </div>

        <!-- Milheiro Management Section -->
        <div class="glass-panel mb-6 animate-slide-up overflow-hidden" style="animation-delay: 0.3s; opacity: 0;">
            <div class="glass-panel-header">
                <h2 class="text-base font-semibold text-white flex items-center gap-2.5">
                    <span class="w-2 h-2 rounded-full bg-green-400 shadow-sm shadow-green-400/50"></span>
                    Programas de Pontos & Milheiros
                </h2>
            </div>

            <div class="p-6">
            <!-- Add Form -->
            <div class="flex gap-3 mb-5">
                <input id="new-programa" type="text" placeholder="Nome do programa" class="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-colors" />
                <input id="new-preco" type="number" step="0.5" placeholder="R$/milheiro" class="w-36 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-colors" />
                <button onclick="addMilheiro()" class="btn-primary text-sm text-white font-semibold px-6 py-2.5 rounded-xl flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                    Adicionar
                </button>
            </div>

            <!-- Programs Table -->
            <div id="milheiros-container" class="overflow-y-auto max-h-[500px] scrollbar-thin">
                <table class="w-full">
                    <thead>
                        <tr class="border-b border-white/10">
                            <th class="text-left text-[11px] text-gray-500 uppercase tracking-wider font-semibold pb-3 pl-4">Programa</th>
                            <th class="text-left text-[11px] text-gray-500 uppercase tracking-wider font-semibold pb-3">Aliases (nomes reconhecidos)</th>
                            <th class="text-left text-[11px] text-gray-500 uppercase tracking-wider font-semibold pb-3">R$ / Milheiro</th>
                            <th class="text-right text-[11px] text-gray-500 uppercase tracking-wider font-semibold pb-3 pr-4">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="milheiros-tbody">
                        <tr><td colspan="4" class="text-center text-gray-500 py-8 text-sm">Carregando programas...</td></tr>
                    </tbody>
                </table>
            </div>
            </div>
        </div>

        <!-- Destination Images Section -->
        <div id="dest-section" class="glass-panel mb-6 animate-slide-up overflow-hidden" style="animation-delay: 0.4s; opacity: 0;">
            <div class="glass-panel-header">
                <h2 class="text-base font-semibold text-white flex items-center gap-2.5">
                    <span class="w-2 h-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50"></span>
                    Imagens de Destinos <span id="dest-count" class="text-xs font-normal text-gray-500 ml-1"></span>
                </h2>
            </div>
            <div class="p-6">

            <!-- Add New Destination -->
            <div class="mb-6 rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.04] p-4">
                <div class="flex flex-col xl:flex-row gap-3">
                    <input id="new-dest-cidade" type="text" placeholder="Nova cidade para match (ex.: Fort Lauderdale ou Veneza)" onkeydown="handleDestAddKey(event)" class="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-colors" />
                    <input id="new-dest-url" type="text" placeholder="URL da imagem" onkeydown="handleDestAddKey(event)" class="flex-[1.4] bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-colors" />
                    <button onclick="addDestination()" class="btn-primary text-sm text-white font-semibold px-6 py-2.5 rounded-xl whitespace-nowrap flex items-center justify-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                        Adicionar destino
                    </button>
                </div>
                <p class="text-[11px] text-cyan-200/70 mt-3">
                    Adicione cidades novas que ainda nao existem no lookup. Se a cidade ja existir, a URL sera salva como override.
                </p>
            </div>

            <!-- Search + Pagination Controls -->
            <div class="flex gap-3 mb-6 items-center">
                <input id="dest-search" type="text" placeholder="Buscar destino..." oninput="searchDestinations()" class="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-colors" />
                <div class="flex items-center gap-2">
                    <button onclick="destPrevPage()" id="dest-prev" class="btn-glass px-3 py-2 rounded-lg text-sm text-white disabled:opacity-30" disabled>
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
                    </button>
                    <span id="dest-page-info" class="text-sm text-gray-400 min-w-[80px] text-center">1 / 1</span>
                    <button onclick="destNextPage()" id="dest-next" class="btn-glass px-3 py-2 rounded-lg text-sm text-white disabled:opacity-30" disabled>
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                    </button>
                </div>
            </div>

            <!-- Destinations Grid -->
            <div id="dest-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-[800px] overflow-y-auto scrollbar-thin pr-2">
                <div class="col-span-full text-center text-gray-500 py-8 text-sm">Carregando destinos...</div>
            </div>
            </div>
        </div>

        <!-- BuscaMilhas Config Section -->
        <div class="glass-panel mb-6 animate-slide-up overflow-hidden" style="animation-delay: 0.5s; opacity: 0;">
            <div class="glass-panel-header flex items-center justify-between">
                <h2 class="text-base font-semibold text-white flex items-center gap-2.5">
                    <span class="w-2 h-2 rounded-full bg-orange-400 shadow-sm shadow-orange-400/50"></span>
                    BuscaMilhas - Configuracao
                </h2>
                <div class="flex items-center gap-3">
                    <span id="bm-status-text" class="text-xs text-gray-400">Carregando...</span>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="bm-toggle" class="sr-only peer" onchange="toggleBmEnabledUI(this.checked)">
                        <div class="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                    </label>
                </div>
            </div>
            <div class="p-6">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label class="text-xs text-gray-400 mb-1 block">Authorization (Bearer JWT)</label>
                        <div class="flex gap-2">
                            <input id="bm-authorization" type="password" placeholder="Bearer eyJ..." class="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 transition-colors font-mono" />
                            <button onclick="saveBmConfig('authorization')" class="btn-glass px-3 py-2 rounded-xl text-xs text-orange-300 hover:text-white">Salvar</button>
                        </div>
                        <p id="bm-auth-preview" class="text-[10px] text-gray-600 mt-1 font-mono"></p>
                    </div>
                    <div>
                        <label class="text-xs text-gray-400 mb-1 block">Session Authorization (UUID)</label>
                        <div class="flex gap-2">
                            <input id="bm-session_authorization" type="password" placeholder="xxxxxxxx-xxxx-..." class="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 transition-colors font-mono" />
                            <button onclick="saveBmConfig('session_authorization')" class="btn-glass px-3 py-2 rounded-xl text-xs text-orange-300 hover:text-white">Salvar</button>
                        </div>
                        <p id="bm-session-preview" class="text-[10px] text-gray-600 mt-1 font-mono"></p>
                    </div>
                    <div>
                        <label class="text-xs text-gray-400 mb-1 block">X-API-Key</label>
                        <div class="flex gap-2">
                            <input id="bm-x_api_key" type="password" placeholder="P-9dc26c..." class="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 transition-colors font-mono" />
                            <button onclick="saveBmConfig('x_api_key')" class="btn-glass px-3 py-2 rounded-xl text-xs text-orange-300 hover:text-white">Salvar</button>
                        </div>
                        <p id="bm-key-preview" class="text-[10px] text-gray-600 mt-1 font-mono"></p>
                    </div>
                </div>
            </div>
        </div>

        <!-- BuscaMilhas Manual Search Section -->
        <div class="glass-panel mb-6 animate-slide-up overflow-hidden" style="animation-delay: 0.6s; opacity: 0;">
            <div class="glass-panel-header">
                <h2 class="text-base font-semibold text-white flex items-center gap-2.5">
                    <span class="w-2 h-2 rounded-full bg-yellow-400 shadow-sm shadow-yellow-400/50"></span>
                    BuscaMilhas - Busca Manual
                </h2>
            </div>
            <div class="p-6">
                <div class="grid grid-cols-2 md:grid-cols-6 gap-3 mb-5">
                    <input id="bm-origin" placeholder="Origem (IATA)" maxlength="3" class="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 transition-colors uppercase" />
                    <input id="bm-destination" placeholder="Destino (IATA)" maxlength="3" class="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 transition-colors uppercase" />
                    <input id="bm-departure" type="text" placeholder="Ida (dd/mm/aaaa)" class="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 transition-colors" />
                    <input id="bm-return" type="text" placeholder="Volta (dd/mm/aaaa)" class="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 transition-colors" />
                    <select id="bm-airline" class="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500/50 transition-colors">
                        <option value="GOL">GOL (Smiles)</option>
                        <option value="LANPASS">LATAM</option>
                        <option value="AZUL">Azul</option>
                        <option value="IBERIA">Iberia</option>
                        <option value="AMERICAN AIRLINES">American Airlines</option>
                        <option value="COPA">Copa</option>
                    </select>
                    <button onclick="searchBm()" id="bm-search-btn" class="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold text-white">Buscar</button>
                </div>
                <div id="bm-loading" class="hidden text-center py-6">
                    <div class="inline-flex items-center gap-2 text-yellow-300 text-sm">
                        <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                        Buscando voos... (aguarde ~20s)
                    </div>
                </div>
                <div id="bm-results" class="mt-2"></div>
            </div>
        </div>

        <!-- BuscaMilhas Verification History -->
        <div class="glass-panel mb-6 animate-slide-up overflow-hidden" style="animation-delay: 0.7s; opacity: 0;">
            <div class="glass-panel-header">
                <h2 class="text-base font-semibold text-white flex items-center gap-2.5">
                    <span class="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50"></span>
                    Historico de Verificacoes
                </h2>
            </div>
            <div class="p-6">
                <div id="bm-history" class="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin">
                    <div class="text-center text-gray-500 py-4 text-sm">Carregando...</div>
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
        .scrollbar-thin::-webkit-scrollbar { width: 5px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
    </style>

    <script>
        // Aliases display map injected from server
        const PROGRAMA_ALIASES = ${JSON.stringify(PROGRAMA_ALIASES_DISPLAY)};

        function showToast(message) {
            const toast = document.getElementById('toast');
            document.getElementById('toast-msg').innerText = message;
            toast.classList.remove('translate-y-20', 'opacity-0');
            setTimeout(() => { toast.classList.add('translate-y-20', 'opacity-0'); }, 4000);
        }

        // Format milheiro price: show integer if whole, otherwise 1 decimal
        function fmtPreco(val) {
            const n = Number(val);
            return n % 1 === 0 ? n.toFixed(0) : n.toFixed(1);
        }

        // Toggle Logs section
        let logsCollapsed = false;
        function toggleLogs() {
            logsCollapsed = !logsCollapsed;
            const body = document.getElementById('logs-body');
            const icon = document.getElementById('logs-toggle-icon');
            if (logsCollapsed) {
                body.classList.add('collapsed');
                icon.classList.add('collapsed');
            } else {
                body.classList.remove('collapsed');
                icon.classList.remove('collapsed');
            }
        }

        // Track last data hash to avoid unnecessary re-renders (no flash)
        let lastQueueHash = '';
        let lastLogsHash = '';
        let isFirstLoad = true;

        async function fetchData() {
            try {
                const res = await fetch('/api/dashboard');
                const data = await res.json();
                const queueList = data.queue || [];
                const logs = data.logs || [];

                // Only re-render if data actually changed
                const queueHash = JSON.stringify(queueList.map(m => m.id + ':' + m.processed));
                const logsHash = JSON.stringify(logs.map(l => l.created_at));

                if (queueHash !== lastQueueHash) {
                    lastQueueHash = queueHash;
                    document.getElementById('queue-count').innerText = '(' + queueList.length + ' msgs, 24h)';
                    renderQueue(queueList, isFirstLoad);
                }
                if (logsHash !== lastLogsHash) {
                    lastLogsHash = logsHash;
                    renderLogs(logs, isFirstLoad);
                }
                isFirstLoad = false;
            } catch (err) {
                console.error('Erro ao conectar com API:', err);
            }
        }

        function stripEmojis(str) {
            return (str || '').replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2702}-\u{27B0}\u{200D}\u{20E3}\u{FE0F}]/gu, '').trim();
        }

        function renderQueue(queueList, animate) {
            const container = document.getElementById('queue-container');
            container.innerHTML = '';

            if (!queueList || queueList.length === 0) {
                 container.innerHTML = '<div class="flex items-center justify-center h-full text-gray-400 text-sm">Nenhuma mensagem recente localizada.</div>';
                 return;
            }

            let delay = 0;
            queueList.forEach(function(msg) {
                const div = document.createElement('div');
                const isProcessed = msg.processed;
                const typeIcons = { image: '📸', text: '📝', caption: '💬' };
                const typeLabels = { image: 'Imagem', text: 'Texto', caption: 'Caption' };
                const typeIcon = typeIcons[msg.msg_type] || '📝';
                const typeLabel = typeLabels[msg.msg_type] || msg.msg_type;
                const statusLabel = isProcessed ? 'Processado' : 'Pendente';
                const borderClass = isProcessed ? 'border-green-500/20 bg-green-500/5' : 'border-white/10 bg-white/5';

                // Fonte badge colors
                let fonteBg = 'bg-gray-500/20 text-gray-400 border-gray-500/30';
                let fonteLabel = msg.fonte || 'Desconhecido';
                if (msg.fonte === 'Passageiro de Primeira') {
                    fonteBg = 'bg-purple-500/20 text-purple-400 border-purple-500/30';
                    fonteLabel = 'PP';
                } else if (msg.fonte === 'Alerta de Voos') {
                    fonteBg = 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
                    fonteLabel = 'Alerta';
                }

                if (animate) {
                    div.className = \`animate-slide-up p-4 rounded-xl border \${borderClass} transition-all hover:bg-white/10\`;
                    div.style.animationDelay = \`\${delay}s\`;
                    div.style.opacity = '0';
                    delay += 0.03;
                } else {
                    div.className = \`p-4 rounded-xl border \${borderClass} transition-all hover:bg-white/10\`;
                }

                const msgId = msg.id || Math.random().toString(36).slice(2);
                const escapedContent = (msg.content || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
                const extractedJson = msg.extracted_data ? JSON.stringify(msg.extracted_data, null, 2).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : null;

                div.innerHTML = \`
                    <div class="cursor-pointer" onclick="toggleDetail('\${msgId}')">
                        <div class="flex justify-between items-start mb-2">
                            <div class="flex items-center gap-2 flex-1 min-w-0">
                                <span class="text-lg">\${typeIcon}</span>
                                <div class="min-w-0 flex-1">
                                    <div class="flex items-center gap-2">
                                        <h3 class="font-semibold text-white text-sm tracking-tight truncate">\${stripEmojis(msg.chat_name) || 'Grupo Desconhecido'}</h3>
                                        <span class="text-[9px] font-bold px-2 py-0.5 rounded-full border \${fonteBg} whitespace-nowrap">\${fonteLabel}</span>
                                    </div>
                                    <p class="text-[10px] text-gray-500 font-mono mt-0.5">\${msg.group_phone}</p>
                                </div>
                            </div>
                            <div class="flex items-center gap-2 ml-2 shrink-0">
                                <span class="text-[10px] font-semibold px-2 py-1 rounded-full \${isProcessed ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'}">\${statusLabel}</span>
                                \${!isProcessed ? \`<button onclick="event.stopPropagation(); reprocess('\${msg.group_phone}', this)" class="btn-primary text-[10px] text-white font-semibold px-3 py-1 rounded-full">Reenviar</button>\` : ''}
                            </div>
                        </div>
                        <div class="flex items-center justify-between mt-2">
                            <div class="flex items-center gap-2">
                                <span class="text-[10px] px-2 py-0.5 rounded bg-white/10 text-gray-300 font-medium">\${typeLabel}</span>
                                <span class="text-[10px] text-gray-500 truncate max-w-[300px]">\${msg.content_preview || ''}</span>
                                <svg class="w-3 h-3 text-gray-500 transition-transform detail-arrow-\${msgId}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                            <span class="text-[10px] text-gray-500 whitespace-nowrap">\${new Date(msg.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</span>
                        </div>
                    </div>
                    <div id="detail-\${msgId}" class="hidden mt-3 pt-3 border-t border-white/10">
                        <p class="text-[10px] text-gray-400 font-semibold mb-1">Conteudo:</p>
                        <pre class="text-[11px] text-gray-300 whitespace-pre-wrap break-all bg-black/30 rounded-lg p-3 max-h-60 overflow-auto font-mono">\${escapedContent}</pre>
                        \${extractedJson ? \`<p class="text-[10px] text-gray-400 font-semibold mt-2 mb-1">Dados Extraidos (GPT):</p><pre class="text-[11px] text-green-300/80 whitespace-pre-wrap break-all bg-black/30 rounded-lg p-3 max-h-60 overflow-auto font-mono">\${extractedJson}</pre>\` : ''}
                    </div>
                \`;
                container.appendChild(div);
            });
        }

        function renderLogs(logs, animate) {
            const container = document.getElementById('logs-body');
            container.innerHTML = '';
            document.getElementById('logs-count').innerText = logs.length > 0 ? '(' + logs.length + ')' : '';

            if (logs.length === 0) {
                 container.innerHTML = '<div class="flex items-center justify-center h-32 text-gray-500 text-sm">Painel de logs limpo.</div>';
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
                } else if (log.event_type === 'BM_VERIFICATION') {
                    colorClass = 'border-orange-500/50 bg-orange-500/10';
                    textColor = 'text-orange-400';
                    icon = '<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>';
                } else if (log.event_type === 'OFFER_NOT_VERIFIED') {
                    colorClass = 'border-red-500/50 bg-red-500/10';
                    textColor = 'text-red-400';
                    icon = '<path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636"></path>';
                } else if (log.event_type === 'IATA_EXTRACTED') {
                    colorClass = 'border-cyan-500/50 bg-cyan-500/10';
                    textColor = 'text-cyan-400';
                    icon = '<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>';
                } else {
                    colorClass = 'border-white/10 bg-white/5 text-gray-300';
                    textColor = 'text-gray-300';
                }

                if (animate) {
                    div.className = \`animate-slide-up flex gap-4 p-4 rounded-xl mb-3 border backdrop-blur-sm transition-colors \${colorClass}\`;
                    div.style.animationDelay = \`\${delay}s\`;
                    div.style.opacity = '0';
                    delay += 0.03;
                } else {
                    div.className = \`flex gap-4 p-4 rounded-xl mb-3 border backdrop-blur-sm transition-colors \${colorClass}\`;
                }

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

        function toggleDetail(msgId) {
            const detail = document.getElementById('detail-' + msgId);
            const arrow = document.querySelector('.detail-arrow-' + msgId);
            if (detail) {
                detail.classList.toggle('hidden');
                if (arrow) arrow.style.transform = detail.classList.contains('hidden') ? '' : 'rotate(180deg)';
            }
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

        // ========== Milheiro Management ==========
        async function fetchMilheiros() {
            try {
                const res = await fetch('/api/milheiros');
                const data = await res.json();
                renderMilheiros(data);
            } catch (err) {
                console.error('Erro ao buscar milheiros:', err);
            }
        }

        function renderMilheiros(list) {
            const tbody = document.getElementById('milheiros-tbody');
            tbody.innerHTML = '';

            if (!list || list.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center text-gray-500 py-8">Nenhum programa cadastrado.</td></tr>';
                return;
            }

            list.forEach(item => {
                const tr = document.createElement('tr');
                tr.className = 'border-b border-white/5 hover:bg-white/5 transition-colors';
                tr.setAttribute('data-programa', item.programa);
                const aliases = PROGRAMA_ALIASES[item.programa] || [];
                const aliasesHtml = aliases.length > 0
                    ? aliases.map(a => \`<span class="inline-block text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-gray-400 mr-1 mb-1">\${a}</span>\`).join('')
                    : '<span class="text-[10px] text-gray-600">—</span>';
                tr.innerHTML = \`
                    <td class="py-3 pl-4">
                        <span class="text-sm font-medium text-white programa-label">\${item.programa}</span>
                    </td>
                    <td class="py-3 max-w-[300px]">
                        <div class="flex flex-wrap gap-0.5">\${aliasesHtml}</div>
                    </td>
                    <td class="py-3">
                        <span class="text-sm text-green-400 font-semibold preco-label">R$ \${fmtPreco(item.preco_milheiro)}</span>
                        <input type="number" step="0.5" value="\${item.preco_milheiro}" class="hidden w-28 bg-white/10 border border-blue-500/50 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none preco-input" />
                    </td>
                    <td class="py-3 pr-4 text-right">
                        <button onclick="startEditMilheiro(this)" class="btn-edit text-xs text-blue-400 hover:text-blue-300 font-medium px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-colors mr-2">Editar</button>
                        <button onclick="saveMilheiro(this)" class="btn-save hidden text-xs text-green-400 hover:text-green-300 font-medium px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition-colors mr-2">Salvar</button>
                        <button onclick="cancelEditMilheiro(this)" class="btn-cancel hidden text-xs text-gray-400 hover:text-gray-300 font-medium px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors mr-2">Cancelar</button>
                        <button onclick="deleteMilheiro('\${item.programa}')" class="text-xs text-red-400 hover:text-red-300 font-medium px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors">Excluir</button>
                    </td>
                \`;
                tbody.appendChild(tr);
            });
        }

        function startEditMilheiro(btn) {
            const tr = btn.closest('tr');
            tr.querySelector('.preco-label').classList.add('hidden');
            tr.querySelector('.preco-input').classList.remove('hidden');
            tr.querySelector('.btn-edit').classList.add('hidden');
            tr.querySelector('.btn-save').classList.remove('hidden');
            tr.querySelector('.btn-cancel').classList.remove('hidden');
            tr.querySelector('.preco-input').focus();
        }

        function cancelEditMilheiro(btn) {
            const tr = btn.closest('tr');
            tr.querySelector('.preco-label').classList.remove('hidden');
            tr.querySelector('.preco-input').classList.add('hidden');
            tr.querySelector('.btn-edit').classList.remove('hidden');
            tr.querySelector('.btn-save').classList.add('hidden');
            tr.querySelector('.btn-cancel').classList.add('hidden');
        }

        async function saveMilheiro(btn) {
            const tr = btn.closest('tr');
            const programa = tr.getAttribute('data-programa');
            const newPreco = tr.querySelector('.preco-input').value;

            try {
                const res = await fetch('/api/milheiros', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ programa, preco_milheiro: Number(newPreco) })
                });
                if (res.ok) {
                    showToast(\`\${programa} atualizado para R$ \${fmtPreco(newPreco)}\`);
                    fetchMilheiros();
                } else {
                    const err = await res.json();
                    alert('Erro: ' + (err.error || 'Falha ao atualizar'));
                }
            } catch(e) {
                alert('Erro na conexão.');
            }
        }

        async function addMilheiro() {
            const programa = document.getElementById('new-programa').value.trim();
            const preco = document.getElementById('new-preco').value;

            if (!programa || !preco) {
                alert('Preencha o nome do programa e o valor do milheiro.');
                return;
            }

            try {
                const res = await fetch('/api/milheiros', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ programa, preco_milheiro: Number(preco) })
                });
                if (res.ok) {
                    showToast(\`Programa "\${programa}" adicionado com sucesso!\`);
                    document.getElementById('new-programa').value = '';
                    document.getElementById('new-preco').value = '';
                    fetchMilheiros();
                } else {
                    const err = await res.json();
                    alert('Erro: ' + (err.error || 'Falha ao adicionar'));
                }
            } catch(e) {
                alert('Erro na conexão.');
            }
        }

        async function deleteMilheiro(programa) {
            if (!confirm(\`Tem certeza que deseja excluir "\${programa}"?\`)) return;

            try {
                const res = await fetch('/api/milheiros', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ programa })
                });
                if (res.ok) {
                    showToast(\`"\${programa}" removido.\`);
                    fetchMilheiros();
                } else {
                    const err = await res.json();
                    alert('Erro: ' + (err.error || 'Falha ao excluir'));
                }
            } catch(e) {
                alert('Erro na conexão.');
            }
        }

        // ========== Destination Images Management ==========
        let destCurrentPage = 1;
        let destTotalPages = 1;
        let destSearchTimeout = null;

        function isValidHttpUrl(value) {
            try {
                const parsed = new URL(value);
                return parsed.protocol === 'http:' || parsed.protocol === 'https:';
            } catch (_) {
                return false;
            }
        }

        function handleDestAddKey(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                addDestination();
            }
        }

        async function addDestination() {
            const cidadeInput = document.getElementById('new-dest-cidade');
            const urlInput = document.getElementById('new-dest-url');
            const cidade = cidadeInput.value.trim();
            const url = urlInput.value.trim();

            if (!cidade || !url) {
                alert('Preencha a cidade e a URL da imagem.');
                return;
            }

            if (!isValidHttpUrl(url)) {
                alert('Informe uma URL valida com http ou https.');
                return;
            }

            try {
                const res = await fetch('/api/destinations', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cidade: cidade, url: url })
                });

                if (res.ok) {
                    showToast('Destino "' + cidade + '" salvo com sucesso!');
                    cidadeInput.value = '';
                    urlInput.value = '';
                    document.getElementById('dest-search').value = cidade;
                    destCurrentPage = 1;
                    await fetchDestinations(1, cidade);
                } else {
                    const err = await res.json();
                    alert('Erro: ' + (err.error || 'Falha ao salvar destino'));
                }
            } catch (e) {
                alert('Erro na conexao.');
            }
        }

        async function fetchDestinations(page, search) {
            page = page || destCurrentPage;
            search = search !== undefined ? search : (document.getElementById('dest-search').value || '');
            try {
                const params = new URLSearchParams({ page: String(page), limit: '30' });
                if (search) params.set('search', search);
                const res = await fetch('/api/destinations?' + params.toString());
                const data = await res.json();
                if (data.totalPages > 0 && page > data.totalPages) {
                    return fetchDestinations(data.totalPages, search);
                }
                destCurrentPage = data.page;
                destTotalPages = data.totalPages;
                document.getElementById('dest-count').innerText = '(' + data.total + ' destinos)';
                document.getElementById('dest-page-info').innerText = data.totalPages > 0 ? (data.page + ' / ' + data.totalPages) : '0 / 0';
                document.getElementById('dest-prev').disabled = data.page <= 1;
                document.getElementById('dest-next').disabled = data.page >= data.totalPages;
                renderDestinations(data.destinations);
            } catch (err) {
                console.error('Erro ao buscar destinos:', err);
            }
        }

        function renderDestinations(list) {
            const grid = document.getElementById('dest-grid');
            grid.innerHTML = '';
            if (!list || list.length === 0) {
                grid.innerHTML = '<div class="col-span-full text-center text-gray-400 py-8 text-sm">Nenhum destino encontrado.</div>';
                return;
            }
            list.forEach(function(item) {
                const card = document.createElement('div');
                card.className = 'group relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-cyan-500/30 transition-all hover:bg-white/10';
                card.setAttribute('data-cidade', item.cidade);
                card.setAttribute('data-custom', item.custom ? 'true' : 'false');
                const statusBadge = item.custom
                    ? '<span class="absolute top-2 right-2 text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 z-10">Novo</span>'
                    : (item.overridden
                        ? '<span class="absolute top-2 right-2 text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 z-10">Editado</span>'
                        : '');
                const deleteLabel = item.custom ? 'Excluir' : 'Reverter';
                const deleteButton = item.overridden
                    ? '<button onclick="deleteDest(event, this)" class="dest-delete-btn text-[10px] text-red-400 hover:text-red-300 font-medium px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors whitespace-nowrap">' + deleteLabel + '</button>'
                    : '';
                card.innerHTML =
                    statusBadge +
                    '<div class="relative w-full h-32 bg-black/40 overflow-hidden">' +
                        '<img src="' + item.url + '" alt="' + item.cidade + '" class="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" loading="lazy" onerror="this.src=\\'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&q=80\\'" />' +
                    '</div>' +
                    '<div class="p-3">' +
                        '<h4 class="text-sm font-semibold text-white truncate mb-2">' + item.cidade + '</h4>' +
                        '<div class="flex gap-1">' +
                            '<input type="text" value="' + item.url + '" class="dest-url-input hidden flex-1 bg-white/10 border border-cyan-500/30 rounded-lg px-2 py-1 text-[10px] text-gray-300 focus:outline-none" />' +
                            '<button onclick="startEditDest(this)" class="dest-edit-btn flex-1 text-[10px] text-cyan-400 hover:text-cyan-300 font-medium py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors">Editar URL</button>' +
                            '<button onclick="saveDest(this)" class="dest-save-btn hidden text-[10px] text-green-400 hover:text-green-300 font-medium px-2 py-1 rounded-lg bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition-colors whitespace-nowrap">Salvar</button>' +
                            '<button onclick="cancelEditDest(this)" class="dest-cancel-btn hidden text-[10px] text-gray-400 hover:text-gray-300 font-medium px-2 py-1 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors whitespace-nowrap">X</button>' +
                            deleteButton +
                        '</div>' +
                    '</div>';
                grid.appendChild(card);
            });
        }

        function startEditDest(btn) {
            const card = btn.closest('[data-cidade]');
            card.querySelector('.dest-url-input').classList.remove('hidden');
            card.querySelector('.dest-edit-btn').classList.add('hidden');
            card.querySelector('.dest-save-btn').classList.remove('hidden');
            card.querySelector('.dest-cancel-btn').classList.remove('hidden');
            const deleteBtn = card.querySelector('.dest-delete-btn');
            if (deleteBtn) deleteBtn.classList.add('hidden');
            card.querySelector('.dest-url-input').focus();
            card.querySelector('.dest-url-input').select();
        }

        function cancelEditDest(btn) {
            const card = btn.closest('[data-cidade]');
            card.querySelector('.dest-url-input').classList.add('hidden');
            card.querySelector('.dest-edit-btn').classList.remove('hidden');
            card.querySelector('.dest-save-btn').classList.add('hidden');
            card.querySelector('.dest-cancel-btn').classList.add('hidden');
            const deleteBtn = card.querySelector('.dest-delete-btn');
            if (deleteBtn) deleteBtn.classList.remove('hidden');
        }

        async function saveDest(btn) {
            const card = btn.closest('[data-cidade]');
            const cidade = card.getAttribute('data-cidade');
            const newUrl = card.querySelector('.dest-url-input').value.trim();
            if (!newUrl) { alert('URL vazia'); return; }
            if (!isValidHttpUrl(newUrl)) { alert('Informe uma URL valida com http ou https.'); return; }
            try {
                const res = await fetch('/api/destinations', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cidade: cidade, url: newUrl })
                });
                if (res.ok) {
                    showToast('Imagem de "' + cidade + '" atualizada!');
                    await fetchDestinations(destCurrentPage);
                } else {
                    const err = await res.json();
                    alert('Erro: ' + (err.error || 'Falha ao salvar'));
                }
            } catch(e) {
                alert('Erro na conexao.');
            }
        }

        async function deleteDest(event, btn) {
            event.stopPropagation();
            const card = btn.closest('[data-cidade]');
            const cidade = card.getAttribute('data-cidade');
            const isCustom = card.getAttribute('data-custom') === 'true';
            const confirmText = isCustom
                ? 'Tem certeza que deseja excluir o destino "' + cidade + '"?'
                : 'Tem certeza que deseja remover o override de "' + cidade + '"?';

            if (!confirm(confirmText)) return;

            try {
                const res = await fetch('/api/destinations', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cidade: cidade })
                });
                if (res.ok) {
                    showToast(isCustom ? 'Destino "' + cidade + '" removido.' : 'Override de "' + cidade + '" removido.');
                    await fetchDestinations(destCurrentPage);
                } else {
                    const err = await res.json();
                    alert('Erro: ' + (err.error || 'Falha ao remover'));
                }
            } catch (e) {
                alert('Erro na conexao.');
            }
        }

        function searchDestinations() {
            if (destSearchTimeout) clearTimeout(destSearchTimeout);
            destSearchTimeout = setTimeout(function() {
                destCurrentPage = 1;
                fetchDestinations(1);
            }, 300);
        }

        function destPrevPage() {
            if (destCurrentPage > 1) fetchDestinations(destCurrentPage - 1);
        }

        function destNextPage() {
            if (destCurrentPage < destTotalPages) fetchDestinations(destCurrentPage + 1);
        }

        // ===== BuscaMilhas Toggle =====
        async function fetchBmEnabled() {
            try {
                const res = await fetch('/api/buscamilhas/enabled');
                const data = await res.json();
                document.getElementById('bm-toggle').checked = data.enabled;
                document.getElementById('bm-status-text').textContent = data.enabled ? 'Ativado' : 'Desativado';
                document.getElementById('bm-status-text').className = 'text-xs ' + (data.enabled ? 'text-green-400' : 'text-red-400');
            } catch(e) { console.error('Erro ao carregar estado BM:', e); }
        }

        async function toggleBmEnabledUI(enabled) {
            try {
                const res = await fetch('/api/buscamilhas/enabled', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ enabled: enabled })
                });
                if (res.ok) {
                    document.getElementById('bm-status-text').textContent = enabled ? 'Ativado' : 'Desativado';
                    document.getElementById('bm-status-text').className = 'text-xs ' + (enabled ? 'text-green-400' : 'text-red-400');
                    showToast(enabled ? 'BuscaMilhas ativado' : 'BuscaMilhas desativado');
                }
            } catch(e) { alert('Erro ao alterar estado BuscaMilhas.'); }
        }

        // ===== BuscaMilhas Config =====
        async function fetchBmConfig() {
            try {
                const res = await fetch('/api/buscamilhas/config');
                const data = await res.json();
                const previewMap = { 'authorization': 'bm-auth-preview', 'session_authorization': 'bm-session-preview', 'x_api_key': 'bm-key-preview' };
                for (const item of data) {
                    const el = document.getElementById(previewMap[item.key]);
                    if (el) el.textContent = 'Atual: ' + item.value;
                }
            } catch(e) { console.error('Erro ao carregar config BM:', e); }
        }

        async function saveBmConfig(key) {
            const inputId = 'bm-' + key;
            const value = document.getElementById(inputId).value.trim();
            if (!value) return alert('Valor nao pode ser vazio');
            try {
                const res = await fetch('/api/buscamilhas/config', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key: key, value: value })
                });
                if (res.ok) {
                    showToast('Config "' + key + '" salva!');
                    document.getElementById(inputId).value = '';
                    fetchBmConfig();
                } else {
                    const err = await res.json();
                    alert('Erro: ' + (err.error || 'Falha'));
                }
            } catch(e) { alert('Erro na conexao.'); }
        }

        // ===== BuscaMilhas Manual Search =====
        async function searchBm() {
            const origin = document.getElementById('bm-origin').value.toUpperCase().trim();
            const destination = document.getElementById('bm-destination').value.toUpperCase().trim();
            const departure = document.getElementById('bm-departure').value.trim();
            const returnDate = document.getElementById('bm-return').value.trim();
            const airline = document.getElementById('bm-airline').value;

            if (!origin || !destination || !departure) return alert('Preencha origem, destino e data de ida');

            document.getElementById('bm-loading').classList.remove('hidden');
            document.getElementById('bm-results').innerHTML = '';
            document.getElementById('bm-search-btn').disabled = true;

            try {
                const res = await fetch('/api/buscamilhas/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ origin: origin, destination: destination, departureDate: departure, returnDate: returnDate || undefined, airline: airline })
                });
                const data = await res.json();
                if (data.error) {
                    document.getElementById('bm-results').innerHTML = '<p class="text-red-400 text-sm">' + data.error + '</p>';
                } else {
                    renderBmResults(data);
                }
            } catch(err) {
                document.getElementById('bm-results').innerHTML = '<p class="text-red-400 text-sm">Erro na busca</p>';
            } finally {
                document.getElementById('bm-loading').classList.add('hidden');
                document.getElementById('bm-search-btn').disabled = false;
            }
        }

        function renderBmResults(data) {
            const flights = data.flights || [];
            if (flights.length === 0) {
                document.getElementById('bm-results').innerHTML = '<p class="text-gray-400 text-sm py-4 text-center">Nenhum voo encontrado (total: ' + (data.total || 0) + ')</p>';
                return;
            }

            const idaFlights = flights.filter(function(f) { return f.direction === 'ida'; });
            const voltaFlights = flights.filter(function(f) { return f.direction === 'volta'; });

            let html = '<div class="space-y-4">';
            if (idaFlights.length > 0) {
                html += '<h3 class="text-sm font-semibold text-yellow-300">Ida (' + idaFlights.length + ' voos)</h3>';
                html += '<div class="overflow-x-auto"><table class="w-full text-xs text-left">';
                html += '<thead><tr class="text-gray-400 border-b border-white/10"><th class="py-2 px-3">Voo</th><th class="py-2 px-3">Rota</th><th class="py-2 px-3">Data</th><th class="py-2 px-3">Hora</th><th class="py-2 px-3">Cabine</th><th class="py-2 px-3 text-right">Milhas</th><th class="py-2 px-3 text-right">Taxas</th></tr></thead><tbody>';
                for (var i = 0; i < idaFlights.length; i++) {
                    var f = idaFlights[i];
                    html += '<tr class="border-b border-white/5 hover:bg-white/5"><td class="py-2 px-3 text-white font-mono">' + f.flightNumber + '</td><td class="py-2 px-3">' + f.origin + ' → ' + f.destination + '</td><td class="py-2 px-3">' + f.date + '</td><td class="py-2 px-3">' + f.time + '</td><td class="py-2 px-3">' + f.cabin + '</td><td class="py-2 px-3 text-right font-semibold text-yellow-300">' + f.miles.toLocaleString('pt-BR') + '</td><td class="py-2 px-3 text-right text-gray-400">R$ ' + f.boardingFee.toFixed(2).replace('.', ',') + '</td></tr>';
                }
                html += '</tbody></table></div>';
            }
            if (voltaFlights.length > 0) {
                html += '<h3 class="text-sm font-semibold text-blue-300 mt-4">Volta (' + voltaFlights.length + ' voos)</h3>';
                html += '<div class="overflow-x-auto"><table class="w-full text-xs text-left">';
                html += '<thead><tr class="text-gray-400 border-b border-white/10"><th class="py-2 px-3">Voo</th><th class="py-2 px-3">Rota</th><th class="py-2 px-3">Data</th><th class="py-2 px-3">Hora</th><th class="py-2 px-3">Cabine</th><th class="py-2 px-3 text-right">Milhas</th><th class="py-2 px-3 text-right">Taxas</th></tr></thead><tbody>';
                for (var j = 0; j < voltaFlights.length; j++) {
                    var fv = voltaFlights[j];
                    html += '<tr class="border-b border-white/5 hover:bg-white/5"><td class="py-2 px-3 text-white font-mono">' + fv.flightNumber + '</td><td class="py-2 px-3">' + fv.origin + ' → ' + fv.destination + '</td><td class="py-2 px-3">' + fv.date + '</td><td class="py-2 px-3">' + fv.time + '</td><td class="py-2 px-3">' + fv.cabin + '</td><td class="py-2 px-3 text-right font-semibold text-blue-300">' + fv.miles.toLocaleString('pt-BR') + '</td><td class="py-2 px-3 text-right text-gray-400">R$ ' + fv.boardingFee.toFixed(2).replace('.', ',') + '</td></tr>';
                }
                html += '</tbody></table></div>';
            }
            html += '</div>';
            document.getElementById('bm-results').innerHTML = html;
        }

        // ===== BuscaMilhas History =====
        async function fetchBmHistory() {
            try {
                const res = await fetch('/api/buscamilhas/results');
                const data = await res.json();
                renderBmHistory(data);
            } catch(e) { console.error('Erro ao carregar historico BM:', e); }
        }

        function renderBmHistory(list) {
            if (!list || list.length === 0) {
                document.getElementById('bm-history').innerHTML = '<p class="text-gray-500 text-sm text-center py-4">Nenhuma verificacao ainda</p>';
                return;
            }
            let html = '';
            for (var i = 0; i < list.length; i++) {
                var item = list[i];
                var statusColor = item.verified ? 'text-emerald-400' : (item.skipped ? 'text-gray-400' : (item.error ? 'text-yellow-400' : 'text-red-400'));
                var statusIcon = item.verified ? 'V' : (item.skipped ? 'S' : (item.error ? '!' : 'X'));
                var statusText = item.verified ? 'Verificado' : (item.skipped ? 'Pulado' : (item.error ? 'Erro' : 'Nao encontrado'));
                var offer = item.offer_data || {};
                var route = (offer.origem || '?') + ' → ' + (offer.destino || '?');
                var miles = (offer.milhas_ida || 0) + (offer.milhas_volta || 0);
                var timeAgo = timeSince(item.created_at);

                html += '<div class="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-colors cursor-pointer" onclick="this.querySelector(\\'.bm-detail\\').classList.toggle(\\'hidden\\')">';
                html += '<span class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ' + statusColor + ' bg-white/5">' + statusIcon + '</span>';
                html += '<div class="flex-1 min-w-0"><div class="text-sm text-white truncate">' + route + ' <span class="text-gray-500">(' + (offer.programa_mais_vantajoso || '?') + ')</span></div>';
                html += '<div class="text-[10px] text-gray-500">' + statusText + ' | ' + miles.toLocaleString('pt-BR') + ' milhas | ' + timeAgo + '</div></div>';
                html += '<span class="text-xs ' + statusColor + ' font-semibold">' + (item.matched_miles ? item.matched_miles.toLocaleString('pt-BR') + ' mi' : (item.error || statusText)) + '</span>';
                html += '<div class="bm-detail hidden w-full mt-2 text-[10px] text-gray-500 bg-black/20 p-2 rounded-lg font-mono overflow-x-auto max-h-40 overflow-y-auto">' + (item.error || 'Match: ' + (item.matched_miles || 0) + ' milhas') + '</div>';
                html += '</div>';
            }
            document.getElementById('bm-history').innerHTML = html;
        }

        function timeSince(dateStr) {
            var now = new Date();
            var d = new Date(dateStr);
            var diff = Math.floor((now - d) / 1000);
            if (diff < 60) return diff + 's atras';
            if (diff < 3600) return Math.floor(diff / 60) + 'min atras';
            if (diff < 86400) return Math.floor(diff / 3600) + 'h atras';
            return Math.floor(diff / 86400) + 'd atras';
        }

        fetchData();
        fetchMilheiros();
        fetchDestinations(1, '');
        fetchBmEnabled();
        fetchBmConfig();
        fetchBmHistory();
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
    // 1. Fetch recent queue (last 24 hours) from whatsapp_offers_temp - individual messages
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);

    const { data: queueData, error: queueError } = await supabase
      .from('whatsapp_offers_temp')
      .select('id, group_phone, chat_name, msg_type, content, extracted_data, processed, created_at')
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false })
      .limit(100);

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

    // Return individual messages for the queue
    const queueList = (queueData || []).map((msg: any) => {
      // Detect source from chat_name
      const chatLower = (msg.chat_name || '').toLowerCase();
      let fonte = 'Desconhecido';
      if (chatLower.includes('mundo ultra') || chatLower.includes('passageiro')) {
        fonte = 'Passageiro de Primeira';
      } else if (chatLower.includes('alerta') || chatLower.includes('premium')) {
        fonte = 'Alerta de Voos';
      }

      return {
        id: msg.id,
        group_phone: msg.group_phone,
        chat_name: msg.chat_name,
        msg_type: msg.msg_type,
        content_preview: msg.msg_type === 'text'
          ? (msg.content || '').substring(0, 120)
          : (msg.content || '').substring(0, 80),
        content: msg.content || '',
        extracted_data: msg.extracted_data || null,
        processed: msg.processed,
        created_at: msg.created_at,
        fonte: fonte,
      };
    });

    return res.status(200).json({
        queue: queueList,
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
