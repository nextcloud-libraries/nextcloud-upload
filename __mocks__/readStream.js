const { Readable } = require('stream');
const fs = require('fs');

class ReadStream extends Readable {
  #failing = false;
  #ptr = 0;

  constructor(failing, opts) {
    super(opts);

    this.#failing = failing;

    setTimeout(() => this.emit('readable'), 300);
  }

  _read(size) {
    if (this.#failing) {
      this.destroy(new Error());
    }

    while(this.#ptr++ < fs.__dataLength && this.push('\0', 'ascii')) {
    }

    if (this.#ptr === fs.__dataLength) {
      this.push(null);
    }
  }
}

module.exports = ReadStream;