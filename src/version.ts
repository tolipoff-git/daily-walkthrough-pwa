declare const __APP_VERSION__: string;
declare const __COMMIT_HASH__: string;
declare const __BUILD_TIME__: string;
declare const __REPO_URL__: string;

export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'v1.3.0';
export const COMMIT_HASH = typeof __COMMIT_HASH__ !== 'undefined' ? __COMMIT_HASH__ : '32e575a';
export const BUILD_TIME = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : new Date().toISOString();
export const REPO_URL = typeof __REPO_URL__ !== 'undefined' ? __REPO_URL__ : 'https://github.com/tolipoff-git/daily-walkthrough-pwa';
export const COMMIT_URL = `${REPO_URL}/commit/${COMMIT_HASH}`;
