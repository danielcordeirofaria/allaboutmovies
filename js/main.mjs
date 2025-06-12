// src/js/main.mjs
import { loadHeader } from './header.mjs';
import { loadFooter } from './footer.mjs';

function setupHeaderSearch() {

    const headerSearchInput = document.getElementById('searchInput');
    const headerSearchButton = document.getElementById('searchButton');

    if (headerSearchInput && headerSearchButton) {
        const performSearch = () => {
            const query = headerSearchInput.value.trim();
            if (query) {
                window.location.href = `./search.html?query=${encodeURIComponent(query)}`;
            }
        };

        headerSearchButton.addEventListener('click', performSearch);

        headerSearchInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault(); 
                performSearch();
            }
        });
        console.log("Header search (input/button) setup complete.");

    } else {
        if (!headerSearchInput) console.warn("Header search input (ID: 'searchInput') not found.");
        if (!headerSearchButton) console.warn("Header search button (ID: 'searchButton') not found.");
        console.warn("Header search functionality may not work as expected.");
    }
}

function initializeUI() {

  loadHeader();

  loadFooter();

  setupHeaderSearch();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeUI);
} else {
  initializeUI();
}