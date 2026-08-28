import { useState, useCallback, useEffect } from 'react';
import { safeLocalStorage } from '../../utils/safeStorage.js';

interface UseAdminControlsOptions {
  maintenanceMode?: boolean;
  onMaintenanceModeChange?: (active: boolean) => void;
  addLog: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export function useAdminControls({
  maintenanceMode,
  onMaintenanceModeChange,
  addLog,
}: UseAdminControlsOptions) {
  const [adminPasscode, setAdminPasscode] = useState<string>(() => {
    return safeLocalStorage.getItem('triton_admin_passcode') || '5252';
  });

  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem('triton_admin_unlocked') === 'true';
  });

  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [passcodeSuccessMessage, setPasscodeSuccessMessage] = useState('');

  const [maintenanceModeState, setMaintenanceModeState] = useState<boolean>(() => {
    if (typeof maintenanceMode === 'boolean') return maintenanceMode;
    return safeLocalStorage.getItem('triton_maintenance_mode') === 'true';
  });

  useEffect(() => {
    if (typeof maintenanceMode === 'boolean') {
      setMaintenanceModeState(maintenanceMode);
    }
  }, [maintenanceMode]);

  const handleVerifyPasscode = useCallback(
    (codeToVerify?: string) => {
      const code = (codeToVerify !== undefined ? codeToVerify : passcodeInput).trim();
      if (code === adminPasscode) {
        setIsUnlocked(true);
        sessionStorage.setItem('triton_admin_unlocked', 'true');
        setPasscodeError('');
        setPasscodeInput('');
        addLog('Admin authentication successful.', 'success');
        return true;
      } else {
        setPasscodeError('Invalid administrative passcode. Access denied.');
        addLog('Failed admin passcode verification attempt.', 'error');
        return false;
      }
    },
    [passcodeInput, adminPasscode, addLog]
  );

  const handleUpdatePasscode = useCallback(
    (newPasscode: string) => {
      if (newPasscode.length < 4) {
        setPasscodeError('Passcode must be at least 4 characters long.');
        return false;
      }
      setAdminPasscode(newPasscode);
      safeLocalStorage.setItem('triton_admin_passcode', newPasscode);
      setPasscodeSuccessMessage('Admin passcode updated successfully.');
      setTimeout(() => setPasscodeSuccessMessage(''), 3000);
      addLog('Administrative security passcode updated.', 'info');
      return true;
    },
    [addLog]
  );

  const handleToggleMaintenance = useCallback(
    (enabled: boolean) => {
      setMaintenanceModeState(enabled);
      safeLocalStorage.setItem('triton_maintenance_mode', enabled ? 'true' : 'false');
      if (onMaintenanceModeChange) {
        onMaintenanceModeChange(enabled);
      }
      addLog(`Maintenance mode ${enabled ? 'ENABLED - Public store hidden' : 'DISABLED - Public store live'}.`, 'warning');
    },
    [onMaintenanceModeChange, addLog]
  );

  const handleLogout = useCallback(() => {
    setIsUnlocked(false);
    sessionStorage.removeItem('triton_admin_unlocked');
    addLog('Administrator signed out.', 'info');
  }, [addLog]);

  return {
    adminPasscode,
    isUnlocked,
    setIsUnlocked,
    passcodeInput,
    setPasscodeInput,
    passcodeError,
    setPasscodeError,
    passcodeSuccessMessage,
    maintenanceModeState,
    handleVerifyPasscode,
    handleUpdatePasscode,
    handleToggleMaintenance,
    handleLogout,
  };
}
