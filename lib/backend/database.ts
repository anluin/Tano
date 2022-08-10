import { DB } from "https://deno.land/x/sqlite@v3.5.0/mod.ts";


await Deno.mkdir("./data", { recursive: true });

const database = new DB("data/database.db");

type ColumnModifier = undefined | "nullable" | "autoincrement" | "primary key" | "unique";
type ColumnType = "integer" | "string" | "datetime" | (() => Table<Record<string, ColumnData>>) | (() => [Table<Record<string, ColumnData>>]);

type ColumnData<Type = ColumnType, Modifier = ColumnModifier, DefaultValue = unknown> = {
    type: Type,
    modifiers: Modifier[],
    defaultValue: DefaultValue,
};

type Column<Name extends string, Type, Modifier, DefaultValue> = {
    [K in Name]: ColumnData<Type, Modifier, DefaultValue>
};

type UnwrapSetupColumnType<Type> =
    Type extends "string" ? string :
    Type extends "integer" ? number :
    Type extends "datetime" ? Date | "CURRENT_TIMESTAMP" :
    Type extends (() => Table<infer Columns>) ? Entry<Columns> :
    Type extends (() => [Table<infer Columns>]) ? Entry<Columns>[]:
        never;

type UnwrapColumnType<Type> =
    Type extends "string" ? string :
    Type extends "integer" ? number :
    Type extends "datetime" ? Date:
    Type extends (() => Table<infer Columns>) ? Entry<Columns> :
    Type extends (() => [Table<infer Columns>]) ? Entry<Columns>[]:
        never;

type UnwrapType<Column> =
    Column extends ColumnData<infer Type, unknown, unknown>
        ? Type
        : never;

type UnwrapModifier<Column> =
    Column extends ColumnData<unknown, infer Modifier, unknown>
        ? Modifier
        : never;

type InsertDataColumn<Column> =
    Column extends ColumnData<infer Type, infer Modifier, infer DefaultValue>
        ? DefaultValue extends undefined
            ? "autoincrement" extends Modifier
                ? never
                : "nullable" extends Modifier
                    ? UnwrapColumnType<Type> | null
                    : UnwrapColumnType<Type>
            : "autoincrement" extends Modifier
                ? never
                : UnwrapColumnType<Type> | null
        : never;

type InsertData<Columns> = {
    [Name in keyof Columns as InsertDataColumn<Columns[Name]> extends never ? never : null extends InsertDataColumn<Columns[Name]> ? never : Name]: InsertDataColumn<Columns[Name]>
} & {
    [Name in keyof Columns as InsertDataColumn<Columns[Name]> extends never ? never : null extends InsertDataColumn<Columns[Name]> ? Name : never]?: InsertDataColumn<Columns[Name]>
};

type WhereColumn<Column> =
    Column extends ColumnData<infer Type, infer Modifier>
        ? "nullable" extends Modifier
            ? UnwrapColumnType<Type> | null
            : UnwrapColumnType<Type>
        : never;

type Where<Columns> = {
    [Name in keyof Columns as WhereColumn<Columns[Name]> extends never ? never : Name]?: WhereColumn<Columns[Name]>
};

class TableData<Columns> {
    readonly name: string;
    readonly columns: Columns;

    constructor(name: string, columns: Columns) {
        this.name = name;
        this.columns = columns;
    }
}

export type TableColumns<T> = T extends Table<infer Columns> ? Columns : never;
export type EntryOf<T> = T extends Table<infer Columns> ? Entry<Columns> : never;

type UpdateColumn<Column = ColumnData> =
    Column extends ColumnData<infer Type, infer Modifier, infer DefaultValue>
        ? "nullable" extends Modifier
            ? UnwrapColumnType<Type> | null
            : UnwrapColumnType<Type>
        : never;

type EntryColumn<Column = ColumnData> =
    Column extends ColumnData<infer Type, infer Modifier, infer DefaultValue>
        ? "nullable" extends Modifier
            ? UnwrapColumnType<Type> | null
            : UnwrapColumnType<Type>
        : never;

export type Entry<Columns extends Record<string, unknown>> = {
    [ColumnName in keyof Columns]: EntryColumn<Columns[ColumnName]>
}

const db2js = <T>(value: T, type?: ColumnType) => {
    if (type === "datetime" && typeof value === "string") {
        return new Date(value);
    }

    return value;
};

const js2db = <T>(value: T) => {
    if (value instanceof Date) {
        return (
            value
                .toISOString()
                .replace(
                    /(\d+)-(\d+)-(\d+)T(\d+):(\d+):(\d+).*/gm,
                    `$1-$2-$3 $4:$5:$6`,
                )
        );
    }

    if (value !== null && typeof value === "object") {
        return (value as any).id;
    }

    return value;
};

const createEntry = <Columns extends Record<string, ColumnData>, T extends object>(table: Table<Columns>, entry: T): { entry: T, proxy: T } => {
    for (const name in entry) {
        (entry as any)[name] = db2js(entry[name], (table.columns as any)[name].type);
    }

    return {
        entry, proxy: entry && new Proxy(entry, {
            get(target, property, receiver) {
                const value: unknown = target[property as keyof T];

                if (typeof property === "string") {
                    const columnType = table.columns[property]?.type;

                    if (columnType instanceof Function) {
                        const temp = columnType();

                        if (temp instanceof Array) {
                            const [ subTable ] = temp;

                            return (
                                database.queryEntries(`
                                            SELECT ${subTable.name}.*
                                            FROM ${subTable.name}
                                                     INNER JOIN "${table.name} ⟷ ${subTable.name}" "⟷" ON ${subTable.name}.id = "⟷"."${subTable.name}.id"
                                            WHERE "${table.name}.id" IS ?
                                    `,
                                    [ (entry as any).id ],
                                )
                                    .map(entry => createEntry(subTable, entry).proxy)
                            );
                        } else if (typeof value === "number") {
                            return temp.findById(value);
                        }
                    }

                    return value ?? null;
                }

                return value;
            },
            set<T>(target: T, property: string | symbol, value: any, receiver: any): boolean {
                if (typeof property === "string") {
                    const columnType = table.columns[property]?.type;

                    if (columnType instanceof Function) {
                        const temp = columnType();

                        if (temp instanceof Array) {
                            const [ subTable ] = temp;
                            const tableName = `${table.name} ⟷ ${subTable.name}`;

                            const newEntryIds = value.map(({ id }: { id: number }) => id) as number[];
                            const currentEntryIds = database.query(`
                                SELECT "${subTable.name}.id"
                                FROM "${tableName}"
                                WHERE "${table.name}.id" IS ${(entry as any).id}
                            `).flat() as number[];

                            for (const id of newEntryIds) {
                                if (!currentEntryIds.includes(id)) {
                                    database.query(`
                                        INSERT INTO "${tableName}" ("${table.name}.id", "${subTable.name}.id")
                                        VALUES (?, ?);
                                    `, [ (entry as any).id as number, id as number ])
                                }
                            }

                            for (const id of currentEntryIds) {
                                if (!newEntryIds.includes(id)) {
                                    database.query(`
                                        DELETE
                                        FROM "${tableName}"
                                        WHERE "${table.name}.id" = ?
                                          AND "${subTable.name}.id" = ?
                                    `, [ (entry as any).id as number, id as number ])
                                }
                            }

                            return true;
                        }
                    }

                    table.update((target as any).id, property, value);

                    return true
                }

                return false;
            },
        }),
    };
};

class Table<Columns extends Record<string, ColumnData>> extends TableData<Columns> {
    private entries: Record<number, { entry: Entry<Columns>, proxy: Entry<Columns> }> = {};
    private updates: Record<number, Partial<Entry<Columns>>> = {};
    private timeoutId = -1;

    constructor(name: string, columns: Columns) {
        super(name, columns);
    }

    insert(data: InsertData<Columns>): Entry<Columns> {
        const { names, placeholders, values } = (
            Object.entries(data)
                .reduce(({ names, placeholders, values }, [ key, value ]) => {
                    if (value instanceof Array) {
                        return ({
                            names: [ ...names ],
                            placeholders: [ ...placeholders ],
                            values: [ ...values ],
                        });
                    } else {
                        return ({
                            names: [ ...names, key ],
                            placeholders: [ ...placeholders, "?" ],
                            values: [ ...values, js2db(value) ],
                        });
                    }
                }, { names: [], placeholders: [], values: [] } as {
                    names: string[],
                    placeholders: string[],
                    values: string[],
                })
        );

        database.query(
            `INSERT INTO ${this.name} (${names})
             VALUES (${placeholders})`,
            values,
        );

        const entry = this.findById(database.lastInsertRowId)!;

        for (const name in data) {
            const value = (data as any)[name] as UnwrapSetupColumnType<ColumnType>;
            const type = this.columns[name].type;

            if (value instanceof Array && type instanceof Function) {
                const temp = type();

                if (temp instanceof Array) {
                    const [ table ] = temp;

                    for (const subEntry of value) {
                        database.query(`
                            INSERT INTO "${this.name} ⟷ ${table.name}" ("${this.name}.id", "${table.name}.id")
                            VALUES (?, ?);
                        `, [entry.id as number, subEntry.id as number])
                    }
                }
            }
        }

        return entry;
    }

    update<Column extends keyof Columns>(id: number, column: Column, value: UpdateColumn<Columns[Column]>) {
        const entry = this.internalFindById(id).entry;

        if (entry && entry[column] !== value) {
            const columnType = this.columns[column]?.type;
            const normalizedValue = (
                columnType instanceof Function
                    ? (value as any)?.id ?? null
                    : js2db(value)
            );

            (this.updates[id] ??= {})[column] = normalizedValue;
            entry[column] = value;

            if (typeof column === "string" && (normalizedValue === null || typeof normalizedValue === "string" || typeof normalizedValue === "number")) {
                if (this.timeoutId === -1) {
                    this.timeoutId = setTimeout(() => {
                        const updates = this.updates;

                        this.updates = {};
                        this.timeoutId = -1;

                        for (const id in updates) {
                            const data = updates[id];

                            let query = "";
                            let values: any[] = [];

                            for (const column in data) {
                                query += `${column} = ?,`;

                                if (data[column]) {
                                    values = [ ...values, js2db(data[column]) ];
                                }
                            }

                            database.query(`UPDATE ${this.name} SET ${query} updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,  [ ...values, id ]);
                        }
                    });
                }
            } else {
                throw new Error();
            }
        }
    }

    findById(id: number): Entry<Columns> | undefined {
        return this.internalFindById(id).proxy;
    }

    where(data: Where<Columns>): Entry<Columns>[] {
        const keys = Object.keys(data);
        const where = keys.length > 0 ? `WHERE  ${
            keys
                .map(name => `${name} IS ?`)
                .join(" AND ")
        }` : ``;

        return (
            database.queryEntries(`SELECT * FROM ${this.name} ${where}`, Object.values(data))
                .map((entry) => {
                    return (this.entries[(entry as any).id] ??= createEntry(this, entry as Entry<Columns>)).proxy;
                })
        );
    }

    all(): Entry<Columns>[] {
        return this.where({});
    }

    private internalFindById(id: number): { entry: Entry<Columns> | undefined, proxy: Entry<Columns> | undefined } {
        return (this.entries[id] ??= createEntry(this, (
            database.queryEntries(`SELECT * FROM ${this.name} WHERE id = ?`, [ id ])[0] as Entry<Columns>
        )));
    }
}

type TableBuilder<Columns extends Record<string, ColumnData> = {}> = {
    column<Name extends string, Type extends ColumnType, Modifier extends ColumnModifier = undefined, DefaultValue extends UnwrapSetupColumnType<Type> | undefined = undefined>(name: Name, type: Type, modifiers?: Modifier[], defaultValue?: DefaultValue): TableBuilder<Columns & Column<Name, Type, Modifier, DefaultValue>>,
    create(): Table<Columns>,
};

type DefaultColumns =
    Column<"id", "integer", "autoincrement" | "primary key", undefined> &
    Column<"createdAt", "datetime", undefined, "CURRENT_TIMESTAMP"> &
    Column<"updatedAt", "datetime", undefined, "CURRENT_TIMESTAMP"> &
    Column<"deletedAt", "datetime", "nullable", null>;

export const table = (name: string): TableBuilder<DefaultColumns> => {
    const columns: DefaultColumns & Record<string, unknown> = {
        id: { type: "integer", modifiers: [ "primary key", "autoincrement" ], defaultValue: undefined },
        createdAt: { type: "datetime", modifiers: [], defaultValue: "CURRENT_TIMESTAMP" },
        updatedAt: { type: "datetime", modifiers: [], defaultValue: "CURRENT_TIMESTAMP" },
        deletedAt: { type: "datetime", modifiers: ["nullable"], defaultValue: null },
    };

    return {
        column(name, type, modifiers, defaultValue) {
            columns[name] = {
                type,
                modifiers,
                defaultValue,
            };

            return this as never;
        },
        create() {
            const queryColumns =
                (Object.entries(columns) as ([ string, ColumnData<ColumnType, ColumnModifier> ][]))
                    .map(([ columnName, { type, modifiers, defaultValue } ]) => {
                        const queryType = (
                            type instanceof Function
                                ? (reference => {
                                    if (reference instanceof Array) {
                                        const [ table ] = reference;

                                        database.execute(`
                                            CREATE TABLE IF NOT EXISTS "${name} ⟷ ${table.name}"
                                            (
                                                "${name}.id"       INTEGER REFERENCES ${name},
                                                "${table.name}.id" INTEGER REFERENCES ${table.name}
                                            );
                                        `);

                                        return undefined;
                                    } else {
                                        return `INTEGER REFERENCES ${reference.name}`;
                                    }
                                })(type())
                                : (<Record<string, string>>{
                                "string": "text",
                            })[type as string] ?? type
                        );

                        if (!queryType) {
                            return undefined;
                        }

                        const queryModifiers = [ ...modifiers?.sort(x => x === "autoincrement" ? 1 : -1) ?? [] ] as string[];
                        const index = queryModifiers.indexOf("nullable");

                        if (index !== -1) {
                            queryModifiers.splice(index, 1);
                        } else {
                            queryModifiers.push("not null");
                        }

                        const queryDefaultValue = (
                            defaultValue !== undefined
                                ? `DEFAULT ${js2db(defaultValue)}`
                                : ''
                        );

                        return `${columnName} ${queryType} ${queryModifiers?.join(" ") ?? ""} ${queryDefaultValue}`.trim();
                    })
                    .filter(column => !!column)
                    .join(",");

            database.execute(`CREATE TABLE IF NOT EXISTS ${name} (${queryColumns})`);

            return new Table<DefaultColumns>(name, columns);
        },
    };
};
