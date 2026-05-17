declare module 'pg' {
  export interface QueryResultRow {
    [key: string]: any;
  }
  
  export interface QueryResult<R extends QueryResultRow = any> {
    rows: R[];
    rowCount: number;
    fields: Field[];
    command: string;
  }
  
  export interface Field {
    name: string;
    dataTypeID: number;
  }
  
  export interface PoolClient {
    query<R extends QueryResultRow = any>(text: string, values?: any[]): Promise<QueryResult<R>>;
    release(): void;
  }
  
  export interface Pool {
    connect(): Promise<PoolClient>;
    query<R extends QueryResultRow = any>(text: string, values?: any[]): Promise<QueryResult<R>>;
    end(): Promise<void>;
  }
  
  export class Pool {
    constructor(config?: any);
    connect(): Promise<PoolClient>;
    query<R extends QueryResultRow = any>(text: string, values?: any[]): Promise<QueryResult<R>>;
    end(): Promise<void>;
  }
  
  export function createPool(config: any): Pool;
}