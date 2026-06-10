// Let TypeScript treat imported audio files as URL strings (Vite resolves them to a
// hashed, base-aware asset URL at build time).
declare module '*.mp3' {
  const url: string;
  export default url;
}
declare module '*.ogg' {
  const url: string;
  export default url;
}
