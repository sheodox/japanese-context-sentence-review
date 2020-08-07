import {Router, Response} from 'express';
import {tracker} from '../util/tracker';
import {getUserId, requireAuth, Request} from "./routeHelpers";
import {broadcastToUser} from '../util/server-socket';

const router = Router();
router.use(requireAuth);

//send an updated phrase list to user's connected client(s) over websocket if the list changes
const sendListToUser = async (req: Request) => {
		const userId = getUserId(req);
		broadcastToUser(userId, 'list', await tracker.list(userId))
	},
	//send nothing in response, but broadcast the list to the user, used when the response isn't
	//important, but the phrase list for the user has changed
	defaultResponse = async (req: Request, res: Response) => {
		res.json({});
		sendListToUser(req);
	}

async function addHandler(req: Request, res: Response) {
	const phraseText = req.params.phrases || (typeof req.body === 'object' ? req.body.phraseText : ''),
		addedPhrases = await tracker.add(getUserId(req), phraseText);

	sendListToUser(req);

	//return only the phrases that were added for the userscript. it will show
	//them individually and show delete buttons for each phrase to undo adding
	if (req.query.diff === 'true') {
		res.json(addedPhrases);
	}
		//allow versioning by extension if incompatible responses are expected
	// in the future this number can be incremented
	else if (req.query.extension) {
		res.json({
			addedPhrases,
			stats: {
				totalPhrases: (await tracker.list(getUserId(req))).length
			}
		})
	}
	else {
		res.send();
	}
}
router.get('/add/:phrases', addHandler);
router.post('/add/', addHandler);

router.get('/list', async (req: Request, res: Response) => {
	res.json(await tracker.list(getUserId(req)));
});

router.get('/remove/:id', async (req: Request, res: Response) => {
	await tracker.remove(getUserId(req), req.params.id);
	defaultResponse(req, res);
});

// remove as a POST is a batch operation, it expects an array of phrase IDs to be sent as the body
router.post('/remove', async (req: Request, res: Response) => {
	await tracker.remove(getUserId(req), req.body);
	defaultResponse(req, res);
});

router.get('/undo', async (req: Request, res: Response) => {
	await tracker.undo(getUserId(req));
	defaultResponse(req, res);
});

router.get('/hide/:id', async (req: Request, res: Response) => {
	await tracker.hide(getUserId(req), req.params.id);
	defaultResponse(req, res);
})

router.get('/show-all', async (req: Request, res: Response) => {
	await tracker.showAll(getUserId(req));
	defaultResponse(req, res);
})

module.exports = router;