const QUOTE_CONFIG = {
    googleFormUrl: 'https://forms.gle/sexDAmnKmpu2H5LX7',
    resultsUrl: 'https://docs.google.com/spreadsheets/d/17omExHYxgq5jPH2pxEiHXjvMB_shcW6TqDfwBmQRfGA/edit?usp=sharing',
    sheetCsvUrl: 'https://docs.google.com/spreadsheets/d/17omExHYxgq5jPH2pxEiHXjvMB_shcW6TqDfwBmQRfGA/export?format=csv&gid=0'
};

const FALLBACK_QUOTES = [
    {
        quote: 'Add your first Zach quote through the Google Form and it will appear here.',
        context: 'This placeholder stays visible until the live Google Sheet is connected.'
    }
];

let allQuotes = [];

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
    const quote = row.quote || row.Quote || row['Zach Quote'] || row['Quote'];
    const context = row.context || row.Context || row['Quote Context'] || row['Context'] || '';
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
            quoteContext.textContent = `Context: ${entry.context}`;
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

function showRandomQuote() {
    if (!allQuotes.length) {
        allQuotes = [...FALLBACK_QUOTES];
    }

    const entry = allQuotes[Math.floor(Math.random() * allQuotes.length)];
    updateQuoteDisplay(entry);
}

function updateQuoteLinks() {
    const submitLink = document.getElementById('submitQuoteLink');
    const resultsLink = document.getElementById('viewResultsLink');
    const formSection = document.getElementById('quoteFormSection');
    const formFrame = document.getElementById('quoteFormFrame');

    const formUrl = isConfiguredUrl(QUOTE_CONFIG.googleFormUrl) ? QUOTE_CONFIG.googleFormUrl : '';
    const resultsUrl = isConfiguredUrl(QUOTE_CONFIG.resultsUrl) ? QUOTE_CONFIG.resultsUrl : '';

    if (submitLink) {
        if (formUrl) {
            submitLink.href = formUrl;
            submitLink.classList.remove('is-disabled');
        } else {
            submitLink.removeAttribute('href');
            submitLink.classList.add('is-disabled');
        }
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
        formSection.hidden = false;
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
        if (status) {
            status.textContent = `Loaded ${allQuotes.length} Zach quotes from the Google Form responses.`;
        }
    } catch (error) {
        console.warn('Could not load live quotes:', error);
        allQuotes = [...FALLBACK_QUOTES];
        if (status) {
            status.textContent = 'Could not load the live Google Sheet yet, so placeholder content is being shown.';
        }
    }
}

async function initializeQuotesPage() {
    updateQuoteLinks();
    await loadQuotesFromGoogleSheet();
    showRandomQuote();

    const newQuoteBtn = document.getElementById('newQuoteBtn');
    if (newQuoteBtn) {
        newQuoteBtn.addEventListener('click', showRandomQuote);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeQuotesPage);
} else {
    initializeQuotesPage();
}
