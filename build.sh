rm -rf dist

mkdir dist

tsc index.ts -m commonjs --esModuleInterop --outDir dist

NODE_ENV=production vite build
mv static dist