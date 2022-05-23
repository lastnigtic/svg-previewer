import Koa, { Context } from 'koa';
import fs from 'fs';
import Router from '@koa/router';
import path from 'path';
import openInBrowser from 'open';

const PORT = 8132;

const app = new Koa();
const router = new Router();

const dirName = __dirname;
const cwd = process.cwd();
let previewPath = cwd;
let relativePath = '';

router.get('/svg', async (ctx, next) => {
	const names = fs.readdirSync(previewPath);
	const uris = [];
	for (let name of names) {
		if (/\.svg/.test(name)) {
			uris.push(`/fs/${relativePath}/${name}`);
		}
	}

	ctx.body = {
		uris,
	};

	await next();
});

router.get('/fs/(.*)', async (ctx, next) => {
	const realPath = ctx.path.split('/fs/')[1];
	if (!/\.svg/.test(realPath)) return next();
	ctx.res.setHeader('content-type', 'image/svg+xml');

	const readStream = fs.createReadStream(path.join(cwd, decodeURIComponent(realPath)));
	ctx.res.writeHead(200);
	ctx.body = readStream;
	await next();
});

router.del('/rm', async (ctx, next) => {
	let reqStr = '';
	await new Promise((resolve) => {
		const read = (chunk: Buffer) => {
			reqStr += chunk.toString();
		};

		ctx.req.on('data', read);
		ctx.req.on('end', resolve);
	});

	const json = JSON.parse(reqStr);
	if (!json.uri) return next();
	fs.unlinkSync(path.join(cwd, `${json.uri.split('/fs/')[1]}`));
	ctx.res.writeHead(200);
	await next();
});

const getWebResource = async (ctx: Context, next: Koa.Next) => {
	let filepath = ctx.path;
	if (!/\//.test(filepath) && !/\/resource/.test(filepath)) return;
	if (filepath === '/') filepath = 'static/index.html';
	filepath = filepath.replace(/\/resource/, '');

	let contentType = 'text/html';
	if (/\.js$/.test(filepath)) contentType = 'text/javascript';
	else if (/\.css/.test(filepath)) contentType = 'text/css';

	ctx.res.setHeader('content-type', contentType);

	const readStream = fs.createReadStream(path.join(dirName, '..', filepath));

	ctx.res.writeHead(200);
	ctx.body = readStream;
	await next();
};

router.get('/resource/(.*)', getWebResource);
router.get('/', getWebResource);

const startServer = ({ directory, open }: { directory: string; open: boolean }) => {
	previewPath = path.join(cwd, directory);
	relativePath = directory;

	app.use(router.routes());

	app.listen(PORT, () => {
		console.log(`server running at: http://localhost:${PORT}`);
		open && openInBrowser(`http://localhost:${PORT}`);
	});
};

export { startServer };
