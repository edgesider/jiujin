declare const TextEncoder: any | undefined;
declare const TextDecoder: any | undefined;
declare const FileReader: any | undefined;
// declare const URL: any | undefined;
declare const Headers: any | undefined;
// declare const URLSearchParams: any | undefined;
declare const WebSocket: any | undefined;

declare type WebSocket = typeof WebSocket;

declare type Event = any;
declare type Response = any;
declare type File = any;

declare function fetch(...o: any): Response;


declare namespace WechatMiniprogram {
  interface SocketTask {
    readyState: number;
    CONNECTING: 0;
    OPEN: 1;
    CLOSING: 2;
    CLOSED: 3;
  }
}
