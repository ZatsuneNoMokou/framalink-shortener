const
	packageJson = require('../package.json'),
	fs = require("fs-extra"),
	path = require("path"),
	pwd = path.join(__dirname, ".."),

	{ execSync } = require('./common/custom-child-process')(pwd),

	{modifyFile, modifyFiles} = require("./common/file-operations"),
	echo = console.log,
	{error, warning, info, success} = require("./common/custom-console"),

	through2 = require('through2'),
	stripDebug = require('strip-debug'), //TODO /!\ Using my rocambole fork hoping update https://github.com/millermedeiros/rocambole/issues/32

	yargs = require('yargs')
		.usage('Usage: $0 [options]')

		.option('p', {
			"alias": ['prod','production'],
			"description": 'Do stable release',
			"type": "boolean"
		})
		.fail(function (msg, err, yargs) {
			if(msg==="yargs error"){
				console.error(yargs.help());
			}

			/*if(err){// preserve stack
				throw err;
			}*/

			process.exit(1)
		})

		.help('h')
		.alias('h', 'help')
		.argv
;

/**
 *
 * @param {String} msg
 */
function throwException(msg) {
	console.trace();
	error(msg);
	process.exit(1);
}

/**
 *
 * @param {Promise} promise
 * @return {Promise<*>}
 */
function errorHandler(promise) {
	promise.catch(err=>{
		throwException.call(this, err);
	});
	return promise;
}


async function init() {
	if(await fs.pathExists(path.join(pwd, `./framalink_shortener${(yargs.prod === true)? '' : '_dev_'}-${packageJson.version}.zip`))){
		throwException(`Zip package already exist for version ${packageJson.version}!`);
	}



	const tmpPath = path.join(pwd, "./tmp");
	if (await fs.pathExists(tmpPath)) {
		warning("Temporary folder already exist, deleting...");
		await errorHandler(fs.remove(tmpPath));
	}
	await errorHandler(fs.mkdir(tmpPath));

	echo("Copying into tmp folder");
	try {
		fs.copySync(path.join(pwd, "./webextension"), tmpPath);
	} catch (e) {
		error(e);
	}

	if (yargs.prod === true) {
		echo("Ready to clean files!");

		let excludeDirString = "data/js/lib";
		if(process.platform==="win32"){
			excludeDirString = "data\\js\\lib";
		}



		const excludeDirAndJsFilter = through2.obj(function (item, enc, next) {
			if(item.path.indexOf(excludeDirString) === -1 && item.stats.isFile() && path.extname(item.path) === `.js`){
				this.push(item)
			}
			next()
		});

		await modifyFiles(tmpPath, function (data, filePath) {
			try {
				data = stripDebug(data).toString();
			} catch (err) {
				console.trace();
				info(filePath);
				error(err);
				process.exit(1);
			}
			return data;
		}, excludeDirAndJsFilter)
			.catch(err => {
				console.trace();
				info(filePath);
				error(err);
				process.exit(1);
			})
		;

		await errorHandler(modifyFile(path.join(tmpPath, './manifest.json'), function (data) {
			data.applications.gecko.id = 'framalinkshortener@zatsunenomokou.eu';
			delete data.applications.gecko.update_url;

			data.name = "Framalink shortener";
			data.short_name = "FramalinkShortener";

			return data;
		}, "json"));
	}

	try{
		execSync("web-ext build --artifacts-dir ./ --source-dir ./tmp", true);
	} catch (e){
		error(e);
	}

	await errorHandler(fs.remove(tmpPath));
}

errorHandler(init());
