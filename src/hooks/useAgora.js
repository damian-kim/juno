import AgoraRTC from 'agora-rtc-sdk-ng';
import { useCallback, useEffect, useRef, useState } from 'react';

// AgoraRTC config
AgoraRTC.setLogLevel(4); // silent in production

const APP_ID = import.meta.env.VITE_AGORA_APP_ID || 'YOUR_AGORA_APP_ID';

export function useAgora() {
  const clientRef = useRef(null);
  const screenClientRef = useRef(null);

  // Track refs
  const localAudioTrackRef = useRef(null);
  const localVideoTrackRef = useRef(null);
  const localScreenTrackRef = useRef(null);

  // State
  const [joined, setJoined] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [screenShareEnabled, setScreenShareEnabled] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [connectionState, setConnectionState] = useState('DISCONNECTED');
  const [localVolume, setLocalVolume] = useState(80);
  const [outputVolume, setOutputVolume] = useState(100);
  const [networkQuality, setNetworkQuality] = useState(null);
  const [error, setError] = useState(null);

  // Device state
  const [audioDevices, setAudioDevices] = useState([]);
  const [videoDevices, setVideoDevices] = useState([]);
  const [outputDevices, setOutputDevices] = useState([]);
  const [selectedMic, setSelectedMic] = useState('');
  const [selectedCamera, setSelectedCamera] = useState('');
  const [selectedOutput, setSelectedOutput] = useState('');

  // Initialize client
  const initClient = useCallback(() => {
    if (clientRef.current) return clientRef.current;

    const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

    client.on('user-published', async (user, mediaType) => {
      await client.subscribe(user, mediaType);
      if (mediaType === 'audio') {
        user.audioTrack?.play();
        applyOutputVolume(user.audioTrack, outputVolume);
      }
      setRemoteUsers(prev => {
        const exists = prev.find(u => u.uid === user.uid);
        if (exists) return prev.map(u => u.uid === user.uid ? { ...user, hasAudio: user.hasAudio, hasVideo: user.hasVideo } : u);
        return [...prev, user];
      });
    });

    client.on('user-unpublished', (user, mediaType) => {
      setRemoteUsers(prev => prev.map(u => u.uid === user.uid ? { ...u, hasAudio: user.hasAudio, hasVideo: user.hasVideo } : u));
    });

    client.on('user-left', (user) => {
      setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
    });

    client.on('connection-state-change', (state) => {
      setConnectionState(state);
    });

    client.on('network-quality', (stats) => {
      setNetworkQuality(stats);
    });

    client.on('exception', (e) => {
      console.warn('Agora exception:', e);
    });

    clientRef.current = client;
    return client;
  }, [outputVolume]);

  const applyOutputVolume = (audioTrack, vol) => {
    if (audioTrack && typeof audioTrack.setVolume === 'function') {
      audioTrack.setVolume(vol);
    }
  };

  // Load devices
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
      if (mics.length > 0) setSelectedMic(mics[0].deviceId);
      if (cams.length > 0) setSelectedCamera(cams[0].deviceId);
      if (outputs.length > 0) setSelectedOutput(outputs[0].deviceId);
    } catch (err) {
      console.error('Failed to load devices:', err);
    }
  }, []);

  // Join a channel
  const join = useCallback(async (channel, token = null, uid = null) => {
    try {
      setError(null);
      const client = initClient();

      await client.join(APP_ID, channel, token, uid);

      // Create audio track
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
      setError(err.message || 'Failed to join channel');
      console.error('Join failed:', err);
    }
  }, [initClient, selectedMic, localVolume]);

  // Leave channel
  const leave = useCallback(async () => {
    localAudioTrackRef.current?.close();
    localVideoTrackRef.current?.close();
    localScreenTrackRef.current?.close();
    localAudioTrackRef.current = null;
    localVideoTrackRef.current = null;
    localScreenTrackRef.current = null;

    await clientRef.current?.leave();
    await screenClientRef.current?.leave();
    screenClientRef.current = null;

    setJoined(false);
    setMicEnabled(true);
    setCameraEnabled(false);
    setScreenShareEnabled(false);
    setRemoteUsers([]);
  }, []);

  // Toggle mic
  const toggleMic = useCallback(async () => {
    const track = localAudioTrackRef.current;
    if (!track) return;
    await track.setEnabled(!micEnabled);
    setMicEnabled(v => !v);
  }, [micEnabled]);

  // Toggle camera
  const toggleCamera = useCallback(async () => {
    const client = clientRef.current;
    if (!client || !joined) return;

    if (!cameraEnabled) {
      try {
        const videoTrack = await AgoraRTC.createCameraVideoTrack({
          cameraId: selectedCamera || undefined,
          encoderConfig: { width: 1280, height: 720, frameRate: 30, bitrateMax: 2000 },
        });
        localVideoTrackRef.current = videoTrack;
        await client.publish(videoTrack);
        setCameraEnabled(true);
      } catch (err) {
        setError('Camera access denied');
      }
    } else {
      await client.unpublish(localVideoTrackRef.current);
      localVideoTrackRef.current?.close();
      localVideoTrackRef.current = null;
      setCameraEnabled(false);
    }
  }, [cameraEnabled, joined, selectedCamera]);

  // Toggle screen share
  const toggleScreenShare = useCallback(async () => {
    if (!joined) return;

    if (!screenShareEnabled) {
      try {
        const screenTrack = await AgoraRTC.createScreenVideoTrack({
          encoderConfig: '1080p_1',
          optimizationMode: 'detail',
        }, 'disable');

        // Use a dedicated client for screen share
        const screenClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        await screenClient.join(APP_ID, clientRef.current._channelName, null, `screen_${Date.now()}`);
        await screenClient.publish(screenTrack);

        screenTrack.on('track-ended', () => {
          toggleScreenShare();
        });

        localScreenTrackRef.current = screenTrack;
        screenClientRef.current = screenClient;
        setScreenShareEnabled(true);
      } catch (err) {
        if (err.code !== 'PERMISSION_DENIED') {
          setError('Screen share failed');
        }
      }
    } else {
      await screenClientRef.current?.unpublish(localScreenTrackRef.current);
      localScreenTrackRef.current?.close();
      localScreenTrackRef.current = null;
      await screenClientRef.current?.leave();
      screenClientRef.current = null;
      setScreenShareEnabled(false);
    }
  }, [screenShareEnabled, joined]);

  // Change mic volume
  const changeMicVolume = useCallback((vol) => {
    localAudioTrackRef.current?.setVolume(vol);
    setLocalVolume(vol);
  }, []);

  // Change output volume
  const changeOutputVolume = useCallback((vol) => {
    remoteUsers.forEach(user => {
      applyOutputVolume(user.audioTrack, vol);
    });
    setOutputVolume(vol);
  }, [remoteUsers]);

  // Switch mic device
  const switchMic = useCallback(async (deviceId) => {
    setSelectedMic(deviceId);
    if (localAudioTrackRef.current) {
      await localAudioTrackRef.current.setDevice(deviceId);
    }
  }, []);

  // Switch camera device
  const switchCamera = useCallback(async (deviceId) => {
    setSelectedCamera(deviceId);
    if (localVideoTrackRef.current) {
      await localVideoTrackRef.current.setDevice(deviceId);
    }
  }, []);

  // Play local video in element
  const playLocalVideo = useCallback((element) => {
    if (localVideoTrackRef.current && element) {
      localVideoTrackRef.current.play(element);
    }
  }, []);

  // Play local screen in element
  const playLocalScreen = useCallback((element) => {
    if (localScreenTrackRef.current && element) {
      localScreenTrackRef.current.play(element);
    }
  }, []);

  useEffect(() => {
    loadDevices();
    return () => {
      if (joined) leave();
    };
  }, []);

  return {
    // State
    joined,
    micEnabled,
    cameraEnabled,
    screenShareEnabled,
    remoteUsers,
    connectionState,
    localVolume,
    outputVolume,
    networkQuality,
    error,
    // Devices
    audioDevices,
    videoDevices,
    outputDevices,
    selectedMic,
    selectedCamera,
    selectedOutput,
    // Actions
    join,
    leave,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    changeMicVolume,
    changeOutputVolume,
    switchMic,
    switchCamera,
    setSelectedOutput,
    // Refs
    playLocalVideo,
    playLocalScreen,
    localVideoTrack: localVideoTrackRef,
    localAudioTrack: localAudioTrackRef,
  };
}
