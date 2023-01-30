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
} from 'firebase/database';
import { firebaseConfig } from './configs';

@Injectable({ providedIn: 'root' })
export class Firebase {
  app: FirebaseApp;
  database: Database;
  userFromLocal: string | null;

  constructor() {
    this.app = initializeApp(firebaseConfig);
    this.database = getDatabase(this.app);
    this.userFromLocal = null;
  }

  async writeUsername(username: string) {
    await set(ref(this.database, 'users/' + username), {
      username: username,
    }).then(() => {
      this.userFromLocal = username;
    });
  }

  async writeUserList() {
    await set(ref(this.database, 'roomlist/' + this.userFromLocal), {
      username: this.userFromLocal,
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
      msg: `${this.userFromLocal} is here!`,
      timestamp: timestamp,
      side: 'left',
    });
  }

  async deleteUserFromList() {
    await remove(child(ref(this.database, 'roomlist'), this.userFromLocal!));
  }

  async deleteUserData() {
    await remove(child(ref(this.database, 'users'), this.userFromLocal!));
  }

  async deleteChat() {
    await remove(ref(this.database, 'roomchat'));
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
