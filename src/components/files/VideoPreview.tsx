import React, { useEffect, useRef, useState } from "react";

interface VideoPreviewProps {
  src: string;
  className?: string;
  style?: React.CSSProperties;
  controls?: boolean;
  playsInline?: boolean;
  controlsList?: string;
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

/**
 * Video element that falls back to a blob object URL (with the correct
 * MIME type inferred from the file extension) when the server response
 * cannot be played directly — e.g. WebM files served with a wrong or
 * missing Content-Type header.
 */
const VideoPreview: React.FC<VideoPreviewProps> = ({
  src,
  className,
  style,
  controls = true,
  playsInline = true,
  controlsList,
  onError,
}) => {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const activeSrc = objectUrl || src;

  // Revoke the blob URL when it changes or on unmount
  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  // Reset state when the source file changes
  useEffect(() => {
    setObjectUrl(null);
    setTried(false);
  }, [src]);

  const handleError = async () => {
    if (onError) onError();
    if (tried || objectUrl) return; // blob fallback also failed
    setTried(true);
    try {
      const res = await fetch(src);
      if (!res.ok) return;
      const buffer = await res.arrayBuffer();
      const ext = src.split("?")[0].split("#")[0].split(".").pop()?.toLowerCase() || "";
      const mime = MIME_BY_EXT[ext] || res.headers.get("content-type") || "video/mp4";
      const blob = new Blob([buffer], { type: mime });
      setObjectUrl(URL.createObjectURL(blob));
    } catch {
      // Nothing more we can do — leave the original <video> error state
    }
  };

  return (
    <video
      ref={videoRef}
      key={activeSrc}
      src={activeSrc}
      controls={controls}
      playsInline={playsInline}
      controlsList={controlsList}
      className={className}
      style={style}
      onError={handleError}
    />
  );
};

export default VideoPreview;
