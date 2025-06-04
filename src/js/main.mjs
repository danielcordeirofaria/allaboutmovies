// src/js/main.mjs
import { loadHeader } from './header.mjs';
import { loadFooter } from './footer.mjs';

// Function to initialize the UI components
function initializeUI() {
  loadHeader();
  loadFooter();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeUI);
} else {
  initializeUI();
}