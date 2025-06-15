import {
  fetchAndCacheMovieGenres,
  fetchMovieDetailsById,
  renderMovieDetails
} from './tmdbService.mjs';

import { findMovieSoundtrackOnSpotify } from './spotifyService.mjs';
import { addToWatchlist, removeFromWatchlist, isInWatchlist } from './storageUtils.js';

const movieDetailsContainer = document.getElementById('movieDetailsContainer');
let currentGenresMap = {};
let currentMovie = null;

async function loadAndDisplayMovieDetails(movieId) {
  if (!movieDetailsContainer) return;
  movieDetailsContainer.innerHTML = `
    <div class="loading-placeholder">
      <div class="loader"></div>
      <p>Loading movie details...</p>
    </div>`;

  try {
    if (Object.keys(currentGenresMap).length === 0) {
      currentGenresMap = await fetchAndCacheMovieGenres();
    }

    const movieDetails = await fetchMovieDetailsById(movieId);
    currentMovie = movieDetails;

    if (movieDetails) {
      console.log("TMDB Movie Details:", movieDetails);
      const movieTitle = movieDetails.title;
      const movieYear = movieDetails.release_date ? movieDetails.release_date.substring(0, 4) : null;
      let soundtrackData = null;
      if (movieTitle) {
        soundtrackData = await findMovieSoundtrackOnSpotify(movieTitle, movieYear);
        console.log("Spotify Soundtrack Data:", soundtrackData);
      } else {
        console.warn("Movie title is missing, cannot search Spotify.");
      }
      movieDetailsContainer.innerHTML = renderMovieDetails(movieDetails, currentGenresMap, soundtrackData);
    } else {
      movieDetailsContainer.innerHTML = '<p>Could not load movie details. Please try again.</p>';
    }
  } catch (error) {
    console.error('Error in loading movie details:', error);
    movieDetailsContainer.innerHTML = `<p>An error occurred: ${error.message}. Please try again.</p>`;
  }
}

async function initializePage() {
  const urlParams = new URLSearchParams(window.location.search);
  const movieId = urlParams.get('id');
  if (movieId) {
    await loadAndDisplayMovieDetails(movieId);
  } else {
    if (movieDetailsContainer) {
      movieDetailsContainer.innerHTML = `<p>No movie ID provided.</p>`;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
    initializePage();

    movieDetailsContainer.addEventListener('click', (event) => {
        const button = event.target.closest('.watchlist-btn.add');
        if (!button || !currentMovie) return;

        const movieId = currentMovie.id;

        if (isInWatchlist(movieId)) {
            removeFromWatchlist(movieId);
            button.classList.remove('active');
            button.title = "Add to Watchlist";
        } else {
            addToWatchlist(currentMovie);
            button.classList.add('active');
            button.title = "Remove from Watchlist";
        }
    });
});