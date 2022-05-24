import Konva from 'konva';
import { Shape } from 'konva/lib/Shape';
import ColorPicker from 'simple-color-picker';
import { throttle } from 'lodash-es';
import './style.css';

const $container = document.querySelector('#app') as HTMLDivElement;

const defaultLen = 120;
const PadLen = 50;
var MaxWidth = 400;

const ThemeColor = '#002fA7';
const CopyNameSvg = `<svg viewBox="0 0 1024 1024" version="1.1"
xmlns="http://www.w3.org/2000/svg"  width="20" height="20"
xmlns:xlink="http://www.w3.org/1999/xlink">
<circle cx="512" cy="512" r="512" fill="#002fA7"></circle>
<path d="M798.592 682.666667l-45.781333-113.322667L707.029333 682.666667h91.562667z m34.474667 85.333333h-160.512l-21.973334 54.4a42.666667 42.666667 0 1 1-79.146666-32l139.093333-344.192a42.624 42.624 0 0 1 29.568-25.472 42.666667 42.666667 0 0 1 54.4 23.978667l139.605333 345.514666a42.666667 42.666667 0 0 1-79.104 32L833.066667 768zM128 170.666667h768v85.333333H128V170.666667z m0 213.333333h469.333333v85.333333H128V384z m0 170.666667h341.333333v85.333333H128v-85.333333z m0 170.666666h256v85.333334H128v-85.333334z" fill="#ffffff"></path>
</svg>`;
const DeleteSvg = `<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg viewBox="0 0 1024 1024" version="1.1"
  xmlns="http://www.w3.org/2000/svg" width="20" height="20"
  xmlns:xlink="http://www.w3.org/1999/xlink">
  <circle cx="512" cy="512" r="512" fill="#002fA7"></circle>
  <path d="M341.333333 170.666667l42.666667-85.333334h256l42.666667 85.333334h213.333333v85.333333H128V170.666667h213.333333zM213.333333 298.666667h597.333334v554.666666a85.333333 85.333333 0 0 1-85.333334 85.333334H298.666667a85.333333 85.333333 0 0 1-85.333334-85.333334V298.666667z m85.333334 85.333333v469.333333h426.666666V384H298.666667z m85.333333 85.333333h85.333333v298.666667H384v-298.666667z m170.666667 0h85.333333v298.666667h-85.333333v-298.666667z" fill="#ffffff"></path>
</svg>`;

const IconURLMap: Record<string, string> = {
	copy: `data:image/svg+xml;base64,${window.btoa(CopyNameSvg)}`,
	delete: `data:image/svg+xml;base64,${window.btoa(DeleteSvg)}`,
};

const IconMAP: Record<keyof typeof IconURLMap, null | Konva.Image> = {
	copy: null,
	delete: null,
};

const preLoadImage = async () => {
	Promise.all(
		Object.keys(IconURLMap).map(
			(name) =>
				new Promise<void>((resolve) => {
					Konva.Image.fromURL(IconURLMap[name], (imageNode: Shape) => {
						(IconMAP as any)[name] = imageNode;
						resolve();
					});
				})
		)
	);
};

const $input = document.createElement('input') as HTMLInputElement;
$input.setAttribute('style', 'position: absolute; opacity: 0; top: 0; z-index: -999');
document.body.appendChild($input);
const copyText = (text: string) => {
	$input.value = text;
	$input.select();
	document.execCommand('copy');
};

const $picker = document.createElement('div');
$picker.classList.add('picker');
document.body.insertBefore($picker, $container);
const colorPicker = new ColorPicker({
	color: '#FFFFFF',
	background: '#101010',
	el: $picker,
	width: 120,
	height: 120,
});
colorPicker.onChange((color: string) => {
	$container?.setAttribute('style', `background-color: ${color};`);
});

var width = window.innerWidth;
var height = window.innerHeight;

var stage = new Konva.Stage({
	container: $container,
	width: width,
	height: height,
	draggable: true,
});

const setCursorStyle = (shape: any) => {
	shape.on('mouseenter', function () {
		stage.container().style.cursor = 'pointer';
	});

	shape.on('mouseleave', function () {
		stage.container().style.cursor = 'default';
	});
};

var layer = new Konva.Layer();
stage.add(layer);

const addImage = (
	uri: string,
	pos: { x: number; y: number }
): Promise<{ imageNode: Shape; showCtrl: () => void; hideCtrl: () => void }> =>
	new Promise((resolve, reject) => {
		// try to draw SVG natively
		Konva.Image.fromURL(
			uri,
			(imageNode: Shape) => {
				const image = imageNode?.attrs?.image as HTMLImageElement;
				if (!image) {
					reject();
					return;
				}
				const { naturalWidth, naturalHeight } = image;
				const ratio = naturalWidth / naturalHeight;
				layer.add(imageNode);

				let plusX = 0;
				let plusY = 0;
				let defaultWidth = defaultLen;
				let defaultHeight = defaultLen / ratio;
				if (naturalWidth < naturalHeight) {
					defaultWidth = defaultLen * ratio;
					defaultHeight = defaultLen;
					plusX = (defaultLen - defaultWidth) / 2;
				} else {
					plusY = (defaultLen - defaultHeight) / 2;
				}

				imageNode.setAttrs({
					width: defaultWidth,
					height: defaultHeight,
					x: pos.x + plusX,
					y: pos.y + plusY,
					ratio,
					draggable: true,
				});

				const defaultAttrs = {
					rotateEnabled: false,
					enabledAnchors: [],
					borderEnabled: false,
				};
				// create new transformer
				var tr = new Konva.Transformer(defaultAttrs);
				const copyIcon = IconMAP.copy?.clone();
				const deleteIcon = IconMAP.delete?.clone();

				setCursorStyle(copyIcon);
				setCursorStyle(deleteIcon);
				const updatePosition = (size: { width: number; height: number }) => {
					copyIcon.setPosition({
						x: -8,
						y: -8,
					});
					deleteIcon.setPosition({
						x: size.width - 8,
						y: -8,
					});
				};

				let isCtrlShow = false;
				const fileName = decodeURIComponent(uri.match(/.*\/(.*)$/)?.[1] || '');
				copyIcon.on('click', () => {
					copyText(fileName);
				});

				deleteIcon.on('click', async () => {
					const isConfirm = window.confirm(`是否删除本地文件 ${fileName}?`);
					if (!isConfirm) return;
					const res = fetch('/rm', {
						method: 'DELETE',
						headers: {
							Accept: 'application/json',
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							uri,
						}),
					});
					if ((await res).status === 200) {
						imageNode.remove();
						tr.remove();
					}
				});

				const showCtrl = () => {
					if (isCtrlShow) return;
					isCtrlShow = true;
					tr.setAttrs({
						borderEnabled: true,
						borderStroke: ThemeColor,
						enabledAnchors: ['bottom-left', 'bottom-right'],
						anchorStroke: ThemeColor,
						anchorSize: 8,
						anchorFill: ThemeColor,
						anchorCornerRadius: 8,
						borderDash: [8, 8, 8, 8],
						boundBoxFunc(oldBoundBox: any, newBoundBox: any) {
							if (Math.abs(newBoundBox.width) > MaxWidth) {
								return oldBoundBox;
							}
							return newBoundBox;
						},
					});
					tr.add(copyIcon);
					tr.add(deleteIcon);
					updatePosition(tr.size());
				};

				const hideCtrl = () => {
					if (!isCtrlShow) return;
					isCtrlShow = false;
					tr.setAttrs(defaultAttrs);
					copyIcon.remove();
					deleteIcon.remove();
					updatePosition(tr.size());
				};

				layer.add(tr);
				tr.nodes([imageNode]);
				resolve({ imageNode, showCtrl, hideCtrl });
			},
			(...err: any[]) => {
				reject(...err);
			}
		);
	});

/** 按顺序排列 */
const getNextPos = ({
	x,
	y,
	padLen,
	containerWidth,
}: {
	x: number;
	y: number;
	padLen: number;
	containerWidth: number;
}) => {
	const exceedWidth = x + 2 * defaultLen + 2 * padLen > containerWidth;

	if (exceedWidth) {
		return {
			x: padLen,
			y: y + defaultLen + padLen,
		};
	}
	return {
		x: x + defaultLen + padLen,
		y,
	};
};

(async () => {
	await preLoadImage();
	const res = await fetch('/svg');
	const json = await res.json();
	let renderInfo = {
		x: 220,
		y: 20,
		padLen: PadLen,
		containerWidth: window.innerWidth,
	};

	const imageNodes: { imageNode: Shape; showCtrl: () => void; hideCtrl: () => void }[] = [];
	for (const src of json.uris) {
		const res = await addImage(src, renderInfo);
		renderInfo = { ...renderInfo, ...getNextPos(renderInfo) };
		imageNodes.push(res);
	}

	const hideCtrl = () => imageNodes.map(({ hideCtrl }) => hideCtrl());

	imageNodes.forEach(({ imageNode, showCtrl }) => {
		imageNode.on('mousedown', () => {
			hideCtrl();
			showCtrl();
		});
	});
})();
