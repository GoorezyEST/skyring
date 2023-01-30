import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  Input,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Firebase } from 'src/services/firebase.service';
import { ref, onChildAdded, onChildRemoved, query } from 'firebase/database';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss'],
})
export class SignupComponent implements OnInit, AfterViewInit {
  @ViewChild('chat', { static: false }) chatDiv!: ElementRef;

  @HostListener('window:beforeunload')
  deleteUsernameFromDB() {
    this.deleteUserData();
  }

  @Input() userSigned: boolean = false;
  notLoading: boolean = true;

  signupForm!: FormGroup;
  usernameInputErrorMsg!: string;
  userList: { username: string }[] = [];
  msgList: {
    username: string;
    msg: string;
    timestamp: string;
    side: string;
  }[] = [];
  joinTimestamp!: string;

  availableColors: string[] = [
    'rgb(166,0,0)',
    'rgb(166,0,122)',
    'rgb(128,0,166)',
    'rgb(6,0,166)',
    'rgb(0,166,166)',
    'rgb(0,166,39)',
    'rgb(166,155,0)',
  ];

  userColors = new Map<string, string>();

  constructor(private firebase: Firebase) {
    onChildAdded(ref(this.firebase.database, 'roomlist'), async () => {
      this.userList = await this.firebase.getUserList();
    });

    onChildRemoved(ref(this.firebase.database, 'roomlist'), async () => {
      this.userList = await this.firebase.getUserList();
    });
  }

  ngAfterViewInit(): void {
    onChildAdded(query(ref(this.firebase.database, 'roomchat')), async () => {
      await this.getMessages();
      setTimeout(() => {
        this.chatDiv.nativeElement.scrollTop =
          this.chatDiv.nativeElement.scrollHeight;
      }, 3);
    });
  }

  ngOnInit(): void {
    this.signupForm = new FormGroup({
      username: new FormControl(null, [
        Validators.required,
        Validators.pattern(/^[A-Za-z]+$/),
        Validators.minLength(4),
        Validators.maxLength(15),
      ]),
    });
  }

  async submitedForm(username: string, e: Event) {
    e.preventDefault();
    this.notLoading = false;
    await this.firebase.writeUsername(username);
    await this.firebase.writeUserList();
    this.userList = await this.firebase.getUserList();
    this.userSigned = true;
    await this.firebase.writeJoinMessage();
    setTimeout(async () => {
      this.joinTimestamp = new Date().toUTCString();
      await this.getMessages();
      this.notLoading = true;
    }, 1500);
  }

  deleteUserData() {
    this.firebase.deleteUserData();
    this.firebase.deleteUserFromList();
    if (this.userList.length === 1) {
      this.firebase.deleteChat();
    }
  }

  msgSubmit(input: HTMLInputElement, msg: string, e: Event) {
    e.preventDefault();
    if (msg === null || msg === '' || msg === undefined) {
      return;
    }
    input.value = '';
    this.firebase.writeMessage(msg);
  }

  async getMessages() {
    const messages = await this.firebase.getMsgs(this.joinTimestamp);
    this.msgList = messages;
  }

  assignColor(username: string) {
    if (username == 'Skyring') {
      return 'rgb(255, 76, 41)';
    }
    if (this.userColors.has(username)) {
      return this.userColors.get(username);
    } else {
      if (this.availableColors.length === 0) {
        this.availableColors = [...this.userColors.values()];
      }
      let colorNum = Math.floor(Math.random() * this.availableColors.length);
      let color = this.availableColors[colorNum];
      this.userColors.set(username, color);
      this.availableColors.splice(colorNum, 1);
      return color;
    }
  }
}
