import fs from "fs";
import path from "path";
import { logger } from "../utils/logger.js";

export interface SystemSettings {
  maintenanceMode: boolean;
  updatedAt: string;
}

const SETTINGS_DIR = path.join(process.cwd(), "server", "data");
const SETTINGS_FILE = path.join(SETTINGS_DIR, "system_settings.json");

let cachedSettings: SystemSettings | null = null;

function ensureDirectoryExists() {
  try {
    if (!fs.existsSync(SETTINGS_DIR)) {
      fs.mkdirSync(SETTINGS_DIR, { recursive: true });
    }
  } catch (err: any) {
    logger.warn({ err: err?.message }, "Could not ensure server data directory exists");
  }
}

export function getSystemSettings(): SystemSettings {
  if (cachedSettings) {
    return cachedSettings;
  }

  ensureDirectoryExists();

  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const content = fs.readFileSync(SETTINGS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (typeof parsed.maintenanceMode === "boolean") {
        cachedSettings = {
          maintenanceMode: parsed.maintenanceMode,
          updatedAt: parsed.updatedAt || new Date().toISOString(),
        };
        return cachedSettings;
      }
    }
  } catch (err: any) {
    logger.warn({ err: err?.message }, "Failed to load system settings from disk, using defaults");
  }

  cachedSettings = {
    maintenanceMode: false,
    updatedAt: new Date().toISOString(),
  };
  return cachedSettings;
}

export function getMaintenanceMode(): boolean {
  return getSystemSettings().maintenanceMode;
}

export function setMaintenanceMode(enabled: boolean): boolean {
  ensureDirectoryExists();
  const settings: SystemSettings = {
    maintenanceMode: Boolean(enabled),
    updatedAt: new Date().toISOString(),
  };

  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
    cachedSettings = settings;
    logger.info({ maintenanceMode: enabled }, "System maintenance mode updated and persisted to disk");
    return true;
  } catch (err: any) {
    logger.error({ err: err?.message }, "Failed to write system settings to disk");
    cachedSettings = settings;
    return false;
  }
}
