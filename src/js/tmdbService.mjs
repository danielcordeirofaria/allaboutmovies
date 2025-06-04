// js/tmdbService.mjs

const API_CONFIG = {
  KEY: 'a6a31210ff3a5959d29008875d98fb94',
  BASE_URL: 'https://api.themoviedb.org/3',
  IMAGE_BASE_URL: 'https://image.tmdb.org/t/p/w500',
  DEFAULT_LANGUAGE: 'en-US',
  MAX_DISCOVER_PAGES: 500,
};
export const IMAGE_BASE_URL = API_CONFIG.IMAGE_BASE_URL;

let genresMap = null;

async function _request(endpoint, params = {}, method = 'GET') {
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
        console.warn(`Resource not found (404): ${url}`);
        return null;
      }
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`API Error [${response.status}]: ${errorData.message || response.statusText} accessing ${url}`);
    }
    if (response.status === 204) {
        return null;
    }
    return await response.json();
  } catch (error) {
    console.error(`Request failed for ${endpoint}:`, error.message);
    throw error;
  }
}

export async function fetchAndCacheMovieGenres() {
  if (genresMap) {
    return genresMap;
  }
  try {
    const data = await _request('/genre/movie/list');
    if (!data || !data.genres) {
        console.warn('Could not fetch genre list.');
        genresMap = {};
        return genresMap;
    }
    const tempGenresMap = {};
    data.genres.forEach(genre => {
      tempGenresMap[genre.id] = genre.name;
    });
    genresMap = tempGenresMap;
    return genresMap;
  } catch (error) {
    console.error('Failed to process genres:', error.message);
    genresMap = {};
    return {};
  }
}

export async function fetchMovieDetailsById(movieId) {
  if (!movieId) {
    console.error('Movie ID is required to fetch details.');
    return null;
  }
  try {
    const movieData = await _request(`/movie/${movieId}`, {
      'append_to_response': 'watch/providers,credits'
    });
    return movieData;
  } catch (error) {
    return null;
  }
}

async function _discoverMovies(discoveryParams) {
  try {
    const initialData = await _request('/discover/movie', { ...discoveryParams, page: 1 });
    if (!initialData || !initialData.results || initialData.results.length === 0) {
      return null;
    }

    const totalPages = Math.min(initialData.total_pages, API_CONFIG.MAX_DISCOVER_PAGES);
    if (totalPages === 0) {
        return null;
    }

    const randomPage = Math.floor(Math.random() * totalPages) + 1;
    const pageData = await _request('/discover/movie', { ...discoveryParams, page: randomPage });

    if (pageData && pageData.results && pageData.results.length > 0) {
      const randomIndex = Math.floor(Math.random() * pageData.results.length);
      return pageData.results[randomIndex].id;
    }
    return null;
  } catch (error) {
    console.warn(`Discovery failed with params: ${JSON.stringify(discoveryParams)} -> ${error.message}`);
    return null;
  }
}

export async function discoverRandomMovieId() {
  const currentYear = new Date().getFullYear();

  const primaryDiscoveryParams = {
    sort_by: 'popularity.desc',
    include_adult: false,
    include_video: false,
    'vote_count.gte': 100,
    'primary_release_date.gte': `${currentYear - 20}-01-01`,
    'primary_release_date.lte': `${currentYear}-12-31`,
  };

  let movieId = await _discoverMovies(primaryDiscoveryParams);

  if (movieId) {
    return movieId;
  }

  console.warn('No movie found with primary criteria. Attempting fallback...');
  const fallbackDiscoveryParams = {
    sort_by: 'popularity.desc',
    include_adult: false,
    include_video: false,
    'vote_count.gte': 50,
  };

  movieId = await _discoverMovies(fallbackDiscoveryParams);

  if (!movieId) {
    console.error('No movie found even with fallback criteria.');
  }
  return movieId;
}