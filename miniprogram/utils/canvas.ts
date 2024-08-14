import { Commodity, Help } from '../types';
import { generateUUID, getCompressedImageUrl, getRegionPath, getRegionPathName } from './other';
import { saveCanvasToTempFile, saveToFile } from './fs';
import { getSettings } from './settings';

type OffscreenCanvas = WechatMiniprogram.OffscreenCanvas;
type CanvasContext = WechatMiniprogram.CanvasContext;

export const REGION_ICON = 'https://6a6a-jj-4g1ndtns7f1df442-1322373141.tcb.qcloud.la/region.png';
export const HELP_BOUNTY_IMAGE = 'https://6a6a-jj-4g1ndtns7f1df442-1322373141.tcb.qcloud.la/help_share_bounty.png';
export const HELP_NO_BOUNTY_IMAGE = 'https://6a6a-jj-4g1ndtns7f1df442-1322373141.tcb.qcloud.la/help_share_no_bounty.png';
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

export async function drawCommodityShareImage(commodity: Commodity): Promise<string> {
  const cvs = wx.createOffscreenCanvas({
    width: 1000,
    height: 800,
    type: '2d'
  });
  const ctx = cvs.getContext('2d') as CanvasContext;

  const imgHeight = 648;
  const textHeight = 800 - imgHeight;
  const textCenter = imgHeight + textHeight / 2 - 10;

  console.log('draw image')
  await drawImage(cvs, ctx, randomizeUrl(commodity.img_urls[0]), 0, 0, 1000, imgHeight);

  ctx.fillStyle = '#21ac39'
  ctx.font = 'bold 54px sans-serif';
  let { width, } = ctx.measureText('￥');
  ctx.fillText(`￥`, 4, textCenter + 86 / 2);
  ctx.font = 'bold 86px sans-serif';
  ctx.fillText(`${commodity.price / 100}`, 4 + width, textCenter + 86 / 2);

  const regionPath = getRegionPathName(commodity.rid, 2);
  ctx.font = 'bold 50px sans-serif';
  ctx.fillStyle = '#979797';
  width = ctx.measureText(regionPath).width;
  ctx.fillText(regionPath, 1000 - width - 12, textCenter + 50 / 2);

  console.log('draw icon')
  await drawImage(
    cvs, ctx,
    randomizeUrl(REGION_ICON),
    1000 - width - 12 - 60, textCenter - 44 / 2,
    60, 60
  );

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

  const imgHeight = 648;
  const textHeight = 800 - imgHeight;
  const textCenter = imgHeight + textHeight / 2 - 10;

  console.log('draw image')
  const img = help.img_urls.length > 0
    ? help.img_urls[0]
    : (help.bounty > 0
        ? HELP_BOUNTY_IMAGE
        : HELP_NO_BOUNTY_IMAGE
    );
  await drawImage(cvs, ctx, randomizeUrl(img), 0, 0, 1000, imgHeight);

  // ctx.fillStyle = 'white';
  // let pos = 4;
  // ctx.font = 'bold 86px sans-serif';
  // ctx.fillText('悬赏', pos, textCenter + 86 / 2);
  // pos += ctx.measureText('悬赏').width;
  //
  // ctx.font = 'bold 54px sans-serif';
  // ctx.fillText('￥', pos, textCenter + 86 / 2);
  // pos += ctx.measureText('￥').width;
  //
  // ctx.font = 'bold 86px sans-serif';
  // ctx.fillText(`${help.bounty}`, pos, textCenter + 86 / 2);
  // pos += ctx.measureText(`${help.bounty}`).width;
  //
  // const bountyWidth = pos;
  // // background: linear-gradient(180deg, #fac000 0%, #ff4d4d 100%);
  // const grad = ctx.createLinearGradient(0, 0, bountyWidth, 92);
  // grad.addColorStop(0, '#fac000');
  // grad.addColorStop(1, '#ff4d4d');
  // ctx.fillStyle = grad;
  // const gradW = bountyWidth;
  // const gradH = 92;
  // const gradX = 0;
  // const gradY = textCenter - gradH / 2;
  // ctx.beginPath();
  // ctx.moveTo(0, gradH + 16);
  // // ctx.arcTo()
  // ctx.fillRect(0, textCenter - 92 / 2, bountyWidth, 92);

  if (help.bounty > 0) {
    let pos = 16;
    ctx.fillStyle = '#fac000';
    ctx.font = 'bold 76px sans-serif';
    ctx.fillText('悬赏', pos, textCenter + 76 / 2);
    pos += ctx.measureText('悬赏').width;

    ctx.font = 'bold 44px sans-serif';
    ctx.fillText('￥', pos, textCenter + 76 / 2);
    pos += ctx.measureText('￥').width;

    ctx.font = 'bold 76px sans-serif';
    const bountyText = `${help.bounty / 100}`
    ctx.fillText(bountyText, pos, textCenter + 76 / 2);
  }

  const regionPath = getRegionPathName(help.rid, 2);
  ctx.font = 'bold 50px sans-serif';
  ctx.fillStyle = '#979797';
  let width = ctx.measureText(regionPath).width;
  ctx.fillText(regionPath, 1000 - width - 12, textCenter + 50 / 2);

  console.log('draw icon')
  await drawImage(
    cvs, ctx,
    randomizeUrl(REGION_ICON),
    1000 - width - 12 - 60, textCenter - 44 / 2,
    60, 60
  );

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