const
	echo = console.log,

	fs = require('fs-extra'),
	path = require('path'),
	pwd = path.join(__dirname, ".."),

	// cssLib = path.join(pwd, './webextension/data/css/lib/'),
	jsLib = path.join(pwd, './webextension/data/js/lib/')
;

const {cp} = require("./common/file-operations");
const {error} = require("./common/custom-console");


/**
 *
 * @param {Promise} promise
 * @return {Promise<*>}
 */
async function exceptionHandler(promise) {
	let result;

	try{
		result = await promise;
	} catch(err){
		console.trace();
		error(err);
		process.exit(1);
	}

	return result;
}




async function init() {
	const exist_jsLib = await fs.pathExists(jsLib);

	const _cp = function (src, dest) {
		return exceptionHandler(cp(path.join(pwd, src), dest));
	};

	if(!exist_jsLib){
		error("JS lib folder not found!");
		process.exit(1);
	} else {
		echo("Copying Webextension Polyfill...");
		await _cp("./node_modules/webextension-polyfill/dist/browser-polyfill.js", jsLib);
		await _cp("./node_modules/webextension-polyfill/dist/browser-polyfill.js.map", jsLib);
	}
}
init();
