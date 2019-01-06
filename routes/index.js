const express = require('express'),
    router = express.Router(),
    tracker = require('../util/tracker'),
    lookup = require('../util/definition-lookup');
let io;

function refresh() {
    io.emit('refresh', tracker.list());
}

/**
 * send node modules files 
 */
router.get('/module/:name', (req, res, next) => {
    const modules = {
        'handlebars.js' : 'node_modules/handlebars/dist/handlebars.runtime.js'
    },
        requested = modules[req.params.name];
    if (requested) {
        res.sendfile(requested)
    }
    else {
        next();
    }
});

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index', { title: 'Japanese Context Sentence Review'});
});

router.get('/add/:phrase', (req, res) => {
    tracker.add(req.params.phrase);
    res.json(tracker.list());
    refresh();
});

router.get('/list', (req, res) => {
    res.json(tracker.list());
});

router.get('/remove/:id', (req, res) => {
    tracker.remove(req.params.id);
    res.json(tracker.list());
    refresh();
});

router.get('/undo', (req, res) => {
    tracker.undo();
    res.json(tracker.list());
    refresh();
});

router.get('/lookup/jisho/:word', async (req, res) => {
    const word = req.params.word,
        jishoResults = await lookup.jisho.search(word);
    if (jishoResults.length) {
        res.json(
            {source: 'Jisho', data: jishoResults}
        );
    }
    else {
        res.json({
            source: 'Jisho', data: [{word: 'No results', definitions: [`No definitions found for ${word}`]}]
        });
    }
});

router.get('/lookup/goo/:word', async (req, res) => {
    const word = req.params.word,
        //the jisho search should be cached
        jishoResults = await lookup.jisho.search(word);
    if (jishoResults.length) {
        const gooResults = await lookup.goo.search(jishoResults[0].word);
        res.json(
            {source: 'Goo辞書', data: gooResults}
        );
    }
    else {
        res.json({
            source: 'Goo辞書', data: [{word: 'No results', definitions: [`No definitions found for ${word}`]}]
        })
    }
});

module.exports = (sio) => {
    io = sio;
    io.on('connection', socket => {
        socket.on('remove', id => {
            tracker.remove(id);
            refresh();
        });

        socket.on('list', () => {
            socket.emit('refresh', tracker.list());
        });
        
        socket.on('undo', () => {
            tracker.undo();
            refresh();
        })
    });
    
    return router;
};
