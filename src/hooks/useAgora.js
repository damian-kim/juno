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

  const initClient = useCallback(() => {
    if (clientRef.current) return clientRef.current;

    const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

    client.on('user-published', async (user, mediaType) => {
      // ── CRITICAL FIX ─────────────────────────────────────────────────────────
      // Skip our own screen-share UID. If the main client tries to subscribe to
      // its own screen track:
      //   1. Agora opens a redundant WebSocket → "closed before established" error
      //   2. The internal renderer hits an uninitialized player object → "Cannot
      //      read properties of undefined (reading 'current')" crash
      // We use a FIXED, KNOWN screen UID (localUid + SCREEN_UID_OFFSET) so we can
      // filter it reliably without waiting for an async uid lookup.
      const screenUid = getScreenUid();
      if (screenUid !== null && user.uid === screenUid) return;
      // ─────────────────────────────────────────────────────────────────────────

      await client.subscribe(user, mediaType);

      if (mediaType === 'audio') {
        user.audioTrack?.play();
        applyOutputVolume(user.audioTrack, outputVolume);
      }

      setRemoteUsers(prev => {
        const exists = prev.find(u => u.uid === user.uid);
        const updated = {
          uid:        user.uid,
          hasAudio:   user.hasAudio,
          hasVideo:   user.hasVideo,
          videoTrack: user.videoTrack,
          audioTrack: user.audioTrack,
        };
        if (exists) return prev.map(u => u.uid === user.uid ? updated : u);
        return [...prev, updated];
      });
    });

    client.on('user-unpublished', (user, mediaType) => {
      const screenUid = getScreenUid();
      if (screenUid !== null && user.uid === screenUid) return;

      setRemoteUsers(prev =>
        prev.map(u => u.uid === user.uid
          ? { ...u, hasAudio: user.hasAudio, hasVideo: user.hasVideo,
              videoTrack: mediaType === 'video' ? null : u.videoTrack }
          : u
        )
      );
    });

    client.on('user-left', (user) => {
      const screenUid = getScreenUid();
      if (screenUid !== null && user.uid === screenUid) return;
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

    try {
      if (localScreenTrackRef.current) { localScreenTrackRef.current.close(); localScreenTrackRef.current = null; }
      if (screenClientRef.current)     { await screenClientRef.current.leave().catch(() => {}); screenClientRef.current = null; }
      if (localVideoTrackRef.current)  {
        await clientRef.current?.unpublish(localVideoTrackRef.current).catch(() => {});
        localVideoTrackRef.current.close(); localVideoTrackRef.current = null;
      }
      if (localAudioTrackRef.current)  { localAudioTrackRef.current.close(); localAudioTrackRef.current = null; }
      await clientRef.current?.leave();
    } catch (e) { console.error('Leave error:', e); }

    setJoined(false); setMicEnabled(true); setCameraEnabled(false);
    setScreenShareEnabled(false); setRemoteUsers([]);
  }, []);

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

    if (screenClientJoiningRef.current) return; // Pipeline will self-clean

    const trackToClose  = localScreenTrackRef.current;
    const clientToLeave = screenClientRef.current;
    localScreenTrackRef.current = null;
    screenClientRef.current     = null;

    try {
      if (trackToClose)  { await clientToLeave?.unpublish(trackToClose).catch(() => {}); trackToClose.close(); }
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

      let screenTrack  = null;
      let screenClient = null;

      try {
        // Step 1: Browser screen picker (throws PERMISSION_DENIED if cancelled)
        screenTrack = await AgoraRTC.createScreenVideoTrack(
          { encoderConfig: '1080p_1', optimizationMode: 'detail' },
          'disable'
        );
        if (!screenShareEnabledRef.current) { screenTrack.close(); screenClientJoiningRef.current = false; return; }

        // Step 2: Compute a fixed screen UID and request a token FOR THAT UID.
        // This is the root fix — the token must match the UID passed to join().
        // Passing null UID + a token scoped to uid=0 works on some servers but
        // fails on others, causing the WebSocket to die mid-handshake.
        const screenUid     = getScreenUid();
        const currentChannel = client.channelName;

        // Request a token specifically for the screen UID.
        // Your backend /api/token endpoint must accept an optional `uid` param.
        // If it doesn't yet, fall back to a token-less join (works with app-mode
        // tokens but not with uid-scoped tokens — update your backend if needed).
        let screenToken = null;
        try {
          const resp = await fetch(
            `${BACKEND_URL}/api/token?channelName=${currentChannel}&uid=${screenUid}`
          );
          if (resp.ok) {
            const data = await resp.json();
            screenToken = data.token;
          } else {
            // Backend doesn't support uid param yet — fall back to unscoped token
            const resp2 = await fetch(`${BACKEND_URL}/api/token?channelName=${currentChannel}`);
            if (resp2.ok) { const d = await resp2.json(); screenToken = d.token; }
          }
        } catch (tokenErr) {
          throw new Error('Failed to fetch screen share token');
        }

        if (!screenShareEnabledRef.current) { screenTrack.close(); screenClientJoiningRef.current = false; return; }

        // Step 3: Join with the FIXED screenUid so our filter in user-published works
        screenClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        await screenClient.join(APP_ID, currentChannel, screenToken, screenUid);

        if (!screenShareEnabledRef.current) {
          screenTrack.close();
          await screenClient.leave().catch(() => {});
          screenClientJoiningRef.current = false;
          return;
        }

        await screenClient.publish(screenTrack);

        screenTrack.on('track-ended', () => stopScreenShare());

        localScreenTrackRef.current    = screenTrack;
        screenClientRef.current        = screenClient;
        screenClientJoiningRef.current = false;
        setScreenShareEnabled(true);

      } catch (err) {
        screenClientJoiningRef.current = false;
        screenShareEnabledRef.current  = false;

        try { screenTrack?.close(); }         catch {}
        try { await screenClient?.leave(); }  catch {}
        localScreenTrackRef.current = null;
        screenClientRef.current     = null;

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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    joined, micEnabled, cameraEnabled, screenShareEnabled,
    remoteUsers, connectionState, localVolume, outputVolume,
    networkQuality, error,
    audioDevices, videoDevices, outputDevices,
    selectedMic, selectedCamera, selectedOutput,
    join, leave,
    toggleMic, toggleCamera, toggleScreenShare, stopScreenShare,
    changeMicVolume, changeOutputVolume,
    switchMic, switchCamera, setSelectedOutput,
    playLocalVideo, playLocalScreen,
    getLocalVideoTrack, getLocalScreenTrack,
    localVideoTrack:  localVideoTrackRef,
    localAudioTrack:  localAudioTrackRef,
    localScreenTrack: localScreenTrackRef,
  };
}