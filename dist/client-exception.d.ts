import { AdsClient } from "./ads-client";
/**
 * Own exception class used for client errors
 * Derived from Error but added innerException and ADS error information
 */
export declare class ClientException extends Error {
    sender: string;
    adsError: boolean;
    adsErrorInfo: Record<string, unknown> | null;
    metaData: unknown | null;
    errorTrace: Array<string>;
    getInnerException: () => (Error | ClientException | null);
    stack: string | undefined;
    constructor(client: AdsClient, sender: string, messageOrError: string | Error | ClientException, ...errData: unknown[]);
}
