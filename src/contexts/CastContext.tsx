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

  // Refs to avoid stale closures inside subscribe callbacks
  const musicRef = useRef(music);
  useEffect(() => { musicRef.current = music; }, [music]);
  const castTargetRef = useRef(castTargetId);
  useEffect(() => { castTargetRef.current = castTargetId; }, [castTargetId]);
  const lastAppliedSeekSeq = useRef<number>(-1);
  const lastAppliedCommandSeq = useRef<number>(-1);
  const seekSeqCounter = useRef<number>(0);
  const isApplyingRemote = useRef(false);

  // === Register this device + heartbeat ===
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const upsertDevice = async () => {
      try {
        await supabase.from("music_cast_devices").upsert(
          {
            user_id: userId,
            device_id: deviceId,
            device_name: deviceName,
            user_agent: navigator.userAgent,
            last_seen: new Date().toISOString(),
          },
          { onConflict: "user_id,device_id" }
        );
      } catch (e) {
        console.warn("cast: register failed", e);
      }
    };

    upsertDevice();
    const heartbeat = setInterval(upsertDevice, 20000);

    const cleanup = async () => {
      try {
        await supabase.from("music_cast_devices").delete()
          .eq("user_id", userId).eq("device_id", deviceId);
      } catch {}
    };
    const onUnload = () => { cleanup(); };
    window.addEventListener("beforeunload", onUnload);

    return () => {
      cancelled = true;
      clearInterval(heartbeat);
      window.removeEventListener("beforeunload", onUnload);
      cleanup();
    };
  }, [userId, deviceId, deviceName]);

  // === Load other devices + realtime updates ===
  const refreshDevices = useCallback(async () => {
    if (!userId) return;
    const cutoff = new Date(Date.now() - 60_000).toISOString();
    const { data } = await supabase
      .from("music_cast_devices")
      .select("device_id, device_name, user_agent, last_seen")
      .eq("user_id", userId)
      .gte("last_seen", cutoff);
    if (data) {
      setDevices(data.filter((d: any) => d.device_id !== deviceId) as CastDevice[]);
    }
  }, [userId, deviceId]);

  useEffect(() => {
    if (!userId) return;
    refreshDevices();
    const poll = setInterval(refreshDevices, 15000);
    const channel = supabase
      .channel(`cast-devices-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "music_cast_devices", filter: `user_id=eq.${userId}` },
        () => refreshDevices()
      )
      .subscribe();
    return () => {
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [userId, refreshDevices]);

  // === Subscribe to cast state (both roles) ===
  useEffect(() => {
    if (!userId) return;

    const applyRemote = async (s: any) => {
      if (!s) return;
      // Am I the receiver?
      if (s.target_device_id === deviceId && s.controller_device_id !== deviceId) {
        isApplyingRemote.current = true;
        try {
          setIsReceiver(true);
          // Look up controller name
          const ctrl = devices.find((d) => d.device_id === s.controller_device_id);
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
      } else if (isReceiver && s.target_device_id !== deviceId) {
        setIsReceiver(false);
        setControllerDeviceName(null);
        musicRef.current.setIsPlaying(false);
      }
    };

    // initial fetch
    (async () => {
      const { data } = await supabase
        .from("music_cast_state")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (data) applyRemote(data);
    })();

    const channel = supabase
      .channel(`cast-state-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "music_cast_state", filter: `user_id=eq.${userId}` },
        (payload) => applyRemote(payload.new)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // devices intentionally not in deps — used only for name lookup
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, deviceId, isReceiver]);

  // === Mirror local state to remote when I'm the controller ===
  useEffect(() => {
    if (!userId || !castTargetId) return;
    if (isApplyingRemote.current) return;
    const payload = {
      user_id: userId,
      target_device_id: castTargetId,
      controller_device_id: deviceId,
      song: music.currentSong as any,
      playlist: music.playlist as any,
      current_index: music.currentIndex,
      is_playing: music.isPlaying,
      volume: music.isMuted ? 0 : music.volume,
      updated_at: new Date().toISOString(),
    };
    supabase.from("music_cast_state").upsert(payload, { onConflict: "user_id" }).then(({ error }) => {
      if (error) console.warn("cast mirror error", error);
    });
  }, [
    userId, castTargetId, deviceId,
    music.currentSong?.id,
    music.isPlaying,
    music.volume,
    music.isMuted,
    music.currentIndex,
    music.playlist,
  ]);

  const startCast = useCallback(async (targetDeviceId: string) => {
    if (!userId) return;
    setCastTargetId(targetDeviceId);
    seekSeqCounter.current += 1;
    const payload = {
      user_id: userId,
      target_device_id: targetDeviceId,
      controller_device_id: deviceId,
      song: music.currentSong as any,
      playlist: music.playlist as any,
      current_index: music.currentIndex,
      is_playing: music.isPlaying,
      position: music.currentTime,
      volume: music.isMuted ? 0 : music.volume,
      seek_seq: seekSeqCounter.current,
      updated_at: new Date().toISOString(),
    };
    await supabase.from("music_cast_state").upsert(payload, { onConflict: "user_id" });
    const target = devices.find((d) => d.device_id === targetDeviceId);
    toast.success(`Casting to ${target?.device_name || "device"}`);
  }, [userId, deviceId, music, devices]);

  const stopCast = useCallback(async () => {
    if (!userId) return;
    setCastTargetId(null);
    await supabase.from("music_cast_state").update({
      target_device_id: null,
      is_playing: false,
      updated_at: new Date().toISOString(),
    }).eq("user_id", userId);
    toast.info("Stopped casting");
  }, [userId]);

  const seekRemote = useCallback(async (time: number) => {
    if (!userId || !castTargetId) return;
    seekSeqCounter.current += 1;
    await supabase.from("music_cast_state").upsert({
      user_id: userId,
      target_device_id: castTargetId,
      controller_device_id: deviceId,
      position: time,
      seek_seq: seekSeqCounter.current,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
  }, [userId, castTargetId, deviceId]);

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
    seekRemote,
  };

  return <CastContext.Provider value={value}>{children}</CastContext.Provider>;
};
