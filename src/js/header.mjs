// src/js/header.mjs
export function loadHeader() {
  const headerElement = document.getElementById('header'); 
  if (!headerElement) {
    console.error("Elemento com ID 'header' não encontrado.");
    return;
  }

  headerElement.innerHTML = `
    <div class="header-container">
      <a href="index.html" class="logo-link">
        <img src="./images/logo.png" alt="All About Movies Logo" id="appLogo">
      </a>

      <button class="hamburger-button" id="hamburgerButton" aria-label="Abrir menu" aria-expanded="false" aria-controls="navbarMenu">
        <span class="hamburger-button__bar"></span>
        <span class="hamburger-button__bar"></span>
        <span class="hamburger-button__bar"></span>
      </button>

      <nav class="navbar" id="navbarMenu">
        <ul class="nav-links">
          <li><a href="index.html" class="active">Home</a></li>
          <li><a href="#">Top Rated</a></li>
          <li><a href="#">Genres</a></li>
          <li><a href="randomMovie.html">Random Movie</a></li>
        </ul>
      </nav>
      
      <div class="search-container">
        <input type="text" id="searchInput" placeholder="Search movies...">
        <button id="searchButton">Search</button>
      </div>
    </div>
  `;

  initializeHamburgerMenu();
}

function initializeHamburgerMenu() {
  const hamburgerButton = document.getElementById('hamburgerButton');
  const navbarMenu = document.getElementById('navbarMenu');
  
  if (hamburgerButton && navbarMenu) {
    const navLinks = navbarMenu.querySelectorAll('.nav-links a');

    hamburgerButton.addEventListener('click', function () {
      this.classList.toggle('active');
      navbarMenu.classList.toggle('active');
      const isExpanded = this.getAttribute('aria-expanded') === 'true' || false;
      this.setAttribute('aria-expanded', !isExpanded);

      if (navbarMenu.classList.contains('active')) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    });

    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        if (navbarMenu.classList.contains('active')) {
          hamburgerButton.classList.remove('active');
          navbarMenu.classList.remove('active');
          hamburgerButton.setAttribute('aria-expanded', 'false');
          document.body.style.overflow = '';
        }
      });
    });

    document.addEventListener('click', function(event) {
      const isClickInsideNav = navbarMenu.contains(event.target);
      const isClickOnHamburger = hamburgerButton.contains(event.target);

      if (!isClickInsideNav && !isClickOnHamburger && navbarMenu.classList.contains('active')) {
        hamburgerButton.classList.remove('active');
        navbarMenu.classList.remove('active');
        hamburgerButton.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });
  } else {
    if (!hamburgerButton) console.error("Botão hambúrguer não encontrado após carregar header.");
    if (!navbarMenu) console.error("Menu Navbar não encontrado após carregar header.");
  }
}