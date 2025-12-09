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
  MonitorOff,
  Phone
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
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
];

const VideoMeet = () => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<Map<string, Peer>>(new Map());
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const userIdRef = useRef(crypto.randomUUID());
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const peersRef = useRef<Map<string, Peer>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);

  // Initialize local media
  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
      });
      setLocalStream(stream);
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      toast.error("Failed to access camera/microphone. Please allow permissions.");
      return null;
    }
  };

  // Create peer connection
  const createPeerConnection = (peerId: string, stream: MediaStream) => {
    console.log("Creating peer connection for:", peerId);
    const pc = new RTCPeerConnection({ 
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 10
    });

    // Add local tracks
    stream.getTracks().forEach((track) => {
      console.log("Adding track:", track.kind);
      pc.addTrack(track, stream);
    });

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        console.log("Sending ICE candidate to:", peerId);
        channelRef.current.send({
          type: "broadcast",
          event: "ice-candidate",
          payload: {
            candidate: event.candidate.toJSON(),
            from: userIdRef.current,
            to: peerId,
          },
        });
      }
    };

    pc.onicegatheringstatechange = () => {
      console.log("ICE gathering state:", pc.iceGatheringState);
    };

    // Handle incoming tracks
    pc.ontrack = (event) => {
      console.log("Received remote track:", event.track.kind);
      const remoteStream = event.streams[0];
      if (remoteStream) {
        setPeers((prev) => {
          const newPeers = new Map(prev);
          const peer = newPeers.get(peerId);
          if (peer) {
            peer.stream = remoteStream;
            newPeers.set(peerId, { ...peer });
          }
          return newPeers;
        });
        // Also update ref
        const peerInRef = peersRef.current.get(peerId);
        if (peerInRef) {
          peerInRef.stream = remoteStream;
        }
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${peerId}:`, pc.connectionState);
      if (pc.connectionState === "failed") {
        console.log("Connection failed, attempting to restart ICE");
        pc.restartIce();
      }
      if (pc.connectionState === "disconnected" || pc.connectionState === "closed") {
        removePeer(peerId);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`ICE connection state with ${peerId}:`, pc.iceConnectionState);
    };

    return pc;
  };

  // Remove peer
  const removePeer = (peerId: string) => {
    console.log("Removing peer:", peerId);
    const peer = peersRef.current.get(peerId);
    if (peer) {
      peer.connection.close();
      peersRef.current.delete(peerId);
      setPeers(new Map(peersRef.current));
    }
  };

  // Handle offer
  const handleOffer = async (offer: RTCSessionDescriptionInit, fromId: string) => {
    console.log("Received offer from:", fromId);
    if (peersRef.current.has(fromId)) {
      console.log("Already have peer connection with:", fromId);
      return;
    }

    const stream = localStreamRef.current;
    if (!stream) {
      console.error("No local stream available");
      return;
    }

    const pc = createPeerConnection(fromId, stream);
    const peer: Peer = { id: fromId, connection: pc };
    peersRef.current.set(fromId, peer);
    setPeers(new Map(peersRef.current));

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      console.log("Sending answer to:", fromId);
      channelRef.current?.send({
        type: "broadcast",
        event: "answer",
        payload: {
          answer: answer,
          from: userIdRef.current,
          to: fromId,
        },
      });
    } catch (error) {
      console.error("Error handling offer:", error);
    }
  };

  // Handle answer
  const handleAnswer = async (answer: RTCSessionDescriptionInit, fromId: string) => {
    console.log("Received answer from:", fromId);
    const peer = peersRef.current.get(fromId);
    if (peer && peer.connection.signalingState === "have-local-offer") {
      try {
        await peer.connection.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (error) {
        console.error("Error handling answer:", error);
      }
    }
  };

  // Handle ICE candidate
  const handleIceCandidate = async (candidate: RTCIceCandidateInit, fromId: string) => {
    console.log("Received ICE candidate from:", fromId);
    const peer = peersRef.current.get(fromId);
    if (peer && peer.connection.remoteDescription) {
      try {
        await peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error("Error adding ICE candidate:", error);
      }
    }
  };

  // Join meeting
  const joinMeeting = async () => {
    if (isJoining || isJoined) return;
    setIsJoining(true);

    const stream = await initializeMedia();
    if (!stream) {
      setIsJoining(false);
      return;
    }

    console.log("Joining meeting with user ID:", userIdRef.current);

    // Set up realtime channel
    const channel = supabase.channel(ROOM_ID, {
      config: { 
        presence: { key: userIdRef.current },
        broadcast: { self: false }
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const count = Object.keys(state).length;
        console.log("Presence sync, participants:", count, state);
        setParticipantCount(count);
      })
      .on("presence", { event: "join" }, async ({ key }) => {
        console.log("User joined:", key);
        if (key === userIdRef.current) return;
        
        // Only the user with the "smaller" ID sends the offer to avoid race conditions
        if (userIdRef.current < key) {
          console.log("Creating offer for new peer:", key);
          const currentStream = localStreamRef.current;
          if (!currentStream) {
            console.error("No local stream for offer");
            return;
          }

          const pc = createPeerConnection(key, currentStream);
          const peer: Peer = { id: key, connection: pc };
          peersRef.current.set(key, peer);
          setPeers(new Map(peersRef.current));

          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            console.log("Sending offer to:", key);
            channel.send({
              type: "broadcast",
              event: "offer",
              payload: {
                offer: offer,
                from: userIdRef.current,
                to: key,
              },
            });
          } catch (error) {
            console.error("Error creating offer:", error);
          }
        }
      })
      .on("presence", { event: "leave" }, ({ key }) => {
        console.log("User left:", key);
        removePeer(key);
      })
      .on("broadcast", { event: "offer" }, ({ payload }) => {
        if (payload.to === userIdRef.current) {
          handleOffer(payload.offer, payload.from);
        }
      })
      .on("broadcast", { event: "answer" }, ({ payload }) => {
        if (payload.to === userIdRef.current) {
          handleAnswer(payload.answer, payload.from);
        }
      })
      .on("broadcast", { event: "ice-candidate" }, ({ payload }) => {
        if (payload.to === userIdRef.current) {
          handleIceCandidate(payload.candidate, payload.from);
        }
      })
      .subscribe(async (status) => {
        console.log("Channel status:", status);
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: userIdRef.current, joined_at: new Date().toISOString() });
          setIsJoined(true);
          setIsJoining(false);
          toast.success("Joined the meeting!");
        }
      });

    channelRef.current = channel;
  };

  // Leave meeting
  const leaveMeeting = useCallback(() => {
    console.log("Leaving meeting");
    
    // Close all peer connections
    peersRef.current.forEach((peer) => {
      peer.connection.close();
    });
    peersRef.current.clear();
    setPeers(new Map());

    // Stop local stream
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
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
    setIsJoining(false);
    setParticipantCount(0);
    toast.info("Left the meeting");
  }, [screenStream]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, []);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, []);

  // Toggle screen share
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop screen sharing
      screenStream?.getTracks().forEach((track) => track.stop());
      setScreenStream(null);
      setIsScreenSharing(false);
      
      // Replace screen track with camera track for all peers
      if (localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        peersRef.current.forEach((peer) => {
          const sender = peer.connection.getSenders().find((s) => s.track?.kind === "video");
          if (sender && videoTrack) {
            sender.replaceTrack(videoTrack);
          }
        });
      }
      toast.info("Stopped screen sharing");
    } else {
      try {
        const screen = await navigator.mediaDevices.getDisplayMedia({ 
          video: { 
            cursor: "always",
            displaySurface: "monitor"
          } as MediaTrackConstraints,
          audio: false 
        });
        setScreenStream(screen);
        setIsScreenSharing(true);

        const screenTrack = screen.getVideoTracks()[0];
        
        // Show screen share to local user
        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = screen;
        }
        
        // Replace camera track with screen track for all peers
        peersRef.current.forEach((peer) => {
          const sender = peer.connection.getSenders().find((s) => s.track?.kind === "video");
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        });

        toast.success("Screen sharing started");

        // Handle when user stops sharing via browser UI
        screenTrack.onended = () => {
          setIsScreenSharing(false);
          setScreenStream(null);
          if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            peersRef.current.forEach((peer) => {
              const sender = peer.connection.getSenders().find((s) => s.track?.kind === "video");
              if (sender && videoTrack) {
                sender.replaceTrack(videoTrack);
              }
            });
          }
          toast.info("Screen sharing stopped");
        };
      } catch (error) {
        console.error("Error sharing screen:", error);
        toast.error("Failed to share screen");
      }
    }
  };

  // Copy meeting link
  const copyMeetingLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Meeting link copied!");
    setTimeout(() => setCopied(false), 2000);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStream?.getTracks().forEach((track) => track.stop());
      peersRef.current.forEach((peer) => peer.connection.close());
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  const remoteStreams = Array.from(peers.values()).filter((p) => p.stream);
  const totalVideos = 1 + remoteStreams.length + (isScreenSharing ? 1 : 0);
  const gridCols = totalVideos <= 1 ? 1 : totalVideos <= 2 ? 2 : totalVideos <= 4 ? 2 : 3;

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex-1 overflow-auto p-2 md:p-6 pb-24">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl md:text-3xl font-bold">Video Meet</h1>
              {isJoined && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {participantCount} participant{participantCount !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
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
          </div>

          {/* Join Button - Show when not joined */}
          {!isJoined && !isJoining && (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold">Ready to join?</h2>
                <p className="text-muted-foreground">Click below to start the video meeting</p>
              </div>
              <Button 
                size="lg" 
                onClick={joinMeeting}
                className="flex items-center gap-2"
              >
                <Phone className="h-5 w-5" />
                Join Meeting
              </Button>
            </div>
          )}

          {/* Loading state */}
          {isJoining && (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="text-muted-foreground">Connecting to meeting...</p>
            </div>
          )}

          {/* Video Grid - Show when joined */}
          {isJoined && (
            <div
              className={cn(
                "grid gap-4",
                gridCols === 1 && "grid-cols-1 max-w-2xl mx-auto",
                gridCols === 2 && "grid-cols-1 md:grid-cols-2",
                gridCols === 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
              )}
            >
              {/* Screen Share Video - Show prominently when sharing */}
              {isScreenSharing && screenStream && (
                <Card className="relative aspect-video bg-muted overflow-hidden md:col-span-2">
                  <video
                    ref={screenVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain bg-black"
                  />
                  <div className="absolute bottom-2 left-2">
                    <Badge className="bg-green-500 text-white">Your Screen</Badge>
                  </div>
                </Card>
              )}

              {/* Local Video */}
              <Card className="relative aspect-video bg-muted overflow-hidden">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={cn(
                    "w-full h-full object-cover transform scale-x-[-1]",
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
          )}

          {/* Controls */}
          {isJoined && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
              <Card className="flex items-center gap-2 p-3 bg-background/95 backdrop-blur-sm shadow-lg border">
                <Button
                  variant={isVideoEnabled ? "secondary" : "destructive"}
                  size="icon"
                  onClick={toggleVideo}
                  title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
                  className="h-12 w-12"
                >
                  {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                </Button>
                
                <Button
                  variant={isAudioEnabled ? "secondary" : "destructive"}
                  size="icon"
                  onClick={toggleAudio}
                  title={isAudioEnabled ? "Mute" : "Unmute"}
                  className="h-12 w-12"
                >
                  {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                </Button>
                
                <Button
                  variant={isScreenSharing ? "default" : "secondary"}
                  size="icon"
                  onClick={toggleScreenShare}
                  title={isScreenSharing ? "Stop sharing" : "Share screen"}
                  className="h-12 w-12"
                >
                  {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
                </Button>
                
                <div className="w-px h-10 bg-border mx-2" />
                
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={leaveMeeting}
                  title="Leave meeting"
                  className="h-12 w-12"
                >
                  <PhoneOff className="h-5 w-5" />
                </Button>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoMeet;
