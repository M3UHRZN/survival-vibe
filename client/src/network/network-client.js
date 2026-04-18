import { Callbacks, Client } from "@colyseus/sdk";
import {
  CLIENT_INPUT_RATE,
  ROOM_NAME,
  SERVER_PORT,
} from "@shared/constants/network.js";
import { CLIENT_MESSAGE_TYPES } from "@shared/messages/message-types.js";
import { createMoveMessage } from "@shared/messages/move-message.js";

export class NetworkClient {
  constructor({ windowRef = window, onStatusChange = null } = {}) {
    this.windowRef = windowRef;
    this.onStatusChange = onStatusChange;

    this.client = null;
    this.room = null;
    this.callbacks = null;
    this.playerSnapshots = new Map();
    this.sessionId = null;
    this.sequence = 0;
    this.lastInputSentAt = Number.NEGATIVE_INFINITY;
  }

  isConnected() {
    return Boolean(this.room);
  }

  async connect({ displayName } = {}) {
    if (this.room) {
      return this.room;
    }

    this.setStatus("connecting", "Connecting");
    this.client = new Client(resolveServerEndpoint(this.windowRef));

    try {
      this.room = await this.client.joinOrCreate(ROOM_NAME, {
        name: displayName || resolveDisplayName(this.windowRef),
      });
    } catch (error) {
      this.clearRoom();
      this.setStatus("offline", "Offline");
      throw error;
    }

    this.callbacks = Callbacks.get(this.room);
    this.sessionId = this.room.sessionId;
    this.bindRoomCallbacks();

    this.room.onLeave((code) => {
      this.clearRoom();
      this.setStatus("offline", `Disconnected (${code})`);
    });

    this.room.onError((code, message) => {
      console.error(`Room error ${code}: ${message}`);
      this.setStatus("error", `Error ${code}`);
    });

    this.setStatus("connected", `Connected (${this.room.id})`);
    return this.room;
  }

  async disconnect() {
    if (!this.room) {
      return;
    }

    const room = this.room;
    this.clearRoom();
    this.setStatus("offline", "Offline");
    await room.leave();
  }

  sendMoveIntent(moveIntent, elapsedTime) {
    if (!this.room) {
      return;
    }

    if (elapsedTime - this.lastInputSentAt < 1 / CLIENT_INPUT_RATE) {
      return;
    }

    this.lastInputSentAt = elapsedTime;
    this.sequence += 1;
    this.room.send(
      CLIENT_MESSAGE_TYPES.MOVE,
      createMoveMessage({
        ...moveIntent,
        seq: this.sequence,
      }),
    );
  }

  getLocalPlayerSnapshot() {
    if (!this.sessionId) {
      return null;
    }

    return this.playerSnapshots.get(this.sessionId) || null;
  }

  getPlayerSnapshots() {
    return [...this.playerSnapshots.values()];
  }

  bindRoomCallbacks() {
    this.callbacks.onAdd("players", (player, sessionId) => {
      const syncSnapshot = () => {
        this.playerSnapshots.set(sessionId, snapshotPlayer(sessionId, player));
      };

      syncSnapshot();
      this.callbacks.onChange(player, syncSnapshot);
    });

    this.callbacks.onRemove("players", (_player, sessionId) => {
      this.playerSnapshots.delete(sessionId);
    });
  }

  clearRoom() {
    if (this.room?.removeAllListeners) {
      this.room.removeAllListeners();
    }

    this.room = null;
    this.callbacks = null;
    this.playerSnapshots.clear();
    this.sessionId = null;
    this.sequence = 0;
    this.lastInputSentAt = Number.NEGATIVE_INFINITY;
  }

  setStatus(kind, label) {
    if (this.onStatusChange) {
      this.onStatusChange({ kind, label });
    }
  }
}

function snapshotPlayer(sessionId, player) {
  return {
    sessionId,
    displayName: player.displayName || "Player",
    x: Number(player.x || 0),
    y: Number(player.y || 0),
    z: Number(player.z || 0),
    rotation: Number(player.rotation || 0),
  };
}

function resolveServerEndpoint(windowRef) {
  const protocol = windowRef.location.protocol === "https:" ? "https" : "http";
  const host = import.meta.env.VITE_SERVER_HOST || windowRef.location.hostname || "localhost";
  const port = import.meta.env.VITE_SERVER_PORT || SERVER_PORT;
  return `${protocol}://${host}:${port}`;
}

function resolveDisplayName(windowRef) {
  const storageKey = "frontier-loop-display-name";
  const existing = windowRef.localStorage?.getItem(storageKey);

  if (existing) {
    return existing;
  }

  const generated = `Survivor-${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`;
  windowRef.localStorage?.setItem(storageKey, generated);
  return generated;
}
