// js/spotifyService.mjs

const SPOTIFY_CONFIG = {
  CLIENT_ID: 'be9e57649c0e432a8554741be978defd',
  CLIENT_SECRET: 'a0b8be5d3dd14cd9bff4c0705d987707',
  ACCOUNTS_URL: 'https://accounts.spotify.com/api/token',
  API_BASE_URL: 'https://api.spotify.com/v1',
};

let spotifyAccessToken = null;
let spotifyTokenExpiresAt = 0;


async function _request(baseUrl, endpoint, token, params = {}, method = 'GET', body = null, isJsonBody = true, additionalHeaders = {}) {
  const queryParams = new URLSearchParams(params);
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  const url = `${baseUrl}${endpoint}${queryString}`;

  const headers = { ...additionalHeaders };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (isJsonBody && body) {
    headers['Content-Type'] = 'application/json';
  } else if (body && typeof body === 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: isJsonBody && body ? JSON.stringify(body) : body,
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Spotify Resource not found (404): ${url}`);
        return null;
      }
      let errorDetails = response.statusText;
      try {
        const errorData = await response.json();
        errorDetails = errorData.error?.message || errorData.message || JSON.stringify(errorData) || response.statusText;
      } catch (e) {}
      throw new Error(`Spotify API Error [${response.status}]: ${errorDetails} accessing ${url}`);
    }
    if (response.status === 204) {
        return null;
    }
    return await response.json();
  } catch (error) {
    if (error.message.startsWith('Spotify API Error') || error.message.startsWith('Request failed')) {
        console.error(error.message);
    } else {
        console.error(`Spotify Request failed for ${endpoint}:`, error.message);
    }
    throw error;
  }
}


async function getSpotifyAccessToken() {
  if (spotifyAccessToken && Date.now() < spotifyTokenExpiresAt) {
    return spotifyAccessToken;
  }

  const authString = btoa(`${SPOTIFY_CONFIG.CLIENT_ID}:${SPOTIFY_CONFIG.CLIENT_SECRET}`);
  const headers = {
    'Authorization': `Basic ${authString}`,
    'Content-Type': 'application/x-www-form-urlencoded'
  };
  const body = 'grant_type=client_credentials';

  try {
    const response = await fetch(SPOTIFY_CONFIG.ACCOUNTS_URL, {
      method: 'POST',
      headers: headers,
      body: body
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Spotify Auth Error [${response.status}]: ${errorData.error_description || errorData.error || errorData.message}`);
    }

    const data = await response.json();
    spotifyAccessToken = data.access_token;
    spotifyTokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
    return spotifyAccessToken;
  } catch (error) {
    console.error('Spotify: Failed to get access token:', error.message);
    spotifyAccessToken = null;
    spotifyTokenExpiresAt = 0;
    throw error;
  }
}

async function _spotifyApiRequest(endpoint, params = {}, method = 'GET', body = null, isJsonBody = true) {
  const token = await getSpotifyAccessToken();
  return _request(SPOTIFY_CONFIG.API_BASE_URL, endpoint, token, params, method, body, isJsonBody);
}

export async function findMovieSoundtrackOnSpotify(movieTitle, movieYear) {
  if (!movieTitle) {
    console.error("Spotify: Movie title is required to search for soundtrack.");
    return null;
  }

  let searchQueries = [
    `"${movieTitle}" "original motion picture soundtrack"`,
    `"${movieTitle}" "soundtrack"`,
    `"${movieTitle}" "original score"`,
    `"${movieTitle}" "music from the motion picture"`
  ];
  if (movieYear) {
    searchQueries = searchQueries.map(q => `${q} year:${movieYear}`).concat(searchQueries);
  }
  searchQueries.push(`"${movieTitle}"`);


  for (const q of searchQueries) {
    try {
      const params = {
        q: q,
        type: 'album',
        limit: 5
      };
      const data = await _spotifyApiRequest('/search', params);

      if (data && data.albums && data.albums.items.length > 0) {
        for (const album of data.albums.items) {
          const albumNameLower = album.name.toLowerCase();
          const movieTitleLower = movieTitle.toLowerCase();

          if (!albumNameLower.includes(movieTitleLower)) {
            continue;
          }

          const soundtrackKeywords = ["soundtrack", "original score", "music from", "motion picture score"];
          const hasSoundtrackKeyword = soundtrackKeywords.some(keyword => albumNameLower.includes(keyword));

          if (hasSoundtrackKeyword) {
             if (movieYear && album.release_date) {
                if (album.release_date.startsWith(movieYear.toString())) {
                    console.log(`Spotify: Strong match found for "${movieTitle}" with year: ${album.name}`);
                    return { name: album.name, url: album.external_urls.spotify, artist: album.artists[0]?.name, cover: album.images?.[0]?.url };
                }
            } else if (!movieYear) {
                console.log(`Spotify: Match found for "${movieTitle}" (no year check): ${album.name}`);
                return { name: album.name, url: album.external_urls.spotify, artist: album.artists[0]?.name, cover: album.images?.[0]?.url };
            }
          }
        }
        const firstPotentialMatch = data.albums.items.find(album => album.name.toLowerCase().includes(movieTitle.toLowerCase()));
        if (firstPotentialMatch) {
            console.warn(`Spotify: Potential (less precise) match for "${movieTitle}": ${firstPotentialMatch.name}. Query: ${q}`);
            return { name: firstPotentialMatch.name, url: firstPotentialMatch.external_urls.spotify, artist: firstPotentialMatch.artists[0]?.name, cover: firstPotentialMatch.images?.[0]?.url };
        }
      }
    } catch (error) {
      console.warn(`Spotify: Search attempt failed for query "${q}". Continuing...`);
    }
  }
  console.log(`Spotify: No soundtrack found for "${movieTitle}" (Year: ${movieYear}) after trying all queries.`);
  return null;
}