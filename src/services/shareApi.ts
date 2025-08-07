import httpClient from '@/utils/httpClient';

export interface ShareRequest {
  currentUserId: string;    // The user receiving the share
  fromUserId: string;       // The user sharing the content
  albums?: string[];        // Optional album IDs
  photos?: string[];        // Optional photo IDs
}

export interface SharedData {
  albums: any[];
  photos: any[];
}

export interface ShareItem {
  fromUserId: string;
  albums?: string[];
  photos?: string[];
}

export class ShareApiService {
  private readonly baseUrl = 'https://droidtechknow.com/admin/api/files/share.php';

  /**
   * Share albums/photos with a user
   */
  async shareContent(data: ShareRequest): Promise<any> {
    const response = await httpClient.post(this.baseUrl, data);
    return response;
  }

  /**
   * Unshare albums/photos from a user
   */
  async unshareContent(data: ShareRequest): Promise<any> {
    const response = await httpClient.delete(this.baseUrl, data);
    return response;
  }

  /**
   * Get shared content for a user
   */
  async getSharedContent(userId: string): Promise<ShareItem[]> {
    const response = await httpClient.get(`${this.baseUrl}?userId=${userId}`);
    return Array.isArray(response) ? response : [];
  }
}

export const shareApi = new ShareApiService();