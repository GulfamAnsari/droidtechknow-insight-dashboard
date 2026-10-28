import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FolderOpen,
  ImageIcon,
  Loader2,
  Trash2,
  UserX,
  X
} from "lucide-react";
import { toast } from "sonner";
import { userApi, User } from "@/services/userApi";
import { shareApi, ShareItem } from "@/services/shareApi";
import { useAuth } from "@/contexts/AuthContext";

interface ManageSharesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Raw share records where the current user is the sharer */
  shares: ShareItem[];
  /** Called after a share is removed so the parent can refresh its data */
  onChanged: () => void;
}

const photoId = (photo: any): string | null => {
  const id = photo?.id ?? photo?.fileId;
  return id != null ? String(id) : null;
};

export function ManageSharesDialog({
  open,
  onOpenChange,
  shares,
  onChanged
}: ManageSharesDialogProps) {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    userApi
      .getUsers()
      .then((fetched) => {
        if (!cancelled) setUsers(fetched);
      })
      .catch(() => {
        // Names fall back to "User" when the list can't be loaded
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    users.forEach((u) => map.set(String(u.id), u.username));
    return map;
  }, [users]);

  const entries = useMemo(() => {
    return shares
      .map((share) => {
        const recipientId = String(
          share.toUserId ?? share.fromUserId ?? ""
        );
        const albumNames = Array.from(
          new Set(
            (share.albumPhotos || [])
              .map((p: any) => p?.album)
              .filter((a: any): a is string => !!a)
          )
        );
        const albumPhotoIds = (share.albumPhotos || [])
          .map(photoId)
          .filter((id): id is string => !!id);
        const directPhotoIds = (share.allPhotos || [])
          .map(photoId)
          .filter((id): id is string => !!id);
        const photoIds = Array.from(
          new Set([...albumPhotoIds, ...directPhotoIds])
        );
        const allPhotos = [
          ...(share.albumPhotos || []),
          ...(share.allPhotos || [])
        ];
        return { share, recipientId, albumNames, photoIds, allPhotos };
      })
      .filter((entry) => entry.recipientId && (entry.albumNames.length > 0 || entry.photoIds.length > 0));
  }, [shares]);

  const remove = async (
    key: string,
    recipientId: string,
    albums: string[] | undefined,
    photos: string[] | undefined,
    successMessage: string
  ) => {
    if (!currentUser) return;
    setRemovingKey(key);
    try {
      await shareApi.unshareContent({
        currentUserId: recipientId,
        fromUserId: currentUser.id,
        albums: albums && albums.length > 0 ? albums : undefined,
        photos: photos && photos.length > 0 ? photos : undefined
      });
      toast.success(successMessage);
      onChanged();
    } catch (error) {
      console.error("Failed to remove sharing:", error);
      toast.error("Không gỡ được chia sẻ. Vui lòng thử lại.");
    } finally {
      setRemovingKey(null);
    }
  };

  const confirmThen = (message: string, action: () => void) => {
    if (window.confirm(message)) action();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-lg max-h-[85vh] overflow-hidden flex flex-col gap-0 p-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <UserX className="h-5 w-5" />
            Quản lý chia sẻ
          </DialogTitle>
          <DialogDescription>
            Xem những gì bạn đã chia sẻ và gỡ chia sẻ bất cứ lúc nào.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 px-4 pb-4">
          {entries.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Bạn chưa chia sẻ nội dung nào với người khác.
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map(
                ({ share, recipientId, albumNames, photoIds, allPhotos }) => {
                  const key = recipientId;
                  const name = nameById.get(recipientId) || "Người dùng";
                  const isRemovingAll = removingKey === `${key}-all`;
                  const isExpanded = expanded === key;
                  return (
                    <div
                      key={key}
                      className="rounded-xl border bg-card overflow-hidden"
                    >
                      <div className="flex items-center gap-3 p-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback>
                            {name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {albumNames.length} album · {photoIds.length} ảnh/video
                          </div>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={isRemovingAll}
                          onClick={() =>
                            confirmThen(
                              `Gỡ toàn bộ nội dung đã chia sẻ với ${name}?`,
                              () =>
                                remove(
                                  `${key}-all`,
                                  recipientId,
                                  albumNames,
                                  photoIds,
                                  `Đã gỡ toàn bộ chia sẻ với ${name}`
                                )
                            )
                          }
                        >
                          {isRemovingAll ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          Gỡ tất cả
                        </Button>
                      </div>

                      {albumNames.length > 0 && (
                        <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                          {albumNames.map((albumName) => {
                            const btnKey = `${key}-album-${albumName}`;
                            return (
                              <Badge
                                key={albumName}
                                variant="secondary"
                                className="gap-1 pl-2 pr-1 py-1"
                              >
                                <FolderOpen className="h-3 w-3" />
                                {albumName}
                                <button
                                  aria-label={`Gỡ chia sẻ album ${albumName}`}
                                  className="ml-1 rounded-full hover:bg-destructive/15 p-0.5 text-destructive"
                                  disabled={removingKey === btnKey}
                                  onClick={() =>
                                    confirmThen(
                                      `Gỡ chia sẻ album "${albumName}" với ${name}?`,
                                      () =>
                                        remove(
                                          btnKey,
                                          recipientId,
                                          [albumName],
                                          undefined,
                                          `Đã gỡ chia sẻ album "${albumName}"`
                                        )
                                    )
                                  }
                                >
                                  {removingKey === btnKey ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <X className="h-3 w-3" />
                                  )}
                                </button>
                              </Badge>
                            );
                          })}
                        </div>
                      )}

                      {photoIds.length > 0 && (
                        <div className="px-3 pb-3">
                          <button
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                            onClick={() =>
                              setExpanded(isExpanded ? null : key)
                            }
                          >
                            <ImageIcon className="h-3 w-3" />
                            {isExpanded
                              ? "Ẩn ảnh/video"
                              : `Xem ${allPhotos.length} ảnh/video`}
                          </button>
                          {isExpanded && (
                            <div className="mt-2 grid grid-cols-4 sm:grid-cols-5 gap-2">
                              {allPhotos.map((photo: any, idx: number) => {
                                const pid = photoId(photo);
                                const btnKey = `${key}-photo-${pid ?? idx}`;
                                if (!pid) return null;
                                return (
                                  <div
                                    key={btnKey}
                                    className="relative aspect-square rounded-lg overflow-hidden bg-muted group"
                                  >
                                    <img
                                      src={photo.thumbnail || photo.url}
                                      alt={photo.title || ""}
                                      className="h-full w-full object-cover"
                                      loading="lazy"
                                    />
                                    <button
                                      aria-label="Gỡ chia sẻ ảnh này"
                                      className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                                      disabled={removingKey === btnKey}
                                      onClick={() =>
                                        confirmThen(
                                          "Gỡ chia sẻ mục này?",
                                          () =>
                                            remove(
                                              btnKey,
                                              recipientId,
                                              undefined,
                                              [pid],
                                              "Đã gỡ chia sẻ"
                                            )
                                        )
                                      }
                                    >
                                      {removingKey === btnKey ? (
                                        <Loader2 className="h-5 w-5 text-white animate-spin" />
                                      ) : (
                                        <X className="h-5 w-5 text-white" />
                                      )}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
