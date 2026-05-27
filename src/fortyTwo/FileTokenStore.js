const fs = require('fs');
const path = require('path');

class FileTokenStore {
  constructor({ filePath = path.resolve(process.cwd(), '.fortytwo-token.json') } = {}) {
    this.filePath = filePath;
  }

  read() {
    if (!fs.existsSync(this.filePath)) {
      return null;
    }

    return JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
  }

  write(token) {
    fs.writeFileSync(this.filePath, `${JSON.stringify(token, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
    });
  }
}

module.exports = {
  FileTokenStore,
};
