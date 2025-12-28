import httpClient from "@/utils/httpClient";
import { weightedPages } from "@/services/constants";
import { SAVAN_URL } from "./config";
export interface Song {
  id: string;
  name: string;
  artists: {
    primary: {
      name: string;
      id: string;
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
  album?: {
    id: string;
    name: string;
  };
  year?: string;
  language?: string;
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
  async search(
    query: string,
    page: number = 1,
    limit: number = 20
  ): Promise<SearchResults> {
    try {
      const [songsRes, albumsRes, artistsRes, playlistsRes] = await Promise.all(
        [
          httpClient.get(
            `${SAVAN_URL}/api/search/songs?query=${encodeURIComponent(
              query
            )}&limit=${limit}&page=${page}`,
            { skipAuth: true }
          ),
          httpClient.get(
            `${SAVAN_URL}/api/search/albums?query=${encodeURIComponent(
              query
            )}&limit=${limit}&page=${page}`,
            { skipAuth: true }
          ),
          httpClient.get(
            `${SAVAN_URL}/api/search/artists?query=${encodeURIComponent(
              query
            )}&limit=${limit}&page=${page}`,
            { skipAuth: true }
          ),
          httpClient.get(
            `${SAVAN_URL}/api/search/playlists?query=${encodeURIComponent(
              query
            )}&limit=${limit}&page=${page}`,
            { skipAuth: true }
          )
        ]
      );

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
    page: number = 1,
    limit: number = 20
  ) {
    try {
      const response = await httpClient.get(
        `${SAVAN_URL}/api/search/${type}?query=${encodeURIComponent(
          query
        )}&limit=${limit}&page=${page}`,
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
        `${SAVAN_URL}/api/albums?id=${albumId}`,
        { skipAuth: true }
      );
      return response?.data?.songs || [];
    } catch (error) {
      console.error("Get album songs failed:", error);
      return [];
    }
  }

  async getArtistSongs(artistId: string, page: number = 1, limit: number = 10): Promise<Song[]> {
    try {
      const response = await httpClient.get(
        `${SAVAN_URL}/api/artists/${artistId}/songs?page=${page}&limit=${limit}`,
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
      // const response = await httpClient.get(
      //   `${SAVAN_URL}/api/playlists?id=${playlistId}`,
      //   { skipAuth: true }
      // );
      // return response?.data?.songs || [];
      let response = await httpClient.get(
        `https://www.jiosaavn.com/api.php?__call=playlist.getDetails&_format=json&cc=in&_marker=0%3F_marker%3D0&listid=${playlistId}`,
        { skipAuth: true }
      );
      response = await response.json();
      return response?.songs || [];
    } catch (error) {
      console.error("Get playlist songs failed:", error);
      return [];
    }
  }

  async getSong(songId: string): Promise<Song | null> {
    try {
      const response = await httpClient.get(
        `${SAVAN_URL}/api/songs/${songId}`,
        { skipAuth: true }
      );
      return response?.data || null;
    } catch (error) {
      console.error("Get song failed:", error);
      return null;
    }
  }

   async getSuggestedSongs(currentSong: Song, suggested): Promise<Song[]> {
    try {
      let allSuggestions: Song[] = [];

      // Get songs from same album if available
      if (currentSong.album?.id) {
        const albumSongs = await this.getAlbumSongs(currentSong.album.id);
        allSuggestions = [...allSuggestions, ...albumSongs.filter(song => song.id !== currentSong.id)];
      }

      

      
      // Get songs from same artists
      if (currentSong.artists?.primary?.length > 0) {
        for (const artist of currentSong.artists.primary.slice(0, 3)) { // Limit to first 3 artists
          for (let attempt = 0; attempt < 5; attempt++) {
            const page = weightedPages[Math.floor(Math.random() * weightedPages.length)];
            const artistResults = await this.getArtistSongs(artist.id, page);
            if (artistResults.length) {
              allSuggestions = [...allSuggestions, ...artistResults.filter((song: Song) => {
                const LAN = ["hindi", "engligh"];
                return song.id !== currentSong.id && LAN.includes(song?.language);
              })];
              break;
            }
          }
        }
      }

      // Remove duplicates and current song
      const uniqueSuggestions = allSuggestions.filter((song, index, self) => 
        song.id !== currentSong.id && 
        index === self.findIndex(s => s.id === song.id)
      );

      // Return first 20 suggestions
      return [currentSong, ...uniqueSuggestions];
    } catch (error) {
      console.error("Get suggested songs failed:", error);
      return [];
    }
  }


  async getPopularArtists(page = 1, limit = 50): Promise<Artist[]> {
    try {
      const response = await httpClient.get(
        `${SAVAN_URL}/api/search/artists?query=popular artists&limit=${limit}&page=${page}`,
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
