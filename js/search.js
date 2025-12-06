(function() {
  const searchInput = document.getElementById('search-input');
  const resultsContainer = document.getElementById('search-results');
  let searchIndex = null;
  let debounceTimer;

  if (!searchInput || !resultsContainer) return;

  searchInput.addEventListener('focus', async () => {
    if (!searchIndex) {
      try {
        const response = await fetch('/search.json');
        searchIndex = await response.json();
      } catch (e) {
        console.error('Could not fetch search index', e);
      }
    }
  });

  searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const term = e.target.value.toLowerCase();

      if (!term || !searchIndex) {
        resultsContainer.style.display = 'none';
        return;
      }

      const results = searchIndex.filter(post => {
        const title = (post.title || '').toLowerCase();
        const content = (post.content || '').toLowerCase();
        return title.includes(term) || content.includes(term);
      });

      displayResults(results, term);
    }, 300);
  });

  function getSnippet(text, term) {
    if (!text) return '';

    // Find where the term is
    const index = text.toLowerCase().indexOf(term);

    // If term not in content (matched by title), just show the start
    if (index === -1) {
      return text.slice(0, 80) + (text.length > 80 ? '...' : '');
    }

    // Context window: 20 chars before, 80 chars after
    const start = Math.max(0, index - 20);
    const end = Math.min(text.length, index + 80);

    let snippet = text.slice(start, end);

    // Add ellipses
    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';

    // Highlight the term (case insensitive) using regex
    // We use a simple replace here. Since content is stripped of tags, this is safe.
    const re = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return snippet.replace(re, '<mark>$1</mark>');
  }

  function displayResults(results, term) {
    if (results.length === 0) {
      resultsContainer.style.display = 'block';
      resultsContainer.innerHTML = '<div class="search-no-results">No matches found.</div>';
      return;
    }

    const html = results.slice(0, 8).map(post => {
      const snippet = getSnippet(post.content, term);
      return `
      <a href="${post.url}" class="search-result-item">
        <span class="search-result-header">
          <span class="search-result-title">${post.title}</span>
          <span class="search-result-date">${post.date}</span>
        </span>
        <span class="search-result-snippet">${snippet}</span>
      </a>
    `}).join('');

    resultsContainer.innerHTML = html;
    resultsContainer.style.display = 'block';
  }

  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
      resultsContainer.style.display = 'none';
    }
  });
})();
