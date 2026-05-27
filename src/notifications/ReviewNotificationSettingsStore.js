const fs = require('fs');
const path = require('path');

class ReviewNotificationSettingsStore {
  constructor({ filePath = path.resolve(process.cwd(), '.review-notification-settings.json') } = {}) {
    this.filePath = filePath;
  }

  read() {
    if (!fs.existsSync(this.filePath)) {
      return null;
    }

    return JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
  }

  write(settings) {
    fs.writeFileSync(this.filePath, `${JSON.stringify(settings, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
    });
  }
}

module.exports = {
  ReviewNotificationSettingsStore,
};
