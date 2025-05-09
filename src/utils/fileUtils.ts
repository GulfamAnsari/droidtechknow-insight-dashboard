
import httpClient from './httpClient';
import { toast } from 'sonner';

/**
 * Delete a file by its ID
 */
export const deleteFile = async (fileId: string): Promise<boolean> => {
  try {
    await httpClient.post('https://droidtechknow.com/admin/api/files/delete.php', {
      id: fileId
    });
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    toast.error('Failed to delete file. Please try again.');
    return false;
  }
};

/**
 * Delete multiple files by their IDs
 */
export const deleteMultipleFiles = async (fileIds: string[]): Promise<{success: string[], failed: string[]}> => {
  const results = {
    success: [] as string[],
    failed: [] as string[]
  };
  
  for (const fileId of fileIds) {
    try {
      await httpClient.post('https://droidtechknow.com/admin/api/files/delete.php', {
        id: fileId
      });
      results.success.push(fileId);
    } catch (error) {
      console.error(`Error deleting file ${fileId}:`, error);
      results.failed.push(fileId);
    }
  }
  
  return results;
};
