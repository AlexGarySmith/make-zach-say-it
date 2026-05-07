const QUOTE_CONFIG = {
    googleFormUrl: 'https://forms.gle/sexDAmnKmpu2H5LX7',
    resultsUrl: 'https://docs.google.com/spreadsheets/d/17omExHYxgq5jPH2pxEiHXjvMB_shcW6TqDfwBmQRfGA/edit?usp=sharing',
    sheetCsvUrl: 'https://docs.google.com/spreadsheets/d/17omExHYxgq5jPH2pxEiHXjvMB_shcW6TqDfwBmQRfGA/gviz/tq?tqx=out:csv&gid=0'
};

const FALLBACK_QUOTES = [
    {
        quote: 'The Zachronomicon says there are no Zach-isms.',
        context: "That can't be right."
    }
];

let allQuotes = [];
let currentQuoteIndex = 0;

function isConfiguredUrl(value) {
    return Boolean(value) && !String(value).includes('PASTE_');
}

function shuffleArray(items) {
    for (let i = items.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
}

function parseCsv(text) {
    const rows = [];
    let currentValue = '';
    let currentRow = [];
    let inQuotes = false;

    for (let i = 0; i < text.length; i += 1) {
        const char = text[i];
        const next = text[i + 1];

        if (char === '"') {
            if (inQuotes && next === '"') {
                currentValue += '"';
                i += 1;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            currentRow.push(currentValue);
            currentValue = '';
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && next === '\n') {
                i += 1;
            }
            currentRow.push(currentValue);
            if (currentRow.some((cell) => cell.trim() !== '')) {
                rows.push(currentRow);
            }
            currentRow = [];
            currentValue = '';
        } else {
            currentValue += char;
        }
    }

    if (currentValue.length || currentRow.length) {
        currentRow.push(currentValue);
        rows.push(currentRow);
    }

    if (!rows.length) return [];

    const headers = rows[0].map((header) => header.trim());
    return rows.slice(1).map((row) => {
        const entry = {};
        headers.forEach((header, index) => {
            entry[header] = (row[index] || '').trim();
        });
        return entry;
    });
}

function normalizeQuoteRow(row) {
    const quote = row.quote || row.Quote || row['Zach Quote'] || row['Quote'] || row['What did he say this time?'];
    const context = row.context || row.Context || row['Quote Context'] || row['Context'] || row['Any context?'] || '';
    const date = row.date || row.Date || row.timestamp || row.Timestamp || '';

    if (!quote) return null;

    return {
        quote,
        context,
        date
    };
}

function updateQuoteDisplay(entry) {
    const quoteText = document.getElementById('quoteText');
    const quoteContext = document.getElementById('quoteContext');
    const quoteMeta = document.getElementById('quoteMeta');

    if (!quoteText || !entry) return;

    quoteText.textContent = entry.quote;

    if (quoteContext) {
        if (entry.context) {
            quoteContext.hidden = false;
            quoteContext.textContent = `${entry.context}`;
        } else {
            quoteContext.hidden = true;
            quoteContext.textContent = '';
        }
    }

    if (quoteMeta) {
        if (entry.date) {
            quoteMeta.hidden = false;
            quoteMeta.textContent = entry.date;
        } else {
            quoteMeta.hidden = true;
            quoteMeta.textContent = '';
        }
    }
}

function showNextQuote() {
    if (!allQuotes.length) {
        allQuotes = shuffleArray([...FALLBACK_QUOTES]);
    }

    updateQuoteDisplay(allQuotes[currentQuoteIndex]);
    currentQuoteIndex = (currentQuoteIndex + 1) % allQuotes.length;
}

function updateQuoteLinks() {
    const submitLink = document.getElementById('submitQuoteLink');
    const resultsLink = document.getElementById('viewResultsLink');
    const formSection = document.getElementById('quoteFormSection');
    const formFrame = document.getElementById('quoteFormFrame');
    const submitBtn = document.getElementById('submitQuoteBtn');
    const closeBtn = document.getElementById('closeFormBtn');

    const formUrl = isConfiguredUrl(QUOTE_CONFIG.googleFormUrl) ? QUOTE_CONFIG.googleFormUrl : '';
    const resultsUrl = isConfiguredUrl(QUOTE_CONFIG.resultsUrl) ? QUOTE_CONFIG.resultsUrl : '';

    if (submitLink) {
        submitLink.remove();
    }

    if (resultsLink) {
        if (resultsUrl) {
            resultsLink.href = resultsUrl;
            resultsLink.classList.remove('is-disabled');
        } else {
            resultsLink.removeAttribute('href');
            resultsLink.classList.add('is-disabled');
        }
    }

    if (formSection && formFrame && formUrl) {
        const separator = formUrl.includes('?') ? '&' : '?';
        formFrame.src = `${formUrl}${separator}embedded=true`;

        const isMobile = window.matchMedia('(max-width: 600px)').matches;
        if (!isMobile) {
            formSection.hidden = false;
        }

        if (submitBtn) {
            submitBtn.addEventListener('click', () => {
                formSection.hidden = false;
                formSection.classList.add('is-open');
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                formSection.classList.remove('is-open');
                formSection.hidden = true;
            });
        }
    }
}

async function loadQuotesFromGoogleSheet() {
    const status = document.getElementById('quoteStatus');

    if (!isConfiguredUrl(QUOTE_CONFIG.sheetCsvUrl)) {
        allQuotes = [...FALLBACK_QUOTES];
        if (status) {
            status.textContent = 'Using placeholder content until the Google Sheet CSV link is connected.';
        }
        return;
    }

    try {
        const response = await fetch(`${QUOTE_CONFIG.sheetCsvUrl}${QUOTE_CONFIG.sheetCsvUrl.includes('?') ? '&' : '?'}t=${Date.now()}`);
        if (!response.ok) {
            throw new Error('Quote sheet request failed');
        }

        const csvText = await response.text();
        const parsedRows = parseCsv(csvText);
        const normalizedQuotes = parsedRows.map(normalizeQuoteRow).filter(Boolean);

        if (!normalizedQuotes.length) {
            throw new Error('No usable quotes found');
        }

        allQuotes = shuffleArray(normalizedQuotes);
        currentQuoteIndex = 0;
        if (status) {
            status.textContent = `There are currently ${allQuotes.length} Zach-isms in the Zachronomicon.`;
        }
    } catch (error) {
        console.warn('Could not load Zach-isms', error);
        allQuotes = [...FALLBACK_QUOTES];
        if (status) {
            status.textContent = 'Could not load the Zachronomicon, so placeholder content is being shown.';
        }
    }
}

async function initializeQuotesPage() {
    updateQuoteLinks();
    await loadQuotesFromGoogleSheet();
    showNextQuote();

    const newQuoteBtn = document.getElementById('newQuoteBtn');
    if (newQuoteBtn) {
        newQuoteBtn.addEventListener('click', showNextQuote);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeQuotesPage);
} else {
    initializeQuotesPage();
}
