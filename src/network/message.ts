interface MessageSerialized {
  type: string;
  payload: any;
}

class Message implements MessageSerialized {
  public type: string;
  public payload: any;
  constructor(type: string, payload: any) {
    this.type = type;
    this.payload = payload || {};
  }
  serialize() {
    return {
      type: this.type,
      payload: this.payload,
    };
  }
}

export default Message;
export { Message, MessageSerialized };
