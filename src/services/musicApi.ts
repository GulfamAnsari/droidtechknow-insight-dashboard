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
  album?: {
    id: string;
    name: string;
  };
  year?: string;
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
  async search(query: string, page: number = 1, limit: number = 20): Promise<SearchResults> {
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
    page: number = 1,
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
        `https://saavn.dev/api/albums?id=${albumId}`,
        { skipAuth: true }
      );
      return response?.data?.songs || [];
    } catch (error) {
      console.error("Get album songs failed:", error);
      return [];
    }
  }

  async getArtistSongs(artistId: string, page: number = 1): Promise<Song[]> {
    try {
      const response = await httpClient.get(
        `https://saavn.dev/api/artists/${artistId}/songs?page=${page}&limit=10`,
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
      //   `https://saavn.dev/api/playlists?id=${playlistId}`,
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

  async getSuggestedSongs(currentSong: Song): Promise<Song[]> {
    try {
      let allSuggestions: Song[] = [];
      
      // Get suggestions based on current song
      const directSuggestions = await this.getSuggestions(currentSong.id);
      allSuggestions = [...allSuggestions, ...directSuggestions];

      // Get songs from same album if available
      if (currentSong.album?.id) {
        const albumSongs = await this.getAlbumSongs(currentSong.album.id);
        allSuggestions = [...allSuggestions, ...albumSongs.filter(song => song.id !== currentSong.id)];
      }

      // Get songs from same artists
      if (currentSong.artists?.primary?.length > 0) {
        for (const artist of currentSong.artists.primary.slice(0, 2)) { // Limit to first 2 artists
          const artistResults = await this.search(artist.name, 1, 10);
          allSuggestions = [...allSuggestions, ...artistResults.songs.filter(song => song.id !== currentSong.id)];
        }
      }

      // Search by year if available
      if (currentSong.year) {
        const yearResults = await this.search(`year:${currentSong.year}`, 1, 10);
        allSuggestions = [...allSuggestions, ...yearResults.songs.filter(song => song.id !== currentSong.id)];
      }

      // Search by keywords from song name
      const keywords = currentSong.name.split(' ').filter(word => word.length > 3).slice(0, 3);
      for (const keyword of keywords) {
        const keywordResults = await this.search(keyword, 1, 5);
        allSuggestions = [...allSuggestions, ...keywordResults.songs.filter(song => song.id !== currentSong.id)];
      }

      // Remove duplicates and current song
      const uniqueSuggestions = allSuggestions.filter((song, index, self) => 
        song.id !== currentSong.id && 
        index === self.findIndex(s => s.id === song.id)
      );

      // Return first 20 suggestions
      return uniqueSuggestions;
    } catch (error) {
      console.error("Get suggested songs failed:", error);
      return [];
    }
  }

  async getTrendingSongs(): Promise<Song[]> {
    try {
      const response = await httpClient.get(
        `https://saavn.dev/api/search/songs?query=trending&limit=10&page=1`,
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
        `https://saavn.dev/api/search/songs?query=top%20bollywood&limit=10&page=1`,
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
        `https://saavn.dev/api/search/artists?query=popular artists&limit=50&page=1`,
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
