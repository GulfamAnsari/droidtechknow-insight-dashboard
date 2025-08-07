import httpClient from '@/utils/httpClient';

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

export interface GetUsersResponse {
  success: boolean;
  data: User[];
}

export class UserApiService {
  private readonly baseUrl = 'https://droidtechknow.com/admin/api/auth/get_users.php';

  /**
   * Get all users for sharing functionality
   */
  async getUsers(): Promise<User[]> {
    const response = await httpClient.get(this.baseUrl);
    return response?.data || [];
  }
}

export const userApi = new UserApiService();