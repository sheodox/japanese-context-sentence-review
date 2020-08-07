import cookie from 'cookie';
import {tracker} from './tracker';
import cookieParser from 'cookie-parser';
import {Request} from '../routes/routeHelpers';
import {Server} from 'ws';
import {Store} from 'express-session';
import WebSocket = require('ws');

//userSessions is a map of user ID to an array of socket objects
const userSessions = new Map();

export function broadcastToUser(userId: string, channel: string, data: any) {
	const sockets = userSessions.get(userId);
	if (sockets) {
		for (const socket of sockets) {
			socket.send(JSON.stringify([channel, data]));
		}
	}
}

//add/removeUserSession methods maintain a map of user IDs to socket connections, so we can efficiently
//send messages to all of a user's connected clients
function addUserSession(userId: string, ws: WebSocket) {
	if (!userId) {
		return;
	}

	if (userSessions.has(userId)) {
		userSessions.get(userId).push(ws);
	}
	else {
		userSessions.set(userId, [ws]);
	}
}

function removeUserSession(userId: string, ws: WebSocket) {
	if (!userId) {
		return;
	}

	// if there was never a session somehow, ignore it
	if (userSessions.has(userId)) {
		const sessions = userSessions.get(userId),
			index = sessions.indexOf(ws);
		if (index > -1) {
			sessions.splice(index, 1);
		}

		//clear this user's array of sessions if that was the last connection
		if (!sessions.length) {
			userSessions.delete(userId);
		}
	}
}

async function getUserIdFromReq(req: Request, sessionStore: Store): Promise<string> {
	return new Promise((resolve, reject) => {
		const cookieHeader = req.headers.cookie,
			sid = cookieParser.signedCookie(cookie.parse(cookieHeader)['connect.sid'], process.env.SESSION_SECRET);
		if (typeof sid === 'string') {
			sessionStore.get(sid, (err, session) => {
				err ? reject(err) : resolve(session.passport.user.user_id);
			})
		}
		else {
		    //no session id present, so there's no user. the socket will get terminated
			resolve('');
		}
	})
}

async function handleChannelMessage(
	userId: string,
	send: (channel: string, data: any) => any,
	channel: string,
	data: any
) {
	switch (channel) {
		case 'list':
			send('list', await tracker.list(userId))
			break;
	}
}

module.exports = {
	broadcastToUser,
	initialize: (wss: Server, sessionStore: Store) => {
		wss.on('connection', async (ws: WebSocket, req: Request) => {
			try {
				const userId = await getUserIdFromReq(req, sessionStore);
				if (!userId) {
					ws.terminate();
					return;
				}
				addUserSession(userId, ws);

				function send(channel: string, data: any = null) {
					ws.send(
						JSON.stringify([channel, data])
					);
				}

				ws.on('close', () => {
					removeUserSession(userId, ws);
				});

				ws.on('message', (msg: string) => {
					if (msg === 'ping') {
						ws.send('pong');
						return;
					}
					try {
						const [channel, data] = JSON.parse(msg);
						handleChannelMessage(userId, send, channel, data);
					} catch (e) {
						console.error(`Error parsing or processing websocket message: ${msg}`, e);
					}
				});
			} catch (e) {
				ws.terminate();
			}
		})
	}
}