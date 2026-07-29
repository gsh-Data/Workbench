const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data directory and db.json exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const defaultData = {
  snippets: [],
  cronJobs: [],
  todos: []
};

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
}

class DB {
  static read() {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading DB:', error);
      return defaultData;
    }
  }

  static write(data) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (error) {
      console.error('Error writing DB:', error);
      return false;
    }
  }

  static getCollection(collection) {
    const data = this.read();
    return data[collection] || [];
  }

  static setCollection(collection, items) {
    const data = this.read();
    data[collection] = items;
    return this.write(data);
  }
}

module.exports = DB;
