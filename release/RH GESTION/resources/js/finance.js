/**
 * finance.js — Finance Engine
 * Handles income calculation, expense tracking, and Chart.js visualization.
 */

const Finance = (() => {
    let _yearlyChart = null;
    let _monthlyChart = null;

    /**
     * Calculate total income from player payments for a given month.
     * @param {Array} players - List of players
     * @param {number} monthIndex - Month index (0-11)
     * @param {number} fee - Monthly subscription fee
     * @returns {number} Total income for the month
     */
    function getMonthlyIncome(players, monthIndex, globalFee) {
        return players
            .filter(p => p.months && p.months[monthIndex])
            .reduce((sum, p) => sum + (parseFloat(p.monthly_amount) || globalFee || 0), 0);
    }

    /**
     * Calculate total income for the entire year.
     */
    function getYearlyIncome(players, globalFee) {
        let total = 0;
        for (let m = 0; m < 12; m++) {
            total += getMonthlyIncome(players, m, globalFee);
        }
        return total;
    }

    /**
     * Calculate total expenses for a given month.
     */
    function getMonthlyExpenses(expenses, monthIndex) {
        return expenses
            .filter(e => {
                const d = new Date(e.date);
                return d.getMonth() === monthIndex && d.getFullYear() === new Date().getFullYear();
            })
            .reduce((sum, e) => sum + (e.amount || 0), 0);
    }

    /**
     * Calculate total expenses for the year.
     */
    function getYearlyExpenses(expenses) {
        const year = new Date().getFullYear();
        return expenses
            .filter(e => new Date(e.date).getFullYear() === year)
            .reduce((sum, e) => sum + (e.amount || 0), 0);
    }

    /**
     * Get net profit (income - expenses)
     */
    function getNetProfit(players, expenses, fee) {
        return getYearlyIncome(players, fee) - getYearlyExpenses(expenses);
    }

    function renderYearlyChart(ctx, players, expenses, fee) {
        if (!ctx) return;

        const monthLabels = [];
        const profitData = [];
        const backgroundColors = [];

        for (let m = 0; m < 12; m++) {
            monthLabels.push(UI.getMonthName(m));
            const inc = getMonthlyIncome(players, m, fee);
            const exp = getMonthlyExpenses(expenses, m);
            const profit = inc - exp;
            profitData.push(profit);
            
            // Green for profit, Red for loss
            backgroundColors.push(profit >= 0 ? 'rgba(40, 167, 69, 0.7)' : 'rgba(220, 53, 69, 0.7)');
        }

        if (_yearlyChart) {
            _yearlyChart.destroy();
        }

        _yearlyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: monthLabels,
                datasets: [{
                    label: UI.currentLang === 'ar' ? 'صافي الربح / الخسارة' : 'Bénéfice / Perte net',
                    data: profitData,
                    backgroundColor: backgroundColors,
                    borderRadius: 6,
                    borderWidth: 0
                }]
            },
            options: {
                ..._getChartOptions(),
                plugins: {
                    ..._getChartOptions().plugins,
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) label += ': ';
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y;
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Render the current month's performance comparison.
     */
    function renderMonthlyChart(ctx, players, expenses, fee) {
        if (!ctx) return;

        const currentMonth = new Date().getMonth();
        const income = getMonthlyIncome(players, currentMonth, fee);
        const expense = getMonthlyExpenses(expenses, currentMonth);

        if (_monthlyChart) {
            _monthlyChart.destroy();
        }

        _monthlyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [UI.t('monthlyPerformance')],
                datasets: [
                    {
                        label: UI.currentLang === 'ar' ? 'المداخيل' : 'Revenus',
                        data: [income],
                        backgroundColor: 'rgba(40, 167, 69, 0.7)',
                        borderRadius: 8
                    },
                    {
                        label: UI.currentLang === 'ar' ? 'المصاريف' : 'Dépenses',
                        data: [expense],
                        backgroundColor: 'rgba(220, 53, 69, 0.7)',
                        borderRadius: 8
                    }
                ]
            },
            options: _getChartOptions()
        });
    }

    function _getChartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#b0b0b0',
                        font: { family: "'Cairo', 'Inter', sans-serif", size: 12 }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#b0b0b0', font: { family: "'Cairo', 'Inter', sans-serif" } },
                    grid: { display: false }
                },
                y: {
                    ticks: { color: '#b0b0b0', font: { family: "'Cairo', 'Inter', sans-serif" } },
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    beginAtZero: true
                }
            }
        };
    }

    /**
     * Update the finance summary cards.
     */
    function updateSummary(players, expenses, fee, currency) {
        const currentMonth = new Date().getMonth();
        const monthlyIncome = getMonthlyIncome(players, currentMonth, fee);
        const monthlyExpense = getMonthlyExpenses(expenses, currentMonth);
        const yearlyIncome = getYearlyIncome(players, fee);
        const yearlyExpense = getYearlyExpenses(expenses);
        const netProfit = yearlyIncome - yearlyExpense;

        _setTextIfExists('stat-monthly-income', `${monthlyIncome} ${currency}`);
        _setTextIfExists('stat-monthly-expense', `${monthlyExpense} ${currency}`);
        _setTextIfExists('stat-yearly-income', `${yearlyIncome} ${currency}`);
        _setTextIfExists('stat-yearly-expense', `${yearlyExpense} ${currency}`);
        _setTextIfExists('stat-net-profit', `${netProfit} ${currency}`);
        // 'stat-total-income' is on the dashboard and should reset/show just this month's income
        _setTextIfExists('stat-total-income', `${monthlyIncome} ${currency}`);

        // Color the net profit
        const netEl = document.getElementById('stat-net-profit');
        if (netEl) {
            netEl.style.color = netProfit >= 0 ? '#28a745' : '#dc3545';
        }
    }

    function _setTextIfExists(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    /**
     * Render the expenses table.
     */
    function renderExpensesTable(expenses, currency) {
        const tbody = document.getElementById('expenses-list-body');
        if (!tbody) return;

        tbody.innerHTML = '';
        expenses.forEach(e => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${e.description}</td>
                <td>${e.amount} ${currency}</td>
                <td>${e.date}</td>
                <td>${e.category}</td>
                <td>
                    <button class="btn btn-danger-sm" onclick="handleDeleteExpense(${e.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    return {
        getMonthlyIncome,
        getYearlyIncome,
        getMonthlyExpenses,
        getYearlyExpenses,
        getNetProfit,
        renderYearlyChart,
        renderMonthlyChart,
        updateSummary,
        renderExpensesTable
    };
})();
