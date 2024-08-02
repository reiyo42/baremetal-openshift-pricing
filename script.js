const CORES_PER_MACHINE = 64;
let chart = null;

function initializePage() {
    const urlParams = new URLSearchParams(window.location.search);
    const comparisonCount = urlParams.get('count') || 1;
    document.getElementById('comparison_count').value = comparisonCount;
    updateForms();
    setValuesFromQuery(urlParams);
}

function updateForms() {
    const count = parseInt(document.getElementById('comparison_count').value);
    const container = document.getElementById('input-forms');
    const currentForms = container.children.length;

    if (count > currentForms) {
        for (let i = currentForms + 1; i <= count; i++) {
            container.appendChild(createForm(i));
        }
    } else if (count < currentForms) {
        for (let i = currentForms; i > count; i--) {
            container.removeChild(container.lastChild);
        }
    }
}

function createForm(index) {
    const div = document.createElement('div');
    div.className = 'form-column';
    div.innerHTML = `
        <h2>構成${index}</h2>
        <div class="form-group">
            <label for="workers${index}">冗長化のための最低必要Worker台数:</label>
            <input type="number" id="workers${index}" min="1" value="3">
        </div>
        
        <div class="form-group">
            <label for="vcpu${index}">アプリのための最低必要vCPU数:</label>
            <input type="number" id="vcpu${index}" min="1" value="16">
        </div>
        
        <div class="form-group">
            <label for="discount${index}">OpenShift単価の割引率 (%):</label>
            <input type="number" id="discount${index}" min="0" max="100" value="0">
        </div>
        
        <div class="form-group">
            <label for="config${index}">構成:</label>
            <select id="config${index}">
                <option value="virtual">vSphere+仮想OpenShift</option>
                <option value="baremetal">ベアメタル</option>
            </select>
        </div>

        <div class="form-group">
            <label for="license${index}">OpenShiftライセンス:</label>
            <select id="license${index}">
                <option value="premium">Premium</option>
                <option value="standard">Standard</option>
            </select>
        </div>
    `;
    return div;
}

function setValuesFromQuery(urlParams) {
    for (const [key, value] of urlParams.entries()) {
        const element = document.getElementById(key);
        if (element) {
            element.value = value;
        }
    }
}

function generateShareURL() {
    const url = new URL(window.location.href.split('?')[0]);
    const params = new URLSearchParams();

    // 共通設定
    params.append('count', document.getElementById('comparison_count').value);
    params.append('vsphere_price', document.getElementById('vsphere_price').value);
    params.append('vopenshift_price_premium', document.getElementById('vopenshift_price_premium').value);
    params.append('vopenshift_price_standard', document.getElementById('vopenshift_price_standard').value);
    params.append('bopenshift_price_premium', document.getElementById('bopenshift_price_premium').value);
    params.append('bopenshift_price_standard', document.getElementById('bopenshift_price_standard').value);
    params.append('machine_price', document.getElementById('machine_price').value);

    // 各構成の設定
    const count = parseInt(document.getElementById('comparison_count').value);
    for (let i = 1; i <= count; i++) {
        params.append(`workers${i}`, document.getElementById(`workers${i}`).value);
        params.append(`vcpu${i}`, document.getElementById(`vcpu${i}`).value);
        params.append(`discount${i}`, document.getElementById(`discount${i}`).value);
        params.append(`config${i}`, document.getElementById(`config${i}`).value);
        params.append(`license${i}`, document.getElementById(`license${i}`).value);
    }

    url.search = params.toString();
    showSharePopup(url.toString());
}

function showSharePopup(url) {
    const popup = document.createElement('div');
    popup.className = 'share-popup';
    popup.innerHTML = `
        <h3>共有用URL</h3>
        <input type="text" value="${url}" readonly>
        <button onclick="copyToClipboard('${url}')">コピー</button>
        <button onclick="closeSharePopup()">閉じる</button>
    `;
    document.body.appendChild(popup);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('URLがクリップボードにコピーされました。');
    });
}

function closeSharePopup() {
    const popup = document.querySelector('.share-popup');
    if (popup) {
        document.body.removeChild(popup);
    }
}

function calculate() {
    const count = parseInt(document.getElementById('comparison_count').value);
    const results = [];

    for (let i = 1; i <= count; i++) {
        results.push(calculateLicense(i));
    }
    
    displayResults(results);
}

function calculateLicense(formNumber) {
    // 入力値の取得
    const workers = parseInt(document.getElementById(`workers${formNumber}`).value);
    const vcpu = parseInt(document.getElementById(`vcpu${formNumber}`).value);
    const vspherePrice = parseFloat(document.getElementById('vsphere_price').value);
    const vopenshiftPricePremium = parseFloat(document.getElementById('vopenshift_price_premium').value);
    const vopenshiftPriceStandard = parseFloat(document.getElementById('vopenshift_price_standard').value);
    const bopenshiftPricePremium = parseFloat(document.getElementById('bopenshift_price_premium').value);
    const bopenshiftPriceStandard = parseFloat(document.getElementById('bopenshift_price_standard').value);
    const machinePrice = parseFloat(document.getElementById('machine_price').value);
    const discount = parseFloat(document.getElementById(`discount${formNumber}`).value) / 100;
    const config = document.getElementById(`config${formNumber}`).value;
    const license = document.getElementById(`license${formNumber}`).value;

    let vsphereCost = 0;
    let openshiftCost = 0;
    let machineCost = 0;

    if (config === 'virtual') {
        // 仮想環境の場合
        // コア数は必要vCPU数のみを参照
        const cores = vcpu;
        
        // vSphereのコスト計算
        vsphereCost = cores * vspherePrice;
        
        // OpenShiftのコスト計算（Premiumか Standardかで単価が異なる）
        openshiftCost = cores * (license === 'premium' ? vopenshiftPricePremium : vopenshiftPriceStandard) * (1 - discount);
        
        // マシン利用料の計算
        machineCost = cores * machinePrice;
    } else {
        // ベアメタルの場合
        // 必要なマシン数を計算（vCPU数とWorker数の大きい方で決定）
        const machines = Math.max(Math.ceil(vcpu / CORES_PER_MACHINE), workers);
        
        // OpenShiftのコスト計算（Premiumか Standardかで単価が異なる）
        openshiftCost = machines * (license === 'premium' ? bopenshiftPricePremium : bopenshiftPriceStandard) * (1 - discount);
        
        // マシン利用料の計算（マシン数 * 1台あたりのコア数 * コア単価）
        machineCost = machines * CORES_PER_MACHINE * machinePrice;
    }

    // 総コストの計算
    const totalCost = vsphereCost + openshiftCost + machineCost;

    return {
        vsphereCost,
        openshiftCost,
        machineCost,
        totalCost,
        config,
        license
    };
}

function displayResults(results) {
    if (chart) {
        chart.destroy();
    }

    const ctx = document.getElementById('chart').getContext('2d');
    const labels = results.map((_, index) => `構成${index + 1}`);
    const datasets = [
        {
            label: 'マシン利用料',
            data: results.map(r => r.machineCost),
            backgroundColor: 'rgba(75, 192, 192, 0.8)',
        },
        {
            label: 'vSphere',
            data: results.map(r => r.vsphereCost),
            backgroundColor: 'rgba(255, 99, 132, 0.8)',
        },
        {
            label: 'OpenShift',
            data: results.map(r => r.openshiftCost),
            backgroundColor: 'rgba(54, 162, 235, 0.8)',
        },
    ];

    chart = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets },
        options: {
            responsive: true,
            scales: {
                x: { stacked: true },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'コスト'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'OpenShift構成比較'
                },
                tooltip: {
                    callbacks: {
                        footer: (tooltipItems) => {
                            const total = tooltipItems.reduce((sum, ti) => sum + ti.parsed.y, 0);
                            return `合計: ${total.toLocaleString()}`;
                        }
                    }
                }
            }
        }
    });
}

// 初期フォームの生成
updateForms();