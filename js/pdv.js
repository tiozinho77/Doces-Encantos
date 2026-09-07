// 1. Configuração das credenciais do Supabase
const SUPABASE_URL = 'https://pznuqeqtytyjtupxnzqk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bnVxZXF0eXR5anR1cHhuenFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MDIyMTAsImV4cCI6MjEwMzk3ODIxMH0.ZadwdTr-pERj7mBYQGnIRpg7M4RhN9K3xNCpcG_GOqQ'; // Insira sua chave anon publica aqui

const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let somAtivado = false;
const audioAlerta = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

document.addEventListener('DOMContentLoaded', () => {
    carregarPedidos();
    iniciarEscutaRealtime();
});

function ativarSom() {
    audioAlerta.play().then(() => {
        somAtivado = true;
        document.getElementById('btn-som').textContent = '🔔 Som Ativado';
        document.getElementById('btn-som').style.background = '#2e7d32';
    }).catch(() => {
        alert('Clique na página para permitir os alertas sonoros.');
    });
}

// 2. Busca inicial de pedidos e seus itens vinculados
async function carregarPedidos() {
    const {data: pedidos, error} = await _supabase
            .from('pedidos')
            .select(`
            *,
            itens_pedido (
                *,
                produtos (nome)
            )
        `)
            .order('criado_em', {ascending: false});

    if (error) {
        console.error('Erro ao buscar pedidos:', error.message);
        return;
    }

    renderizarKanban(pedidos);
}

// 3. Renderiza os cards nas colunas correspondentes
function renderizarKanban(pedidos) {
    const colunas = ['PENDENTE', 'PREPARANDO', 'A_CAMINHO', 'CONCLUIDO'];

    // Limpa containers
    colunas.forEach(c => {
        document.getElementById(`container-${c}`).innerHTML = '';
        document.getElementById(`count-${c.toLowerCase()}`).textContent = '0';
    });

    const contadores = {PENDENTE: 0, PREPARANDO: 0, A_CAMINHO: 0, CONCLUIDO: 0};

    pedidos.forEach(p => {
        if (!contadores.hasOwnProperty(p.status))
            return;

        contadores[p.status]++;
        const container = document.getElementById(`container-${p.status}`);

        const hora = new Date(p.criado_em).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});

        // Monta lista de itens
        let itensHTML = '';
        if (p.itens_pedido && p.itens_pedido.length > 0) {
            p.itens_pedido.forEach(item => {
                const nomeProd = item.produtos ? item.produtos.nome : 'Item';
                itensHTML += `
                    <div class="card-item-row">
                        <span>${item.quantidade}x ${nomeProd}</span>
                        <span>R$ ${item.subtotal.toFixed(2).replace('.', ',')}</span>
                    </div>
                `;
            });
        }

        // Define o próximo status
        let proximoStatus = '';
        let textoBotao = '';
        if (p.status === 'PENDENTE') {
            proximoStatus = 'PREPARANDO';
            textoBotao = '▶️ Iniciar Preparo';
        } else if (p.status === 'PREPARANDO') {
            proximoStatus = 'A_CAMINHO';
            textoBotao = '🚀 Enviar / Pronto';
        } else if (p.status === 'A_CAMINHO') {
            proximoStatus = 'CONCLUIDO';
            textoBotao = '✅ Concluir';
        }

        const card = document.createElement('div');
        card.className = 'order-card';
        card.innerHTML = `
            <div class="card-top">
                <span class="card-id">#${p.id}</span>
                <span class="card-type">${p.tipo}</span>
                <span>${hora}</span>
            </div>
            
            <div class="card-info">
                <strong>Endereço:</strong> ${p.endereco_snapshot || 'Balcão'}<br>
                <strong>Pagamento:</strong> ${p.forma_pagamento} ${p.troco_para ? `(Troco p/ R$ ${p.troco_para})` : ''}
            </div>

            ${p.observacao ? `<div class="card-obs">⚠️ ${p.observacao}</div>` : ''}

            <div class="card-items">${itensHTML}</div>

            <div class="card-total">Total: R$ ${p.valor_total.toFixed(2).replace('.', ',')}</div>

            <div class="card-actions">
                ${p.status !== 'CONCLUIDO' ? `<button class="btn-action btn-next" onclick="mudarStatus(${p.id}, '${proximoStatus}')">${textoBotao}</button>` : ''}
                ${p.status === 'PENDENTE' ? `<button class="btn-action btn-cancel" onclick="mudarStatus(${p.id}, 'CANCELADO')">❌ Cancelar</button>` : ''}
            </div>
        `;

        container.appendChild(card);
    });

    // Atualiza contadores do cabeçalho
    Object.keys(contadores).forEach(c => {
        document.getElementById(`count-${c.toLowerCase()}`).textContent = contadores[c];
    });
}

// 4. Atualiza o status do pedido no banco de dados
async function mudarStatus(pedidoId, novoStatus) {
    const {error} = await _supabase
            .from('pedidos')
            .update({status: novoStatus})
            .eq('id', pedidoId);

    if (error) {
        alert('Erro ao atualizar pedido: ' + error.message);
    } else {
        carregarPedidos();
    }
}

// 5. Escuta novos pedidos ou atualizações em Tempo Real (Realtime)
function iniciarEscutaRealtime() {
    const statusLabel = document.getElementById('realtime-status');

    _supabase
            .channel('pedidos-realtime')
            .on('postgres_changes', {event: '*', schema: 'public', table: 'pedidos'}, (payload) => {

                // Se for um novo pedido inserido
                if (payload.eventType === 'INSERT') {
                    if (somAtivado) {
                        audioAlerta.play().catch(() => {
                        });
                    }
                }

                // Recarrega a tela com os dados atualizados
                carregarPedidos();
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    statusLabel.textContent = '🟢 Conectado em Tempo Real';
                    statusLabel.style.color = '#2e7d32';
                }
            });
}