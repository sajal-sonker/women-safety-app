export type SendResult =
 | {outcome:'PROVIDER_ACCEPTED';provider_ref:string}
 | {outcome:'UNKNOWN'}
 | {outcome:'FAILED';retryable:boolean;retry_after_s?:number};
export interface DeliveryProvider {
 readonly name:string;
 readonly capabilities:{idempotency:boolean;receipts:boolean;reconciliation:boolean};
 send(message:{outbox_id:string;material:Record<string,unknown>}):Promise<SendResult>;
}
