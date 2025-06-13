import {
  IMAGE_BASE_URL,
  fetchAndCacheMovieGenres,
  searchMoviesByQuery,
  discoverMoviesByFilters,
} from "./tmdbService.mjs";
import {
  addToWatchlist,
  removeFromWatchlist,
  isInWatchlist,
} from "./storageUtils.js";

const searchForm = document.getElementById("searchForm");
const queryInput = document.getElementById("query");
const genreSelect = document.getElementById("genre");
const yearInput = document.getElementById("year");
const searchResultsContainer = document.getElementById("searchResults");
const paginationContainer = document.getElementById("pagination");

let genresMap = {};
let currentPage = 1;
let currentFilters = {};
let currentSearchData = null;

async function populateGenreFilter() {
  genresMap = await fetchAndCacheMovieGenres();
  if (genreSelect) {
    genreSelect.innerHTML = '<option value="">All Genres</option>';
    for (const id in genresMap) {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = genresMap[id];
      genreSelect.appendChild(option);
    }
  }
}

function displaySearchResults(data) {
  currentSearchData = data;
  searchResultsContainer.innerHTML = "";

  if (!data || !data.results || !Array.isArray(data.results)) {
    searchResultsContainer.innerHTML =
      '<p class="no-results">No movies found or an error occurred. Try different filters!</p>';
    updatePagination(0, 1);
    return;
  }

  const renderableMovies = data.results.filter(
    (movie) => movie && movie.poster_path && movie.title
  );

  if (renderableMovies.length === 0) {
    if (data.results.length > 0) {
      searchResultsContainer.innerHTML =
        '<p class="no-results">Movies were found, but they were missing essential information (like a poster) to be displayed. Try different filters!</p>';
    } else {
      searchResultsContainer.innerHTML =
        '<p class="no-results">No movies found matching your criteria. Try different filters!</p>';
    }
    updatePagination(0, 1);
    return;
  }

  const resultsGrid = document.createElement("div");
  resultsGrid.className = "movies-grid";

  renderableMovies.forEach((movie) => {
    const posterPath = `${IMAGE_BASE_URL}${movie.poster_path}`;
    const movieYear = movie.release_date
      ? movie.release_date.substring(0, 4)
      : "N/A";

    const movieGenresText =
      movie.genre_ids && Array.isArray(movie.genre_ids)
        ? movie.genre_ids.map((id) => genresMap[id] || "Unknown").join(", ")
        : movie.genres && Array.isArray(movie.genres) && movie.genres.length > 0
        ? movie.genres.map((g) => g.name).join(", ")
        : "Not available";
        
    const isBookmarked = isInWatchlist(movie.id);

    const movieCard = document.createElement("div");
    movieCard.className = "movie-card";
    movieCard.dataset.movieId = movie.id;

    movieCard.innerHTML = `
      <a href="./movieDetail.html?id=${movie.id}" class="movie-card-link">
        <img src="${posterPath}" alt="${
      movie.title
    }" class="movie-card-poster" loading="lazy">
        <div class="movie-card-info">
          <h3 class="movie-card-title">${movie.title}</h3>
          <p class="movie-card-year">Year: ${movieYear}</p>
          <p class="movie-card-genres">Genres: ${movieGenresText}</p>
          <p class="movie-card-rating">Rating: ${
            movie.vote_average ? movie.vote_average.toFixed(1) : "N/A"
          }</p>
        </div>
      </a>
      <button class="watchlist-btn add ${isBookmarked ? 'active' : ''}" 
              data-movie-id="${movie.id}" 
              title="${isBookmarked ? 'Remove from Watchlist' : 'Add to Watchlist'}">❤</button>
    `;
    resultsGrid.appendChild(movieCard);
  });

  searchResultsContainer.appendChild(resultsGrid);

  updatePagination(data.total_pages, data.page);
}

function updatePagination(totalPages, currentPageNum) {
  paginationContainer.innerHTML = "";
  if (!totalPages || totalPages <= 1) return;

  const maxPagesToShow = 5;
  let startPage, endPage;

  if (totalPages <= maxPagesToShow) {
    startPage = 1;
    endPage = totalPages;
  } else {
    const maxPagesBeforeCurrent = Math.floor(maxPagesToShow / 2);
    const maxPagesAfterCurrent = Math.ceil(maxPagesToShow / 2) - 1;
    if (currentPageNum <= maxPagesBeforeCurrent) {
      startPage = 1;
      endPage = maxPagesToShow;
    } else if (currentPageNum + maxPagesAfterCurrent >= totalPages) {
      startPage = totalPages - maxPagesToShow + 1;
      endPage = totalPages;
    } else {
      startPage = currentPageNum - maxPagesBeforeCurrent;
      endPage = currentPageNum + maxPagesAfterCurrent;
    }
  }

  if (currentPageNum > 1) {
    const prevButton = document.createElement("button");
    prevButton.textContent = "Previous";
    prevButton.addEventListener("click", () =>
      handleSearch(currentPageNum - 1)
    );
    paginationContainer.appendChild(prevButton);
  }

  for (let i = startPage; i <= endPage; i++) {
    const pageButton = document.createElement("button");
    pageButton.textContent = i;
    if (i === currentPageNum) {
      pageButton.disabled = true;
      pageButton.classList.add("active");
    }
    pageButton.addEventListener("click", () => handleSearch(i));
    paginationContainer.appendChild(pageButton);
  }

  if (currentPageNum < totalPages) {
    const nextButton = document.createElement("button");
    nextButton.textContent = "Next";
    nextButton.addEventListener("click", () =>
      handleSearch(currentPageNum + 1)
    );
    paginationContainer.appendChild(nextButton);
  }
}

async function handleSearch(page = 1) {
  const query = queryInput.value.trim();
  const genreId = genreSelect.value;
  const year = yearInput.value ? parseInt(yearInput.value, 10) : null;

  currentFilters = { query, genreId, year };
  console.log("Search filters:", currentFilters);

  searchResultsContainer.innerHTML = '<div class="loader">Searching...</div>';

  let searchData = null;

  if (query) {
    searchData = await searchMoviesByQuery(query, year, page);
    console.log("Raw search results:", searchData?.results);
    if (searchData && searchData.results && genreId) {
      const parsedGenreId = parseInt(genreId);
      searchData.results = searchData.results.filter((movie) => {
        const hasGenreIds =
          movie.genre_ids &&
          Array.isArray(movie.genre_ids) &&
          movie.genre_ids.includes(parsedGenreId);
        const hasGenres =
          movie.genres &&
          Array.isArray(movie.genres) &&
          movie.genres.some((genre) => genre.id === parsedGenreId);
        const hasGenre = hasGenreIds || hasGenres;
        console.log(
          `Movie: ${movie.title}, Genre IDs: ${
            movie.genre_ids
          }, Genres: ${JSON.stringify(
            movie.genres
          )}, Has Genre (${parsedGenreId}): ${hasGenre}`
        );
        return hasGenre;
      });
      console.warn(
        "Filtered results by genre on client-side:",
        searchData.results
      );
    }
  } else if (genreId || year) {
    const discoverParams = { page };
    if (genreId) discoverParams.with_genres = genreId;
    if (year) discoverParams.primary_release_year = year;
    searchData = await discoverMoviesByFilters(discoverParams);
    console.log("Discover results:", searchData?.results);
  } else {
    searchResultsContainer.innerHTML =
      '<p class="search-placeholder">Please enter a movie title or select a filter to start searching.</p>';
    updatePagination(null);
    return;
  }

  displaySearchResults(searchData);
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  handleSearch(1);
});

function handleHeaderSearch() {
  const params = new URLSearchParams(window.location.search);
  const headerQuery = params.get("query");
  if (headerQuery) {
    queryInput.value = headerQuery;
    handleSearch(1);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await populateGenreFilter();
  handleHeaderSearch();

  searchResultsContainer.addEventListener("click", (event) => {
    const button = event.target.closest(".watchlist-btn.add");
    if (!button) return;

    const movieId = parseInt(button.dataset.movieId, 10);
    if (isNaN(movieId) || !currentSearchData || !currentSearchData.results)
      return;

    const movie = currentSearchData.results.find((m) => m.id === movieId);
    if (!movie) return;

    if (isInWatchlist(movieId)) {
      removeFromWatchlist(movieId);
      button.classList.remove("active");
      button.title = "Add to Watchlist";
    } else {
      addToWatchlist(movie);
      button.classList.add("active");
      button.title = "Remove from Watchlist";
    }
  });
});