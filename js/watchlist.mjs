import { IMAGE_BASE_URL } from "./tmdbService.mjs";
import { getWatchlist, removeFromWatchlist, isInWatchlist } from "./storageUtils.js";
1
const watchlistResultsContainer = document.getElementById("watchlistResults");

function displayWatchlist() {
  watchlistResultsContainer.innerHTML = "";
  const watchlist = getWatchlist();

  if (watchlist.length === 0) {
    watchlistResultsContainer.innerHTML =
      '<p class="no-results">Your watchlist is empty. Add some movies!</p>';
    return;
  }

  const resultsGrid = document.createElement("div");
  resultsGrid.className = "movies-grid";

  watchlist.forEach((movie) => {
    const posterPath = movie.poster_path
      ? `${IMAGE_BASE_URL}${movie.poster_path}`
      : "https://via.placeholder.com/150x225?text=No+Poster";
    const movieYear = movie.release_date
      ? movie.release_date.substring(0, 4)
      : "N/A";
    const movieGenresText = movie.genres
      ? movie.genres.map((g) => g.name).join(", ")
      : "Not available";

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
      <button class="watchlist-btn remove" data-movie-id="${
        movie.id
      }" title="Remove from Watchlist">❌</button>
    `;
    resultsGrid.appendChild(movieCard);
  });

  watchlistResultsContainer.appendChild(resultsGrid);

  document.querySelectorAll(".watchlist-btn.remove").forEach((button) => {
    button.addEventListener("click", () => {
      const movieId = parseInt(button.dataset.movieId);
      removeFromWatchlist(movieId);
      displayWatchlist();
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  displayWatchlist();
});