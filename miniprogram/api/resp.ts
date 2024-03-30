export class Resp<T> {
  constructor(
    public data: T | undefined,
    public errno: number,
    public message?: string
  ) {}

  get isError(): boolean {
    return this instanceof RespError;
  }
}

export class RespSuccess<T> extends Resp<T> {
  constructor(data: T) {
    super(data, 0)
  }
}

export class RespError<T> extends Resp<T> {
  constructor(message: string, errno = -1) {
    super(undefined, errno, message)
  }
}