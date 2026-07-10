/**
 * Results Module
 * Handles API submission, loading states, scheme card rendering,
 * filtering, sorting, and navigation.
 */

const Results = (() => {
  'use strict';

  // ── Constants ──────────────────────────────────────────────────────────
  const WEBHOOK_URL = N8N_WEBHOOK_URL;

  // Key under which real search history is persisted for the dashboard.
  // Only written to after a genuine (non-mock) webhook success — see
  // saveSearchToHistory().
  const HISTORY_KEY = 'schemefinder_search_history';
  const MAX_HISTORY_ENTRIES = 200;

  const LOADING_TEXTS = [
    'Analyzing your profile with AI...',
    'Cross-referencing eligibility criteria...',
    'Matching against 100+ schemes...',
    'Almost there! Preparing your results...',
  ];

  // ── State ──────────────────────────────────────────────────────────────
  let allSchemes = [];
  let loadingInterval = null;
  let currentFilter = 'all';

  // ── DOM Helpers ────────────────────────────────────────────────────────
  const el = (id) => document.getElementById(id);

  // ── Mock Data ──────────────────────────────────────────────────────────
  function getMockData(formData) {
    const stateName = formData?.state || 'Your State';

    return [
      {
        name: 'PM Kisan Samman Nidhi',
        type: 'central',
        category: 'Agriculture',
        matchScore: 95,
        matchReason: `Based on your income of ₹${(formData?.income || 0).toLocaleString('en-IN')} and occupation, you are highly eligible for direct income support under PM-KISAN.`,
        benefits: 'Direct benefit transfer of ₹6,000 per year in three equal instalments to farmer families across the country.',
        documents: ['Aadhaar Card', 'Land Records', 'Bank Account Details', 'Income Certificate'],
        applyLink: 'https://pmkisan.gov.in/',
        isMock: true,
      },
      {
        name: 'PM Awas Yojana',
        type: 'central',
        category: 'Housing',
        matchScore: 88,
        matchReason: 'Your income bracket qualifies you for affordable housing benefits under the Pradhan Mantri Awas Yojana scheme.',
        benefits: 'Financial assistance up to ₹2.67 lakh for construction or enhancement of houses for eligible rural and urban households.',
        documents: ['Aadhaar Card', 'Income Proof', 'Land Documents', 'Bank Passbook', 'Photograph'],
        applyLink: 'https://pmaymis.gov.in/',
        isMock: true,
      },
      {
        name: `${stateName} State Welfare Scheme`,
        type: 'state',
        category: 'Social Security',
        matchScore: 85,
        matchReason: `As a resident of ${stateName}, you qualify for state-specific welfare benefits tailored to local economic conditions.`,
        benefits: `State-sponsored financial assistance, subsidized services, and skill development programmes available to ${stateName} residents.`,
        documents: ['State Domicile Certificate', 'Aadhaar Card', 'Income Certificate', 'Ration Card'],
        applyLink: '#',
        isMock: true,
      },
      {
        name: 'Ayushman Bharat - PMJAY',
        type: 'central',
        category: 'Healthcare',
        matchScore: 82,
        matchReason: 'Your family income and demographic profile meet the eligibility criteria for comprehensive health coverage.',
        benefits: 'Health insurance coverage of ₹5 lakh per family per year for secondary and tertiary care hospitalisation across empanelled hospitals.',
        documents: ['Aadhaar Card', 'Ration Card', 'Income Certificate', 'Family ID'],
        applyLink: 'https://pmjay.gov.in/',
        isMock: true,
      },
      {
        name: 'PM Ujjwala Yojana',
        type: 'central',
        category: 'Energy',
        matchScore: 78,
        matchReason: 'Your household income makes you eligible for subsidized clean cooking fuel under the Ujjwala scheme.',
        benefits: 'Free LPG connection with a financial support of ₹1,600 per connection along with subsidized refills for BPL households.',
        documents: ['Aadhaar Card', 'BPL Card', 'Bank Account', 'Passport-size Photo', 'Address Proof'],
        applyLink: 'https://www.pmujjwalayojana.com/',
        isMock: true,
      },
      {
        name: 'National Social Assistance Programme',
        type: 'central',
        category: 'Social Security',
        matchScore: 75,
        matchReason: 'Your age and income profile aligns with the social security net provided under NSAP for vulnerable populations.',
        benefits: 'Monthly pension ranging from ₹200 to ₹500 for elderly, widows, and disabled persons from BPL families.',
        documents: ['Aadhaar Card', 'Age Proof', 'BPL Certificate', 'Bank Account Details'],
        applyLink: 'https://nsap.nic.in/',
        isMock: true,
      },
      {
        name: 'Mahatma Gandhi NREGA',
        type: 'central',
        category: 'Employment',
        matchScore: 72,
        matchReason: 'Your profile qualifies for guaranteed wage employment under the rural employment guarantee scheme.',
        benefits: 'Guaranteed 100 days of wage employment per year to every rural household whose adult members volunteer to do unskilled manual work.',
        documents: ['Job Card', 'Aadhaar Card', 'Bank Account Details', 'Photograph'],
        applyLink: 'https://nrega.nic.in/',
        isMock: true,
      },
      {
        name: 'PM Mudra Yojana',
        type: 'central',
        category: 'Finance',
        matchScore: 68,
        matchReason: 'Your occupation and income profile suggest eligibility for micro-enterprise loans under MUDRA.',
        benefits: 'Collateral-free loans up to ₹10 lakh under three categories: Shishu (up to ₹50K), Kishore (₹50K–5L), and Tarun (₹5L–10L).',
        documents: ['Aadhaar Card', 'PAN Card', 'Business Plan', 'Identity Proof', 'Address Proof'],
        applyLink: 'https://www.mudra.org.in/',
        isMock: true,
      },
    ];
  }

  // ── Response Normalization ─────────────────────────────────────────────
  function normalizeScheme(scheme) {
    if (!scheme) return null;
    const name = scheme.name || 'Unnamed Scheme';

    const levelText = (scheme.level || '').toString().toLowerCase();
    const type = levelText.includes('state') ? 'state' : 'central';

    const category = scheme.category || '';
    const matchScore = typeof scheme.matchScore === 'number' ? scheme.matchScore : 90;
    const matchReason = scheme.reason || scheme.matchReason || '';
    const benefits = scheme.benefits || '';

    let documents = [];
    if (typeof scheme.documents === 'string') {
      documents = scheme.documents.split(',').map((d) => d.trim()).filter(Boolean);
    } else if (Array.isArray(scheme.documents)) {
      documents = scheme.documents;
    }

    // Accept whichever field name the backend sends for the apply/official link.
    // n8n's Code node may send this as `url`, `applyLink`, or `link` depending
    // on how it was built — check all of them so the button always resolves
    // to a real destination instead of silently falling back to "#".
    const applyLink = scheme.applyLink || scheme.url || scheme.link || scheme.applyUrl || '#';

    return {
      name,
      type,
      category,
      matchScore,
      matchReason,
      benefits,
      documents,
      applyLink,
      isMock: !!scheme.isMock
    };
  }

  // ── Search History (for the dashboard) ─────────────────────────────────
  // Persists a lightweight record of each genuine (non-mock) search so the
  // dashboard can be built from real usage instead of hardcoded numbers.
  function saveSearchToHistory(formData, schemes) {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      const history = raw ? JSON.parse(raw) : [];

      const scoredSchemes = schemes.filter((s) => typeof s.matchScore === 'number');
      const avgMatchScore = scoredSchemes.length
        ? Math.round(scoredSchemes.reduce((sum, s) => sum + s.matchScore, 0) / scoredSchemes.length)
        : null;

      const entry = {
        timestamp: Date.now(),
        state: formData?.state || 'Unknown',
        schemeCount: schemes.length,
        avgMatchScore,
        schemes: schemes.map((s) => ({
          name: s.name,
          category: s.category,
          type: s.type,
          matchScore: s.matchScore,
        })),
      };

      history.push(entry);

      // Cap history size so localStorage doesn't grow unbounded.
      const trimmed = history.length > MAX_HISTORY_ENTRIES
        ? history.slice(history.length - MAX_HISTORY_ENTRIES)
        : history;

      localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));

      // Let an already-open dashboard (same tab) know new real data landed.
      window.dispatchEvent(new CustomEvent('schemefinder:historyUpdated', { detail: entry }));
    } catch (err) {
      // localStorage can fail (quota, private browsing, etc.) — never let
      // history bookkeeping break the actual results flow.
      console.warn('Could not save search history:', err.message);
    }
  }

  // ── Submission Handler ─────────────────────────────────────────────────
  async function handleSubmission(formData) {
    // Navigate to results page
    if (typeof App !== 'undefined') {
      App.navigateTo('results');
    }

    showLoading();

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const rawSchemes = Array.isArray(data) ? data : data.schemes || [];
      const schemes = rawSchemes.map(normalizeScheme);

      // This is a real, non-mock result — record it for the dashboard.
      saveSearchToHistory(formData, schemes);

      // Brief delay to show the last loading message
      await delay(800);
      renderResults(schemes);
    } catch (error) {
      console.warn('Webhook failed, using mock data:', error.message);
      await delay(2500);
      // Mock/fallback data is intentionally NOT saved to history — it
      // doesn't represent a real search result.
      renderResults(getMockData(formData).map(normalizeScheme));
    }
  }

  // ── Loading State ──────────────────────────────────────────────────────
  function showLoading() {
    const loadingState = el('loadingState');
    const resultsContent = el('resultsContent');
    const subtext = el('loadingSubtext');

    if (loadingState) loadingState.style.display = 'flex';
    if (resultsContent) resultsContent.style.display = 'none';

    // Cycle through loading texts
    let textIndex = 0;
    if (subtext) subtext.textContent = LOADING_TEXTS[0];

    clearInterval(loadingInterval);
    loadingInterval = setInterval(() => {
      textIndex = (textIndex + 1) % LOADING_TEXTS.length;
      if (subtext) {
        subtext.style.opacity = '0';
        setTimeout(() => {
          subtext.textContent = LOADING_TEXTS[textIndex];
          subtext.style.opacity = '1';
        }, 300);
      }
    }, 2000);
  }

  function hideLoading() {
    clearInterval(loadingInterval);
    loadingInterval = null;

    const loadingState = el('loadingState');
    const resultsContent = el('resultsContent');

    if (loadingState) loadingState.style.display = 'none';
    if (resultsContent) {
      resultsContent.style.display = 'block';
      resultsContent.classList.add('fade-in');
      setTimeout(() => resultsContent.classList.remove('fade-in'), 500);
    }
  }

  // ── Render Results ─────────────────────────────────────────────────────
  function renderResults(schemes) {
    hideLoading();

    allSchemes = schemes;
    currentFilter = 'all';

    // Update summary
    const summary = el('resultsSummary');
    if (summary) {
      summary.textContent = `We found ${schemes.length} scheme${schemes.length !== 1 ? 's' : ''} matching your profile.`;
    }

    // Reset filter pills
    document.querySelectorAll('.filter-pill').forEach((pill) => {
      pill.classList.toggle('active', pill.dataset.filter === 'all');
    });

    // Reset sort
    const sortSelect = el('sortSelect');
    if (sortSelect) sortSelect.value = 'score';

    // Render cards
    renderSchemeCards(schemes);

    // Update notice for sample/mock data
    const isMock = schemes.length > 0 && schemes[0].isMock === true;
    updateMockDataNotice(isMock);

    // Wire up interactions
    setupFilters();
    setupSort();
    setupResultsNavigation();
  }

  function renderSchemeCards(schemes) {
    const grid = el('schemesGrid');
    const noResults = el('noResults');
    if (!grid) return;

    grid.innerHTML = '';

    if (schemes.length === 0) {
      if (noResults) {
        // Reset to original "No schemes matched" state
        const iconEl = noResults.querySelector('.no-results-icon');
        const titleEl = noResults.querySelector('h3');
        const descEl = noResults.querySelector('p');
        const retryBtn = noResults.querySelector('#retryBtn');

        if (iconEl) iconEl.textContent = '🔎';
        if (titleEl) titleEl.textContent = 'No schemes matched your current profile';
        if (descEl) descEl.textContent = 'Try adjusting your details or check your inputs.';
        if (retryBtn) {
          retryBtn.textContent = 'Modify Details →';
          retryBtn.onclick = (e) => {
            e.preventDefault();
            if (typeof App !== 'undefined') App.navigateTo('eligibility');
          };
        }
        noResults.style.display = 'flex';
      }
      return;
    }

    if (noResults) noResults.style.display = 'none';

    schemes.forEach((scheme, i) => {
      const card = createSchemeCard(scheme, i);
      grid.appendChild(card);
    });
  }

  function updateMockDataNotice(isMock) {
    const header = document.querySelector('.results-header');
    if (!header) return;

    let notice = el('mockDataNotice');
    if (isMock) {
      if (!notice) {
        notice = document.createElement('div');
        notice.id = 'mockDataNotice';
        notice.className = 'mock-data-notice';
        notice.innerHTML = '⚠️ <strong>Showing sample data</strong> — could not reach the matching service';
        header.appendChild(notice);
      }
      notice.style.display = 'inline-flex';
    } else {
      if (notice) {
        notice.style.display = 'none';
      }
    }
  }

  function createSchemeCard(scheme, index) {
    const card = document.createElement('div');
    card.className = 'scheme-card';
    card.dataset.type = scheme.type;
    card.dataset.score = scheme.matchScore;
    card.dataset.name = scheme.name;
    card.style.animationDelay = `${index * 0.1}s`;

    const typeIcon = scheme.type === 'central' ? '🏛️' : '🏢';
    const typeLabel = scheme.type === 'central' ? 'Central Scheme' : 'State Scheme';
    const score = scheme.matchScore;

    // If no real apply link was provided, fall back to a Google search for
    // the scheme so the button always takes the user somewhere useful
    // instead of a dead "#" link.
    const hasRealLink = scheme.applyLink && scheme.applyLink !== '#';
    const finalApplyLink = hasRealLink
      ? scheme.applyLink
      : `https://www.google.com/search?q=${encodeURIComponent(scheme.name + ' scheme apply online official')}`;

    card.innerHTML = `
      <div class="scheme-card-header">
        <div class="scheme-info">
          <h3 class="scheme-name">${escapeHtml(scheme.name)}</h3>
          <span class="scheme-type ${scheme.type}">${typeIcon} ${typeLabel}</span>
        </div>
        <div class="match-score">
          <div class="score-circle" style="background: conic-gradient(var(--primary, #2563EB) ${score}%, var(--bg-elevated, #f1f5f9) ${score}%)">
            <span class="score-value">${score}%</span>
          </div>
          <span class="score-label">Match</span>
        </div>
        <button class="expand-toggle" aria-label="Expand details">▼</button>
      </div>
      <div class="scheme-card-body">
        <div class="scheme-detail">
          <h4>Why You Match</h4>
          <p>${escapeHtml(scheme.matchReason)}</p>
        </div>
        <div class="scheme-detail">
          <h4>Benefits</h4>
          <p>${escapeHtml(scheme.benefits)}</p>
        </div>
        <div class="scheme-detail">
          <h4>Documents Required</h4>
          <ul class="docs-list">
            ${scheme.documents.map((doc) => `<li>${escapeHtml(doc)}</li>`).join('')}
          </ul>
        </div>
        <a class="apply-link" href="${escapeHtml(finalApplyLink)}" target="_blank" rel="noopener noreferrer">
          Apply Now →
        </a>
      </div>
    `;

    // Toggle expand/collapse
    const header = card.querySelector('.scheme-card-header');
    header.addEventListener('click', () => toggleCard(card));

    return card;
  }

  function toggleCard(card) {
    const isExpanded = card.classList.contains('expanded');
    card.classList.toggle('expanded');

    const toggle = card.querySelector('.expand-toggle');
    if (toggle) {
      toggle.textContent = isExpanded ? '▼' : '▲';
      toggle.setAttribute('aria-label', isExpanded ? 'Expand details' : 'Collapse details');
    }
  }

  // ── Filtering ──────────────────────────────────────────────────────────
  function setupFilters() {
    document.querySelectorAll('.filter-pill').forEach((pill) => {
      // Remove existing listeners by cloning
      const newPill = pill.cloneNode(true);
      pill.parentNode.replaceChild(newPill, pill);

      newPill.addEventListener('click', () => {
        const filter = newPill.dataset.filter;
        filterSchemes(filter);

        // Update active states
        document.querySelectorAll('.filter-pill').forEach((p) => {
          p.classList.toggle('active', p.dataset.filter === filter);
        });
      });
    });
  }

  function filterSchemes(type) {
    currentFilter = type;
    const cards = document.querySelectorAll('.scheme-card');
    let visibleCount = 0;

    cards.forEach((card) => {
      const matches = type === 'all' || card.dataset.type === type;
      card.style.display = matches ? '' : 'none';
      if (matches) visibleCount++;
    });

    const noResults = el('noResults');
    if (noResults) {
      noResults.style.display = visibleCount === 0 ? 'flex' : 'none';
    }
  }

  // ── Sorting ────────────────────────────────────────────────────────────
  function setupSort() {
    const sortSelect = el('sortSelect');
    if (!sortSelect) return;

    // Remove existing listeners by cloning
    const newSelect = sortSelect.cloneNode(true);
    sortSelect.parentNode.replaceChild(newSelect, sortSelect);

    newSelect.addEventListener('change', () => {
      sortSchemes(newSelect.value);
    });
  }

  function sortSchemes(by) {
    const grid = el('schemesGrid');
    if (!grid) return;

    const cards = Array.from(grid.querySelectorAll('.scheme-card'));

    cards.sort((a, b) => {
      if (by === 'score') {
        return parseInt(b.dataset.score, 10) - parseInt(a.dataset.score, 10);
      }
      if (by === 'name') {
        return (a.dataset.name || '').localeCompare(b.dataset.name || '');
      }
      return 0;
    });

    // Re-append in sorted order with fresh animation delays
    cards.forEach((card, i) => {
      card.style.animationDelay = `${i * 0.05}s`;
      grid.appendChild(card);
    });
  }

  // ── Results Navigation ─────────────────────────────────────────────────
  function setupResultsNavigation() {
    const retryBtn = el('retryBtn');
    const modifyBtn = el('modifyBtn');
    const dashboardBtn = el('dashboardFromResults');

    const navigateTo = (page) => {
      if (typeof App !== 'undefined') App.navigateTo(page);
    };

    // Clone to remove old listeners
    if (retryBtn) {
      const newBtn = retryBtn.cloneNode(true);
      retryBtn.parentNode.replaceChild(newBtn, retryBtn);
      newBtn.addEventListener('click', () => navigateTo('eligibility'));
    }

    if (modifyBtn) {
      const newBtn = modifyBtn.cloneNode(true);
      modifyBtn.parentNode.replaceChild(newBtn, modifyBtn);
      newBtn.addEventListener('click', () => navigateTo('eligibility'));
    }

    if (dashboardBtn) {
      const newBtn = dashboardBtn.cloneNode(true);
      dashboardBtn.parentNode.replaceChild(newBtn, dashboardBtn);
      newBtn.addEventListener('click', () => navigateTo('dashboard'));
    }
  }

  // ── Utilities ──────────────────────────────────────────────────────────
  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ── Public API ─────────────────────────────────────────────────────────
  return { handleSubmission, showLoading, hideLoading, renderResults };
})();

window.Results = Results;
