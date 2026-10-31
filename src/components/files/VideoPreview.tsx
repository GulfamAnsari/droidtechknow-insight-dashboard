import React, { useEffect, useRef, useState } from "react";
import videojs from "video.js";
import type { Player } from "video.js";
import "video.js/dist/video-js.css";
import { Download, AlertCircle } from "lucide-react";

interface VideoPreviewProps {
  src: string;
  className?: string;
  style?: React.CSSProperties;
  onError?: () => void;
}

const MIME_BY_EXT: Record<string, string> = {
  webm: "video/webm",
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  ogv: "video/ogg",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo",
  "3gp": "video/3gpp",
};

const mimeFor = (url: string, fallback?: string | null) => {
  const ext = url.split("?")[0].split("#")[0].split(".").pop()?.toLowerCase() || "";
  return MIME_BY_EXT[ext] || fallback || "video/mp4";
};

/**
 * Video.js player used for all video previews in MyCloud.
 * WebM and other files that the server serves with a wrong Content-Type
 * are re-fetched as a blob with the correct MIME type so they can play.
 */
const VideoPreview: React.FC<VideoPreviewProps> = ({ src, className, style, onError }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const triedFallbackRef = useRef(false);
  const [failed, setFailed] = useState(false);
  const [activeSrc, setActiveSrc] = useState(src);
  const [activeMime, setActiveMime] = useState(mimeFor(src));

  // Reset when the file changes
  useEffect(() => {
    objectUrlRef.current = null;
    triedFallbackRef.current = false;
    setFailed(false);
    setActiveSrc(src);
    setActiveMime(mimeFor(src));
  }, [src]);

  useEffect(() => {
    if (!containerRef.current) return;

    const el = document.createElement("video-js");
    el.classList.add("vjs-big-play-centered");
    el.setAttribute("playsinline", "");
    containerRef.current.appendChild(el);

    const player = playerRef.current = videojs(el, {
      controls: true,
      preload: "metadata",
      playsinline: true,
      fill: true,
      controlBar: { pictureInPictureToggle: false },
      sources: [{ src: activeSrc, type: activeMime }],
    });

    const handleError = async () => {
      onError?.();
      if (triedFallbackRef.current) {
        setFailed(true);
        return;
      }
      triedFallbackRef.current = true;
      try {
        const res = await fetch(src);
        if (!res.ok) {
          setFailed(true);
          return;
        }
        const buffer = await res.arrayBuffer();
        const blob = new Blob([buffer], { type: mimeFor(src, res.headers.get("content-type")) });
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        setActiveSrc(url);
        setActiveMime(blob.type);
      } catch {
        setFailed(true);
      }
    };

    player.on("error", handleError);

    return () => {
      player.off("error", handleError);
      player.dispose();
      playerRef.current = null;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [activeSrc, activeMime, src, onError]);

  return (
    <div className={`relative overflow-hidden bg-black ${className || ""}`} style={style}>
      {failed ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
          <AlertCircle className="h-10 w-10 text-red-500" />
          <p className="text-sm text-white">This video can't be played in the browser.</p>
          <a
            href={src}
            download
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            <Download className="h-4 w-4" /> Download instead
          </a>
        </div>
      ) : (
        <div ref={containerRef} className="absolute inset-0 [&>.video-js]:w-full [&>.video-js]:h-full" />
      )}
    </div>
  );
};

export default VideoPreview;
