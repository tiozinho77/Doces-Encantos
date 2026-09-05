// 1. Configuração do Supabase (Substitua pelas suas chaves do Supabase)
const SUPABASE_URL = 'https://App-PDV.supabase.co';
const SUPABASE_KEY = 'sb_publishable_WTF_VVl_WAjoB4bb8BcVOg_87re_QGi';

const _supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// Estado Global da Aplicação
let produtosList = [];
let categoriasList = [];
let carrinho = [];
let taxaEntrega = 0.00;

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    await carregarCategorias();
    await carregarProdutos();
});

// Busca Categorias no Supabase
async function carregarCategorias() {
    if (!_supabase) return;
    const { data, error } = await _supabase
        .from('categorias')
        .select('*')
        .eq('ativo', true)
        .order('ordem');

    if (data && !error) {
        categoriasList = data;
        renderizarCategorias();
    }
}

// Busca Produtos no Supabase
async function carregarProdutos() {
    if (!_supabase) {
        // Dados de teste caso as chaves não estejam configuradas ainda
        produtosList = [
            { id: 1, categoria_id: 1, nome: 'Bolo de Cenoura', descricao: 'Com cobertura generosa de brigadeiro', preco: 15.00, imagem_url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300' },
            { id: 2, categoria_id: 2, nome: 'Brigadeiro Tradicional', descricao: '20g de puro chocolate belga', preco: 4.50, imagem_url: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=300' }
        ];
        renderizarProdutos(produtosList);
        return;
    }

    const { data, error } = await _supabase
        .from('produtos')
        .select('*')
        .eq('ativo', true);

    if (data && !error) {
        produtosList = data;
        renderizarProdutos(produtosList);
    }
}

function renderizarCategorias() {
    const nav = document.getElementById('categories-container');
    categoriasList.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'cat-btn';
        btn.textContent = cat.nome;
        btn.onclick = () => filtrarCategoria(cat.id);
        nav.appendChild(btn);
    });
}

function renderizarProdutos(lista) {
    const grid = document.getElementById('products-container');
    grid.innerHTML = '';

    lista.forEach(p => {
        const img = p.imagem_url || 'https://via.placeholder.com/300?text=Sem+Foto';
        grid.innerHTML += `
            <div class="product-card">
                <img src="${img}" class="product-img" alt="${p.nome}">
                <div class="product-info">
                    <h3 class="product-title">${p.nome}</h3>
                    <p class="product-desc">${p.descricao || ''}</p>
                    <div class="product-price">R$ ${p.preco.toFixed(2).replace('.', ',')}</div>
                    <button class="add-btn" onclick="adicionarAoCarrinho(${p.id})">Adicionar</button>
                </div>
            </div>
        `;
    });
}

function filtrarCategoria(catId) {
    const btns = document.querySelectorAll('.cat-btn');
    btns.forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');

    if (catId === 'todas') {
        renderizarProdutos(produtosList);
    } else {
        const filtrados = produtosList.filter(p => p.categoria_id === catId);
        renderizarProdutos(filtrados);
    }
}

// Gerenciamento do Carrinho
function adicionarAoCarrinho(produtoId) {
    const prod = produtosList.find(p => p.id === produtoId);
    const itemExistente = carrinho.find(i => i.id === produtoId);

    if (itemExistente) {
        itemExistente.qtd++;
    } else {
        carrinho.push({ ...prod, qtd: 1 });
    }
    atualizarCarrinho();
}

function alterarQtd(produtoId, delta) {
    const item = carrinho.find(i => i.id === produtoId);
    if (!item) return;

    item.qtd += delta;
    if (item.qtd <= 0) {
        carrinho = carrinho.filter(i => i.id !== produtoId);
    }
    atualizarCarrinho();
}

function atualizarCarrinho() {
    // Total de itens
    const totalItens = carrinho.reduce((sum, item) => sum + item.qtd, 0);
    document.getElementById('cart-count').textContent = totalItens;

    const container = document.getElementById('cart-items');
    const summary = document.getElementById('cart-summary');

    if (carrinho.length === 0) {
        container.innerHTML = '<p class="empty-cart">Seu carrinho está vazio.</p>';
        summary.style.display = 'none';
        return;
    }

    summary.style.display = 'block';
    container.innerHTML = '';

    let subtotal = 0;
    carrinho.forEach(item => {
        const itemSubtotal = item.preco * item.qtd;
        subtotal += itemSubtotal;

        container.innerHTML += `
            <div class="cart-item">
                <div>
                    <strong>${item.nome}</strong><br>
                    <small>R$ ${item.preco.toFixed(2).replace('.', ',')}</small>
                </div>
                <div class="cart-item-qty">
                    <button class="qty-btn" onclick="alterarQtd(${item.id}, -1)">-</button>
                    <span>${item.qtd}</span>
                    <button class="qty-btn" onclick="alterarQtd(${item.id}, 1)">+</button>
                </div>
            </div>
        `;
    });

    const tipoPedido = document.getElementById('tipo_pedido').value;
    const frete = tipoPedido === 'DELIVERY' ? taxaEntrega : 0;
    const total = subtotal + frete;

    document.getElementById('subtotal-val').textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
    document.getElementById('taxa-val').textContent = `R$ ${frete.toFixed(2).replace('.', ',')}`;
    document.getElementById('total-val').textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
}

function toggleCarrinho() {
    const modal = document.getElementById('cart-modal');
    modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
}

function atualizarTaxa() {
    atualizarCarrinho();
    const tipo = document.getElementById('tipo_pedido').value;
    const endSection = document.getElementById('endereco-section');
    const inputs = endSection.querySelectorAll('input');

    if (tipo === 'RETIRADA') {
        endSection.style.display = 'none';
        inputs.forEach(i => i.removeAttribute('required'));
    } else {
        endSection.style.display = 'block';
        inputs.forEach(i => i.setAttribute('required', 'true'));
        document.getElementById('cli_complemento').removeAttribute('required');
        document.getElementById('cli_referencia').removeAttribute('required');
    }
}

function toggleTroco() {
    const forma = document.getElementById('forma_pagamento').value;
    const trocoGroup = document.getElementById('troco-group');
    trocoGroup.style.display = forma === 'DINHEIRO' ? 'block' : 'none';
}

// Envio do Pedido ao Supabase
async function finalizarPedido(event) {
    event.preventDefault();
    const btn = document.getElementById('btn-submit');
    btn.disabled = true;
    btn.textContent = 'Enviando...';

    const tipo = document.getElementById('tipo_pedido').value;
    const nome = document.getElementById('cli_nome').value;
    const tel = document.getElementById('cli_telefone').value;
    const rua = document.getElementById('cli_rua').value;
    const num = document.getElementById('cli_numero').value;
    const bairro = document.getElementById('cli_bairro').value;
    const comp = document.getElementById('cli_complemento').value;
    const ref = document.getElementById('cli_referencia').value;

    const subtotal = carrinho.reduce((sum, i) => sum + (i.preco * i.qtd), 0);
    const frete = tipo === 'DELIVERY' ? taxaEntrega : 0;
    const total = subtotal + frete;

    const endFormatted = tipo === 'DELIVERY' ? `${rua}, ${num} - ${bairro} (${comp}) [Ref: ${ref}]` : 'RETIRADA NO BALCÃO';

    try {
        if (!_supabase) throw new Error('Configure o Supabase no app.js!');

        // 1. Cadastra/Atualiza o Cliente
        const { data: cliente } = await _supabase
            .from('clientes')
            .upsert([{ nome, telefone: tel, rua, numero: num, bairro, complemento: comp, ponto_referencia: ref }], { onConflict: 'telefone' })
            .select()
            .single();

        // 2. Grava o Pedido
        const { data: pedido, error: errPed } = await _supabase
            .from('pedidos')
            .insert([{
                cliente_id: cliente ? cliente.id : null,
                tipo,
                status: 'PENDENTE',
                valor_produtos: subtotal,
                taxa_entrega: frete,
                valor_total: total,
                forma_pagamento: document.getElementById('forma_pagamento').value,
                troco_para: document.getElementById('troco_para').value || null,
                endereco_snapshot: endFormatted,
                observacao: document.getElementById('observacao').value
            }])
            .select()
            .single();

        if (errPed) throw errPed;

        // 3. Grava os Itens do Pedido
        const itens = carrinho.map(item => ({
            pedido_id: pedido.id,
            produto_id: item.id,
            quantidade: item.qtd,
            preco_unitario: item.preco,
            subtotal: item.preco * item.qtd
        }));

        const { error: errItens } = await _supabase.from('itens_pedido').insert(itens);
        if (errItens) throw errItens;

        alert('🎉 Pedido realizado com sucesso! Acompanhe pelo seu WhatsApp.');
        carrinho = [];
        atualizarCarrinho();
        toggleCarrinho();

    } catch (err) {
        alert('Erro ao enviar pedido: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Enviar Pedido';
    }
}