import AgoraRTC from 'agora-rtc-sdk-ng';
import { useCallback, useEffect, useRef, useState } from 'react';

AgoraRTC.setLogLevel(4);

const APP_ID      = import.meta.env.VITE_AGORA_APP_ID || 'YOUR_AGORA_APP_ID';
const BACKEND_URL = 'https://api.juno.rest';

// Screen share UIDs use a fixed high-range prefix so we can reliably identify
// and filter them. The main client UID is a random low integer assigned by Agora;
// the screen client UID is always mainUid + 100000. Both must have matching tokens.
const SCREEN_UID_OFFSET = 100000;

export function useAgora() {
  const clientRef       = useRef(null);
  const screenClientRef = useRef(null);

  const localAudioTrackRef  = useRef(null);
  const localVideoTrackRef  = useRef(null);
  const localScreenTrackRef = useRef(null);
  const localScreenAudioTrackRef = useRef(null);

  // Store our own main UID after join so we can derive the screen share UID
  const localUidRef            = useRef(null);
  const screenShareEnabledRef  = useRef(false);
  const screenClientJoiningRef = useRef(false);

  // For subtitling
  const [subtitles, setSubtitles] = useState([]);
  const dataStreamIdRef = useRef(null);
  const audioWsRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  // Tracks UIDs of remote users who have joined the channel as a "main"
  // participant (i.e. not as one of our derived screen-share clients). Used
  // to reliably distinguish a remote screen-share UID (mainUid + OFFSET)
  // from a regular participant who happens to have a large random UID.
  const mainUidsRef = useRef(new Set());

  const [joined,             setJoined]             = useState(false);
  const [isJoining,          setIsJoining]          = useState(false);
  const [micEnabled,         setMicEnabled]         = useState(true);
  const [cameraEnabled,      setCameraEnabled]      = useState(false);
  const [screenShareEnabled, setScreenShareEnabled] = useState(false);
  const [remoteUsers,        setRemoteUsers]        = useState([]);
  const [connectionState,    setConnectionState]    = useState('DISCONNECTED');
  const [localVolume,        setLocalVolume]        = useState(80);
  const [outputVolume,       setOutputVolume]       = useState(100);
  const [networkQuality,     setNetworkQuality]     = useState(null);
  const [error,              setError]              = useState(null);

  const [audioDevices,   setAudioDevices]   = useState([]);
  const [videoDevices,   setVideoDevices]   = useState([]);
  const [outputDevices,  setOutputDevices]  = useState([]);
  const [selectedMic,    setSelectedMic]    = useState('');
  const [selectedCamera, setSelectedCamera] = useState('');
  const [selectedOutput, setSelectedOutput] = useState('');

  const applyOutputVolume = useCallback((audioTrack, vol) => {
    if (audioTrack?.setVolume) audioTrack.setVolume(vol);
  }, []);

  // Returns the screen UID for the current session, or null if not joined yet
  const getScreenUid = () => {
    const uid = localUidRef.current;
    if (uid === null || uid === undefined) return null;
    return uid + SCREEN_UID_OFFSET;
  };

  const stopSubtitling = useCallback(() => {
    if (mediaRecorderRef.current) {
      try { mediaRecorderRef.current.stop(); } catch (e) {}
      mediaRecorderRef.current = null;
    }
    if (audioWsRef.current) {
      try { audioWsRef.current.close(); } catch (e) {}
      audioWsRef.current = null;
    }
  }, []);

  const startSubtitling = useCallback((targetTrackRef, sourceLanguage = "zh-CN", targetLanguage = "en") => {
    // 1. Teardown any existing subtitling tracks, recorders, or sockets before re-binding
    stopSubtitling();
    if (!targetTrackRef?.current) {
      console.warn("⚠️ Subtitling block skipped: No target audio track reference passed.");
      return;
    }

    // 2. Initialize connection to your cloud pipeline proxy
    const ws = new WebSocket('wss://api.juno.rest');
    audioWsRef.current = ws;

    ws.onopen = () => {
      console.log(`🔌 WebSocket linked! Handshaking: ${sourceLanguage} -> ${targetLanguage}`);
      
      // Send dynamic language variables directly up the pipeline initialization handshake
      ws.send(JSON.stringify({ 
        action: 'start',
        sourceLanguage: sourceLanguage,
        targetLanguage: targetLanguage
      }));

      // Extract the underlying native hardware MediaStreamTrack abstraction safely
      const liveAudioTrack = localAudioTrackRef.current?.getMediaStreamTrack() 
        || targetTrackRef?.current?.getMediaStreamTrack();

      if (!liveAudioTrack || liveAudioTrack.readyState !== "live") {
        console.error("🔴 Subtitling Engine Failure: Hardware Microphone track is not active or missing!");
        return;
      }

      // Clone the track wrapper to prevent interfering with Agora's core WebRTC voice lane
      const duplicatedTrack = liveAudioTrack.clone();
      const mediaStream = new MediaStream([duplicatedTrack]);

      // Fallback safety verification matching standard browser codec profiles
      let chosenMime = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(chosenMime)) {
        chosenMime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      }

      console.log(`📡 MediaRecorder spinning up smoothly using container profile: ${chosenMime}`);
      const recorder = new MediaRecorder(mediaStream, { mimeType: chosenMime });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = async (e) => {
        if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          // Flatten media chunks into raw ArrayBuffers for immediate transmission
          const buffer = await e.data.arrayBuffer();
          ws.send(buffer);
        }
      };

      // Slice out clean 250ms binary chunks for low-latency delivery
      recorder.start(250);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'subtitle') {
          // Build out our text layout package 
          const payload = { uid: localUidRef.current || 'Local', text: data.text };
          
          // Render straight into our local state frame to guarantee instant display
          setSubtitles(prev => {
            const combined = [...prev, payload];
            // Keep a floating backlog layout frame of the last 3 transcript strings
            return combined.length > 3 ? combined.slice(combined.length - 3) : combined;
          });
        }
      } catch (err) {
        console.error("❌ Failed to process inbound socket subtitle chunk:", err);
      }
    };

    ws.onerror = (error) => {
      console.error("❌ Subtitle WebSocket encountered an operational exception:", error);
    };

    ws.onclose = () => {
      console.log("🔒 Subtitle WebSocket loop successfully closed down.");
    };
  }, [stopSubtitling]);

  const initClient = useCallback(() => {
    if (clientRef.current) return clientRef.current;

    const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

    // Track every remote UID that joins the channel as a "main" participant.
    // A remote screen-share client's UID will be (someMainUid + SCREEN_UID_OFFSET),
    // so we can use this set to confirm a published stream is genuinely a
    // screen share rather than just a participant with a large random UID.
    client.on('user-joined', (user) => {
      mainUidsRef.current.add(user.uid);
    });

    // Intercept incoming synchronized text strings sent by remote callers alongside media tracks
    client.on("stream-message", (uid, payload) => {
      const decoder = new TextDecoder("utf8");
      const messageString = decoder.decode(payload);
      try {
        const subtitleData = JSON.parse(messageString);
        setSubtitles(prev => {
          const combined = [...prev, subtitleData];
          return combined.length > 3 ? combined.slice(combined.length - 3) : combined;
        });
      } catch (e) { 
        console.warn("Malformed synchronized data stream frame drop:", e); 
      }
    });

    client.on('user-published', async (user, mediaType) => {
      // ── CRITICAL FIX ─────────────────────────────────────────────────────────
      // Skip our own screen-share UID. If the main client tries to subscribe to its own screen track:
      //   1. Agora opens a redundant WebSocket → "closed before established" error
      //   2. The internal renderer hits an uninitialized player object → crash
      const screenUid = getScreenUid();
      if (screenUid !== null && user.uid === screenUid) return;
      // ─────────────────────────────────────────────────────────────────────────

      await client.subscribe(user, mediaType);

      if (mediaType === 'audio') {
        user.audioTrack?.play();
        applyOutputVolume(user.audioTrack, outputVolume);
      }

      // A remote stream is a genuine screen share only if its UID equals
      // (someone's main UID) + SCREEN_UID_OFFSET, where that main UID actually
      // joined the channel as a regular participant.
      const isScreenShare = mainUidsRef.current.has(Number(user.uid) - SCREEN_UID_OFFSET);

      setRemoteUsers(prev => {
        const exists = prev.find(u => u.uid === user.uid);
        const updated = {
          uid:        user.uid,
          hasAudio:   user.hasAudio,
          hasVideo:   user.hasVideo,
          videoTrack: user.videoTrack,
          audioTrack: user.audioTrack,
          isScreenShare,
        };
        if (exists) return prev.map(u => u.uid === user.uid ? updated : u);
        return [...prev, updated];
      });
    });

    client.on('user-unpublished', (user, mediaType) => {
      setRemoteUsers(prev =>
        prev.map(u => u.uid === user.uid
          ? { ...u, hasAudio: user.hasAudio, hasVideo: user.hasVideo,
              videoTrack: mediaType === 'video' ? null : u.videoTrack }
          : u
        )
      );
    });

    client.on('user-left', (user) => {
      mainUidsRef.current.delete(user.uid);
      setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
    });

    client.on('connection-state-change', setConnectionState);
    client.on('network-quality',         setNetworkQuality);
    client.on('exception',               (e) => console.warn('Agora exception:', e));

    clientRef.current = client;
    return client;
  }, [applyOutputVolume, outputVolume]);

  const loadDevices = useCallback(async () => {
    try {
      const [mics, cams, outputs] = await Promise.all([
        AgoraRTC.getMicrophones(),
        AgoraRTC.getCameras(),
        AgoraRTC.getPlaybackDevices ? AgoraRTC.getPlaybackDevices() : Promise.resolve([]),
      ]);
      setAudioDevices(mics);
      setVideoDevices(cams);
      setOutputDevices(outputs);
      if (mics.length)    setSelectedMic(mics[0].deviceId);
      if (cams.length)    setSelectedCamera(cams[0].deviceId);
      if (outputs.length) setSelectedOutput(outputs[0].deviceId);
    } catch (err) {
      console.error('Failed to load devices:', err);
    }
  }, []);

  const join = useCallback(async (channel) => {
    if (isJoining || clientRef.current?.connectionState === 'CONNECTED') return;
    try {
      setIsJoining(true);
      setError(null);
      const client = initClient();

      // Fetch token for the main client (no UID specified → server picks one)
      const resp = await fetch(`${BACKEND_URL}/api/token?channelName=${channel}`);
      if (!resp.ok) throw new Error('Failed to fetch token.');
      const { token } = await resp.json();

      // Join and capture the UID Agora assigns us
      const uid = await client.join(APP_ID, channel, token, null);
      localUidRef.current = uid;

      dataStreamIdRef.current = true;

      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
        microphoneId: selectedMic || undefined,
        encoderConfig: 'high_quality',
      });
      localAudioTrackRef.current = audioTrack;
      audioTrack.setVolume(localVolume);
      await client.publish(audioTrack);

      setJoined(true);
      setMicEnabled(true);
    } catch (err) {
      setError(err.message || 'Failed to join');
      console.error('Join failed:', err);
    } finally {
      setIsJoining(false);
    }
  }, [initClient, selectedMic, localVolume, isJoining]);

  const leave = useCallback(async () => {
    screenShareEnabledRef.current = false;
    localUidRef.current           = null;
    mainUidsRef.current.clear();
    stopSubtitling();

    try {
      if (localScreenTrackRef.current)      { localScreenTrackRef.current.close(); localScreenTrackRef.current = null; }
      if (localScreenAudioTrackRef.current) { localScreenAudioTrackRef.current.close(); localScreenAudioTrackRef.current = null; }
      if (screenClientRef.current)          { await screenClientRef.current.leave().catch(() => {}); screenClientRef.current = null; }
      if (localVideoTrackRef.current)  {
        await clientRef.current?.unpublish(localVideoTrackRef.current).catch(() => {});
        localVideoTrackRef.current.close(); localVideoTrackRef.current = null;
      }
      if (localAudioTrackRef.current)  { localAudioTrackRef.current.close(); localAudioTrackRef.current = null; }
      await clientRef.current?.leave();
    } catch (e) { console.error('Leave error:', e); }

    setJoined(false); setMicEnabled(true); setCameraEnabled(false);
    setScreenShareEnabled(false); setRemoteUsers([]); setSubtitles([]);
  }, [stopSubtitling]);

  const toggleMic = useCallback(async () => {
    const track = localAudioTrackRef.current;
    if (!track) return;
    await track.setEnabled(!micEnabled);
    setMicEnabled(v => !v);
  }, [micEnabled]);

  const toggleCamera = useCallback(async () => {
    const client = clientRef.current;
    if (!client || client.connectionState !== 'CONNECTED') return;

    if (!cameraEnabled) {
      try {
        const videoTrack = await AgoraRTC.createCameraVideoTrack({
          cameraId:      selectedCamera || undefined,
          encoderConfig: { width: 1280, height: 720, frameRate: 30, bitrateMin: 600, bitrateMax: 1200 },
        });
        localVideoTrackRef.current = videoTrack;
        await client.publish(videoTrack);
        setCameraEnabled(true);
      } catch (err) {
        console.error('Camera failed:', err);
        setError('Camera access denied or unavailable.');
        localVideoTrackRef.current?.close();
        localVideoTrackRef.current = null;
      }
    } else {
      try {
        if (localVideoTrackRef.current) {
          await client.unpublish(localVideoTrackRef.current);
          localVideoTrackRef.current.close();
          localVideoTrackRef.current = null;
        }
        setCameraEnabled(false);
      } catch (err) { console.error('Unpublish camera failed:', err); }
    }
  }, [cameraEnabled, selectedCamera]);

  const stopScreenShare = useCallback(async () => {
    if (!screenShareEnabledRef.current) return;
    screenShareEnabledRef.current = false;
    setScreenShareEnabled(false);

    if (screenClientJoiningRef.current) return;

    const videoTrack    = localScreenTrackRef.current;
    const audioTrack    = localScreenAudioTrackRef.current;
    const clientToLeave = screenClientRef.current;
    localScreenTrackRef.current      = null;
    localScreenAudioTrackRef.current = null;
    screenClientRef.current          = null;

    try {
      const tracksToUnpublish = [videoTrack, audioTrack].filter(Boolean);
      if (tracksToUnpublish.length && clientToLeave) {
        await clientToLeave.unpublish(tracksToUnpublish).catch(() => {});
      }
      videoTrack?.close();
      audioTrack?.close();
      if (clientToLeave) { await clientToLeave.leave().catch(() => {}); }
    } catch (e) { console.error('Screen stop error:', e); }
  }, []);

  const toggleScreenShare = useCallback(async () => {
    console.log("screen share button clicked");
    const client = clientRef.current;
    if (!client || client.connectionState !== 'CONNECTED') return;

    if (!screenShareEnabledRef.current) {
      screenShareEnabledRef.current  = true;
      screenClientJoiningRef.current = true;

      let screenVideoTrack = null;
      let screenAudioTrack = null;
      let screenClient     = null;

      try {
        const screenTracks = await AgoraRTC.createScreenVideoTrack(
          { encoderConfig: '1080p_2', optimizationMode: 'detail' },
          'enable'
        );
        if (Array.isArray(screenTracks)) {
          [screenVideoTrack, screenAudioTrack] = screenTracks;
        } else {
          screenVideoTrack = screenTracks;
        }

        if (!screenShareEnabledRef.current) {
          screenVideoTrack?.close();
          screenAudioTrack?.close();
          screenClientJoiningRef.current = false;
          return;
        }

        const screenUid     = getScreenUid();
        const currentChannel = client.channelName;

        let screenToken = null;
        try {
          const resp = await fetch(
            `${BACKEND_URL}/api/token?channelName=${currentChannel}&uid=${screenUid}`
          );
          if (resp.ok) {
            const data = await resp.json();
            screenToken = data.token;
          } else {
            const resp2 = await fetch(`${BACKEND_URL}/api/token?channelName=${currentChannel}`);
            if (resp2.ok) { const d = await resp2.json(); screenToken = d.token; }
          }
        } catch (tokenErr) {
          throw new Error('Failed to fetch screen share token');
        }

        if (!screenShareEnabledRef.current) {
          screenVideoTrack?.close();
          screenAudioTrack?.close();
          screenClientJoiningRef.current = false;
          return;
        }

        screenClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        await screenClient.join(APP_ID, currentChannel, screenToken, screenUid);

        if (!screenShareEnabledRef.current) {
          screenVideoTrack?.close();
          screenAudioTrack?.close();
          await screenClient.leave().catch(() => {});
          screenClientJoiningRef.current = false;
          return;
        }

        const tracksToPublish = [screenVideoTrack, screenAudioTrack].filter(Boolean);
        await screenClient.publish(tracksToPublish);

        screenVideoTrack.on('track-ended', () => stopScreenShare());

        localScreenTrackRef.current      = screenVideoTrack;
        localScreenAudioTrackRef.current = screenAudioTrack;
        screenClientRef.current          = screenClient;
        screenClientJoiningRef.current   = false;
        setScreenShareEnabled(true);

      } catch (err) {
        screenClientJoiningRef.current = false;
        screenShareEnabledRef.current  = false;

        try { screenVideoTrack?.close(); } catch {}
        try { screenAudioTrack?.close(); } catch {}
        try { await screenClient?.leave(); } catch {}
        localScreenTrackRef.current      = null;
        localScreenAudioTrackRef.current = null;
        screenClientRef.current          = null;

        if (err.code !== 'PERMISSION_DENIED') {
          console.error('Screen share failed:', err);
          setError('Screen share failed. Please try again.');
        }
        setScreenShareEnabled(false);
      }
    } else {
      await stopScreenShare();
    }
  }, [stopScreenShare]);

  const changeMicVolume    = useCallback((vol) => { localAudioTrackRef.current?.setVolume(vol); setLocalVolume(vol); }, []);
  const changeOutputVolume = useCallback((vol) => {
    setRemoteUsers(prev => { prev.forEach(u => applyOutputVolume(u.audioTrack, vol)); return prev; });
    setOutputVolume(vol);
  }, [applyOutputVolume]);

  const switchMic    = useCallback(async (id) => { setSelectedMic(id);    if (localAudioTrackRef.current) await localAudioTrackRef.current.setDevice(id); }, []);
  const switchCamera = useCallback(async (id) => { setSelectedCamera(id); if (localVideoTrackRef.current) await localVideoTrackRef.current.setDevice(id); }, []);

  const getLocalVideoTrack  = useCallback(() => localVideoTrackRef.current,  []);
  const getLocalScreenTrack = useCallback(() => localScreenTrackRef.current, []);

  const playLocalVideo  = useCallback((el) => { const t = localVideoTrackRef.current;  if (t && el) try { t.play(el); } catch {} }, []);
  const playLocalScreen = useCallback((el) => { const t = localScreenTrackRef.current; if (t && el) try { t.play(el); } catch {} }, []);

  useEffect(() => {
    loadDevices();
    return () => { if (clientRef.current?.connectionState === 'CONNECTED') leave(); };
  }, []);

  return {
    joined, micEnabled, cameraEnabled, screenShareEnabled,
    remoteUsers, connectionState, localVolume, outputVolume,
    networkQuality, error, subtitles,
    audioDevices, videoDevices, outputDevices,
    selectedMic, selectedCamera, selectedOutput,
    join, leave, startSubtitling, stopSubtitling,
    toggleMic, toggleCamera, toggleScreenShare, stopScreenShare,
    changeMicVolume, changeOutputVolume,
    switchMic, switchCamera, setSelectedOutput,
    playLocalVideo, playLocalScreen,
    getLocalVideoTrack, getLocalScreenTrack,
    localVideoTrack:  localVideoTrackRef,
    localAudioTrack:  localAudioTrackRef,
    localScreenTrack: localScreenTrackRef,
    localScreenAudioTrack: localScreenAudioTrackRef,
  };
}