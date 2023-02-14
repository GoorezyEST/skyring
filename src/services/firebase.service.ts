import { Injectable } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getDatabase,
  Database,
  ref,
  set,
  get,
  child,
  push,
  remove,
  orderByChild,
  query,
  startAt,
  onChildAdded,
  onChildRemoved,
  onValue,
} from 'firebase/database';
import { firebaseConfig, restoreCMD } from './configs';

@Injectable({ providedIn: 'root' })
export class Firebase {
  [x: string]: any;
  app: FirebaseApp;
  database: Database;
  userFromLocal: string | null;
  userList: { username: string }[] = [];

  constructor() {
    this.app = initializeApp(firebaseConfig);
    this.database = getDatabase(this.app);
    this.userFromLocal = null;
    async () => {
      this.userList = await this.getUserList();
    };
    onChildAdded(ref(this.database, 'roomlist'), async () => {
      this.userList = await this.getUserList();
    });

    onChildRemoved(ref(this.database, 'roomlist'), async () => {
      this.userList = await this.getUserList();
    });
    onValue(ref(this.database, 'restoreDB'), async (snapshot) => {
      const restoreValue = snapshot.val();
      if (restoreValue === 'reload') {
        await set(ref(this.database, 'restoreDB'), 'no-action');
        location.reload();
        await remove(ref(this.database, 'roomchat'));
        await remove(ref(this.database, 'roomlist'));
        await remove(ref(this.database, 'users'));
      }
    });
  }

  async writeUsername(username: string) {
    await set(ref(this.database, 'users/' + username), {
      username: username,
    }).then(() => {
      this.userFromLocal = username;
    });
  }

  async writeUserList() {
    var timestamp = new Date().toUTCString();
    await set(ref(this.database, 'roomlist/' + this.userFromLocal), {
      username: this.userFromLocal,
      timestampJoined: timestamp,
    });
  }

  async writeMessage(msg: string) {
    var timestamp = new Date().toUTCString();
    await push(ref(this.database, 'roomchat/'), {
      username: this.userFromLocal,
      msg: msg,
      timestamp: timestamp,
      side: 'left',
    });
  }

  async writeJoinMessage() {
    var timestamp = new Date().toUTCString();
    await push(ref(this.database, 'roomchat'), {
      username: 'Skyring',
      msg: `${this.userFromLocal} join the chat!`,
      timestamp: timestamp,
      side: 'left',
    });
  }

  async writeDisconnectMessage() {
    var timestamp = new Date().toUTCString();
    await push(ref(this.database, 'roomchat'), {
      username: 'Skyring',
      msg: `${this.userFromLocal} leave the chat!`,
      timestamp: timestamp,
      side: 'left',
    });
  }

  async deleteUserFromList() {
    await remove(child(ref(this.database, 'roomlist'), this.userFromLocal!));
  }

  async restoreDB(cmd: string) {
    if (cmd === restoreCMD) {
      await set(ref(this.database, 'restoreDB'), 'reload');
    }
  }

  async deleteUserData() {
    await remove(child(ref(this.database, 'users'), this.userFromLocal!));
  }

  async deleteChat() {
    await remove(ref(this.database, 'roomchat'));
  }

  async checkAfk() {
    if (this.userFromLocal === null || this.userFromLocal === undefined) {
      return;
    } else {
      const thresholdTime = 10 * 60 * 1000; // 10 minutes in milliseconds

      const messages = await get(child(ref(this.database), `roomchat`));
      const users = await get(child(ref(this.database), 'roomlist'));

      if (messages.exists()) {
        let data: { username: string; timestamp: string }[] = messages.val();
        let filteredMessages = Object.values(data).filter(
          (item) => item.username === this.userFromLocal
        );

        filteredMessages.sort(
          (a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)
        );

        let lastMessage = filteredMessages[0];
        let currentTimestamp = Date.now();
        let difference = currentTimestamp - Date.parse(lastMessage.timestamp);

        if (difference >= thresholdTime) {
          this.deleteUserData();
          this.deleteUserFromList();
          if (this.userList.length > 1) {
            this.writeDisconnectMessage();
          }
          if (this.userList.length === 1) {
            this.deleteChat();
          }
          location.reload();
        }
      }

      if (users.exists()) {
        let data: { username: string; timestampJoined: string }[] = users.val();

        let filterUser = Object.values(data).filter(
          (item) => item.username === this.userFromLocal
        );

        let joinedTimestamp = Date.parse(filterUser[0].timestampJoined);
        let currentTimestamp = Date.now();
        let difference = currentTimestamp - joinedTimestamp;

        if (difference >= thresholdTime) {
          this.deleteUserData();
          this.deleteUserFromList();
          if (this.userList.length > 1) {
            this.writeDisconnectMessage();
          }
          if (this.userList.length === 1) {
            this.deleteChat();
          }
          location.reload();
        }
      }
    }
  }

  async getUserList() {
    let userList: { username: string }[] = [];

    await get(child(ref(this.database), `roomlist`))
      .then((snapshot) => {
        if (snapshot.exists()) {
          let data = snapshot.val();
          for (let key in data) {
            if (data.hasOwnProperty(key)) {
              let item = data[key];
              userList.push(item);
            }
          }
        }
      })
      .catch((error) => {
        console.error(error);
      });

    return userList;
  }

  async getMsgs(userTimestamp: string) {
    let msgList: {
      username: string;
      msg: string;
      timestamp: string;
      side: string;
    }[] = [];

    var myQuery = query(
      ref(this.database, 'roomchat'),
      orderByChild('timestamp'),
      startAt(userTimestamp)
    );

    await get(myQuery)
      .then((snapshot) => {
        if (snapshot.exists()) {
          let data = snapshot.val();
          for (let key in data) {
            let item = data[key];
            if (item.username === this.userFromLocal) {
              item.side = 'right';
            }
            msgList.push(item);
          }
        }
      })
      .catch((error) => {
        console.error(error);
      });

    return msgList;
  }
}
