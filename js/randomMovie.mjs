import {
  fetchAndCacheMovieGenres,
  fetchMovieDetailsById,
  discoverRandomMovie,
  IMAGE_BASE_URL,
  renderMovieDetails
} from './tmdbService.mjs';

import { findMovieSoundtrackOnSpotify } from './spotifyService.mjs';

const movieDetailsContainer = document.getElementById('movieDetailsContainer');
const getAnotherMovieBtn = document.getElementById('getAnotherMovieBtn');

let currentGenresMap = {};

async function loadAndDisplayRandomMovie() {
  if (!movieDetailsContainer) return;
  movieDetailsContainer.innerHTML = `<div class="loading-placeholder"><p>Finding an awesome movie for you...</p></div>`;
  if (getAnotherMovieBtn) getAnotherMovieBtn.disabled = true;

  try {
    if (Object.keys(currentGenresMap).length === 0) {
      currentGenresMap = await fetchAndCacheMovieGenres();
    }

    const randomMovieBase = await discoverRandomMovie();
    if (randomMovieBase && randomMovieBase.id) {
      console.log("TMDB Random Movie (Base):", randomMovieBase);
      const movieDetails = await fetchMovieDetailsById(randomMovieBase.id);
      if (movieDetails) {
        console.log("TMDB Movie Details (Full):", movieDetails);
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
        movieDetailsContainer.innerHTML = '<p>Could not load full details for the random movie. Please try again.</p>';
      }
    } else {
      movieDetailsContainer.innerHTML = '<p>Could not find a random movie. Please try again.</p>';
    }
  } catch (error) {
    console.error('Error in loading random movie process:', error);
    movieDetailsContainer.innerHTML = `<p>An error occurred: ${error.message}. Please try again.</p>`;
  } finally {
    if (getAnotherMovieBtn) getAnotherMovieBtn.disabled = false;
  }
}

if (getAnotherMovieBtn) {
  getAnotherMovieBtn.addEventListener('click', loadAndDisplayRandomMovie);
}

async function initializePage() {
  try {
    if (Object.keys(currentGenresMap).length === 0) {
      currentGenresMap = await fetchAndCacheMovieGenres();
    }
    await loadAndDisplayRandomMovie();
  } catch (error) {
    console.error('Error initializing page:', error);
    if (movieDetailsContainer) {
      movieDetailsContainer.innerHTML = `<p>Could not initialize the page. Please refresh or try again later. Error: ${error.message}</p>`;
    }
  }
}

document.addEventListener('DOMContentLoaded', initializePage);