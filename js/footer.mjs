// src/js/footer.mjs
export function loadFooter() {
  const footer = document.getElementById('footer');

  footer.innerHTML = `
    <div class="footer-content">
      <p>&copy; ${new Date().getFullYear()} All About Movies. All rights reserved.</p>
    </div>
  `;
}
