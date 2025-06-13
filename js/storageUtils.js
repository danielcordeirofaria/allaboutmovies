const WATCHLIST_KEY = 'movieWatchlist';

function saveWatchlist(watchlist) {
  try {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
  } catch (error) {
    console.error('Erro ao salvar a lista de favoritos:', error);
  }
}

export function getWatchlist() {
  try {
    const watchlistJSON = localStorage.getItem(WATCHLIST_KEY);
    return watchlistJSON ? JSON.parse(watchlistJSON) : [];
  } catch (error) {
    console.error('Erro ao obter a lista de favoritos:', error);
    return [];
  }
}

export function addToWatchlist(movieObject) {
  if (!movieObject?.id) {
    return;
  }
  const watchlist = getWatchlist();
  const movieExists = watchlist.some(movie => movie.id === movieObject.id);
  
  if (!movieExists) {
    watchlist.push(movieObject);
    saveWatchlist(watchlist);
  }
}

export function removeFromWatchlist(movieId) {
  let watchlist = getWatchlist();
  watchlist = watchlist.filter(movie => movie.id !== movieId);
  saveWatchlist(watchlist);
}

export function isInWatchlist(movieId) {
  const watchlist = getWatchlist();
  return watchlist.some(movie => movie.id === movieId);
}