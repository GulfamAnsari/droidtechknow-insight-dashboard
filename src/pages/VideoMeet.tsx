import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Phone,
  MessageSquare,
  Hand,
  Settings,
  X,
  Send,
  Circle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Peer {
  id: string;
  name: string;
  connection: RTCPeerConnection;
  stream?: MediaStream;
  handRaised?: boolean;
}

interface ChatMessage {
  id: string;
  sender: string;
  senderName: string;
  message: string;
  timestamp: Date;
}

const ROOM_ID = "main-meeting-room";

// Free TURN servers from multiple providers for reliability
const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
  // OpenRelay TURN servers (free, public)
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject"
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject"
  },
  {
    urls: "turn:openrelay.metered.ca:443?transport=tcp",
    username: "openrelayproject",
    credential: "openrelayproject"
  }
];

const VideoMeet = () => {
  // Media state
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<Map<string, Peer>>(new Map());
  
  // UI toggles
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  
  // Meeting state
  const [isJoined, setIsJoined] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [userName, setUserName] = useState("");
  const [showPreview, setShowPreview] = useState(true);
  
  // Chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [unreadMessages, setUnreadMessages] = useState(0);
  
  // Refs
  const userIdRef = useRef(crypto.randomUUID());
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const peersRef = useRef<Map<string, Peer>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Initialize preview media
  const initializePreview = async () => {
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
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      toast.error("Failed to access camera/microphone. Please check permissions.");
      return null;
    }
  };

  // Start preview when component mounts
  useEffect(() => {
    if (showPreview) {
      initializePreview();
    }
    return () => {
      // Cleanup on unmount
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  // Update preview video when stream changes
  useEffect(() => {
    if (previewVideoRef.current && localStream && showPreview) {
      previewVideoRef.current.srcObject = localStream;
    }
    if (localVideoRef.current && localStream && isJoined) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, showPreview, isJoined]);

  // Create peer connection
  const createPeerConnection = useCallback((peerId: string, peerName: string, stream: MediaStream) => {
    console.log("Creating peer connection for:", peerId, peerName);
    
    const pc = new RTCPeerConnection({ 
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 10
    });

    // Add local tracks
    stream.getTracks().forEach((track) => {
      console.log("Adding track:", track.kind, track.enabled);
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
      console.log("Received remote track:", event.track.kind, "from:", peerId);
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
  }, []);

  // Remove peer
  const removePeer = useCallback((peerId: string) => {
    console.log("Removing peer:", peerId);
    const peer = peersRef.current.get(peerId);
    if (peer) {
      peer.connection.close();
      peersRef.current.delete(peerId);
      setPeers(new Map(peersRef.current));
    }
  }, []);

  // Handle offer
  const handleOffer = useCallback(async (offer: RTCSessionDescriptionInit, fromId: string, fromName: string) => {
    console.log("Received offer from:", fromId, fromName);
    if (peersRef.current.has(fromId)) {
      console.log("Already have peer connection with:", fromId);
      return;
    }

    const stream = localStreamRef.current;
    if (!stream) {
      console.error("No local stream available");
      return;
    }

    const pc = createPeerConnection(fromId, fromName, stream);
    const peer: Peer = { id: fromId, name: fromName, connection: pc };
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
          fromName: userName,
          to: fromId,
        },
      });
    } catch (error) {
      console.error("Error handling offer:", error);
    }
  }, [createPeerConnection, userName]);

  // Handle answer
  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit, fromId: string) => {
    console.log("Received answer from:", fromId);
    const peer = peersRef.current.get(fromId);
    if (peer && peer.connection.signalingState === "have-local-offer") {
      try {
        await peer.connection.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (error) {
        console.error("Error handling answer:", error);
      }
    }
  }, []);

  // Handle ICE candidate
  const handleIceCandidate = useCallback(async (candidate: RTCIceCandidateInit, fromId: string) => {
    console.log("Received ICE candidate from:", fromId);
    const peer = peersRef.current.get(fromId);
    if (peer && peer.connection.remoteDescription) {
      try {
        await peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error("Error adding ICE candidate:", error);
      }
    }
  }, []);

  // Join meeting
  const joinMeeting = async () => {
    if (isJoining || isJoined) return;
    if (!userName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    
    setIsJoining(true);
    setShowPreview(false);

    // Make sure we have a stream
    let stream = localStreamRef.current;
    if (!stream) {
      stream = await initializePreview();
      if (!stream) {
        setIsJoining(false);
        setShowPreview(true);
        return;
      }
    }

    console.log("Joining meeting with user ID:", userIdRef.current, "name:", userName);

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
      .on("presence", { event: "join" }, async ({ key, newPresences }) => {
        console.log("User joined:", key, newPresences);
        if (key === userIdRef.current) return;
        
        const peerName = (newPresences[0] as any)?.name || "Participant";
        
        // Only the user with the "smaller" ID sends the offer
        if (userIdRef.current < key) {
          console.log("Creating offer for new peer:", key);
          const currentStream = localStreamRef.current;
          if (!currentStream) {
            console.error("No local stream for offer");
            return;
          }

          const pc = createPeerConnection(key, peerName, currentStream);
          const peer: Peer = { id: key, name: peerName, connection: pc };
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
                fromName: userName,
                to: key,
              },
            });
          } catch (error) {
            console.error("Error creating offer:", error);
          }
        }
        
        toast.success(`${peerName} joined the meeting`);
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        console.log("User left:", key);
        const peerName = (leftPresences[0] as any)?.name || "Participant";
        removePeer(key);
        toast.info(`${peerName} left the meeting`);
      })
      .on("broadcast", { event: "offer" }, ({ payload }) => {
        if (payload.to === userIdRef.current) {
          handleOffer(payload.offer, payload.from, payload.fromName);
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
      .on("broadcast", { event: "chat" }, ({ payload }) => {
        const msg: ChatMessage = {
          id: crypto.randomUUID(),
          sender: payload.from,
          senderName: payload.fromName,
          message: payload.message,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, msg]);
        if (!showChat) {
          setUnreadMessages(prev => prev + 1);
        }
      })
      .on("broadcast", { event: "hand-raise" }, ({ payload }) => {
        const peer = peersRef.current.get(payload.from);
        if (peer) {
          peer.handRaised = payload.raised;
          setPeers(new Map(peersRef.current));
          if (payload.raised) {
            toast.info(`${payload.fromName} raised their hand`);
          }
        }
      })
      .subscribe(async (status) => {
        console.log("Channel status:", status);
        if (status === "SUBSCRIBED") {
          await channel.track({ 
            user_id: userIdRef.current, 
            name: userName,
            joined_at: new Date().toISOString() 
          });
          setIsJoined(true);
          setIsJoining(false);
          
          // Set video to local video element
          if (localVideoRef.current && localStreamRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
          }
          
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
    setMessages([]);
    setShowChat(false);
    setHandRaised(false);
    setShowPreview(true);
    
    // Restart preview
    initializePreview();
    
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
      screenStream?.getTracks().forEach((track) => track.stop());
      setScreenStream(null);
      setIsScreenSharing(false);
      
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
            cursor: "always"
          } as MediaTrackConstraints,
          audio: true 
        });
        setScreenStream(screen);
        setIsScreenSharing(true);

        const screenTrack = screen.getVideoTracks()[0];
        
        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = screen;
        }
        
        peersRef.current.forEach((peer) => {
          const sender = peer.connection.getSenders().find((s) => s.track?.kind === "video");
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        });

        toast.success("Screen sharing started");

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

  // Toggle hand raise
  const toggleHandRaise = useCallback(() => {
    const newState = !handRaised;
    setHandRaised(newState);
    channelRef.current?.send({
      type: "broadcast",
      event: "hand-raise",
      payload: {
        from: userIdRef.current,
        fromName: userName,
        raised: newState,
      },
    });
    if (newState) {
      toast.info("You raised your hand");
    }
  }, [handRaised, userName]);

  // Send chat message
  const sendMessage = useCallback(() => {
    if (!newMessage.trim()) return;
    
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      sender: userIdRef.current,
      senderName: userName,
      message: newMessage.trim(),
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, msg]);
    
    channelRef.current?.send({
      type: "broadcast",
      event: "chat",
      payload: {
        from: userIdRef.current,
        fromName: userName,
        message: newMessage.trim(),
      },
    });
    
    setNewMessage("");
  }, [newMessage, userName]);

  // Toggle chat panel
  const toggleChat = useCallback(() => {
    setShowChat(prev => !prev);
    setUnreadMessages(0);
  }, []);

  // Copy meeting link
  const copyMeetingLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Meeting link copied!");
    setTimeout(() => setCopied(false), 2000);
  }, []);

  // Scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

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

  // Pre-join preview screen
  if (showPreview && !isJoined) {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold">Join Meeting</h1>
              <p className="text-muted-foreground">Check your camera and audio before joining</p>
            </div>
            
            {/* Video Preview */}
            <Card className="relative aspect-video bg-muted overflow-hidden">
              <video
                ref={previewVideoRef}
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
                  <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
                    <VideoOff className="h-10 w-10 text-muted-foreground" />
                  </div>
                </div>
              )}
              
              {/* Preview Controls */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
                <Button
                  variant={isVideoEnabled ? "secondary" : "destructive"}
                  size="icon"
                  onClick={toggleVideo}
                  className="h-10 w-10"
                >
                  {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                </Button>
                <Button
                  variant={isAudioEnabled ? "secondary" : "destructive"}
                  size="icon"
                  onClick={toggleAudio}
                  className="h-10 w-10"
                >
                  {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                </Button>
              </div>
            </Card>
            
            {/* Name Input and Join */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Enter your name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && joinMeeting()}
                className="flex-1"
              />
              <Button 
                onClick={joinMeeting}
                disabled={isJoining || !userName.trim()}
                className="flex items-center gap-2"
              >
                {isJoining ? (
                  <>
                    <Circle className="h-4 w-4 animate-pulse" />
                    Joining...
                  </>
                ) : (
                  <>
                    <Phone className="h-4 w-4" />
                    Join Now
                  </>
                )}
              </Button>
            </div>
            
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={copyMeetingLink}
                className="flex items-center gap-2"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied!" : "Copy Meeting Link"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <div className={cn("flex-1 flex overflow-hidden", showChat && "pr-80")}>
        <div className="flex-1 overflow-auto p-2 md:p-6 pb-24">
          <div className="max-w-7xl mx-auto space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl md:text-3xl font-bold">Video Meet</h1>
                {isJoined && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {participantCount}
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

            {/* Video Grid */}
            {isJoined && (
              <div
                className={cn(
                  "grid gap-4",
                  gridCols === 1 && "grid-cols-1 max-w-2xl mx-auto",
                  gridCols === 2 && "grid-cols-1 md:grid-cols-2",
                  gridCols === 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                )}
              >
                {/* Screen Share Video */}
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
                      <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold">
                        {userName.charAt(0).toUpperCase()}
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 flex items-center gap-2">
                    <Badge variant="secondary">{userName} (You)</Badge>
                    {handRaised && (
                      <Badge className="bg-yellow-500 text-white">
                        <Hand className="h-3 w-3" />
                      </Badge>
                    )}
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
                    <div className="absolute bottom-2 left-2 flex items-center gap-2">
                      <Badge variant="secondary">{peer.name}</Badge>
                      {peer.handRaised && (
                        <Badge className="bg-yellow-500 text-white">
                          <Hand className="h-3 w-3" />
                        </Badge>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Loading state */}
            {isJoining && (
              <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="text-muted-foreground">Connecting to meeting...</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Sidebar */}
        {showChat && (
          <div className="fixed right-0 top-0 bottom-0 w-80 bg-background border-l flex flex-col z-40">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold">Chat</h2>
              <Button variant="ghost" size="icon" onClick={toggleChat}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1 p-4" ref={chatScrollRef}>
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "space-y-1",
                      msg.sender === userIdRef.current && "text-right"
                    )}
                  >
                    <div className="text-xs text-muted-foreground">
                      {msg.senderName}
                    </div>
                    <div
                      className={cn(
                        "inline-block px-3 py-2 rounded-lg text-sm",
                        msg.sender === userIdRef.current
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      {msg.message}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />
                <Button size="icon" onClick={sendMessage}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

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
            
            <Button
              variant={handRaised ? "default" : "secondary"}
              size="icon"
              onClick={toggleHandRaise}
              title={handRaised ? "Lower hand" : "Raise hand"}
              className="h-12 w-12"
            >
              <Hand className="h-5 w-5" />
            </Button>
            
            <Button
              variant="secondary"
              size="icon"
              onClick={toggleChat}
              title="Chat"
              className="h-12 w-12 relative"
            >
              <MessageSquare className="h-5 w-5" />
              {unreadMessages > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadMessages}
                </span>
              )}
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
  );
};

export default VideoMeet;
