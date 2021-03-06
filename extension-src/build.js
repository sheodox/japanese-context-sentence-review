const fs = require('fs'),
	sharp = require('sharp'),
	path = require('path');

module.exports = isProd => {
	//ensure all the directories we need exist
	['./extension', './extension/icons', './extension/settings'].forEach(p => {
		try {
			fs.mkdirSync(p)
			//ignore errors where th path already exists
		}catch(e) {}
	});

	//create some resized logos
	[16, 32, 48, 96, 128].forEach(px => {
		sharp('./public-src/favicon.png')
			.resize(px)
			.toFile(`./extension/icons/context-reviews-${px}.png`)
	});

	//copy files that have no webpack build
	['manifest.json', 'settings/settings.html']
		.forEach(file => {
			fs.copyFileSync(
				path.join('./extension-src', file),
				path.join('./extension', file)
			)
		});

	//change the server hostname based on dev vs prod
	['background.js', 'phrase-stasher.js'].forEach(file => {
		const filePath = path.join('./extension', file),
			script = fs
				.readFileSync(filePath)
				.toString()
				.replace(/--server--/g, isProd ?
					'https://context.reviews' : 'http://dev.context.reviews'
				)
				.replace(/--server-websocket--/g, isProd ?
					'wss://context.reviews' : 'ws://dev.context.reviews'
				);
		fs.writeFileSync(filePath, script);
	})

	console.log(`extension built (prod? ${isProd})`);
}
