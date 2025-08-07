import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Share2, X } from 'lucide-react';
import { toast } from 'sonner';
import { userApi, User } from '@/services/userApi';
import { shareApi } from '@/services/shareApi';
import { useAuth } from '@/contexts/AuthContext';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFiles: string[];
  selectedAlbums: string[];
  onShareComplete: () => void;
}

export function ShareDialog({ open, onOpenChange, selectedFiles, selectedAlbums, onShareComplete }: ShareDialogProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = users.filter(user => 
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchQuery, users]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const fetchedUsers = await userApi.getUsers();
      // Filter out current user
      const otherUsers = fetchedUsers.filter(user => user.id !== currentUser?.id);
      setUsers(otherUsers);
      setFilteredUsers(otherUsers);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (!selectedUser || !currentUser) {
      toast.error('Please select a user to share with');
      return;
    }

    if (selectedFiles.length === 0 && selectedAlbums.length === 0) {
      toast.error('Please select files or albums to share');
      return;
    }

    try {
      setIsSharing(true);
      await shareApi.shareContent({
        currentUserId: selectedUser.id,
        fromUserId: currentUser.id,
        albums: selectedAlbums.length > 0 ? selectedAlbums : undefined,
        photos: selectedFiles.length > 0 ? selectedFiles : undefined,
      });

      toast.success(`Content shared with ${selectedUser.username}`);
      onShareComplete();
      onOpenChange(false);
      setSelectedUser(null);
      setSearchQuery('');
    } catch (error) {
      console.error('Failed to share content:', error);
      toast.error('Failed to share content');
    } finally {
      setIsSharing(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedUser(null);
    setSearchQuery('');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Content
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Share summary */}
          <div className="text-sm text-muted-foreground">
            Sharing: {selectedFiles.length} files, {selectedAlbums.length} albums
          </div>

          {/* Search users */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by username or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Selected user */}
          {selectedUser && (
            <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{selectedUser.username.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="font-medium">{selectedUser.username}</div>
                <div className="text-sm text-muted-foreground">{selectedUser.email}</div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedUser(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Users list */}
          {!selectedUser && (
            <div className="max-h-60 overflow-y-auto space-y-2">
              {isLoading ? (
                <div className="text-center py-4 text-muted-foreground">Loading users...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  {searchQuery ? 'No users found' : 'No users available'}
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-2 hover:bg-accent rounded-lg cursor-pointer"
                    onClick={() => setSelectedUser(user)}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium">{user.username}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleShare} 
              disabled={!selectedUser || isSharing}
              className="flex-1"
            >
              {isSharing ? 'Sharing...' : 'Share'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}