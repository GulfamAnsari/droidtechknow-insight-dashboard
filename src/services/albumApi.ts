import httpClient from '@/utils/httpClient';

export interface Album {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  fileCount?: number;
}

export interface CreateAlbumRequest {
  album: string;
  description?: string;
}

export interface DeleteAlbumRequest {
  album: string;
}

export class AlbumApiService {
  private readonly baseUrl = 'https://droidtechknow.com/admin/api/album.php';

  /**
   * Create a new album
   */
  async createAlbum(data: CreateAlbumRequest): Promise<Album> {
    const response = await httpClient.post(this.baseUrl, data);
    return response;
  }

  /**
   * Get all albums
   */
  async getAlbums(): Promise<Album[]> {
    const response = await httpClient.get(this.baseUrl);
    return response;
  }

  /**
   * Delete an album
   */
  async deleteAlbum(data: DeleteAlbumRequest): Promise<void> {
    await httpClient.delete(this.baseUrl, data);
  }
}

export const albumApi = new AlbumApiService();