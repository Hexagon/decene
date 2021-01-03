interface IPems {
  private: string;
  public: string;
  cert: string;
}
export interface IIdentity {
  uuid: string;
  key: IPems;
}
