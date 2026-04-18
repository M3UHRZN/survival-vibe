import { Server } from "colyseus";
import { SERVER_PORT, ROOM_NAME } from "../../shared/constants/network.js";
import { SurvivalRoom } from "./rooms/SurvivalRoom.js";

const port = Number(process.env.PORT || SERVER_PORT);

// Colyseus 0.17 manages its own HTTP server via the better-call adapter.
// Do NOT pass a custom createServer — it conflicts with better-call's request
// handling and causes ERR_HTTP_HEADERS_SENT on every matchmaking request.
const gameServer = new Server();

gameServer.define(ROOM_NAME, SurvivalRoom);
gameServer.listen(port);

console.log(`Gemini Play server listening on http://localhost:${port}`);
