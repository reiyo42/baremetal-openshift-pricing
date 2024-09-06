let chart = null;
let chart2 = null;

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
            <div class="number-input-wrapper">
                <input type="number" id="workers${index}" min="1" value="3">
                <div class="number-input-buttons">
                    <div class="number-input-button" onclick="changeNumber('workers${index}', 1)">+</div>
                    <div class="number-input-button" onclick="changeNumber('workers${index}', -1)">-</div>
                </div>
            </div>
        </div>
        
        <div class="form-group">
            <label for="vcpu${index}">アプリのための最低必要vCPU数:</label>
            <div class="number-input-wrapper">
                <input type="number" id="vcpu${index}" min="1" value="16">
                <div class="number-input-buttons">
                    <div class="number-input-button" onclick="changeNumber('vcpu${index}', 1)">+</div>
                    <div class="number-input-button" onclick="changeNumber('vcpu${index}', -1)">-</div>
                </div>
            </div>
        </div>
        
        <div class="form-group">
            <label for="discount${index}">OpenShift単価の割引率 (%):</label>
            <div class="number-input-wrapper">
                <input type="number" id="discount${index}" min="0" max="100" value="0">
                <div class="number-input-buttons">
                    <div class="number-input-button" onclick="changeNumber('discount${index}', 1)">+</div>
                    <div class="number-input-button" onclick="changeNumber('discount${index}', -1)">-</div>
                </div>
            </div>
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
                <option value="ccsp">CCSP</option>
            </select>
        </div>
    `;
    return div;
}

function changeNumber(id, delta, callback) {
    const input = document.getElementById(id);
    const currentValue = parseInt(input.value) || 0;
    input.value = Math.max(parseInt(input.min) || 0, Math.min(parseInt(input.max) || Infinity, currentValue + delta));
    if (typeof callback === 'function') {
        callback();
    }
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
    params.append('vopenshift_price_ccsp', document.getElementById('vopenshift_price_ccsp').value);
    params.append('bopenshift_price_premium', document.getElementById('bopenshift_price_premium').value);
    params.append('bopenshift_price_standard', document.getElementById('bopenshift_price_standard').value);
    params.append('bopenshift_price_ccsp', document.getElementById('bopenshift_price_ccsp').value);
    params.append('machine_price', document.getElementById('machine_price').value);
    params.append('machine_core_count', document.getElementById('machine_core_count').value);

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

function toggleAccordion(id) {
    const content = document.getElementById(id);
    content.style.display = content.style.display === 'block' ? 'none' : 'block';
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
    const workers = parseInt(document.getElementById(`workers${formNumber}`).value);
    const vcpu = parseInt(document.getElementById(`vcpu${formNumber}`).value);
    const vspherePrice = parseFloat(document.getElementById('vsphere_price').value);
    const vopenshiftPricePremium = parseFloat(document.getElementById('vopenshift_price_premium').value);
    const vopenshiftPriceStandard = parseFloat(document.getElementById('vopenshift_price_standard').value);
    const vopenshiftPriceCCSP = parseFloat(document.getElementById('vopenshift_price_ccsp').value);
    const bopenshiftPricePremium = parseFloat(document.getElementById('bopenshift_price_premium').value);
    const bopenshiftPriceStandard = parseFloat(document.getElementById('bopenshift_price_standard').value);
    const bopenshiftPriceCCSP = parseFloat(document.getElementById('bopenshift_price_ccsp').value);
    const machinePrice = parseFloat(document.getElementById('machine_price').value);
    const discount = parseFloat(document.getElementById(`discount${formNumber}`).value) / 100;
    const config = document.getElementById(`config${formNumber}`).value;
    const license = document.getElementById(`license${formNumber}`).value;
    const machineCoreCount = parseInt(document.getElementById('machine_core_count').value);

    let vsphereCost = 0;
    let openshiftCost = 0;
    let machineCost = 0;
    const machines = Math.max(Math.ceil(vcpu / machineCoreCount), workers);

    if (config === 'virtual') {
        const cores = vcpu;
        vsphereCost = cores * vspherePrice;
        
        switch(license) {
            case 'premium':
                openshiftCost = cores * vopenshiftPricePremium * (1 - discount);
                break;
            case 'standard':
                openshiftCost = cores * vopenshiftPriceStandard * (1 - discount);
                break;
            case 'ccsp':
                openshiftCost = cores * vopenshiftPriceCCSP * (1 - discount);
                break;
        }
        
        machineCost = cores * machinePrice;
    } else {
        switch(license) {
            case 'premium':
                openshiftCost = machines * bopenshiftPricePremium * (1 - discount);
                break;
            case 'standard':
                openshiftCost = machines * bopenshiftPriceStandard * (1 - discount);
                break;
            case 'ccsp':
                openshiftCost = machines * bopenshiftPriceCCSP * (1 - discount);
                break;
        }
        
        machineCost = machines * machineCoreCount * machinePrice;
    }

    const totalCost = vsphereCost + openshiftCost + machineCost;

    return {
        vsphereCost,
        openshiftCost,
        machineCost,
        totalCost,
        config,
        license,
        machines
    };
}

function displayResults(results) {
    if (chart) {
        chart.destroy();
    }
    if (chart2) {
        chart2.destroy();
    }

    const ctx1 = document.getElementById('chart').getContext('2d');
    const ctx2 = document.getElementById('chart2').getContext('2d');

    const machineCoreCount = parseInt(document.getElementById('machine_core_count').value);
    const labels = results.map((r, index) => {
        const config = document.getElementById(`config${index + 1}`).value;
        const license = document.getElementById(`license${index + 1}`).value;
        const vcpu = parseInt(document.getElementById(`vcpu${index + 1}`).value);
        if (config === 'virtual') {
            return [`構成${index + 1}：${config} (${license})`, `${vcpu} / ${vcpu} vCPU`];
        } else {
            const totalVcpu = r.machines * machineCoreCount;
            return [`構成${index + 1}：${config} (${license})`, `${vcpu} / ${totalVcpu} vCPU`];
        }
    });

    const datasets1 = [
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
        }
    ];

    chart = new Chart(ctx1, {
        type: 'bar',
        data: { labels, datasets: datasets1 },
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
                    text: '全体のコスト比較'
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
        },
        plugins: [ChartDataLabels]
    });

    const vcpuShares = results.map((r, index) => {
        const config = document.getElementById(`config${index + 1}`).value;
        if (config === 'virtual') {
            return 1;
        } else {
            const vcpu = parseInt(document.getElementById(`vcpu${index + 1}`).value);
            const totalVcpu = r.machines * machineCoreCount;
            return vcpu / totalVcpu;
        }
    });
    const vcpuCostData = results.map((r, index) => {
        return {
            machineCost: r.machineCost * vcpuShares[index],
            vsphereCost: r.vsphereCost * vcpuShares[index],
            openshiftCost: r.openshiftCost * vcpuShares[index]
        };
    });

    const datasets2 = [
        {
            label: 'マシン利用料 (アプリのvCPUあたり)',
            data: vcpuCostData.map(r => r.machineCost),
            backgroundColor: 'rgba(75, 192, 192, 0.8)',
        },
        {
            label: 'vSphere (アプリのvCPUあたり)',
            data: vcpuCostData.map(r => r.vsphereCost),
            backgroundColor: 'rgba(255, 99, 132, 0.8)',
        },
        {
            label: 'OpenShift (アプリのvCPUあたり)',
            data: vcpuCostData.map(r => r.openshiftCost),
            backgroundColor: 'rgba(54, 162, 235, 0.8)',
        }
    ];

    chart2 = new Chart(ctx2, {
        type: 'bar',
        data: { labels, datasets: datasets2 },
        options: {
            responsive: true,
            scales: {
                x: { stacked: true },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'アプリのvCPUあたりのコスト'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'アプリのvCPUあたりのコスト比較'
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
        },
        plugins: [ChartDataLabels]
    });
}

function extractChartData(chart) {
    const data = chart.data;
    let csvContent = "構成,vCPU," + data.datasets.map(dataset => dataset.label).join(",") + "\n";
    
    data.labels.forEach((label, index) => {
        const dataPoints = data.datasets.map(dataset => dataset.data[index] || "N/A");
        csvContent += [label, ...dataPoints].join(",") + "\n";
    });
    
    return csvContent;
}

function copyChartData() {
    // グラフオブジェクトを取得
    const chart1 = Chart.getChart("chart"); // IDが"chart"のグラフを取得
    const chart2 = Chart.getChart("chart2"); // IDが"chart2"のグラフを取得

    // グラフデータをCSV形式に変換
    const csvContent1 = extractChartData(chart1);
    const csvContent2 = extractChartData(chart2);

    // CSVコンテンツをテキストエリアに表示
    document.getElementById("chartDataOutput").value = `グラフ1\n${csvContent1}\n\nグラフ2\n${csvContent2}`;

    // テキストエリアの内容を選択してコピー
    const csvOutput = document.getElementById("chartDataOutput");
    csvOutput.select();
    csvOutput.setSelectionRange(0, 99999); // モバイル対応
    document.execCommand("copy");
    alert("グラフデータをクリップボードにコピーしました");
}

// ページ読み込み時に初期化
window.onload = initializePage;