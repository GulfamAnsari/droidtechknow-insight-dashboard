import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMusicContext } from "@/contexts/MusicContext";
import { toast } from "sonner";

export interface CastDevice {
  device_id: string;
  device_name: string;
  user_agent?: string | null;
  last_seen: string;
}

interface CastContextType {
  deviceId: string;
  deviceName: string;
  devices: CastDevice[];
  castTargetId: string | null;
  isCasting: boolean;
  isReceiver: boolean;
  controllerDeviceName: string | null;
  refreshDevices: () => Promise<void>;
  startCast: (targetDeviceId: string) => Promise<void>;
  stopCast: () => Promise<void>;
  disconnectReceiver: () => Promise<void>;
  seekRemote: (time: number) => Promise<void>;
}

const CastContext = createContext<CastContextType | undefined>(undefined);

export const useCast = () => {
  const ctx = useContext(CastContext);
  if (!ctx) throw new Error("useCast must be used within CastProvider");
  return ctx;
};

const detectDeviceName = () => {
  const ua = navigator.userAgent;
  let os = "Device";
  if (/iPhone/.test(ua)) os = "iPhone";
  else if (/iPad/.test(ua)) os = "iPad";
  else if (/Android/.test(ua)) os = "Android";
  else if (/Mac OS X/.test(ua)) os = "Mac";
  else if (/Windows/.test(ua)) os = "Windows";
  else if (/Linux/.test(ua)) os = "Linux";
  let browser = "Browser";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/Chrome\//.test(ua)) browser = "Chrome";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Safari\//.test(ua)) browser = "Safari";
  return `${os} · ${browser}`;
};

const getOrCreateDeviceId = () => {
  let id = localStorage.getItem("music_cast_device_id");
  if (!id) {
    id = `dev_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
    localStorage.setItem("music_cast_device_id", id);
  }
  return id;
};

export const CastProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const music = useMusicContext();

  const deviceIdRef = useRef<string>(getOrCreateDeviceId());
  const [deviceName] = useState(detectDeviceName());
  const [devices, setDevices] = useState<CastDevice[]>([]);
  const [castTargetId, setCastTargetId] = useState<string | null>(null);
  const [isReceiver, setIsReceiver] = useState(false);
  const [controllerDeviceName, setControllerDeviceName] = useState<string | null>(null);

  const userId = user?.id ? String(user.id) : null;
  const deviceId = deviceIdRef.current;

  const musicRef = useRef(music);
  useEffect(() => { musicRef.current = music; }, [music]);
  const castTargetRef = useRef(castTargetId);
  useEffect(() => { castTargetRef.current = castTargetId; }, [castTargetId]);
  const devicesRef = useRef<CastDevice[]>([]);
  useEffect(() => { devicesRef.current = devices; }, [devices]);
  const isReceiverRef = useRef(isReceiver);
  useEffect(() => { isReceiverRef.current = isReceiver; }, [isReceiver]);
  const lastAppliedSeekSeq = useRef<number>(-1);
  const lastAppliedCommandSeq = useRef<number>(-1);
  const seekSeqCounter = useRef<number>(0);
  const isApplyingRemote = useRef(false);
  const castChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const currentControllerIdRef = useRef<string | null>(null);

  // === Device discovery over WebSocket presence ===
  const refreshDevices = useCallback(async () => {
    // Devices are kept live by Realtime presence; this stays as a stable public API
    // for the cast dialog without making any polling/API request.
    setDevices([...devicesRef.current]);
  }, []);

  const syncPresenceDevices = useCallback((presenceState: Record<string, unknown>) => {
    const next = new Map<string, CastDevice>();

    Object.values(presenceState).forEach((presences) => {
      if (!Array.isArray(presences)) return;

      presences.forEach((presence) => {
        const p = presence as Partial<CastDevice> & { online_at?: string };
        if (!p.device_id || p.device_id === deviceId) return;

        next.set(p.device_id, {
          device_id: p.device_id,
          device_name: p.device_name || "Device",
          user_agent: p.user_agent ?? null,
          last_seen: p.last_seen || p.online_at || new Date().toISOString(),
        });
      });
    });

    const list = Array.from(next.values()).sort((a, b) => a.device_name.localeCompare(b.device_name));
    devicesRef.current = list;
    setDevices(list);
  }, [deviceId]);

  useEffect(() => {
    if (!userId) {
      devicesRef.current = [];
      setDevices([]);
      return;
    }

    const channel = supabase.channel(`cast-presence:${userId}`, {
      config: { presence: { key: deviceId } },
    });

    const sync = () => syncPresenceDevices(channel.presenceState() as Record<string, unknown>);

    channel
      .on("presence", { event: "sync" }, sync)
      .on("presence", { event: "join" }, sync)
      .on("presence", { event: "leave" }, sync)
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED") return;

        await channel.track({
          device_id: deviceId,
          device_name: deviceName,
          user_agent: navigator.userAgent,
          last_seen: new Date().toISOString(),
        });
        sync();
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, deviceId, deviceName, syncPresenceDevices]);

  // Persisted block list of controller device IDs the user disconnected from.
  // While a controller is blocked, this device will NOT auto-become a receiver
  // for its broadcasts until the user opts back in (by starting a new cast to
  // this device from that controller — handled below when the block is cleared
  // via UI, or by clearing storage).
  const blockedKey = `music_cast_blocked_${userId ?? "anon"}`;
  const isBlocked = useCallback((controllerId?: string | null) => {
    if (!controllerId) return false;
    try {
      const raw = localStorage.getItem(blockedKey);
      const list: string[] = raw ? JSON.parse(raw) : [];
      return list.includes(controllerId);
    } catch { return false; }
  }, [blockedKey]);
  const addBlocked = useCallback((controllerId: string) => {
    try {
      const raw = localStorage.getItem(blockedKey);
      const list: string[] = raw ? JSON.parse(raw) : [];
      if (!list.includes(controllerId)) list.push(controllerId);
      localStorage.setItem(blockedKey, JSON.stringify(list));
    } catch { /* ignore */ }
  }, [blockedKey]);

  // === Apply remote state helper ===
  const applyRemote = useCallback((s: any) => {
    if (!s) return;
    if (s.target_device_id === deviceId && s.controller_device_id !== deviceId) {
      if (isBlocked(s.controller_device_id)) return; // user opted out
      isApplyingRemote.current = true;
      try {
        setIsReceiver(true);
        currentControllerIdRef.current = s.controller_device_id;
        const ctrl = devicesRef.current.find((d) => d.device_id === s.controller_device_id);
        setControllerDeviceName(ctrl?.device_name || "Another device");

        const m = musicRef.current;
        if (s.playlist && Array.isArray(s.playlist) && s.playlist.length) {
          m.setPlaylist(s.playlist);
        }
        if (s.song && (!m.currentSong || m.currentSong.id !== s.song.id)) {
          m.setCurrentSong(s.song);
          m.setCurrentIndex(s.current_index ?? 0);
          m.setCurrentTime(s.position || 0);
        } else if (typeof s.current_index === "number" && s.current_index !== m.currentIndex) {
          m.setCurrentIndex(s.current_index);
        }
        if (typeof s.volume === "number") m.setVolume(s.volume);
        if (typeof s.is_playing === "boolean") m.setIsPlaying(s.is_playing);
        if (typeof s.seek_seq === "number" && s.seek_seq !== lastAppliedSeekSeq.current) {
          lastAppliedSeekSeq.current = s.seek_seq;
          m.setCurrentTime(s.position || 0);
        }
        if (typeof s.command_seq === "number" && s.command_seq !== lastAppliedCommandSeq.current) {
          lastAppliedCommandSeq.current = s.command_seq;
          if (s.command === "next") m.playNext();
          else if (s.command === "previous") m.playPrevious();
        }
      } finally {
        setTimeout(() => { isApplyingRemote.current = false; }, 50);
      }
    } else if (isReceiverRef.current && s.target_device_id !== deviceId) {
      setIsReceiver(false);
      currentControllerIdRef.current = null;
      setControllerDeviceName(null);
      musicRef.current.setIsPlaying(false);
    }
  }, [deviceId, isBlocked]);

  const broadcastState = useCallback(async (payload: Record<string, unknown>) => {
    const channel = castChannelRef.current;
    if (!channel) return;

    await channel.send({
      type: "broadcast",
      event: "state",
      payload: {
        ...payload,
        updated_at: new Date().toISOString(),
      },
    });
  }, []);

  // === Playback control over WebSocket broadcast ===
  useEffect(() => {
    if (!userId) {
      castChannelRef.current = null;
      return;
    }

    const channel = supabase
      .channel(`cast:${userId}`, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "state" }, ({ payload }) => {
        applyRemote(payload);
      })
      .on("broadcast", { event: "receiver-disconnect" }, ({ payload }) => {
        const p = payload as { controller_device_id?: string; target_device_id?: string };
        if (p.controller_device_id === deviceId && p.target_device_id === castTargetRef.current) {
          setCastTargetId(null);
          toast.info("Receiver disconnected");
        }
      })
      .subscribe();

    castChannelRef.current = channel;

    return () => {
      if (castChannelRef.current === channel) castChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [userId, deviceId, applyRemote]);


  // === Mirror local state to remote when I'm the controller ===
  useEffect(() => {
    if (!userId || !castTargetId) return;
    if (isApplyingRemote.current) return;
    broadcastState({
      target_device_id: castTargetId,
      controller_device_id: deviceId,
      song: music.currentSong,
      playlist: music.playlist,
      current_index: music.currentIndex,
      is_playing: music.isPlaying,
      volume: music.isMuted ? 0 : music.volume,
    });
  }, [
    userId, castTargetId, deviceId,
    music.currentSong?.id,
    music.isPlaying,
    music.volume,
    music.isMuted,
    music.currentIndex,
    music.playlist,
    broadcastState,
  ]);

  const startCast = useCallback(async (targetDeviceId: string) => {
    if (!userId) return;
    setCastTargetId(targetDeviceId);
    seekSeqCounter.current += 1;
    await broadcastState({
      target_device_id: targetDeviceId,
      controller_device_id: deviceId,
      song: music.currentSong,
      playlist: music.playlist,
      current_index: music.currentIndex,
      is_playing: music.isPlaying,
      position: music.currentTime,
      volume: music.isMuted ? 0 : music.volume,
      seek_seq: seekSeqCounter.current,
    });
    const target = devices.find((d) => d.device_id === targetDeviceId);
    toast.success(`Casting to ${target?.device_name || "device"}`);
  }, [userId, deviceId, music, devices, broadcastState]);

  const stopCast = useCallback(async () => {
    if (!userId) return;
    const previousTargetId = castTargetRef.current;
    setCastTargetId(null);
    await broadcastState({
      target_device_id: null,
      previous_target_device_id: previousTargetId,
      controller_device_id: deviceId,
      is_playing: false,
    });
    toast.info("Stopped casting");
  }, [userId, deviceId, broadcastState]);

  const seekRemote = useCallback(async (time: number) => {
    if (!userId || !castTargetId) return;
    seekSeqCounter.current += 1;
    await broadcastState({
      target_device_id: castTargetId,
      controller_device_id: deviceId,
      position: time,
      seek_seq: seekSeqCounter.current,
    });
  }, [userId, castTargetId, deviceId, broadcastState]);

  // Receiver disconnects itself and blocks the current controller from being
  // able to auto-take over this device again (until user explicitly reconnects).
  const disconnectReceiver = useCallback(async () => {
    const controllerId = currentControllerIdRef.current;
    if (controllerId) addBlocked(controllerId);
    setIsReceiver(false);
    currentControllerIdRef.current = null;
    setControllerDeviceName(null);
    musicRef.current.setIsPlaying(false);
    if (controllerId) {
      await castChannelRef.current?.send({
        type: "broadcast",
        event: "receiver-disconnect",
        payload: {
          target_device_id: deviceId,
          controller_device_id: controllerId,
        },
      });
    }
    toast.info("Disconnected. This device won't auto-connect again.");
  }, [addBlocked, deviceId]);

  const value: CastContextType = {
    deviceId,
    deviceName,
    devices,
    castTargetId,
    isCasting: !!castTargetId,
    isReceiver,
    controllerDeviceName,
    refreshDevices,
    startCast,
    stopCast,
    disconnectReceiver,
    seekRemote,
  };

  return <CastContext.Provider value={value}>{children}</CastContext.Provider>;
};
