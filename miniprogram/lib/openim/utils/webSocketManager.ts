import type { WsRequest, WsResponse } from '../types/entity';
import { utf8Decode, utf8Encode } from './textCoder';
import { RequestApi } from '../constant/api';

type SocketTask = WechatMiniprogram.SocketTask;

type AppPlatform = 'unknow' | 'web' | 'uni' | 'wx';

enum WsOpenState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3,
}

class WebSocketManager {
  private ws?: SocketTask;
  private url: string;
  private reconnectAttempts: number;
  private connected: boolean;
  private isProcessingMessage: boolean = false;

  constructor(
    url: string,
    private onMessage: (data: WsResponse) => void,
    private onReconnectSuccess: () => void,
    private onDisconnect: (willRetry: boolean) => void,
    private reconnectInterval = 1000,
    private maxReconnectAttempts = Infinity
  ) {
    this.url = url;
    this.reconnectAttempts = 0;
    this.connected = false;
  }

  public connect = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState === WsOpenState.CLOSED) {
        const onWsOpen = () => {
          if (this.reconnectAttempts) {
            console.log('onReconnectSuccess');
            this.onReconnectSuccess();
          }
          this.reconnectAttempts = 0;
          this.connected = true;
          resolve();
        };
        const onWsMessage = (event: any) => this.onBinaryMessage(event.data);
        const onWsClose = () => {
          this.connected = false;
          const willRetry =
            this.reconnectAttempts < this.maxReconnectAttempts
          if (willRetry) {
            if (this.isProcessingMessage) {
              setTimeout(() => onWsClose(), 100);
              return;
            }
            console.log('onReconnect');
            setTimeout(() => this.connect(), this.reconnectInterval);
            this.reconnectAttempts++;
          }
          this.onDisconnect(willRetry);
        };
        const onWsError = (event: Event) => {
          console.error('onWsError', event);
          onWsClose();
        }

        this.ws = wx.connectSocket({ url: this.url });
        this.ws.onOpen(onWsOpen);
        this.ws.onMessage(onWsMessage);
        this.ws.onClose(onWsClose);
        this.ws.onError(onWsError);
      } else if (this.ws.readyState === WsOpenState.OPEN) {
        resolve();
      } else {
        reject(new Error('WebSocket is in an unknown state'));
      }
    });
  };

  private onBinaryMessage = async (message: string) => {
    this.isProcessingMessage = true;
    const json: WsResponse = JSON.parse(message);
    this.onMessage(json);
    if (json.event === RequestApi.Login && json.errCode === 0) {
      this.connected = true;
    }
    this.isProcessingMessage = false;
  };

  public sendMessage = (message: WsRequest) => {
    if (this.ws?.readyState === WsOpenState.OPEN) {
      this.ws.send({
        //@ts-ignore
        data: JSON.stringify(message),
      });
    } else {
      console.error('Connection lost');
    }
  };

  public close = () => {
    if (this.ws?.readyState === WsOpenState.OPEN) {
      this.ws.close({});
    }
  };
}

export default WebSocketManager;
