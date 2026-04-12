import { useState, useEffect } from 'react';

/**
 * Fetches /data/manifest.json (generated at build time by scripts/generate-manifest.cjs).
 * Returns the full entry list plus loading/error state.
 */
export function useManifest() {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    fetch('/data/manifest.json')
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load manifest (${r.status})`);
        return r.json();
      })
      .then((json) => { setData(json); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, []);

  return { data, loading, error };
}
