import { isInWatchlist } from './storageUtils.js';

const API_CONFIG = {
  KEY: 'a6a31210ff3a5959d29008875d98fb94',
  BASE_URL: 'https://api.themoviedb.org/3',
  IMAGE_BASE_URL: 'https://image.tmdb.org/t/p/w500',
  DEFAULT_LANGUAGE: 'en-US',
  MAX_DISCOVER_PAGES: 500,
};
export const IMAGE_BASE_URL = API_CONFIG.IMAGE_BASE_URL;

let tmdbGenresMap = null;

async function _tmdbApiRequest(endpoint, params = {}, method = 'GET') {
  const queryParams = new URLSearchParams({
    api_key: API_CONFIG.KEY,
    language: API_CONFIG.DEFAULT_LANGUAGE,
    ...params,
  });
  const url = `${API_CONFIG.BASE_URL}${endpoint}?${queryParams.toString()}`;
  try {
    const response = await fetch(url, { method });
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`TMDB Resource not found (404): ${url}`);
        return null;
      }
      const errorData = await response.json().catch(() => ({ status_message: response.statusText }));
      throw new Error(`TMDB API Error [${response.status}]: ${errorData.status_message || response.statusText} accessing ${url}`);
    }
    if (response.status === 204) return null;
    return await response.json();
  } catch (error) {
    console.error(`TMDB Request failed for ${endpoint}:`, error.message);
    throw error;
  }
}

export async function fetchAndCacheMovieGenres() {
  if (tmdbGenresMap) return tmdbGenresMap;
  try {
    const data = await _tmdbApiRequest('/genre/movie/list');
    if (!data || !data.genres) {
      console.warn('TMDB: Could not fetch genre list.');
      tmdbGenresMap = {};
      return tmdbGenresMap;
    }
    const tempGenresMap = {};
    data.genres.forEach(genre => { tempGenresMap[genre.id] = genre.name; });
    tmdbGenresMap = tempGenresMap;
    return tmdbGenresMap;
  } catch (error) {
    tmdbGenresMap = {};
    return {};
  }
}

export async function fetchMovieDetailsById(movieId) {
  if (!movieId) {
    console.error('TMDB: Movie ID is required to fetch details.');
    return null;
  }
  try {
    const movieData = await _tmdbApiRequest(`/movie/${movieId}`, {
      append_to_response: 'watch/providers,credits,videos,images'
    });
    return movieData;
  } catch (error) {
    return null;
  }
}

async function _discoverRandomMovieFromParams(baseDiscoveryParams) {
  try {
    const initialData = await _tmdbApiRequest('/discover/movie', { ...baseDiscoveryParams, page: 1 });
    if (!initialData || !initialData.results || initialData.results.length === 0) return null;
    
    const totalPages = Math.min(initialData.total_pages, API_CONFIG.MAX_DISCOVER_PAGES);
    if (totalPages === 0) return null;

    const randomPage = Math.floor(Math.random() * totalPages) + 1;
    const pageData = await _tmdbApiRequest('/discover/movie', { ...baseDiscoveryParams, page: randomPage });

    if (pageData && pageData.results && pageData.results.length > 0) {
      const randomIndex = Math.floor(Math.random() * pageData.results.length);
      return pageData.results[randomIndex];
    }
    return null;
  } catch (error) {
    console.warn(`TMDB: Random movie discovery failed with params: ${JSON.stringify(baseDiscoveryParams)}`);
    return null;
  }
}

export async function discoverRandomMovie() {
  const currentYear = new Date().getFullYear();
  const primaryDiscoveryParams = {
    sort_by: 'popularity.desc',
    include_adult: false,
    include_video: false,
    'vote_count.gte': 100,
    'primary_release_date.gte': `${currentYear - 20}-01-01`,
    'primary_release_date.lte': `${currentYear}-12-31`,
  };
  let movie = await _discoverRandomMovieFromParams(primaryDiscoveryParams);
  if (movie) {
    const movieDetails = await fetchMovieDetailsById(movie.id);
    return movieDetails || movie;
  }

  console.warn('TMDB: No movie found with primary criteria. Attempting fallback...');
  const fallbackDiscoveryParams = {
    sort_by: 'popularity.desc',
    include_adult: false,
    include_video: false,
    'vote_count.gte': 50,
  };
  movie = await _discoverRandomMovieFromParams(fallbackDiscoveryParams);
  if (movie) {
    const movieDetails = await fetchMovieDetailsById(movie.id);
    return movieDetails || movie;
  }
  console.error('TMDB: No movie found even with fallback criteria.');
  return null;
}

export async function searchMoviesByQuery(query, year = null, page = 1) {
  if (!query && !year) {
    console.warn("TMDB: Query or year is required for searchMoviesByQuery. Returning empty results.");
    return { results: [], total_pages: 0, total_results: 0 };
  }
  const params = { page };
  if (query) params.query = query;
  if (year) params.primary_release_year = year;
  try {
    const searchResults = await _tmdbApiRequest('/search/movie', params);
    if (searchResults && searchResults.results && searchResults.results.length > 0) {
      const detailedResults = await Promise.all(
        searchResults.results.map(async movie => {
          const details = await fetchMovieDetailsById(movie.id);
          return details || movie;
        })
      );
      return {
        ...searchResults,
        results: detailedResults
      };
    }
    return searchResults;
  } catch (error) {
    console.error(`TMDB: Error searching movies with query "${query}" and year "${year}".`);
    return null;
  }
}

export async function discoverMoviesByFilters(filters = {}) {
  const params = {
    page: filters.page || 1,
    include_adult: false,
  };
  if (filters.with_genres) params.with_genres = filters.with_genres;
  if (filters.primary_release_year) params.primary_release_year = filters.primary_release_year;
  if (filters.sort_by) params.sort_by = filters.sort_by;

  try {
    const discoverResults = await _tmdbApiRequest('/discover/movie', params);
    if (discoverResults && discoverResults.results && discoverResults.results.length > 0) {
      const detailedResults = await Promise.all(
        discoverResults.results.map(async movie => {
          const details = await fetchMovieDetailsById(movie.id);
          return details || movie;
        })
      );
      return {
        ...discoverResults,
        results: detailedResults
      };
    }
    return discoverResults;
  } catch (error) {
    console.error(`TMDB: Error discovering movies with filters:`, JSON.stringify(filters));
    return null;
  }
}

export function renderMovieDetails(movie, genresMap, soundtrackData = null) {
  if (!movie) {
    return `<div class="loading-placeholder"><p>Could not load movie details.</p></div>`;
  }

  const posterPath = movie.poster_path ? `${IMAGE_BASE_URL}${movie.poster_path}` : './images/placeholder-poster.png';
  const releaseYear = movie.release_date ? movie.release_date.substring(0, 4) : '';
  const releaseDateFormatted = movie.release_date ? new Date(movie.release_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not available';
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
  const overview = movie.overview || 'Synopsis not available.';
  const runtime = movie.runtime ? `${movie.runtime} minutes` : 'Not available';
  const movieGenres = movie.genres && Array.isArray(movie.genres) && movie.genres.length > 0
    ? movie.genres.map(genre => genre.name).join(', ')
    : (movie.genre_ids && Array.isArray(movie.genre_ids)
        ? movie.genre_ids.map(id => genresMap[id] || 'Unknown').join(', ')
        : 'Not available');

  const isBookmarked = isInWatchlist(movie.id);
  const watchlistBtnHtml = `
    <button class="watchlist-btn add ${isBookmarked ? 'active' : ''}"
            data-movie-id="${movie.id}"
            title="${isBookmarked ? 'Remove from Watchlist' : 'Add to Watchlist'}">❤</button>
  `;

  let watchProvidersHtml = '';
  const countryCode = 'US';
  const watchData = movie['watch/providers'] || movie.watch_providers;
  if (watchData && watchData.results && watchData.results[countryCode]) {
    const countryProviders = watchData.results[countryCode];
    const tmdbWatchLink = countryProviders.link;
    let providersListHtml = '';
    if (countryProviders.flatrate && countryProviders.flatrate.length > 0) {
      const logoBaseUrl = 'https://image.tmdb.org/t/p/w45';
      providersListHtml = '<ul class="streaming-provider-list">';
      countryProviders.flatrate.forEach(provider => {
        providersListHtml += `<li><img src="${logoBaseUrl}${provider.logo_path}" alt="${provider.provider_name} logo" class="provider-logo" loading="lazy"> ${provider.provider_name}</li>`;
      });
      providersListHtml += '</ul>';
    }
    if (tmdbWatchLink) {
      watchProvidersHtml = `<div class="watch-providers-section"><h4>Where to Watch (${countryCode}):</h4>${providersListHtml || '<p class="no-options-text">No subscription streaming options listed for this region.</p>'}<a href="${tmdbWatchLink}" target="_blank" rel="noopener noreferrer" class="watch-now-button">View All Watch Options on TMDb</a></div>`;
    } else if (providersListHtml) {
      watchProvidersHtml = `<div class="watch-providers-section"><h4>Available on (${countryCode}):</h4>${providersListHtml}</div>`;
    }
  } else if (watchData && watchData.results && Object.keys(watchData.results).length > 0) {
    watchProvidersHtml = `<div class="watch-providers-section"><p>Watch information not available for your specific region (${countryCode}), but may be available elsewhere.</p></div>`;
  }

  let spotifyHtml = '';
  if (soundtrackData) {
    spotifyHtml = `<div class="soundtrack-info" style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee;"><h4>Soundtrack on Spotify</h4>`;
    if (soundtrackData.cover) spotifyHtml += `<img src="${soundtrackData.cover}" alt="Cover for ${soundtrackData.name}" class="soundtrack-cover" style="max-width: 100px; height: auto; border-radius: 4px; margin-bottom: 10px; display: block;">`;
    spotifyHtml += `<p><strong>Album:</strong> ${soundtrackData.name || 'N/A'}</p>`;
    if (soundtrackData.artist) spotifyHtml += `<p><strong>Artist:</strong> ${soundtrackData.artist}</p>`;
    spotifyHtml += `<a href="${soundtrackData.url}" target="_blank" class="spotify-link" style="display: inline-block; background-color: #1DB954; color: white; padding: 8px 15px; border-radius: 20px; text-decoration: none; font-weight: 500;">Listen on Spotify</a></div>`;
  } else {
    spotifyHtml = `<div class="soundtrack-info" style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee;"><p>Soundtrack information not found on Spotify.</p></div>`;
  }

  return `
    <div class="movie-detail-layout">
      <div class="movie-poster-column">
        <img src="${posterPath}" alt="Poster for ${movie.title}" class="movie-poster-detail">
      </div>
      <div class="movie-info-column">
        <div class="movie-title-wrapper">
          <h3 class="movie-title-detail">${movie.title} ${releaseYear ? `(${releaseYear})` : ''}</h3>
          ${watchlistBtnHtml}
        </div>
        <div class="movie-meta-detail">
          <span><strong>Release Date:</strong> ${releaseDateFormatted}</span>
          <span><strong>Runtime:</strong> ${runtime}</span>
          ${movieGenres && movieGenres !== 'Not available' ? `<span><strong>Genres:</strong> ${movieGenres}</span>` : ''}
        </div>
        <div class="movie-rating-detail">
          <strong>Rating:</strong> ${rating} / 10 (${movie.vote_count || 0} votes)
        </div>
        <p class="movie-overview-detail">${overview}</p>
        ${watchProvidersHtml}
        <div id="spotifySoundtrackSection">${spotifyHtml}</div>
      </div>
    </div>
  `;
}