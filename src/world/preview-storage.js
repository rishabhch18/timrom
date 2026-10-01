const KEY = 'timrom.v1';
const objects = ['look', 'owned', 'placed', 'ownWalls', 'ownFloors', 'ownPalettes', 'ownTracks', 'days'];
const arrays = ['pets', 'people', 'todos', 'memories', 'friends'];

/** Browser-only demo persistence, never an authoritative wallet or real account. */
export function createPreviewStorage(getStorage) {
  return {
    load(freshState) {
      try {
        const raw = getStorage().getItem(KEY);
        if (!raw) return freshState();
        const value = JSON.parse(raw);
        if (!value || value.v !== 1 || typeof value.name !== 'string' ||
          objects.some(key => !value[key] || typeof value[key] !== 'object' || Array.isArray(value[key])) ||
          arrays.some(key => !Array.isArray(value[key]) || value[key].some(item => !item || typeof item !== 'object')) ||
          ['coins', 'streak', 'goal', 'speed', 'sessions', 'totalMin'].some(key => !Number.isFinite(value[key])) ||
          (value.session && (!['desk', 'kitchen', 'bed', 'bath', 'tv', 'door'].includes(value.session.act) || !Number.isFinite(value.session.total)))) {
          // Keep the old value recoverable before a fresh preview eventually saves.
          getStorage().setItem(`${KEY}.recovery`, raw);
          return freshState();
        }
        return value;
      } catch { return freshState(); }
    },
    save(state) {
      try { getStorage().setItem(KEY, JSON.stringify(state)); return true; }
      catch { return false; }
    },
    clear() { try { getStorage().removeItem(KEY); } catch {} },
  };
}
