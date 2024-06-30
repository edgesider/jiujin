import axios from 'axios';

export interface Settings {
  enableImageLocalCompress: boolean;
}

const SETTINGS_URL = 'https://static.lllw.cc/settings.json';

let settings: Optional<Settings> = {};

export async function initSettings() {
  const resp = await axios.get(SETTINGS_URL);
  settings = resp.data;
}

export function getSettings(): Readonly<Optional<Settings>> {
  return settings;
}