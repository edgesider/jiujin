import { generateUUID } from './other';

const fs = wx.getFileSystemManager();

export function isFileAccess(path: string): boolean {
  try {
    fs.accessSync(path);
    return true;
  } catch (e) {
    return false;
  }
}

export function rmFileIfExist(path: string): boolean {
  try {
    fs.unlinkSync(path);
    return true;
  } catch (e) {
    return false;
  }
}

export function saveToFile(content: string | ArrayBuffer, path: string): string {
  if (typeof content === 'string') {
    const prefixToRemove = ['data:image/png;base64,', 'data:image/jpeg;base64,'];
    for (const prefix of prefixToRemove) {
      if (content.startsWith(prefix)) {
        content = content.substring(prefix.length);
      }
    }
    fs.writeFileSync(path, content, 'base64');
  } else {
    fs.writeFileSync(path, content);
  }
  return path;
}