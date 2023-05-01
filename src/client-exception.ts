import { AdsClient } from "./ads-client";
import { AmsTcpPacket } from "./types/ads-types";

/**
 * Own exception class used for client errors
 * Derived from Error but added innerException and ADS error information
 */
export class ClientException extends Error {
  sender: string;
  adsError: boolean;
  adsErrorInfo: Record<string, unknown> | null = null;
  metaData: unknown | null = null;
  errorTrace: Array<string> = [];
  getInnerException: () => (Error | ClientException | null);
  stack: string | undefined;

  constructor(client: AdsClient, sender: string, messageOrError: string | Error | ClientException, ...errData: unknown[]) {

    //The 2nd parameter can be either message or another Error or ServerException
    super((messageOrError as Error).message ? (messageOrError as Error).message : messageOrError as string);

    if (messageOrError instanceof ClientException) {
      //Add to errData, so will be handled later
      errData.push(messageOrError);

    } else if (messageOrError instanceof Error) {
      //Add to errData, so will be handled later
      errData.push(messageOrError);
    }

    //Stack trace
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = (new Error(this.message)).stack;
    }

    this.name = this.constructor.name;
    this.sender = sender;
    this.adsError = false;
    this.adsErrorInfo = null;
    this.metaData = null;
    this.errorTrace = [];
    this.getInnerException = () => null;

    //Loop through given additional data
    errData.forEach(data => {

      if (data instanceof ClientException && this.getInnerException == null) {
        //Another ServerException error
        this.getInnerException = () => data;

        //Add it to our own tracing array
        this.errorTrace.push(`${(this.getInnerException() as ClientException).sender}: ${this.getInnerException()?.message}`);

        //Add also all traces from the inner exception
        (this.getInnerException() as ClientException).errorTrace.forEach((s: string) => this.errorTrace.push(s));

        //Modifying the stack trace so it contains all previous ones too
        //Source: Matt @ https://stackoverflow.com/a/42755876/8140625
        if (client.debugLevel > 0) {
          const message_lines = (this.message.match(/\n/g) || []).length + 1;
          this.stack = this.stack ? this.stack.split("\n").slice(0, message_lines + 1).join("\n") + "\n" : "" +
            this.getInnerException()?.stack;
        }
      } else if (data instanceof Error && this.getInnerException == null) {
        //Error -> Add it"s message to our message
        this.message += ` (${data.message})`;
        this.getInnerException = () => data;

        //Modifying the stack trace so it contains all previous ones too
        //Source: Matt @ https://stackoverflow.com/a/42755876/8140625
        if (client.debugLevel > 0) {
          const message_lines = (this.message.match(/\n/g) || []).length + 1;
          this.stack = this.stack ? this.stack.split("\n").slice(0, message_lines + 1).join("\n") + "\n" : "" +
            this.getInnerException()?.stack;
        }

      } else if ((data as AmsTcpPacket).ams && (data as AmsTcpPacket).ams.error) {
        //AMS reponse with error code
        this.adsError = true;
        this.adsErrorInfo = {
          adsErrorType: "AMS error",
          adsErrorCode: (data as AmsTcpPacket).ams.errorCode,
          adsErrorStr: (data as AmsTcpPacket).ams.errorStr
        };

      } else if ((data as AmsTcpPacket).ads && (data as AmsTcpPacket).ads.error) {
        //ADS response with error code
        this.adsError = true;
        this.adsErrorInfo = {
          adsErrorType: "ADS error",
          adsErrorCode: (data as AmsTcpPacket).ads.errorCode,
          adsErrorStr: (data as AmsTcpPacket).ads.errorStr
        };

      } else if (this.metaData == null) {
        //If something else is provided, save it
        this.metaData = data;
      }
    });

    //If this particular exception has no ADS error, check if the inner exception has
    //It should always be passed upwards to the end-user
    if (!this.adsError && this.getInnerException() != null) {
      const inner = this.getInnerException() as ClientException;

      if (inner.adsError != null && inner.adsError === true) {
        this.adsError = true;
        this.adsErrorInfo = inner.adsErrorInfo;
      }
    }
  }
}
