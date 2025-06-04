// js/randomMovie.mjs

import {
  fetchAndCacheMovieGenres,
  fetchMovieDetailsById,
  discoverRandomMovieId, // Esta função deve retornar apenas o ID
  IMAGE_BASE_URL
} from './tmdbService.mjs'; // Seu serviço TMDB

// Importa a função de busca de trilha sonora do Spotify
import { findMovieSoundtrackOnSpotify } from './spotifyService.mjs'; // Seu serviço Spotify

const movieDetailsContainer = document.getElementById('movieDetailsContainer');
const getAnotherMovieBtn = document.getElementById('getAnotherMovieBtn');

let currentGenresMap = {};

// A função displayMovieDetails permanece a mesma, pois ela não exibe dados do Spotify diretamente no DOM
// (a menos que você decida adicionar isso depois)
function displayMovieDetails(movie, genresMap) {
  if (!movieDetailsContainer || !movie) {
    movieDetailsContainer.innerHTML = '<p>Could not load movie details.</p>';
    return;
  }

  const posterPath = movie.poster_path
    ? `${IMAGE_BASE_URL}${movie.poster_path}`
    : './images/placeholder-poster.png'; // Certifique-se que este placeholder existe
  const releaseYear = movie.release_date ? movie.release_date.substring(0, 4) : '';
  const releaseDateFormatted = movie.release_date
    ? new Date(movie.release_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Not available';
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
  const overview = movie.overview || 'Synopsis not available.';
  const runtime = movie.runtime ? `${movie.runtime} minutes` : 'Not available';

  const movieGenres = movie.genres && Array.isArray(movie.genres)
    ? movie.genres.map(genre => genre.name).join(', ')
    : (movie.genre_ids && Array.isArray(movie.genre_ids)
        ? movie.genre_ids.map(id => genresMap[id] || 'Unknown').join(', ')
        : 'Not available');

  let watchProvidersHtml = '';
  const countryCode = 'US'; // Você pode tornar isso configurável ou detectar a região do usuário
  const watchData = movie['watch/providers'] || movie.watch_providers; // TMDB mudou o nome da chave

  if (watchData && watchData.results && watchData.results[countryCode]) {
    const countryProviders = watchData.results[countryCode];
    const tmdbWatchLink = countryProviders.link;

    let providersListHtml = '';
    if (countryProviders.flatrate && countryProviders.flatrate.length > 0) {
      // A URL base para logos do TMDB é diferente da de posters
      const logoBaseUrl = 'https://image.tmdb.org/t/p/w45'; // w45 é um bom tamanho para logos pequenos
      providersListHtml = '<ul class="streaming-provider-list">';
      countryProviders.flatrate.forEach(provider => {
        providersListHtml += `
          <li>
            <img src="${logoBaseUrl}${provider.logo_path}" alt="${provider.provider_name} logo" class="provider-logo" loading="lazy">
            ${provider.provider_name}
          </li>`;
      });
      providersListHtml += '</ul>';
    }

    if (tmdbWatchLink) {
      watchProvidersHtml = `
        <div class="watch-providers-section">
          <h4>Where to Watch (${countryCode}):</h4>
          ${providersListHtml || '<p class="no-options-text">No subscription streaming options listed for this region.</p>'}
          <a href="${tmdbWatchLink}" target="_blank" rel="noopener noreferrer" class="watch-now-button">
            View All Watch Options on TMDb
          </a>
        </div>
      `;
    } else if (providersListHtml) {
        watchProvidersHtml = `
        <div class="watch-providers-section">
          <h4>Available on (${countryCode}):</h4>
          ${providersListHtml}
        </div>
      `;
    }
  } else if (watchData && watchData.results && Object.keys(watchData.results).length > 0) {
    // Se não tiver para US, mas tiver para outros, informa.
    watchProvidersHtml = `<div class="watch-providers-section"><p>Watch information not available for your specific region (${countryCode}), but may be available elsewhere.</p></div>`;
  }


  movieDetailsContainer.innerHTML = `
    <div class="movie-detail-layout">
      <div class="movie-poster-column">
        <img src="${posterPath}" alt="Poster for ${movie.title}" class="movie-poster-detail">
      </div>
      <div class="movie-info-column">
        <h3 class="movie-title-detail">${movie.title} ${releaseYear ? `(${releaseYear})` : ''}</h3>
        <div class="movie-meta-detail">
          <span><strong>Release Date:</strong> ${releaseDateFormatted}</span>
          <span><strong>Runtime:</strong> ${runtime}</span>
          ${movieGenres && movieGenres !== 'Not available' ? `<span><strong>Genres:</strong> ${movieGenres}</span>` : ''}
        </div>
        <div class="movie-rating-detail">
          <strong>Rating:</strong> ${rating} / 10 (${movie.vote_count} votes)
        </div>
        <p class="movie-overview-detail">${overview}</p>
        ${watchProvidersHtml}
        <!-- Você pode adicionar uma seção para o link do Spotify aqui se quiser -->
        <div id="spotifySoundtrackSection"></div>
      </div>
    </div>
  `;
}


async function loadAndDisplayRandomMovie() {
  if (!movieDetailsContainer) return;

  movieDetailsContainer.innerHTML = `
    <div class="loading-placeholder">
      <p>Finding an awesome movie for you...</p>
    </div>`;
  if (getAnotherMovieBtn) getAnotherMovieBtn.disabled = true;

  try {
    if (Object.keys(currentGenresMap).length === 0) {
        console.log("Fetching movie genres...");
        currentGenresMap = await fetchAndCacheMovieGenres();
    }

    console.log("Discovering random movie ID...");
    const movieId = await discoverRandomMovieId(); // Espera-se que retorne apenas o ID

    if (movieId) {
      console.log(`Fetching details for movie ID: ${movieId}...`);
      // Importante: fetchMovieDetailsById deve incluir 'append_to_response=watch/providers'
      // Se não, você precisará fazer uma chamada separada para /movie/{movie_id}/watch/providers
      const movieDetails = await fetchMovieDetailsById(movieId); // Assegure que esta função busca 'watch/providers'

      if (movieDetails) {
        console.log("TMDB Movie Details:", movieDetails);
        displayMovieDetails(movieDetails, currentGenresMap); // Exibe os detalhes do filme do TMDB

        // Agora, busca a trilha sonora no Spotify
        const movieTitle = movieDetails.title;
        const movieYear = movieDetails.release_date ? movieDetails.release_date.substring(0, 4) : null;

        if (movieTitle) {
          console.log(`Searching Spotify for soundtrack: "${movieTitle}" (Year: ${movieYear || 'N/A'})...`);
          const soundtrackData = await findMovieSoundtrackOnSpotify(movieTitle, movieYear);

          if (soundtrackData) {
            console.log("Spotify Soundtrack Data:", soundtrackData);
            // Opcional: Exibir o link do Spotify no DOM
            const spotifySection = document.getElementById('spotifySoundtrackSection');
            if (spotifySection) {
                let spotifyHtml = `
                    <div class="soundtrack-info" style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee;">
                        <h4>Soundtrack on Spotify</h4>`;
                if (soundtrackData.cover) {
                    spotifyHtml += `<img src="${soundtrackData.cover}" alt="Cover for ${soundtrackData.name}" class="soundtrack-cover" style="max-width: 100px; height: auto; border-radius: 4px; margin-bottom: 10px; display: block;">`;
                }
                spotifyHtml += `<p><strong>Album:</strong> ${soundtrackData.name || 'N/A'}</p>`;
                if (soundtrackData.artist) {
                    spotifyHtml += `<p><strong>Artist:</strong> ${soundtrackData.artist}</p>`;
                }
                spotifyHtml += `<a href="${soundtrackData.url}" target="_blank" class="spotify-link" style="display: inline-block; background-color: #1DB954; color: white; padding: 8px 15px; border-radius: 20px; text-decoration: none; font-weight: 500;">Listen on Spotify</a>
                    </div>`;
                spotifySection.innerHTML = spotifyHtml;
            }
          } else {
            console.log(`No soundtrack found on Spotify for "${movieTitle}".`);
            const spotifySection = document.getElementById('spotifySoundtrackSection');
            if(spotifySection) spotifySection.innerHTML = `<div class="soundtrack-info" style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee;"><p>Soundtrack information not found on Spotify.</p></div>`;
          }
        } else {
            console.warn("Movie title is missing, cannot search Spotify.");
        }

      } else {
        movieDetailsContainer.innerHTML = '<p>Random movie not found or failed to load details. Please try again.</p>';
      }
    } else {
      movieDetailsContainer.innerHTML = '<p>Could not find a random movie ID. Please try again.</p>';
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
    // Pré-carrega os gêneros se ainda não tiver
    if (Object.keys(currentGenresMap).length === 0) {
        currentGenresMap = await fetchAndCacheMovieGenres();
    }
    // Carrega o primeiro filme aleatório
    await loadAndDisplayRandomMovie();
  } catch (error) {
    console.error('Error initializing page:', error);
    if (movieDetailsContainer) {
      movieDetailsContainer.innerHTML = `<p>Could not initialize the page. Please refresh or try again later. Error: ${error.message}</p>`;
    }
  }
}

document.addEventListener('DOMContentLoaded', initializePage);