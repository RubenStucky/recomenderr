function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Check your .env file.`
    );
  }
  return value;
}

export const config = {
  tautulli: {
    url: requireEnv("TAUTULLI_URL").replace(/\/+$/, ""),
    apiKey: requireEnv("TAUTULLI_API_KEY"),
  },
  tmdb: {
    apiKey: requireEnv("TMDB_API_KEY"),
    baseUrl: "https://api.themoviedb.org/3",
    imageBaseUrl: "https://image.tmdb.org/t/p",
  },
  seerr: {
    url: requireEnv("SEERR_URL").replace(/\/+$/, ""),
    apiKey: requireEnv("SEERR_API_KEY"),
  },
  appName: process.env.NEXT_PUBLIC_APP_NAME || "Plex Recommender",
};
