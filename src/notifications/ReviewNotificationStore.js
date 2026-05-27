const fs = require('fs');
const path = require('path');

class ReviewNotificationStore {
  constructor({ filePath = path.resolve(process.cwd(), '.review-notifications.json') } = {}) {
    this.filePath = filePath;
  }

  has(notificationKey) {
    const data = this.read();
    return data.notified.includes(notificationKey);
  }

  add(notificationKey) {
    const data = this.read();

    if (!data.notified.includes(notificationKey)) {
      data.notified.push(notificationKey);
      this.write(data);
    }
  }

  read() {
    if (!fs.existsSync(this.filePath)) {
      return { notified: [] };
    }

    return JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
  }

  write(data) {
    fs.writeFileSync(this.filePath, `${JSON.stringify(data, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
    });
  }
}

module.exports = {
  ReviewNotificationStore,
};
