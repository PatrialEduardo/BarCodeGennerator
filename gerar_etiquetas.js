let produtos = [];

function adicionarProduto() {
  const idx = produtos.length;
  const div = document.createElement('div');
  div.className = 'produto-item';
  div.innerHTML = `
    <label>Referência: <input type="text" maxlength="5" id="ref_${idx}" required></label>
    <label>Descrição: <input type="text" maxlength="40" id="desc_${idx}" required></label>
  `;
  document.getElementById('produtos-list').appendChild(div);
  produtos.push({ref: '', desc: ''});
}

function calculaDigitoEAN13(codigo) {
  let somaImpar = 0, somaPar = 0;
  for (let i = 0; i < 12; i++) {
    if (i % 2 === 0) somaImpar += parseInt(codigo[i]);
    else somaPar += parseInt(codigo[i]);
  }
  const total = somaImpar + somaPar * 3;
  const digito = (10 - (total % 10)) % 10;
  return digito;
}

function gerarEtiquetas() {
  const prefixo = document.getElementById('prefixo').value.trim();
  if (!prefixo.match(/^\d{7}$/)) {
    alert('Prefixo GS1 deve ter 7 dígitos.');
    return;
  }
  // Atualiza produtos
  for (let i = 0; i < produtos.length; i++) {
    const ref = document.getElementById(`ref_${i}`).value.trim().padStart(5, '0');
    const desc = document.getElementById(`desc_${i}`).value.trim();
    if (!ref.match(/^\d{5}$/) || !desc) {
      alert('Preencha todas as referências e descrições corretamente.');
      return;
    }
    produtos[i] = {ref, desc};
  }
  if (produtos.length === 0) {
    alert('Adicione pelo menos um produto.');
    return;
  }
  // Monta etiquetas
  let html = '';
  for (let i = 0; i < produtos.length; i += 2) {
    html += '<div class="linha-etiquetas">';
    for (let j = 0; j < 2; j++) {
      const idx = i + j;
      if (idx >= produtos.length) break;
      const prod = produtos[idx];
      const codigoBase = prefixo + prod.ref;
      const digito = calculaDigitoEAN13(codigoBase);
      const codigoFinal = codigoBase + digito;
      html += `
        <div class="etiqueta">
          <div class="etiqueta-nome">${prod.desc} - ${codigoFinal}</div>
          <svg id="barcode_${idx}" class="barcode-svg"></svg>
        </div>
      `;
    }
    html += '</div>';
  }
  document.getElementById('etiquetas-preview').innerHTML = html;
  // Gera os códigos de barras
  for (let i = 0; i < produtos.length; i++) {
    const codigoBase = prefixo + produtos[i].ref;
    const digito = calculaDigitoEAN13(codigoBase);
    const codigoFinal = codigoBase + digito;
    JsBarcode(`#barcode_${i}`, codigoFinal, {
      format: "ean13",
      width: 2,
      height: 60,
      displayValue: true,
      fontSize: 18,
      margin: 0
    });
  }
  document.getElementById('download-btn').classList.add('show');
}

async function gerarPDF() {
  const prefixo = document.getElementById('prefixo').value.trim();
  if (!prefixo.match(/^\d{7}$/)) {
    alert('Prefixo GS1 deve ter 7 dígitos.');
    return;
  }
  // Atualiza produtos
  for (let i = 0; i < produtos.length; i++) {
    const ref = document.getElementById(`ref_${i}`).value.trim().padStart(5, '0');
    const desc = document.getElementById(`desc_${i}`).value.trim();
    produtos[i] = {ref, desc};
  }
  if (produtos.length === 0) {
    alert('Adicione pelo menos um produto.');
    return;
  }

  // Parâmetros de layout
  const etiquetasPorLinha = 2;
  const margemX = 30;
  const margemY = 30;
  const larguraEtiqueta = 260;
  const alturaEtiqueta = 120;
  const espacamentoX = 20;
  const espacamentoY = 20;

  // Cria PDF
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  for (let i = 0; i < produtos.length; i++) {
    const linha = Math.floor(i / etiquetasPorLinha);
    const coluna = i % etiquetasPorLinha;
    const x = margemX + coluna * (larguraEtiqueta + espacamentoX);
    const y = margemY + linha * (alturaEtiqueta + espacamentoY);

    // Monta código EAN-13
    const codigoBase = prefixo + produtos[i].ref;
    const digito = calculaDigitoEAN13(codigoBase);
    const codigoFinal = codigoBase + digito;

    // Gera código de barras em canvas
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, codigoFinal, {
      format: "ean13",
      width: 2,
      height: 50,
      displayValue: true,
      fontSize: 16,
      margin: 0
    });
    // Nome do produto acima do código
    pdf.setFontSize(12);
    pdf.text(`${produtos[i].desc} - ${codigoFinal}`, x, y + 18);

    // Adiciona o código de barras (imagem) ao PDF
    const imgData = canvas.toDataURL("image/png");
    pdf.addImage(imgData, 'PNG', x, y + 25, 200, 60);

    // Nova página se passar do limite
    if ((i + 1) % (etiquetasPorLinha * 7) === 0 && i !== produtos.length - 1) {
      pdf.addPage();
    }
  }

  pdf.save('etiquetas.pdf');
}