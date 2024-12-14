import { AdsError, AmsHeader, BaseAdsResponse } from "./types/ads-protocol-types";

export default class ClientError extends Error {
  public adsError?: AdsError;
  public trace: string[] = [];

  constructor(message?: string, adsError?: unknown) {
    super(message); 
    Object.setPrototypeOf(this, new.target.prototype); 
    this.name = "ClientError";
    message && this.trace.push(message);

    if (adsError !== undefined && (adsError as Error).stack) {
      //console.log("moro:", this.stack)
      //process.exit()
      this.stack = this.stack + "\n" + (adsError as Error).stack;//+ this.stack?.split('\n').slice(0, 2).join('\n') + '\n';
    }

    if (adsError instanceof ClientError) {
      this.adsError = adsError.adsError;
      this.trace = this.trace.concat(adsError.trace);
    
    } else if (!(adsError instanceof Error) && adsError !== undefined) {
      const error = adsError as AdsError;

      this.adsError = {
        errorCode: error.errorCode,
        errorStr: error.errorStr
      };
    }
    Object.setPrototypeOf(this, ClientError.prototype);
  }
}