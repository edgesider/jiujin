import { Commodity, Help } from '../types';
import { generateUUID, getCompressedImageUrl, getRegionPath, getRegionPathName } from './other';
import { saveCanvasToTempFile, saveToFile } from './fs';
import { getSettings } from './settings';

type OffscreenCanvas = WechatMiniprogram.OffscreenCanvas;
type CanvasContext = WechatMiniprogram.CanvasContext;

export const REGION_ICON = 'https://6a6a-jj-4g1ndtns7f1df442-1322373141.tcb.qcloud.la/region.png';
export const CO_BG_IMAGE = 'https://6a6a-jj-4g1ndtns7f1df442-1322373141.tcb.qcloud.la/commodity_share_bg.png';
export const HELP_BOUNTY_IMAGE = 'https://6a6a-jj-4g1ndtns7f1df442-1322373141.tcb.qcloud.la/help_share_bounty_v2.png';
export const HELP_NO_BOUNTY_IMAGE = 'https://6a6a-jj-4g1ndtns7f1df442-1322373141.tcb.qcloud.la/help_share_no_bounty_v2.png';
export const HELP_BOUNTY_BG_IMAGE = 'https://6a6a-jj-4g1ndtns7f1df442-1322373141.tcb.qcloud.la/help_share_bg_bounty.png';
export const HELP_NO_BOUNTY_BG_IMAGE = 'https://6a6a-jj-4g1ndtns7f1df442-1322373141.tcb.qcloud.la/help_share_bg_no_bounty.png';
const QRCODE_BG = 'https://6a6a-jj-4g1ndtns7f1df442-1322373141.tcb.qcloud.la/qrcode.png'

const fs = wx.getFileSystemManager();
const shareImageDir = `${wx.env.USER_DATA_PATH}/share_images/`;

// const compressedImageDir = `${wx.env.USER_DATA_PATH}/compressed/`;

export function clearSavedImages() {
  try {
    fs.rmdir({ dirPath: shareImageDir, recursive: true });
  } catch (e) {
    console.warn('clearSavedImages failed', e);
  }
}

function getRandomPath(ext: string = 'png') {
  fs.mkdir({ dirPath: shareImageDir, recursive: true });
  return `${shareImageDir}/${generateUUID()}.${ext}`;
}

async function drawImage(canvas: OffscreenCanvas, ctx: CanvasContext, imgUrl: string, x: number, y: number, w: number, h: number) {
  imgUrl = getCompressedImageUrl(imgUrl);
  return new Promise<void>((res, rej) => {
    const img = canvas.createImage()
    img.onload = () => {
      console.log(`onload ${imgUrl}`);
      if (w === -1 && h === -1) {
        w = img.width;
        h = img.height;
      } else if (w === -1) {
        w = img.width / img.height * h;
      } else if (h === -1) {
        h = img.height / img.width * w;
      }
      const srcWidth = img.width;
      const srcHeight = h / w * img.width;
      const srcY = (img.height - srcHeight) / 2;
      // @ts-ignore
      ctx.drawImage(img, 0, srcY, srcWidth, srcHeight, x, y, w, h);
      res();
    }
    img.onerror = rej;
    img.src = `${imgUrl}`;
    console.log(`draw image ${img.src}`)
  });
}

function isLocalUrl(path) {
  return !(/^(cloud|http|https):\/\//.test(path) && !/^http:\/\/tmp\//.test(path));
}

function randomizeUrl(u: string): string {
  if (isLocalUrl(u)) {
    return u;
  } else {
    return `${u}?t=${Date.now()}`;
  }
}

function roundRect(ctx: CanvasContext, x: number, y: number, w: number, h: number, r: number) {
  // const hr = r / 2;
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  // ctx.moveTo(x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  // ctx.moveTo(x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  // ctx.moveTo(x + w - r, y + h);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
}

/**
 * 获取精确将text绘制成底对齐到bottom所需要的y参数
 *
 * iOS 稳定能用，安卓上 measureText 返回值不全，不太可用
 */
function getTextDrawYFromBottom(ctx: CanvasContext, text: string, bottom: number): number {
  const info = ctx.measureText(text);
  console.log(text, info);
  // @ts-ignore
  return bottom + (info.actualBoundingBoxDescent ?? 0); // 默认是从基线开始绘制，所以减去往上在绘制Descent的距离就是刚好贴边
}

const PADDING = 24;
const IMG_HEIGHT = 666;

export async function drawCommodityShareImage(commodity: Commodity): Promise<string> {
  const cvs = wx.createOffscreenCanvas({
    width: 1000,
    height: 800,
    type: '2d'
  });
  const ctx = cvs.getContext('2d') as CanvasContext;
  await drawImage(cvs, ctx, randomizeUrl(CO_BG_IMAGE), 0, 0, 1000, 800);

  ctx.save();
  ctx.beginPath();
  roundRect(ctx, PADDING, PADDING, 1000 - PADDING * 2, IMG_HEIGHT, 19);
  ctx.clip();
  await drawImage(cvs, ctx, randomizeUrl(commodity.img_urls[0]), PADDING, PADDING, 1000 - PADDING * 2, IMG_HEIGHT);
  ctx.restore();

  ctx.fillStyle = '#347816';
  ctx.font = 'bold 86px sans-serif';
  const priceText = `${commodity.price / 100}`;
  ctx.fillText(priceText, PADDING + 36, 800 - PADDING);

  const regionPath = getRegionPathName(commodity.rid, 2);
  ctx.font = 'bold 50px sans-serif';
  ctx.fillStyle = '#ffffff';
  let width = ctx.measureText(regionPath).width;
  ctx.fillText(regionPath, 1000 - width - PADDING - 4, 800 - PADDING - 10);

  // const b = getTextDrawYFromBottom(ctx, regionPath, 800 - PADDING);
  // ctx.fillStyle = 'red';
  // ctx.moveTo(0, b);
  // ctx.lineTo(1000, b)
  // ctx.stroke();
  // ctx.fillStyle = 'green';
  // ctx.moveTo(0, 800 - PADDING);
  // ctx.lineTo(0, 800 - PADDING)
  // ctx.stroke();

  return saveToFile(
    // @ts-ignore
    cvs.toDataURL(),
    getRandomPath(),
  );
}

export async function drawHelpShareImage(help: Help): Promise<string> {
  const cvs = wx.createOffscreenCanvas({
    width: 1000,
    height: 800,
    type: '2d'
  });
  const ctx = cvs.getContext('2d') as CanvasContext;

  const helpImg = help.img_urls[0];
  if (helpImg) {
    await drawImage(
      cvs, ctx, randomizeUrl(help.bounty > 0 ? HELP_BOUNTY_BG_IMAGE : HELP_NO_BOUNTY_BG_IMAGE),
      0, 0, 1000, 800);
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, PADDING, PADDING, 1000 - PADDING * 2, IMG_HEIGHT, 19);
    ctx.clip();
    await drawImage(cvs, ctx, randomizeUrl(helpImg), PADDING, PADDING, 1000 - PADDING * 2, IMG_HEIGHT);
    ctx.restore();
  } else {
    const img = help.bounty > 0 ? HELP_BOUNTY_IMAGE : HELP_NO_BOUNTY_IMAGE;
    await drawImage(cvs, ctx, randomizeUrl(img), 0, 0, 1000, 800);
  }

  if (help.bounty > 0) {
    ctx.font = 'bold 86px sans-serif';
    ctx.fillStyle = '#ff5757';
    const bountyText = `${help.bounty / 100}`
    ctx.fillText(bountyText, 148, 800 - PADDING);
  }

  const regionPath = getRegionPathName(help.rid, 2);
  ctx.font = 'bold 50px sans-serif';
  ctx.fillStyle = '#ffffff';
  let width = ctx.measureText(regionPath).width;
  ctx.fillText(regionPath, 1000 - width - PADDING - 4, 800 - PADDING - 10);

  return saveToFile(
    // @ts-ignore
    cvs.toDataURL(),
    getRandomPath()
  );
}

export async function drawMyQrcode(qrcode: ArrayBuffer, path: string): Promise<string> {
  const cvs = wx.createOffscreenCanvas({
    width: 1080,
    height: 1080,
    type: '2d'
  });
  const ctx = cvs.getContext('2d') as CanvasContext;
  await drawImage(cvs, ctx, QRCODE_BG, 0, 0, 1080, 1080);
  const qrPath = saveToFile(qrcode, getRandomPath());
  await drawImage(cvs, ctx, qrPath, 680, 700, 300, 300);
  return saveToFile(
    // @ts-ignore
    cvs.toDataURL(),
    path);
}

export async function compressImage(path: string, target: {
  width?: number;
  height?: number;
}): Promise<string> {
  if (!getSettings().enableImageLocalCompress) {
    console.log('local compress image is disabled');
    return path;
  }
  if (typeof target.width !== 'number') {
    target.width = 0;
  }
  if (typeof target.height !== 'number') {
    target.height = 0;
  }
  if (target.width <= 0 && target.height <= 0) {
    throw Error('both width and height is not specified');
  }
  const { width, height } = await wx.getImageInfo({ src: path });
  if (target.width <= 0) {
    target.width = target.height * width / height;
  } else if (target.height <= 0) {
    target.height = target.width * height / width;
  }
  if (target.width >= width) {
    console.log('压缩后的大小不比之前的小');
    return path;
  }
  console.log(`compressing image from ${width}x${height} to ${target.width}x${target.height} `);
  const cvs = wx.createOffscreenCanvas({
    width: target.width,
    height: target.height,
    type: '2d'
  });
  const ctx = cvs.getContext('2d') as CanvasContext;
  await drawImage(cvs, ctx, path, 0, 0, target.width, target.height);
  // fs.mkdir({ dirPath: compressedImageDir, recursive: true });
  const result = await saveCanvasToTempFile(cvs, 'jpg');
  console.log('compressed path', result);
  return result;
}