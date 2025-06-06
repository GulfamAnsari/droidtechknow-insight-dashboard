
import httpClient from "@/utils/httpClient";

export interface Song {
  id: string;
  name: string;
  artists: {
    primary: {
      name: string;
    }[];
  };
  image: {
    quality: string;
    url: string;
  }[];
  downloadUrl: {
    quality: string;
    url: string;
  }[];
  duration: number;
}

export interface Album {
  id: string;
  name: string;
  image: {
    quality: string;
    url: string;
  }[];
  primaryArtists: string;
  songCount: number;
}

export interface Artist {
  id: string;
  name: string;
  image: {
    quality: string;
    url: string;
  }[];
}

export interface Playlist {
  id: string;
  name: string;
  image: {
    quality: string;
    url: string;
  }[];
  subtitle?: string;
}

export interface SearchResults {
  songs: Song[];
  albums: Album[];
  artists: Artist[];
  playlists: Playlist[];
}

class MusicApiService {
  async search(query: string, page: number = 0, limit: number = 20): Promise<SearchResults> {
    try {
      const [songsRes, albumsRes, artistsRes, playlistsRes] = await Promise.all([
        httpClient.get(
          `https://saavn.dev/api/search/songs?query=${encodeURIComponent(query)}&limit=${limit}&page=${page}`,
          { skipAuth: true }
        ),
        httpClient.get(
          `https://saavn.dev/api/search/albums?query=${encodeURIComponent(query)}&limit=${limit}&page=${page}`,
          { skipAuth: true }
        ),
        httpClient.get(
          `https://saavn.dev/api/search/artists?query=${encodeURIComponent(query)}&limit=${limit}&page=${page}`,
          { skipAuth: true }
        ),
        httpClient.get(
          `https://saavn.dev/api/search/playlists?query=${encodeURIComponent(query)}&limit=${limit}&page=${page}`,
          { skipAuth: true }
        )
      ]);

      return {
        songs: songsRes?.data?.results || [],
        albums: albumsRes?.data?.results || [],
        artists: artistsRes?.data?.results || [],
        playlists: playlistsRes?.data?.results || []
      };
    } catch (error) {
      console.error("Search failed:", error);
      return { songs: [], albums: [], artists: [], playlists: [] };
    }
  }

  async searchByType(
    type: "songs" | "albums" | "artists" | "playlists",
    query: string,
    page: number = 0,
    limit: number = 20
  ) {
    try {
      const response = await httpClient.get(
        `https://saavn.dev/api/search/${type}?query=${encodeURIComponent(query)}&limit=${limit}&page=${page}`,
        { skipAuth: true }
      );
      return response?.data?.results || [];
    } catch (error) {
      console.error(`Search ${type} failed:`, error);
      return [];
    }
  }

  async getAlbumSongs(albumId: string): Promise<Song[]> {
    try {
      const response = await httpClient.get(
        `https://saavn.dev/api/albums/${albumId}`,
        { skipAuth: true }
      );
      return response?.data?.songs || [];
    } catch (error) {
      console.error("Get album songs failed:", error);
      return [];
    }
  }

  async getArtistSongs(artistId: string, page: number = 0): Promise<Song[]> {
    try {
      const response = await httpClient.get(
        `https://saavn.dev/api/artists/${artistId}/songs?page=${page}&limit=50`,
        { skipAuth: true }
      );
      return response?.data?.songs || [];
    } catch (error) {
      console.error("Get artist songs failed:", error);
      return [];
    }
  }

  async getPlaylistSongs(playlistId: string): Promise<Song[]> {
    try {
      const response = await httpClient.get(
        `https://saavn.dev/api/playlists/${playlistId}`,
        { skipAuth: true }
      );
      return response?.data?.songs || [];
    } catch (error) {
      console.error("Get playlist songs failed:", error);
      return [];
    }
  }

  async getSong(songId: string): Promise<Song | null> {
    try {
      const response = await httpClient.get(
        `https://saavn.dev/api/songs/${songId}`,
        { skipAuth: true }
      );
      return response?.data || null;
    } catch (error) {
      console.error("Get song failed:", error);
      return null;
    }
  }

  async getSuggestions(songId: string): Promise<Song[]> {
    try {
      const response = await httpClient.get(
        `https://saavn.dev/api/songs/${songId}/suggestions`,
        { skipAuth: true }
      );
      return response?.data || [];
    } catch (error) {
      console.error("Get suggestions failed:", error);
      return [];
    }
  }

  async getTrendingSongs(): Promise<Song[]> {
    try {
      const response = await httpClient.get(
        `https://saavn.dev/api/search/songs?query=trending&limit=20&page=0`,
        { skipAuth: true }
      );
      return response?.data?.results || [];
    } catch (error) {
      console.error("Get trending songs failed:", error);
      return [];
    }
  }

  async getTopSongs(): Promise<Song[]> {
    try {
      const response = await httpClient.get(
        `https://saavn.dev/api/search/songs?query=top%20bollywood&limit=20&page=0`,
        { skipAuth: true }
      );
      return response?.data?.results || [];
    } catch (error) {
      console.error("Get top songs failed:", error);
      return [];
    }
  }

  async getPopularArtists(): Promise<Artist[]> {
    try {
      const response = await httpClient.get(
        `https://saavn.dev/api/search/artists?query=popular&limit=20&page=0`,
        { skipAuth: true }
      );
      return response?.data?.results || [];
    } catch (error) {
      console.error("Get popular artists failed:", error);
      return [];
    }
  }
}

export const musicApi = new MusicApiService();
