import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  PhoneOff, 
  Users, 
  Copy, 
  Check,
  Monitor,
  MonitorOff
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Peer {
  id: string;
  connection: RTCPeerConnection;
  stream?: MediaStream;
}

const ROOM_ID = "main-meeting-room";
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

const VideoMeet = () => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<Map<string, Peer>>(new Map());
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [participantCount, setParticipantCount] = useState(1);
  const [copied, setCopied] = useState(false);
  const [userId] = useState(() => crypto.randomUUID());
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const peersRef = useRef<Map<string, Peer>>(new Map());

  // Initialize local media
  const initializeMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      toast.error("Failed to access camera/microphone");
      return null;
    }
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback((peerId: string, stream: MediaStream) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Add local tracks
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "ice-candidate",
          payload: {
            candidate: event.candidate,
            from: userId,
            to: peerId,
          },
        });
      }
    };

    // Handle incoming tracks
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      setPeers((prev) => {
        const newPeers = new Map(prev);
        const peer = newPeers.get(peerId);
        if (peer) {
          peer.stream = remoteStream;
          newPeers.set(peerId, peer);
        }
        return newPeers;
      });
    };

    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${peerId}:`, pc.connectionState);
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        removePeer(peerId);
      }
    };

    return pc;
  }, [userId]);

  // Remove peer
  const removePeer = useCallback((peerId: string) => {
    const peer = peersRef.current.get(peerId);
    if (peer) {
      peer.connection.close();
      peersRef.current.delete(peerId);
      setPeers(new Map(peersRef.current));
      setParticipantCount((prev) => Math.max(1, prev - 1));
    }
  }, []);

  // Handle offer
  const handleOffer = useCallback(async (offer: RTCSessionDescriptionInit, fromId: string, stream: MediaStream) => {
    if (peersRef.current.has(fromId)) return;

    const pc = createPeerConnection(fromId, stream);
    const peer: Peer = { id: fromId, connection: pc };
    peersRef.current.set(fromId, peer);
    setPeers(new Map(peersRef.current));
    setParticipantCount((prev) => prev + 1);

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    channelRef.current?.send({
      type: "broadcast",
      event: "answer",
      payload: {
        answer: answer,
        from: userId,
        to: fromId,
      },
    });
  }, [createPeerConnection, userId]);

  // Handle answer
  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit, fromId: string) => {
    const peer = peersRef.current.get(fromId);
    if (peer) {
      await peer.connection.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }, []);

  // Handle ICE candidate
  const handleIceCandidate = useCallback(async (candidate: RTCIceCandidateInit, fromId: string) => {
    const peer = peersRef.current.get(fromId);
    if (peer) {
      await peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }, []);

  // Join meeting
  const joinMeeting = useCallback(async () => {
    const stream = await initializeMedia();
    if (!stream) return;

    // Set up realtime channel
    const channel = supabase.channel(ROOM_ID, {
      config: { presence: { key: userId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const count = Object.keys(state).length;
        setParticipantCount(count);
      })
      .on("presence", { event: "join" }, async ({ key, newPresences }) => {
        if (key === userId) return;
        
        // Create offer for new peer
        const pc = createPeerConnection(key, stream);
        const peer: Peer = { id: key, connection: pc };
        peersRef.current.set(key, peer);
        setPeers(new Map(peersRef.current));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        channel.send({
          type: "broadcast",
          event: "offer",
          payload: {
            offer: offer,
            from: userId,
            to: key,
          },
        });
      })
      .on("presence", { event: "leave" }, ({ key }) => {
        removePeer(key);
      })
      .on("broadcast", { event: "offer" }, ({ payload }) => {
        if (payload.to === userId) {
          handleOffer(payload.offer, payload.from, stream);
        }
      })
      .on("broadcast", { event: "answer" }, ({ payload }) => {
        if (payload.to === userId) {
          handleAnswer(payload.answer, payload.from);
        }
      })
      .on("broadcast", { event: "ice-candidate" }, ({ payload }) => {
        if (payload.to === userId) {
          handleIceCandidate(payload.candidate, payload.from);
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: userId, joined_at: new Date().toISOString() });
          setIsJoined(true);
          toast.success("Joined the meeting!");
        }
      });

    channelRef.current = channel;
  }, [userId, initializeMedia, createPeerConnection, handleOffer, handleAnswer, handleIceCandidate, removePeer]);

  // Leave meeting
  const leaveMeeting = useCallback(() => {
    // Close all peer connections
    peersRef.current.forEach((peer) => {
      peer.connection.close();
    });
    peersRef.current.clear();
    setPeers(new Map());

    // Stop local stream
    localStream?.getTracks().forEach((track) => track.stop());
    setLocalStream(null);

    // Stop screen share
    screenStream?.getTracks().forEach((track) => track.stop());
    setScreenStream(null);
    setIsScreenSharing(false);

    // Unsubscribe from channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    setIsJoined(false);
    setParticipantCount(1);
    toast.info("Left the meeting");
  }, [localStream, screenStream]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, [localStream]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, [localStream]);

  // Toggle screen share
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      screenStream?.getTracks().forEach((track) => track.stop());
      setScreenStream(null);
      setIsScreenSharing(false);
      
      // Replace screen track with camera track
      if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        peersRef.current.forEach((peer) => {
          const sender = peer.connection.getSenders().find((s) => s.track?.kind === "video");
          if (sender && videoTrack) {
            sender.replaceTrack(videoTrack);
          }
        });
      }
    } else {
      try {
        const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setScreenStream(screen);
        setIsScreenSharing(true);

        const screenTrack = screen.getVideoTracks()[0];
        
        // Replace camera track with screen track for all peers
        peersRef.current.forEach((peer) => {
          const sender = peer.connection.getSenders().find((s) => s.track?.kind === "video");
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        });

        // Handle when user stops sharing via browser UI
        screenTrack.onended = () => {
          setIsScreenSharing(false);
          setScreenStream(null);
          if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            peersRef.current.forEach((peer) => {
              const sender = peer.connection.getSenders().find((s) => s.track?.kind === "video");
              if (sender && videoTrack) {
                sender.replaceTrack(videoTrack);
              }
            });
          }
        };
      } catch (error) {
        console.error("Error sharing screen:", error);
        toast.error("Failed to share screen");
      }
    }
  }, [isScreenSharing, screenStream, localStream]);

  // Copy meeting link
  const copyMeetingLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Meeting link copied!");
    setTimeout(() => setCopied(false), 2000);
  }, []);

  // Auto-join on mount
  useEffect(() => {
    joinMeeting();
    return () => {
      leaveMeeting();
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      localStream?.getTracks().forEach((track) => track.stop());
      screenStream?.getTracks().forEach((track) => track.stop());
      peersRef.current.forEach((peer) => peer.connection.close());
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  const remoteStreams = Array.from(peers.values()).filter((p) => p.stream);
  const gridCols = remoteStreams.length === 0 ? 1 : remoteStreams.length <= 1 ? 2 : remoteStreams.length <= 3 ? 2 : 3;

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto p-2 md:p-6 w-full">
        <div className="max-w-8xl mx-auto space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl md:text-3xl font-bold">Video Meet</h1>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {participantCount} participant{participantCount !== 1 ? "s" : ""}
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={copyMeetingLink}
              className="flex items-center gap-2"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied!" : "Copy Link"}
            </Button>
          </div>

          {/* Video Grid */}
          <div
            className={cn(
              "grid gap-4",
              gridCols === 1 && "grid-cols-1",
              gridCols === 2 && "grid-cols-1 md:grid-cols-2",
              gridCols === 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            )}
          >
            {/* Local Video */}
            <Card className="relative aspect-video bg-muted overflow-hidden">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={cn(
                  "w-full h-full object-cover",
                  !isVideoEnabled && "hidden"
                )}
              />
              {!isVideoEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                    <VideoOff className="h-8 w-8 text-muted-foreground" />
                  </div>
                </div>
              )}
              <div className="absolute bottom-2 left-2">
                <Badge variant="secondary">You</Badge>
              </div>
              {!isAudioEnabled && (
                <div className="absolute bottom-2 right-2">
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <MicOff className="h-3 w-3" />
                  </Badge>
                </div>
              )}
            </Card>

            {/* Remote Videos */}
            {remoteStreams.map((peer) => (
              <Card key={peer.id} className="relative aspect-video bg-muted overflow-hidden">
                <video
                  autoPlay
                  playsInline
                  ref={(el) => {
                    if (el && peer.stream) {
                      el.srcObject = peer.stream;
                    }
                  }}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2">
                  <Badge variant="secondary">Participant</Badge>
                </div>
              </Card>
            ))}
          </div>

          {/* Controls */}
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <Card className="flex items-center gap-2 p-2 bg-background/95 backdrop-blur-sm shadow-lg">
              <Button
                variant={isVideoEnabled ? "secondary" : "destructive"}
                size="icon"
                onClick={toggleVideo}
                title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
              >
                {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </Button>
              
              <Button
                variant={isAudioEnabled ? "secondary" : "destructive"}
                size="icon"
                onClick={toggleAudio}
                title={isAudioEnabled ? "Mute" : "Unmute"}
              >
                {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </Button>
              
              <Button
                variant={isScreenSharing ? "default" : "secondary"}
                size="icon"
                onClick={toggleScreenShare}
                title={isScreenSharing ? "Stop sharing" : "Share screen"}
              >
                {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
              </Button>
              
              <div className="w-px h-8 bg-border mx-1" />
              
              <Button
                variant="destructive"
                size="icon"
                onClick={leaveMeeting}
                title="Leave meeting"
              >
                <PhoneOff className="h-5 w-5" />
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoMeet;
