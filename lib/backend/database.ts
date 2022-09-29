import { DB } from "https://deno.land/x/sqlite@v3.5.0/mod.ts";


const database = new DB("data/database.sqlite");

export type References = { references: { tableName: string } };
export type Optional<Type extends ColumnType> = { optional: Type };
export type Unique<Type extends ColumnType> = { unique: Type };

export type ColumnType =
    typeof Number |
    typeof String |
    typeof Date |
    { references: { tableName: string } } |
    { optional: ColumnType } |
    { unique: ColumnType };

export type ColumnType2TypeScript<T extends ColumnType> =
    T extends typeof Number ? number :
        T extends typeof String ? string :
            T extends typeof Date ? Date | "CURRENT_TIMESTAMP" :
                T extends References ? number :
                    T extends Optional<infer T> ? ColumnType2TypeScript<T> :
                        T extends Unique<infer T> ? ColumnType2TypeScript<T> :
                            never;

export type KeyNotToOptional<O, K extends keyof O> = O[K] extends Optional<infer _> ? never : K;
export type KeyToOptional<O, K extends keyof O> = O[K] extends Optional<infer _> ? K : never;

export const References = (tableName: string): References =>
    ({ references: { tableName } });

export const Optional = <Type extends ColumnType>(type: Type): Optional<Type> =>
    ({ optional: type });

export const Unique = <Type extends ColumnType>(type: Type): Unique<Type> =>
    ({ unique: type });

export type Prototype<Columns extends Record<string, ColumnType>> = {
    readonly id: number;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly deletedAt?: Date;
} & {
    [ColumnName in keyof Columns as KeyNotToOptional<Columns, ColumnName>]: ColumnType2TypeScript<Columns[ColumnName]>;
} & {
    [ColumnName in keyof Columns as KeyToOptional<Columns, ColumnName>]?: ColumnType2TypeScript<Columns[ColumnName]>;
};

export const ct2db = (type: ColumnType): [ string, ...string[] ] => {
    switch (type) {
        case Number:
            return [ "INTEGER", "NOT NULL" ];
        case String:
            return [ "TEXT", "NOT NULL" ];
        case Date:
            return [ "DATETIME", "NOT NULL" ];
        default:
            if ("references" in type)
                return [ "INTEGER", "NOT NULL", `REFERENCES ${type.references.tableName}` ];

            if ("optional" in type) {
                const [ innerType, ...modifiers ] = ct2db(type.optional);

                return [ innerType, ...modifiers.filter(modifier => modifier !== "NOT NULL"), "DEFAULT null" ];
            }

            if ("unique" in type) {
                const [ innerType, ...modifiers ] = ct2db(type.unique);

                return [ innerType, ...modifiers, "UNIQUE" ];
            }

            break;
    }

    throw new Error();
};

export const cv2db = (value: unknown): string | number | null => {
    switch (typeof value) {
        case "number":
        case "string":
            return value;
        case "object":
            if (value === null)
                return value;
            if (value instanceof Date)
                return (
                    value
                        .toISOString()
                        .replace(
                            /(\d+)-(\d+)-(\d+)T(\d+):(\d+):(\d+).*/gm,
                            `$1-$2-$3 $4:$5:$6`,
                        )
                );
            break;
        case "undefined":
            return null;
    }

    throw new Error();
};

export const db2cv = (type: ColumnType, value: unknown): string | number | null | Date => {
    switch (type) {
        case Number:
            return value as number;
        case String:
            return value as string;
        case Date:
            if (typeof value === "string")
                return new Date(value);
            break;
    }

    if ("references" in type) {
        return value as number;
    }

    if ("optional" in type) {
        if (value !== null) {
            return db2cv(type.optional, value);
        } else {
            return null;
        }
    }

    if ("unique" in type) {
        if (value !== null) {
            return db2cv(type.unique, value);
        } else {
            return null;
        }
    }

    throw new Error();
};

export const generateTableQuery = <Columns extends Record<string, ColumnType>>(tableName: string, columns: Columns) => {
    const columnQueries: string[] = [
        `id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT`,
        `createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`,
        `updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`,
        `deletedAt DATETIME DEFAULT null`,
    ];

    for (const columnName in columns) {
        const columnType = columns[columnName];
        const [ type, ...modifiers ] = ct2db(columnType);

        columnQueries.push(`${columnName} ${type} ${modifiers.join(" ")}`);
    }

    return `
        CREATE TABLE IF NOT EXISTS ${tableName}
        (
            ${columnQueries.join(",\n            ")}
        );

        CREATE TRIGGER IF NOT EXISTS update_updatedAt_on_${tableName}_Trigger
            AFTER
        UPDATE
            On ${tableName}
        BEGIN
        UPDATE ${tableName}
        SET updatedAt = CURRENT_TIMESTAMP
        WHERE id = NEW.id;
        END;
    `;
};

export const Model = <Columns extends Record<string, ColumnType>>(tableName: string, columns: Columns) => {
    type InsertType = Omit<Prototype<Columns>, "id" | "createdAt" | "updatedAt" | "deletedAt">;
    type WhereType = Partial<Prototype<Columns>>;

    class Model {
        static columns: Columns = columns;

        readonly id: number;

        constructor(id: number);
        constructor(insert: InsertType);
        constructor(insertOrId: InsertType | number) {
            if (typeof insertOrId !== "number") {
                const { columnNames, placeholders, values } = (
                    Object.entries(insertOrId)
                        .reduce(({ columnNames, placeholders, values }, [ name, value ]) => {
                            return {
                                columnNames: [ ...columnNames, name ],
                                placeholders: [ ...placeholders, "?" ],
                                values: [ ...values, cv2db(value) ],
                            };
                        }, {
                            columnNames: [] as string[],
                            placeholders: [] as string[],
                            values: [] as (string | number | null)[],
                        })
                );

                database.query(`INSERT INTO ${tableName} (${columnNames})
                                VALUES (${placeholders})`, values);
                this.id = database.lastInsertRowId;
            } else {
                this.id = insertOrId;
            }

            const allColumns = {
                ...columns,
                createdAt: Date,
                updatedAt: Date,
                deletedAt: Optional(Date),
            };

            for (const columnName in allColumns) {
                const columnType = allColumns[columnName];

                Object.defineProperty(this, columnName, {
                    get: () => {
                        const [ [ value ] ] = database.query(`
                            SELECT ${columnName}
                            FROM ${tableName}
                            WHERE id IS ${this.id} LIMIT 1
                        `);

                        return db2cv(columnType, value) ?? undefined;
                    },
                    set: (value) => {
                        if (ct2db(columnType)[0] === "DATETIME" && value === "CURRENT_TIMESTAMP") {
                            database.query(`
                                UPDATE ${tableName}
                                SET ${columnName} = CURRENT_TIMESTAMP
                                WHERE id IS ${this.id}
                            `);
                        } else {
                            database.query(`
                                UPDATE ${tableName}
                                SET ${columnName} = ?
                                WHERE id IS ${this.id}
                            `, [ cv2db(value) ]);
                        }
                    },
                })
            }
        }

        get isDeleted() {
            return !!(this as unknown as { deletedAt: Date | undefined }).deletedAt;
        }

        static findMany<T extends Model>(this: { new(...args: any): T }, data: WhereType, options: { limit?: number, includeDeleted?: boolean } = {}): T[] {
            const conditions: string[] = Object.keys(data).map(columName => `${columName} IS ?`);

            if (options.includeDeleted !== true) {
                conditions.push("deletedAt is null");
            }

            return (
                database.query(`
                    SELECT id
                    FROM ${tableName} ${conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ''} ${options.limit !== undefined ? `LIMIT ${options.limit}` : ''}
                `, Object.values(data as any)
                    .map(cv2db))
                    .map(([ id ]) => new this(id))
            );
        }

        static findOne<T extends Model>(this: Pick<typeof Model, 'findMany'> & { new(...args: any): T }, data: WhereType, options: { includeDeleted?: boolean } = {}): T | undefined {
            return this.findMany(data, { ...options, limit: 1 })[0];
        }

        restore() {
            (this as unknown as { deletedAt: undefined }).deletedAt = undefined;
        }

        delete(options: { hard?: boolean } = {}) {
            if (options.hard === true) {
                if (this.id !== undefined) {
                    database.query(`
                        DELETE
                        FROM ${tableName}
                        WHERE id IS ?;
                    `, [ this.id ]);
                    Object.assign(this, { id: -1 });
                }
            } else {
                (this as unknown as { deletedAt: "CURRENT_TIMESTAMP" }).deletedAt = "CURRENT_TIMESTAMP";
            }
        }
    }

    database.execute(generateTableQuery(tableName, columns));

    return Model as Omit<typeof Model, 'new'> & {
        prototype: typeof Model.prototype & Prototype<Columns>,
        new(id: number): typeof Model.prototype & Prototype<Columns>,
        new(insert: InsertType): typeof Model.prototype & Prototype<Columns>,
        new(insertOrId: InsertType | number): typeof Model.prototype & Prototype<Columns>,
    };
};
