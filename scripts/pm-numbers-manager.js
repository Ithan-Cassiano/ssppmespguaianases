class PMNumbersManager {
    constructor() {
        this.init();
    }
    init() {
        if (!localStorage.getItem('pmNumbers')) {
            const defaultNumbers = {
                period: "JANEIRO A DEZEMBRO DE 2026",
                numbers: [
                    {
                        id: 1,
                        value: "1",
                        label: "Milhões",
                        description: "CHAMADAS 190"
                    },
                    {
                        id: 2,
                        value: "25",
                        label: "Toneladas",
                        description: "DROGAS APREENDIDAS"
                    },
                    {
                        id: 3,
                        value: "22",
                        label: "Mil",
                        description: "PESSOAS PRESAS"
                    },
                    {
                        id: 4,
                        value: "1",
                        label: "Mil",
                        description: "ARMAS APREENDIDAS"
                    },
                    {
                        id: 5,
                        value: "6",
                        label: "Mil",
                        description: "VEÍCULOS RECUPERADOS"
                    }
                ]
            };
            localStorage.setItem('pmNumbers', JSON.stringify(defaultNumbers));
        }
    }
    getNumbers() {
        const data = JSON.parse(localStorage.getItem('pmNumbers') || '{}');
        return data.numbers || [];
    }
    getPeriod() {
        const data = JSON.parse(localStorage.getItem('pmNumbers') || '{}');
        return data.period || "JANEIRO A DEZEMBRO DE 2026";
    }
    updateNumbers(numbers, period) {
        const data = {
            period: period || this.getPeriod(),
            numbers: numbers || this.getNumbers(),
            updatedAt: new Date().toISOString()
        };
        localStorage.setItem('pmNumbers', JSON.stringify(data));
        return { success: true };
    }
    updateNumber(id, numberData) {
        const data = JSON.parse(localStorage.getItem('pmNumbers') || '{}');
        const numbers = data.numbers || [];
        const index = numbers.findIndex(n => n.id === parseInt(id));
        if (index === -1) {
            return { success: false, message: 'Número não encontrado' };
        }
        numbers[index] = {
            ...numbers[index],
            value: numberData.value,
            label: numberData.label,
            description: numberData.description
        };
        data.numbers = numbers;
        localStorage.setItem('pmNumbers', JSON.stringify(data));
        return { success: true, number: numbers[index] };
    }
    renderNumbers(containerId, periodId) {
        const container = document.getElementById(containerId);
        const periodElement = document.getElementById(periodId);
        if (!container) return;
        const period = this.getPeriod();
        const numbers = this.getNumbers();
        if (periodElement) {
            periodElement.textContent = `(${period})`;
        }
        container.innerHTML = numbers.map(num => `
            <div class="number-item">
                <div class="number-value">${num.value}</div>
                <div class="number-label">${num.label}</div>
                <div class="number-desc">${num.description}</div>
            </div>
        `).join('');
    }
}
const pmNumbersManager = new PMNumbersManager();
