const fs = jest.genMockFromModule('fs');
const ReadStream = require('./readStream');

fs.reset = () => {
  fs.__failing = false;
  fs.__localPath = null;
  fs.__dataLength = 350;
};

fs.createReadStream = (localPath, options) => {
  fs.__localPath = localPath;

  return new ReadStream(fs.__failing, options);
};

fs.statSync = () => ({size: fs.__dataLength});

fs.reset();

module.exports = fs;