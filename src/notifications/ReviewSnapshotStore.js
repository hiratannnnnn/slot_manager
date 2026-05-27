const fs = require('fs');
const path = require('path');

class ReviewSnapshotStore {
  constructor({ filePath = path.resolve(process.cwd(), '.review-snapshot.json') } = {}) {
    this.filePath = filePath;
  }

  read() {
    if (!fs.existsSync(this.filePath)) {
      return null;
    }

    return JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
  }

  write(snapshot) {
    fs.writeFileSync(this.filePath, `${JSON.stringify(snapshot, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
    });
  }
}

module.exports = {
  ReviewSnapshotStore,
};
