import { useCallback, useEffect, useState } from 'react';

export type MicrophonePermissionState = 'unknown' | 'prompt' | 'granted' | 'denied' | 'unsupported';

function hasPermissionsApi(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.permissions?.query;
}

export function useMicrophonePermission() {
  const [permissionState, setPermissionState] = useState<MicrophonePermissionState>('unknown');

  const refreshPermission = useCallback(async (): Promise<MicrophonePermissionState> => {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setPermissionState('unsupported');
      return 'unsupported';
    }

    if (!hasPermissionsApi()) {
      setPermissionState('unknown');
      return 'unknown';
    }

    try {
      const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      const next = status.state as MicrophonePermissionState;
      setPermissionState(next);
      return next;
    } catch {
      setPermissionState('unknown');
      return 'unknown';
    }
  }, []);

  useEffect(() => {
    refreshPermission();
  }, [refreshPermission]);

  return {
    permissionState,
    refreshPermission,
    isDenied: permissionState === 'denied',
    isGranted: permissionState === 'granted',
    isPrompt: permissionState === 'prompt',
    isUnsupported: permissionState === 'unsupported',
  };
}
