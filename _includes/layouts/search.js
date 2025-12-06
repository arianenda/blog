(function() {
  // Modal elements
  const searchModal = document.getElementById('search-modal');
  const searchToggle = document.getElementById('search-toggle');
  const searchClose = document.getElementById('search-close');
  const searchOverlay = document.getElementById('search-modal-overlay');
  const searchInput = document.getElementById('search-input');
  const resultsContainer = document.getElementById('search-results');

  let searchIndex = null;

  if (!searchInput || !resultsContainer || !searchModal) return;

  // ============ MODAL CONTROLS ============

  function openSearchModal() {
    searchModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
      searchInput.focus();
    }, 100);
  }

  function closeSearchModal() {
    searchModal.classList.remove('active');
    document.body.style.overflow = '';
    searchInput.value = '';
    resultsContainer.innerHTML = '';
  }

  // Open modal on search icon click
  if (searchToggle) {
    searchToggle.addEventListener('click', openSearchModal);
  }

  // Close modal on close button click
  if (searchClose) {
    searchClose.addEventListener('click', closeSearchModal);
  }

  // Close modal on overlay click
  if (searchOverlay) {
    searchOverlay.addEventListener('click', closeSearchModal);
  }

  // Close modal on ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && searchModal.classList.contains('active')) {
      closeSearchModal();
    }
  });

  // Keyboard shortcut: Ctrl+K or Cmd+K to open search
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      openSearchModal();
    }
  });

  // ============ SEARCH INDEX LOADING ============

  // Fetch the index when modal opens (lazy loading)
  searchModal.addEventListener('transitionend', async (e) => {
    if (e.propertyName === 'opacity' && searchModal.classList.contains('active') && !searchIndex) {
      try {
        const response = await fetch('/search.json');
        searchIndex = await response.json();
      } catch (e) {
        console.error('Could not fetch search index', e);
        displayError();
      }
    }
  });

  // Alternative: Load on first focus (keeps your original behavior)
  searchInput.addEventListener('focus', async () => {
    if (!searchIndex) {
      try {
        const response = await fetch('/search.json');
        searchIndex = await response.json();
      } catch (e) {
        console.error('Could not fetch search index', e);
        displayError();
      }
    }
  });

  // ============ SEARCH FUNCTIONALITY ============

  let debounceTimer;

  searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);

    const term = e.target.value.trim().toLowerCase();

    // Clear results if search is empty
    if (!term) {
      resultsContainer.innerHTML = '';
      return;
    }

    // Show loading state for very short time
    if (!searchIndex) {
      resultsContainer.innerHTML = '<div class="search-modal-empty"><p>Loading search index...</p></div>';
      return;
    }

    // Debounce search for better performance
    debounceTimer = setTimeout(() => {
      performSearch(term);
    }, 200);
  });

  function performSearch(term) {
    if (!searchIndex) return;

    // Simple filtering: checks if title or description contains the term
    const results = searchIndex.filter(post => {
      const title = (post.title || '').toLowerCase();
      const desc = (post.description || '').toLowerCase();
      const content = (post.content || '').toLowerCase();
      const tags = (post.tags || []).map(t => t.toLowerCase()).join(' ');

      return title.includes(term) || 
             desc.includes(term) || 
             content.includes(term) ||
             tags.includes(term);
    }).slice(0, 10); // Limit to 10 results

    displayResults(results, term);
  }

  // ============ DISPLAY RESULTS WITH DATE, TITLE, EXCERPT ============

  function displayResults(results, searchTerm) {
    if (results.length === 0) {
      resultsContainer.innerHTML = \`
        <div class="search-modal-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <p>No results found for "\${escapeHtml(searchTerm)}"</p>
        </div>
      \`;
      return;
    }

    resultsContainer.innerHTML = results
      .map(post => {
        const title = post.title || 'Untitled';
        const description = post.description || '';
        const url = post.url || '#';
        const date = post.date ? formatDate(post.date) : '';
        const tags = post.tags || [];

        // Get excerpt with context
        const excerpt = getExcerpt(description, searchTerm, 120);

        return \`
          <a href="\${escapeHtml(url)}" class="search-result-item">
            \${date ? \`<div class="search-result-date">\${escapeHtml(date)}</div>\` : ''}
            <div class="search-result-title">\${highlightTerm(escapeHtml(title), searchTerm)}</div>
            \${excerpt ? \`<div class="search-result-excerpt">\${highlightTerm(excerpt, searchTerm)}</div>\` : ''}
            \${tags.length > 0 ? \`
              <div class="search-result-tags">
                \${tags.slice(0, 3).map(tag => \`<span class="search-result-tag">\${escapeHtml(tag)}</span>\`).join('')}
              </div>
            \` : ''}
          </a>
        \`;
      })
      .join('');
  }

  function displayError() {
    resultsContainer.innerHTML = \`
      <div class="search-modal-empty">
        <p>⚠️ Failed to load search index</p>
      </div>
    \`;
  }

  // ============ UTILITY FUNCTIONS ============

  function formatDate(dateString) {
    try {
      const date = new Date(dateString);
      const options = { year: 'numeric', month: 'short', day: 'numeric' };
      return date.toLocaleDateString('en-US', options);
    } catch (e) {
      return dateString;
    }
  }

  function getExcerpt(text, term, maxLength) {
    if (!text) return '';

    const lowerText = text.toLowerCase();
    const lowerTerm = term.toLowerCase();
    const index = lowerText.indexOf(lowerTerm);

    if (index === -1) {
      return text.substring(0, maxLength) + (text.length > maxLength ? '...' : '');
    }

    // Show context around the match
    const start = Math.max(0, index - 40);
    const end = Math.min(text.length, index + maxLength - 40);

    let excerpt = text.substring(start, end);

    if (start > 0) excerpt = '...' + excerpt;
    if (end < text.length) excerpt = excerpt + '...';

    return excerpt;
  }

  function highlightTerm(text, term) {
    if (!term || !text) return text;

    const regex = new RegExp(\`(\${escapeRegex(term)})\`, 'gi');
    return text.replace(regex, '<strong>$1</strong>');
  }

  function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return '';
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

})();
