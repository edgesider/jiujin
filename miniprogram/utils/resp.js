class Resp {
  constructor(data, message) {
      if (data) {
          this.data = data
      }
      if (message) {
          this.message = message
      }
  }

  get isError() {
    return this instanceof RespError;
  }
}

class RespSuccess extends Resp {
  constructor(data, message) {
      super(data, message)
      this.errno = 0
  }
}

class RespError extends Resp {
  constructor(data, message) {
      super(data, message)
      this.errno = -1
  }
}

module.exports = {
  RespSuccess,
  RespError
}