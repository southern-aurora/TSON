export type TSONRules = {
  stringify: Array<{ match: (v: any) => boolean; handler: (v: any) => string }>;
  parse: Array<{ match: (v: any) => boolean; handler: (v: string) => any }>;
};

export const TSON = {
  rules: {
    stringify: [
      {
        match: (v) => typeof v === "bigint",
        handler: (v: bigint) => `t!bigint:${v.toString()}`,
      },
      {
        match: (v) => v instanceof Date,
        handler: (v: Date) => `t!Date:${v.toISOString()}`,
      },
      {
        match: (v) => v instanceof URL,
        handler: (v: URL) => `t!URL:${v.toString()}`,
      },
      {
        match: (v) => v instanceof RegExp,
        handler: (v: RegExp) => `t!RegExp:${v.toString()}`,
      },
      {
        match: (v) => v instanceof Uint8Array,
        handler: (v: Uint8Array) => `t!Uint8Array:${new TextDecoder().decode(v)}`,
      },
      {
        match: (v) => v instanceof ArrayBuffer,
        handler: (v: Uint8Array) => `t!ArrayBuffer:${new TextDecoder().decode(v)}`,
      },
    ],
    parse: [
      {
        match: (v) => v.startsWith("t!bigint:"),
        handler: (v: string) => BigInt(v.slice("t!bigint:".length)),
      },
      {
        match: (v) => v.startsWith("t!Date:"),
        handler: (v: string) => new Date(v.slice("t!Date:".length)),
      },
      {
        match: (v) => v.startsWith("t!URL:"),
        handler: (v: string) => new URL(v.slice("t!URL:".length)),
      },
      {
        match: (v) => v.startsWith("t!RegExp:"),
        handler: (v: string) => new RegExp(v.slice("t!RegExp:".length)),
      },
      {
        match: (v) => v.startsWith("t!Uint8Array:"),
        handler: (v: string) => new TextEncoder().encode(v.slice("t!Uint8Array:".length)),
      },
      {
        match: (v) => v.startsWith("t!ArrayBuffer:"),
        handler: (v: string) => new TextEncoder().encode(v.slice("t!ArrayBuffer:".length)).buffer,
      },
    ],
  } satisfies TSONRules,

  stringify(value: unknown): string {
    return JSON.stringify(TSON.encode(value));
  },

  parse(text: string): any {
    return TSON.decode(JSON.parse(text));
  },

  encode<T>(value: T): TSONEncode<T> {
    function clone(item: any): any {
      if (!item) {
        return item;
      }
      if (typeof item !== "object" && typeof item !== "bigint") {
        return item;
      } else if (!item) {
        return item;
      } else if (Array.isArray(item)) {
        const result = [];
        for (let index = 0; index < item.length; index++) {
          result[index] = clone(item[index]);
        }
        return result;
      }
      for (const iterator of TSON.rules.stringify) {
        if (iterator.match(item)) {
          return iterator.handler(item as any);
        }
      }
      const result: any = {};
      for (var i in item) {
        result[i] = clone(item[i]);
      }
      return result;
    }
    return clone(value);
  },

  decode(value: any): any {
    function traverse(obj: any): any {
      if (Array.isArray(obj)) {
        return obj.map(traverse);
      } else if (typeof obj === "object" && obj !== null) {
        const result: any = {};
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            result[key] = traverse(obj[key]);
          }
        }
        return result;
      } else if (typeof obj === "string") {
        for (const i of TSON.rules.parse) {
          if (i.match(obj) === true) {
            return i.handler(obj);
          }
        }
        return obj;
      }
      return obj;
    }
    return traverse(value);
  },
};

export type TSONEncode<T> = RecursiveXToString<T, bigint | Date | URL | RegExp | Uint8Array | ArrayBuffer>;

export type RecursiveXToString<T, X> = RecursiveObjectXToString<{ T: T }, X>["T"];

type RecursiveObjectXToString<T, X> = {
  [K in keyof T]: T[K] extends X ? string : T[K] extends object ? RecursiveObjectXToString<T[K], X> : T[K];
};
